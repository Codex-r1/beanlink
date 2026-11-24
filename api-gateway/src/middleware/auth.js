const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const { rows: [user] } = await pool.query(
      'SELECT user_id, email, role, moderation_status FROM users WHERE user_id = $1',
      [payload.user_id]
    );
    if (!user) return res.status(401).json({ error: 'Account not found' });
    if (user.moderation_status === 'restricted') {
      return res.status(403).json({ error: 'This account has been restricted.' });
    }
    req.user = user;
  } catch (err) {
    return next(err);
  }
  next();
};