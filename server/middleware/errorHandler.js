'use strict';

/**
 * 404 handler — mounted after all routes.
 */
function notFound(req, res, next) {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl || req.url,
  });
}

/**
 * Maps a thrown error onto an HTTP status code.
 */
function resolveStatus(err) {
  if (!err) return 500;

  const candidate =
    err.status || err.statusCode || (err.output && err.output.statusCode) || null;

  if (Number.isInteger(candidate) && candidate >= 400 && candidate <= 599) {
    return candidate;
  }

  // Known error names / codes from validation, auth and MySQL layers.
  switch (err.name) {
    case 'ValidationError':
    case 'HttpError':
      return err.status || 400;
    case 'UnauthorizedError':
      return 401;
    case 'ForbiddenError':
      return 403;
    case 'NotFoundError':
      return 404;
    case 'ConflictError':
      return 409;
    default:
      break;
  }

  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return 409;
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return 400;
    case 'ER_BAD_FIELD_ERROR':
    case 'ER_PARSE_ERROR':
      return 500;
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ETIMEDOUT':
      return 503;
    default:
      return 500;
  }
}

function defaultMessageFor(status) {
  switch (status) {
    case 400:
      return 'Bad request';
    case 401:
      return 'Authentication required';
    case 403:
      return 'You do not have permission to do that';
    case 404:
      return 'Resource not found';
    case 409:
      return 'That record already exists';
    case 413:
      return 'Payload too large';
    case 429:
      return 'Too many requests';
    case 503:
      return 'Service temporarily unavailable';
    default:
      return 'Internal server error';
  }
}

/**
 * Central error handler. Must keep the 4-argument signature so Express
 * recognises it as an error-handling middleware.
 */
/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const status = resolveStatus(err);

  // Malformed JSON bodies from express.json()
  const isJsonSyntaxError =
    err instanceof SyntaxError && 'body' in err && status === 400;

  let message =
    (err && typeof err.message === 'string' && err.message.trim()) ||
    defaultMessageFor(status);

  if (isJsonSyntaxError) {
    message = 'Invalid JSON payload';
  }

  // Never leak internal details for unexpected server errors in production.
  if (isProduction && status >= 500) {
    message = defaultMessageFor(500);
  }

  const logPrefix = `[error] ${req.method || 'UNKNOWN'} ${req.originalUrl || req.url || ''} -> ${status}`;
  if (status >= 500) {
    console.error(logPrefix, err && err.stack ? err.stack : err);
  } else {
    console.warn(logPrefix, message);
  }

  if (res.headersSent) {
    return next(err);
  }

  const payload = { error: message };

  if (err && err.details) {
    payload.details = err.details;
  }
  if (err && Array.isArray(err.missing) && err.missing.length) {
    payload.details = { missing: err.missing };
  }
  if (!isProduction && err && err.stack) {
    payload.stack = err.stack.split('\n').slice(0, 8);
  }

  res.status(status).json(payload);
}
/* eslint-enable no-unused-vars */

module.exports = { notFound, errorHandler };