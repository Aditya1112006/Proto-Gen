/**
 * Global Express error handler.
 *
 * Catches all errors forwarded via next(err) and returns a consistent JSON shape.
 *
 * Distinguishes two cases:
 *   - AppError (isOperational = true): expected domain failures (bad input,
 *     missing resource). We surface the message and code to the client.
 *   - Everything else: unexpected crashes. We log the full stack but return
 *     a generic 500 so internal details are never leaked.
 */

import { AppError } from '../errors/AppError.js';

export function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ErrorHandler] ${err.name || 'Error'}: ${err.message}`);
    if (!err.isOperational) console.error(err.stack);
  }

  // AppError – safe to send message to the client.
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, details: err.code },
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors).map(e => e.message).join('; ');
    return res.status(400).json({
      success: false,
      error: { message: `Validation failed: ${msg}`, details: 'validation_error' },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid authentication token.';
    return res.status(401).json({
      success: false,
      error: { message: msg, details: 'unauthorized' },
    });
  }

  // Generic fallback – never leak internal details.
  return res.status(500).json({
    success: false,
    error: { message: 'An unexpected server error occurred. Please try again.', details: 'internal_error' },
  });
}
