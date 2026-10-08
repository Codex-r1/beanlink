const pool = require('../config/db');

exports.listUsers = async (req, res) => {
  const { role } = req.query;
  const params = [req.user.user_id];
  let where = `WHERE user_id <> $1`;
  let i = 2;

  if (role) {
    where += ` AND role = $${i++}`;
    params.push(role);
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, role, county, verified, created_at
         FROM users ${where}
        ORDER BY created_at DESC LIMIT 200`,
      params
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('listUsers', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET verified = true
        WHERE user_id = $1
        RETURNING user_id, full_name, verified`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('verifyUser', err);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

exports.listPrices = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM price_records ORDER BY recorded_date DESC LIMIT 100`
    );
    res.json({ prices: rows });
  } catch (err) {
    console.error('listPrices', err);
    res.status(500).json({ error: 'Failed to load prices' });
  }
};

exports.createPrice = async (req, res) => {
  const { market_name, county, bean_variety, price_per_kg, recorded_date, source } = req.body;
  if (!market_name || !bean_variety || price_per_kg == null || !recorded_date || !source) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO price_records
         (market_name, county, bean_variety, price_per_kg, recorded_date, source)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [market_name, county || null, bean_variety, price_per_kg, recorded_date, source]
    );
    res.status(201).json({ price: rows[0] });
  } catch (err) {
    console.error('createPrice', err);
    res.status(500).json({ error: 'Failed to create price record' });
  }
};

exports.deletePrice = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM price_records WHERE price_id = $1 RETURNING price_id`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: rows[0].price_id });
  } catch (err) {
    console.error('deletePrice', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
};

exports.listReports = async (req, res) => {
  const { status } = req.query;
  const where = status && status !== 'all' ? `WHERE r.status = $1` : '';
  const params = status && status !== 'all' ? [status] : [];

  try {
    const { rows } = await pool.query(
      `SELECT
         r.report_id,
         r.listing_id,
         r.reason,
         r.details,
         r.status,
         r.created_at,
         r.resolved_at,
         l.title AS listing_title,
         l.category AS listing_category,
         reporter.full_name AS reporter_name,
         resolver.full_name AS resolver_name
       FROM reports r
       JOIN listings l ON l.listing_id = r.listing_id
       LEFT JOIN users reporter ON reporter.user_id = r.reporter_id
       LEFT JOIN users resolver ON resolver.user_id = r.resolved_by
       ${where}
       ORDER BY
         CASE WHEN r.status = 'open' THEN 0 ELSE 1 END,
         r.created_at DESC
       LIMIT 200`,
      params
    );

    res.json({
      reports: rows.map((r) => ({
        id: `RPT-${String(r.report_id).padStart(3, '0')}`,
        rawId: r.report_id,
        listingId: r.listing_id,
        listing: `${r.listing_category === 'produce' ? 'PL' : 'IN'}-${r.listing_id} · ${r.listing_title}`,
        listingTitle: r.listing_title,
        reason: r.reason,
        details: r.details,
        status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
        reporter: r.reporter_name,
        resolvedBy: r.resolver_name,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
      })),
    });
  } catch (err) {
    console.error('listReports', err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
};

exports.resolveReport = async (req, res) => {
  const { action } = req.body; // 'resolve' | 'dismiss'
  const status = action === 'dismiss' ? 'dismissed' : 'resolved';

  try {
    const { rows } = await pool.query(
      `UPDATE reports
          SET status = $1,
              resolved_by = $2,
              resolved_at = now()
        WHERE report_id = $3
        RETURNING report_id, status`,
      [status, req.user.user_id, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ report: rows[0] });
  } catch (err) {
    console.error('resolveReport', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
};
exports.getStats = async (req, res) => {
  try {
    const { rows: [userStats] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE role = 'farmer')::int   AS farmers,
        COUNT(*) FILTER (WHERE role = 'buyer')::int    AS buyers,
        COUNT(*) FILTER (WHERE role = 'supplier')::int AS suppliers,
        COUNT(*) FILTER (WHERE verified = false AND role <> 'admin')::int AS pending_verifications
      FROM users
    `);

    const { rows: [listings] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_listings,
        COUNT(*)::int AS total_listings
      FROM listings
    `);

    const { rows: [orders] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_orders,
        COUNT(*)::int AS total_orders
      FROM transactions
    `);

    res.json({ ...userStats, ...listings, ...orders });
  } catch (err) {
    console.error('getStats', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};