const pool = require('../config/db');

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
const IDEMPOTENCY_WINDOW_MINUTES = 3;

/* ============================================================================
   GET /api/orders?role=seller|buyer|all&status=
   ========================================================================== */
exports.getOrders = async (req, res) => {
  const { role, status } = req.query;
  const userId = req.user.user_id;
  
  let query = `
    SELECT 
      t.txn_id,
      t.total_amount,
      t.status,
      t.payment_status,
      t.fulfillment_method,
      t.fulfillment_status,
      t.delivery_address,
      t.delivery_landmark,
      t.created_at,
      t.buyer_id,
      l.listing_id,
      l.title,
      l.variety,
      l.location,
      l.seller_id,
      oi.quantity,
      buyer.full_name as buyer_name,
      buyer.phone_number as buyer_phone,
      seller.full_name as seller_name,
      seller.phone_number as seller_phone
    FROM transactions t
    JOIN order_items oi ON oi.txn_id = t.txn_id
    JOIN listings l ON l.listing_id = oi.listing_id
    JOIN users buyer ON t.buyer_id = buyer.user_id
    JOIN users seller ON l.seller_id = seller.user_id
    -- THIS IS THE CRITICAL FIX: Show orders where I am the buyer OR the seller
    WHERE (t.buyer_id = $1 OR l.seller_id = $1)
  `;
  const params = [userId];

  // If they explicitly filter by role, apply it
  if (role === 'buyer') {
    query += ` AND t.buyer_id = $1`;
  } else if (role === 'seller') {
    query += ` AND l.seller_id = $1`;
  }

  if (status) {
    query += ` AND t.status = $${params.length + 1}`;
    params.push(status);
  }

  query += ` ORDER BY t.created_at DESC`;

  try {
    const { rows } = await pool.query(query, params);
    
    const orders = rows.map(r => {
      // Determine if the current user is the buyer or seller for this specific order
      const isBuyer = r.buyer_id === userId;
      
      return {
        id: `ORD-${r.txn_id}`,
        rawId: r.txn_id,
        item: r.title || r.variety,
        // If I'm the buyer, show me the seller's name. If I'm the seller, show the buyer's name.
        counterpartyName: isBuyer ? r.seller_name : r.buyer_name,
        counterpartyPhone: isBuyer ? r.seller_phone : r.buyer_phone,
        counterpartyLocation: r.location,
        quantity: r.quantity,
        amount: r.total_amount,
        date: r.created_at,
        status: r.status,
        fulfillmentMethod: r.fulfillment_method,
        fulfillmentStatus: r.fulfillment_status,
        deliveryAddress: r.delivery_address,
        deliveryLandmark: r.delivery_landmark,
        // This is what your UI uses to show the right buttons!
        myRole: isBuyer ? "buyer" : "seller" 
      };
    });

    res.json({ orders });
  } catch (err) {
    console.error('getOrders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};
/* ============================================================================
   GET /api/orders/:id
   ========================================================================== */
exports.getOne = async (req, res) => {
  const userId = req.user.user_id;
  try {
    const { rows } = await pool.query(
      `SELECT
         t.txn_id, t.status, t.total_amount, t.created_at,
         t.payment_status, t.mpesa_receipt,
         t.fulfillment_method, t.fulfillment_status,
         t.delivery_address, t.delivery_landmark,
         t.pickup_code, t.dispatched_at, t.delivered_at,
         t.buyer_id, buyer.full_name AS buyer_name, buyer.phone_number AS buyer_phone,
         l.listing_id, l.title, l.category, l.variety, l.location,
         l.seller_id, seller.full_name AS seller_name, seller.phone_number AS seller_phone,
         oi.quantity, oi.unit_price
       FROM transactions t
       JOIN order_items oi ON oi.txn_id = t.txn_id
       JOIN listings l ON l.listing_id = oi.listing_id
       JOIN users buyer ON buyer.user_id = t.buyer_id
       JOIN users seller ON seller.user_id = l.seller_id
       WHERE t.txn_id = $1 AND (t.buyer_id = $2 OR l.seller_id = $2)`,
      [req.params.id, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ order: rows[0] });
  } catch (err) {
    console.error('getOne order', err);
    res.status(500).json({ error: 'Failed to load order' });
  }
};

/* ============================================================================
   GET /api/orders/:id/payment-status
   ========================================================================== */
exports.getPaymentStatus = async (req, res) => {
  const userId = req.user.user_id;
  try {
    const { rows } = await pool.query(
      `SELECT status, payment_status, mpesa_receipt
         FROM transactions
        WHERE txn_id = $1 AND buyer_id = $2`,
      [req.params.id, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getPaymentStatus', err);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
};

/* ============================================================================
   POST /api/orders
   Idempotent: reuses a recent pending order for the same buyer+listing.
   ========================================================================== */
exports.create = async (req, res) => {
  const { listing_id, quantity } = req.body;
  const userId = req.user.user_id;

  if (!listing_id || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'listing_id and positive quantity required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Idempotency: is there a recent pending order from this buyer
    // for this listing? If so, return it instead of creating a new one.
    const existing = await client.query(
      `SELECT t.txn_id, t.status, t.payment_status, t.total_amount
         FROM transactions t
         JOIN order_items oi ON oi.txn_id = t.txn_id
        WHERE t.buyer_id = $1
          AND oi.listing_id = $2
          AND t.status = 'pending'
          AND t.created_at > now() - ($3 || ' minutes')::interval
        ORDER BY t.created_at DESC
        LIMIT 1`,
      [userId, listing_id, String(IDEMPOTENCY_WINDOW_MINUTES)]
    );

    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return res.status(200).json({
        order: existing.rows[0],
        reused: true,
      });
    }

    // Lock the listing row so concurrent buyers can't oversell
    const { rows: [listing] } = await client.query(
      `SELECT listing_id, seller_id, price_per_unit, quantity_available, status
         FROM listings WHERE listing_id = $1 FOR UPDATE`,
      [listing_id]
    );

    if (!listing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Listing not available' });
    }
    if (listing.seller_id === userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "You can't buy your own listing" });
    }
    if (Number(quantity) > Number(listing.quantity_available)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Requested quantity exceeds availability' });
    }

    const total = Number(quantity) * Number(listing.price_per_unit);

    const { rows: [txn] } = await client.query(
      `INSERT INTO transactions (buyer_id, total_amount, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [userId, total]
    );

    await client.query(
      `INSERT INTO order_items (txn_id, listing_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)`,
      [txn.txn_id, listing_id, quantity, listing.price_per_unit]
    );

    await client.query(
      `UPDATE listings
          SET quantity_available = quantity_available - $1
        WHERE listing_id = $2`,
      [quantity, listing_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ order: txn, reused: false });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('create order', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
};

/* ============================================================================
   PATCH /api/orders/:id/status
   ========================================================================== */
exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const userId = req.user.user_id;

  try {
    const { rows } = await pool.query(
      `UPDATE transactions t SET status = $1
        WHERE t.txn_id = $2
          AND (
            t.buyer_id = $3
            OR EXISTS (
              SELECT 1 FROM order_items oi
              JOIN listings l ON l.listing_id = oi.listing_id
              WHERE oi.txn_id = t.txn_id AND l.seller_id = $3
            )
          )
        RETURNING t.*`,
      [status, req.params.id, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found or not yours' });
    res.json({ order: rows[0] });
  } catch (err) {
    console.error('updateStatus order', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

/* ============================================================================
   PATCH /api/orders/:id/fulfillment
   ========================================================================== */
const VALID_METHODS = ['pickup', 'delivery'];

exports.setFulfillment = async (req, res) => {
  const userId = req.user.user_id;
  const { method, address, landmark } = req.body;

  if (!VALID_METHODS.includes(method)) {
    return res.status(400).json({ error: 'Invalid fulfillment method' });
  }
  if (method === 'delivery' && !address) {
    return res.status(400).json({ error: 'Delivery address is required' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE transactions
          SET fulfillment_method = $1,
              delivery_address = $2,
              delivery_landmark = $3
        WHERE txn_id = $4 AND buyer_id = $5 AND status = 'pending'
        RETURNING txn_id, fulfillment_method, delivery_address, delivery_landmark`,
      [method, address || null, landmark || null, req.params.id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found, not yours, or already paid' });
    }
    res.json({ order: rows[0] });
  } catch (err) {
    console.error('setFulfillment', err);
    res.status(500).json({ error: 'Failed to save fulfillment details' });
  }
};

/* ============================================================================
   PATCH /api/orders/:id/seller-advance
   ========================================================================== */
const generatePickupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

exports.sellerAdvance = async (req, res) => {
  const userId = req.user.user_id;
  const { action } = req.body;

  const allowed = ['ready_for_pickup', 'dispatched', 'issue'];
  if (!allowed.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const check = await pool.query(
      `SELECT t.txn_id, t.fulfillment_method
         FROM transactions t
         JOIN order_items oi ON oi.txn_id = t.txn_id
         JOIN listings l ON l.listing_id = oi.listing_id
        WHERE t.txn_id = $1 AND l.seller_id = $2`,
      [req.params.id, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or not yours' });
    }

    const method = check.rows[0].fulfillment_method;
    let pickupCode = null;
    let dispatchedAt = null;

    if (action === 'ready_for_pickup') {
      if (method !== 'pickup') return res.status(400).json({ error: 'This is not a pickup order' });
      const { rows: [existing] } = await pool.query(
        `SELECT pickup_code FROM transactions WHERE txn_id = $1`,
        [req.params.id]
      );
      pickupCode = existing.pickup_code || generatePickupCode();
    } else if (action === 'dispatched') {
      if (method !== 'delivery') return res.status(400).json({ error: 'This is not a delivery order' });
      dispatchedAt = new Date();
    }

    const { rows } = await pool.query(
      `UPDATE transactions
          SET fulfillment_status = $1::fulfillment_status_enum,
              pickup_code = COALESCE($2, pickup_code),
              dispatched_at = COALESCE($3, dispatched_at)
        WHERE txn_id = $4
        RETURNING txn_id, fulfillment_status, pickup_code, dispatched_at`,
      [action, pickupCode, dispatchedAt, req.params.id]
    );

    res.json({ order: rows[0] });
  } catch (err) {
    console.error('sellerAdvance', err);
    res.status(500).json({ error: 'Failed to update fulfillment' });
  }
};

/* ============================================================================
   PATCH /api/orders/:id/confirm-receipt
   ========================================================================== */
exports.buyerConfirm = async (req, res) => {
  const userId = req.user.user_id;
  const { pickup_code } = req.body;

  try {
    // Check if user is buyer OR seller for this order
       const { rows: [order] } = await pool.query(
      `SELECT t.txn_id, t.fulfillment_method, t.fulfillment_status, t.pickup_code, t.buyer_id, l.seller_id
         FROM transactions t
         JOIN order_items oi ON oi.txn_id = t.txn_id
         JOIN listings l ON l.listing_id = oi.listing_id
        WHERE t.txn_id = $1 AND (t.buyer_id = $2 OR l.seller_id = $2)`,
      [req.params.id, userId]
    );
    
    if (!order) return res.status(404).json({ error: 'Order not found or not yours' });

    if (order.fulfillment_method === 'pickup') {
      if (!pickup_code || pickup_code.toUpperCase() !== (order.pickup_code || '').toUpperCase()) {
        return res.status(400).json({ error: 'Incorrect pickup code' });
      }
    } else {
      // Delivery confirmation (only buyer should do this)
      if (userId !== order.buyer_id) {
         return res.status(403).json({ error: 'Only the buyer can confirm delivery.' });
      }
      if (order.fulfillment_status !== 'dispatched') {
        return res.status(400).json({ error: 'Order has not been dispatched yet' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE transactions
          SET fulfillment_status = 'delivered',
              delivered_at = now(),
              status = 'completed'
        WHERE txn_id = $1
        RETURNING txn_id, fulfillment_status, delivered_at, status`,
      [req.params.id]
    );

    res.json({ order: rows[0] });
  } catch (err) {
    console.error('buyerConfirm', err);
    res.status(500).json({ error: 'Failed to confirm receipt' });
  }
};
exports.getOrderReview = async (req, res) => {
  const { txnId } = req.params;
  const userId = req.user.user_id;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM reviews WHERE txn_id = $1 AND reviewer_id = $2',
      [txnId, userId]
    );
    res.json({ review: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check review' });
  }
};
exports.createReview = async (req, res) => {
  // Get txn_id from the URL params, not the body
  const { txnId } = req.params; 
  const { reviewee_id, rating, comment } = req.body;
  const reviewer_id = req.user.user_id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // Check if order is delivered and buyer is the reviewer
    const check = await pool.query(
      `SELECT t.txn_id FROM transactions t 
       WHERE t.txn_id = $1 AND t.buyer_id = $2 AND t.fulfillment_status = 'delivered'`,
      [txnId, reviewer_id]
    );
    
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'You can only review your own delivered orders.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO reviews (txn_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [txnId, reviewer_id, reviewee_id, rating, comment]
    );
    res.status(201).json({ review: rows[0] });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'You have already reviewed this order.' });
    }
    res.status(500).json({ error: 'Failed to submit review' });
  }
};
exports.getSellerRating = async (req, res) => {
  const { sellerId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count, AVG(rating) as average 
       FROM reviews WHERE reviewee_id = $1`,
      [sellerId]
    );
    res.json({ 
      count: parseInt(rows[0].count), 
      average: rows[0].average ? parseFloat(rows[0].average).toFixed(1) : null 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
};