const pool = require('../config/db');

/* ============================================================================
   POST /api/reviews
   Buyer reviews the seller after a completed order.
   ========================================================================== */
exports.create = async (req, res) => {
  const userId = req.user.user_id;
  const { txn_id, rating, comment } = req.body;

  const numericRating = Number(rating);
  if (!txn_id || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: 'txn_id and rating (1-5) are required' });
  }

  try {
    // Load the transaction and verify the caller is the buyer, the order
    // is completed, and the seller is resolvable from the listing.
    const { rows: [order] } = await pool.query(
      `SELECT t.txn_id, t.buyer_id, t.status, t.fulfillment_status,
              l.seller_id
         FROM transactions t
         JOIN order_items oi ON oi.txn_id = t.txn_id
         JOIN listings l ON l.listing_id = oi.listing_id
        WHERE t.txn_id = $1`,
      [txn_id]
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.buyer_id !== userId) {
      return res.status(403).json({ error: 'Only the buyer of this order can leave a review' });
    }
    if (order.status !== 'completed' && order.fulfillment_status !== 'delivered') {
      return res.status(400).json({ error: 'You can only review orders that have been delivered' });
    }

    // Insert — the UNIQUE constraint will reject a second review for this order.
    const { rows } = await pool.query(
      `INSERT INTO reviews (txn_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING review_id, txn_id, rating, comment, created_at`,
      [txn_id, userId, order.seller_id, numericRating, comment || null]
    );

    res.status(201).json({ review: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      // Unique violation — already reviewed this order
      return res.status(409).json({ error: 'You have already reviewed this order' });
    }
    console.error('create review', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

/* ============================================================================
   GET /api/reviews/user/:userId
   List reviews received by a user (public).
   ========================================================================== */
exports.getForUser = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at,
              u.full_name AS reviewer_name
         FROM reviews r
         JOIN users u ON u.user_id = r.reviewer_id
        WHERE r.reviewee_id = $1
        ORDER BY r.created_at DESC
        LIMIT 100`,
      [req.params.userId]
    );
    res.json({ reviews: rows });
  } catch (err) {
    console.error('getForUser', err);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
};

/* ============================================================================
   GET /api/reviews/user/:userId/summary
   Average rating and count (public).
   ========================================================================== */
exports.getSummary = async (req, res) => {
  try {
    const { rows: [summary] } = await pool.query(
      `SELECT
         COUNT(*)::int AS review_count,
         COALESCE(AVG(rating), 0)::numeric(3,2) AS average_rating
       FROM reviews
       WHERE reviewee_id = $1`,
      [req.params.userId]
    );
    res.json({
      reviewCount: summary.review_count,
      averageRating: Number(summary.average_rating),
    });
  } catch (err) {
    console.error('getSummary', err);
    res.status(500).json({ error: 'Failed to load rating summary' });
  }
};

/* ============================================================================
   GET /api/reviews/order/:txnId
   Check whether the caller has already reviewed this order.
   ========================================================================== */
exports.getForOrder = async (req, res) => {
  const userId = req.user.user_id;
  try {
    const { rows } = await pool.query(
      `SELECT review_id, rating, comment, created_at
         FROM reviews
        WHERE txn_id = $1 AND reviewer_id = $2`,
      [req.params.txnId, userId]
    );
    res.json({ review: rows[0] || null });
  } catch (err) {
    console.error('getForOrder', err);
    res.status(500).json({ error: 'Failed to check review status' });
  }
};