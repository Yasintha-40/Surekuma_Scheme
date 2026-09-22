const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Authentication token is required' });

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or has expired' });
  }
  if (!Number.isSafeInteger(claims.id) || claims.id < 1) return res.status(401).json({ message: 'Your session is invalid or has expired' });
  try {
    const [[user]] = await db.execute('SELECT id, email, role, status FROM users WHERE id = ?', [claims.id]);
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Your account is unavailable. Please sign in again.' });
    req.user = user;
    next();
  } catch (error) { next(error); }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have access to this resource' });
  next();
};

module.exports = { authenticate, authorize };
