const pool = require('../config/db');

exports.getProfile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, role, phone_number, county, created_at
         FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('getProfile', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
};

exports.updateProfile = async (req, res) => {
  const allowed = ['full_name', 'phone_number', 'county'];
  const updates = [];
  const values = [];
  let i = 1;

  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      updates.push(`${k} = $${i++}`);
      values.push(req.body[k]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.user.user_id);

  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')}
        WHERE user_id = $${i}
        RETURNING user_id, full_name, email, role, phone_number, county`,
      values
    );
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('updateProfile', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};