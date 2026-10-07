const pool = require('../config/db');

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
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
const generatePickupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

exports.sellerAdvance = async (req, res) => {
  const userId = req.user.user_id;
  const { action } = req.body; // 'ready_for_pickup' | 'dispatched' | 'issue'

  const allowed = ['ready_for_pickup', 'dispatched', 'issue'];
  if (!allowed.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    // Verify the caller is the seller for this order
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
      if (method !== 'pickup') return res.status(400).json({ error: 'Order is not a pickup order' });
      // Only generate once
      const { rows: [existing] } = await pool.query(
        `SELECT pickup_code FROM transactions WHERE txn_id = $1`,
        [req.params.id]
      );
      pickupCode = existing.pickup_code || generatePickupCode();
    } else if (action === 'dispatched') {
      if (method !== 'delivery') return res.status(400).json({ error: 'Order is not a delivery order' });
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
exports.buyerConfirm = async (req, res) => {
  const userId = req.user.user_id;
  const { pickup_code } = req.body;

  try {
    const { rows: [order] } = await pool.query(
      `SELECT txn_id, fulfillment_method, fulfillment_status, pickup_code
         FROM transactions
        WHERE txn_id = $1 AND buyer_id = $2`,
      [req.params.id, userId]
    );
    if (!order) return res.status(404).json({ error: 'Order not found or not yours' });

    if (order.fulfillment_method === 'pickup') {
      if (!pickup_code || pickup_code.toUpperCase() !== (order.pickup_code || '').toUpperCase()) {
        return res.status(400).json({ error: 'Incorrect pickup code' });
      }
    } else {
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
// GET /api/orders?role=seller|buyer|all&status=
exports.getOrders = async (req, res) => {
  const userId = req.user.user_id;
  const { role = 'all', status } = req.query;

  const filters = [];
  const params = [userId];
  let i = 2;

  if (role === 'seller') filters.push(`l.seller_id = $1`);
  else if (role === 'buyer') filters.push(`t.buyer_id = $1`);
  else filters.push(`(l.seller_id = $1 OR t.buyer_id = $1)`);

  if (status) { filters.push(`t.status = $${i++}`); params.push(status); }

  try {
    const { rows } = await pool.query(
      `SELECT t.txn_id AS order_id, t.status, t.total_amount AS amount, t.created_at AS date,
              t.buyer_id, buyer.full_name AS buyer_name,
              l.listing_id, l.title AS item, l.seller_id, seller.full_name AS seller_name,
              oi.quantity, oi.unit_price
         FROM transactions t
         JOIN order_items oi ON oi.txn_id = t.txn_id
         JOIN listings l ON l.listing_id = oi.listing_id
         JOIN users buyer ON buyer.user_id = t.buyer_id
         JOIN users seller ON seller.user_id = l.seller_id
        WHERE ${filters.join(' AND ')}
        ORDER BY t.created_at DESC
        LIMIT 200`,
      params
    );

    res.json({
      orders: rows.map((r) => ({
        id: `ORD-${r.order_id}`,
        rawId: r.order_id,
        item: r.item,
        counterparty: r.buyer_id === userId
          ? `${r.seller_name} (Seller)`
          : `${r.buyer_name} (Buyer)`,
        quantity: `${r.quantity} kg`,
        amount: Number(r.amount),
        date: r.date,
        status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
      })),
    });
  } catch (err) {
    console.error('getOrders', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
};

// GET /api/orders/:id
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
// POST /api/orders  — used by both "Buy Now" and "Place Order"
exports.create = async (req, res) => {
  const { listing_id, quantity } = req.body;
  if (!listing_id || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'listing_id and positive quantity required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [listing] } = await client.query(
      `SELECT listing_id, seller_id, price_per_unit, quantity_available, status
         FROM listings WHERE listing_id = $1 FOR UPDATE`,
      [listing_id]
    );

    if (!listing) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Listing not found' }); }
    if (listing.status !== 'active') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Listing not available' }); }
    if (listing.seller_id === req.user.user_id) { await client.query('ROLLBACK'); return res.status(400).json({ error: "You can't buy your own listing" }); }
    if (Number(quantity) > Number(listing.quantity_available)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Requested quantity exceeds availability' });
    }

    const total = Number(quantity) * Number(listing.price_per_unit);

    const { rows: [txn] } = await client.query(
      `INSERT INTO transactions (buyer_id, total_amount, status)
       VALUES ($1, $2, 'pending') RETURNING *`,
      [req.user.user_id, total]
    );

    await client.query(
      `INSERT INTO order_items (txn_id, listing_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)`,
      [txn.txn_id, listing_id, quantity, listing.price_per_unit]
    );

    // Decrement stock — keeps quantity_available in sync
    await client.query(
      `UPDATE listings SET quantity_available = quantity_available - $1
        WHERE listing_id = $2`,
      [quantity, listing_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ order: txn });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('create order', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
};

// PATCH /api/orders/:id/status
exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

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