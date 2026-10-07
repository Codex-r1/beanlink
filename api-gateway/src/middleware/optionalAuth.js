const jwt = require('jsonwebtoken');

module.exports = function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { user_id: payload.user_id, role: payload.role, email: payload.email };
  } catch {
    // ignore bad token; treat as guest
  }
  next();
};