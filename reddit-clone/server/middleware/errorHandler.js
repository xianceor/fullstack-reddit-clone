const logger = require('../utils/logger');

/**
 * Handles Mongoose CastError (invalid ObjectId).
 */
const handleCastError = (err) => ({
  statusCode: 400,
  message: `Invalid ${err.path}: ${err.value}`,
});

/**
 * Handles Mongoose duplicate key errors (E11000).
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return { statusCode: 409, message: `${field} already exists` };
};

/**
 * Handles Mongoose validation errors.
 */
const handleValidationError = (err) => ({
  statusCode: 422,
  message: Object.values(err.errors)
    .map((e) => e.message)
    .join('. '),
});

/**
 * Central Express error handler.
 * Distinguishes operational errors (safe to expose) from programmer errors.
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, isOperational } = err;

  // Transform known Mongoose/driver errors into operational ones
  if (err.name === 'CastError')          ({ statusCode, message } = handleCastError(err));
  if (err.code === 11000)                ({ statusCode, message } = handleDuplicateKeyError(err));
  if (err.name === 'ValidationError')    ({ statusCode, message } = handleValidationError(err));
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token expired'; }

  // Log server errors with full stack; operational errors at warn level
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, { stack: err.stack });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} [${statusCode}] — ${message}`);
  }

  // Never leak internal error details to the client in production
  const clientMessage =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : message;

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message: clientMessage,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500
      ? { stack: err.stack }
      : {}),
  });
};

module.exports = errorHandler;
