/**
 * AppError - Custom error class for the application.
 *
 * Wraps the built-in Error with an HTTP status code and a short error code
 * string so the global error handler can tell the difference between:
 *   - Operational errors (bad user input, missing resource) - shown to client.
 *   - Programmer bugs (unexpected crashes) - logged, hidden from client.
 */
export class AppError extends Error {
  /**
   * @param {string} message        Human-readable description of the error.
   * @param {number} statusCode     HTTP status to return (400, 404, 500, etc.).
   * @param {string} code           Short machine-readable error key.
   * @param {boolean} isOperational True for expected domain errors; false for bugs.
   */
  constructor(message, statusCode = 500, code = 'internal_error', isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Quick factory shortcuts ──────────────────────────────────────────────────

/** 400 – missing or invalid request data */
AppError.invalid = (message, code = 'validation_error') =>
  new AppError(message, 400, code);

/** 401 – no valid auth token */
AppError.noAuth = (message = 'Authentication required') =>
  new AppError(message, 401, 'unauthorized');

/** 403 – authenticated but not allowed */
AppError.forbidden = (message = 'Access denied') =>
  new AppError(message, 403, 'forbidden');

/** 404 – resource does not exist */
AppError.notFound = (resource = 'Resource') =>
  new AppError(`${resource} not found`, 404, 'not_found');

/** 429 – client is hitting the API too fast */
AppError.rateLimited = (message = 'Rate limit exceeded. Please try again shortly.') =>
  new AppError(message, 429, 'rate_limited');

/** 500 – AI pipeline call failed */
AppError.aiFailed = (details) =>
  new AppError(`AI generation failed: ${details}`, 500, 'generation_failed');

export default AppError;
