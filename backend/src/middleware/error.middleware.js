const logger = require('../config/logger');
const { sendError } = require('../utils/response.utils');

/**
 * Global error handler middleware
 * Must be registered LAST in express app
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message}`, { stack: err.stack, path: req.path, method: req.method });

  // Prisma errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return sendError(res, `${field} already exists`, 409);
  }
  if (err.code === 'P2025') {
    return sendError(res, 'Record not found', 404);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }

  // Validation errors from express-validator passed manually
  if (err.type === 'validation') {
    return sendError(res, 'Validation failed', 422, err.errors);
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return sendError(res, message, statusCode);
};

/**
 * 404 handler — must be BEFORE errorHandler
 */
const notFound = (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
};

module.exports = { errorHandler, notFound };
