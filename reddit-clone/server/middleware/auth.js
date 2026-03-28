const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils/appError');

const protect = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please log in again.'
      : 'Invalid authentication token.';
    next(new AppError(message, 401));
  }
};

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET); } catch {}
  }
  next();
};

const createLimiter = (windowMs, max, message) =>
  rateLimit({ windowMs, max, message: { status: 'fail', message }, standardHeaders: true, legacyHeaders: false });

const apiLimiter  = createLimiter(15 * 60 * 1000, 100, 'Too many requests. Please try again later.');
const authLimiter = createLimiter(15 * 60 * 1000, 10,  'Too many login attempts. Please wait 15 minutes.');
const voteLimiter = createLimiter(60 * 1000,       30,  'Slow down — too many votes per minute.');

module.exports = { protect, optionalAuth, apiLimiter, authLimiter, voteLimiter };
