const pool = require('../config/db');

// GET /api/dashboard/summary
exports.getSummary = async (req, res) => {
  const userId = req.user.user_id;
  const role = req.user.role;

  try {
    if (role === 'buyer') {
      const { rows: [open] } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM transactions
          WHERE buyer_id = $1 AND status IN ('pending','confirmed','processing')`,
        [userId]
      );
      const { rows: [done] } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM transactions
          WHERE buyer_id = $1 AND status = 'completed'`,
        [userId]
      );
      const { rows: [spent] } = await pool.query(
        `SELECT COALESCE(SUM(total_amount),0)::numeric AS s FROM transactions
          WHERE buyer_id = $1 AND status = 'completed'`,
        [userId]
      );
      return res.json({
        role,
        openOrders: open.c,
        completedOrders: done.c,
        totalSpent: Number(spent.s),
      });
    }

    // farmer / supplier / admin
    const { rows: [listings] } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_listings,
         COUNT(*)::int AS total_listings
       FROM listings
       WHERE seller_id = $1`,
      [userId]
    );

    const { rows: [orders] } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE t.status = 'pending')::int AS pending_orders,
         COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed_sales,
         COALESCE(SUM(t.total_amount) FILTER (WHERE t.status = 'completed'), 0)::numeric AS total_revenue
       FROM transactions t
       JOIN order_items oi ON oi.txn_id = t.txn_id
       JOIN listings l ON l.listing_id = oi.listing_id
       WHERE l.seller_id = $1`,
      [userId]
    );

    const { rows: [latest] } = await pool.query(
      `SELECT price_per_kg, bean_variety, market_name, recorded_date
         FROM price_records
        WHERE bean_variety = 'Rosecoco'
        ORDER BY recorded_date DESC LIMIT 1`
    );

    return res.json({
      role,
      activeListings: listings.active_listings,
      totalListings: listings.total_listings,
      pendingOrders: orders.pending_orders,
      completedSales: orders.completed_sales,
      totalRevenue: Number(orders.total_revenue),
      latestPrice: latest || null,
    });
  } catch (err) {
    console.error('getSummary', err);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
};

// GET /api/dashboard/activity
exports.getActivity = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT 'order'::text AS kind,
                t.txn_id::text AS ref,
                t.status::text AS status,
                t.created_at,
                'New order received: ' || oi.quantity || ' × ' || l.title AS message
           FROM transactions t
           JOIN order_items oi ON oi.txn_id = t.txn_id
           JOIN listings l ON l.listing_id = oi.listing_id
          WHERE l.seller_id = $1

         UNION ALL

         SELECT 'listing'::text AS kind,
                l.listing_id::text AS ref,
                l.status::text AS status,
                l.created_at,
                'You listed ' || l.quantity_available || ' × ' || l.title AS message
           FROM listings l
          WHERE l.seller_id = $1

         UNION ALL

         SELECT 'purchase'::text AS kind,
                t.txn_id::text AS ref,
                t.status::text AS status,
                t.created_at,
                'You purchased ' || l.title AS message
           FROM transactions t
           JOIN order_items oi ON oi.txn_id = t.txn_id
           JOIN listings l ON l.listing_id = oi.listing_id
          WHERE t.buyer_id = $1
       ) x
       ORDER BY created_at DESC
       LIMIT 12`,
      [userId]
    );
    res.json({ activity: rows });
  } catch (err) {
    console.error('getActivity', err);
    res.status(500).json({ error: 'Failed to load activity' });
  }
};