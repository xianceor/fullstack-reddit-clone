/**
 * Custom operational error class.
 * Distinguishes between programmer errors and expected operational errors.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true; // Mark as safe-to-expose error

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wraps async route handlers to forward errors to Express error middleware.
 * Eliminates repetitive try/catch blocks in controllers.
 * @param {Function} fn - Async route handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, asyncHandler };
