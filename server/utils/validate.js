'use strict';

/**
 * Small dependency-free validation helpers shared by the Express controllers.
 */

class HttpError extends Error {
  constructor(status, message, details) {
    super(message || 'Request failed');
    this.name = 'HttpError';
    this.status = Number(status) || 500;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace?.(this, HttpError);
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/**
 * Returns true when the given value looks like a valid e-mail address.
 */
function isEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_PATTERN.test(trimmed);
}

/**
 * Returns an array of field names that are missing/blank on the given body.
 */
function requireFields(body, names) {
  const source = body && typeof body === 'object' ? body : {};
  const list = Array.isArray(names) ? names : [];
  const missing = [];

  for (const name of list) {
    const value = source[name];
    if (value === undefined || value === null) {
      missing.push(name);
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      missing.push(name);
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      missing.push(name);
    }
  }

  return missing;
}

/**
 * Parses value as an integer and clamps it between min and max.
 * Falls back to `fallback` (also clamped) when the value is not a number.
 */
function clampInt(value, min, max, fallback) {
  const lowerBound = Number.isFinite(Number(min)) ? Number(min) : Number.NEGATIVE_INFINITY;
  const upperBound = Number.isFinite(Number(max)) ? Number(max) : Number.POSITIVE_INFINITY;

  let parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    parsed = Number.parseInt(fallback, 10);
  }
  if (!Number.isFinite(parsed)) {
    parsed = Number.isFinite(lowerBound) ? lowerBound : 0;
  }

  if (parsed < lowerBound) parsed = lowerBound;
  if (parsed > upperBound) parsed = upperBound;

  return parsed;
}

/**
 * Trims a value, collapses control characters and truncates to maxLen.
 * Always returns a string (empty string for nullish input).
 */
function sanitiseText(value, maxLen) {
  if (value === undefined || value === null) return '';
  let text = String(value);
  // Strip null bytes and other control characters except newline/tab.
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  // Normalise Windows line endings and collapse excessive blank lines.
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  const limit = Number.parseInt(maxLen, 10);
  if (Number.isFinite(limit) && limit > 0 && text.length > limit) {
    text = text.slice(0, limit).trim();
  }

  return text;
}

/**
 * Convenience helper: throws a 400 HttpError listing missing fields.
 */
function assertFields(body, names) {
  const missing = requireFields(body, names);
  if (missing.length > 0) {
    throw new HttpError(400, `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`, {
      missing,
    });
  }
  return true;
}

module.exports = {
  HttpError,
  isEmail,
  requireFields,
  assertFields,
  clampInt,
  sanitiseText,
};