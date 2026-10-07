const pool = require('../config/db');

exports.listUsers = async (req, res) => {
  const { role } = req.query;
  const params = [];
  const where = role ? 'WHERE role = $1' : '';
  if (role) params.push(role);

  try {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, role, county, created_at
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

// Note: your schema has no `status` or `verified` column on users.
// If you want admin to "verify" a user, add a column:
//   ALTER TABLE users ADD COLUMN verified BOOLEAN NOT NULL DEFAULT false;
// Then this endpoint works. Otherwise, treat it as a no-op for the FYP demo.
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

// Reports — there's no `reports` table in your schema. Either:
// 1. Create one: CREATE TABLE reports (report_id BIGSERIAL PK, listing_id BIGINT,
//    reason TEXT, status TEXT DEFAULT 'open', created_at TIMESTAMPTZ DEFAULT now());
// 2. Or for FYP demo, return a hardcoded mock and skip the DB.
exports.listReports = async (req, res) => {
  // Placeholder — swap for a real query once you add the reports table.
  res.json({
    reports: [
      { id: 'RPT-01', listing: 'PL-203 · Mwitemania Beans', reason: 'Price mismatch', status: 'Open' },
      { id: 'RPT-02', listing: 'IN-104 · CAN Top Dressing', reason: 'Unverified seller flagged', status: 'Open' },
    ],
  });
};

exports.resolveReport = async (req, res) => {
  res.json({ id: req.params.id, status: 'Resolved' });
};