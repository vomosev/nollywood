// lib/format.js
// Pure, dependency-free formatting helpers shared across the Nollywood UI.
// Every helper is defensive: bad input returns a sensible fallback instead of throwing.

/**
 * Format a runtime in minutes as "1h 48m" (or "48m" when under an hour).
 * @param {number|string|null|undefined} minutes
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatRuntime(minutes, fallback = '—') {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return fallback;
  const whole = Math.round(total);
  const hours = Math.floor(whole / 60);
  const mins = whole % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Safely coerce a value into a Date, returning null when invalid.
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
export function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format an ISO date string as "12 March 2024".
 * @param {string|number|Date|null|undefined} iso
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatDate(iso, fallback = '—') {
  const date = toDate(iso);
  if (!date) return fallback;
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()] || '';
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format an ISO date string as "12 March 2024, 19:05".
 * @param {string|number|Date|null|undefined} iso
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatDateTime(iso, fallback = '—') {
  const date = toDate(iso);
  if (!date) return fallback;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formatDate(date)}, ${hours}:${minutes}`;
}

/**
 * Extract a four-digit release year from a year number or a date value.
 * @param {number|string|Date|null|undefined} value
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatYear(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 1000 && numeric <= 9999) {
    return String(Math.trunc(numeric));
  }
  const date = toDate(value);
  if (date) return String(date.getFullYear());
  return fallback;
}

/**
 * Format an average rating as a single-decimal string, e.g. "4.3".
 * @param {number|string|null|undefined} avg
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatRating(avg, fallback = '—') {
  const value = Number(avg);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  const clamped = Math.min(Math.max(value, 0), 5);
  return clamped.toFixed(1);
}

/**
 * Pluralise a noun against a count: pluralise(1, 'review') -> "1 review".
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 * @param {boolean} [includeCount=true]
 * @returns {string}
 */
export function pluralise(count, singular, plural, includeCount = true) {
  const n = Number(count);
  const safeCount = Number.isFinite(n) ? n : 0;
  const word = Math.abs(safeCount) === 1 ? singular : plural || `${singular}s`;
  return includeCount ? `${safeCount} ${word}` : word;
}

// Convenience alias for American spelling.
export const pluralize = pluralise;

/**
 * Truncate text to a maximum length, appending an ellipsis when cut.
 * @param {string} text
 * @param {number} [max=140]
 * @param {string} [suffix='…']
 * @returns {string}
 */
export function truncate(text, max = 140, suffix = '…') {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  const limit = Number.isFinite(Number(max)) && Number(max) > 0 ? Math.trunc(Number(max)) : 140;
  if (trimmed.length <= limit) return trimmed;
  const sliced = trimmed.slice(0, limit);
  const lastSpace = sliced.lastIndexOf(' ');
  const base = lastSpace > limit * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${base.replace(/[\s,;:.-]+$/, '')}${suffix}`;
}

/**
 * Normalise an arbitrary hue value into the 0-359 range.
 * @param {number|string|null|undefined} hue
 * @returns {number}
 */
export function normaliseHue(hue) {
  const value = Number(hue);
  if (!Number.isFinite(value)) return 38; // warm Nollywood amber default
  const wrapped = Math.trunc(value) % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/**
 * Build the deterministic CSS gradient used for movie posters.
 * Values are plain hsl() so they blend with the token palette without hardcoding hex.
 * @param {number|string|null|undefined} hue
 * @returns {string} a CSS background value
 */
export function hueToGradient(hue) {
  const base = normaliseHue(hue);
  const second = (base + 28) % 360;
  const third = (base + 310) % 360;
  return [
    `linear-gradient(160deg,`,
    ` hsl(${base} 62% 26%) 0%,`,
    ` hsl(${second} 58% 18%) 46%,`,
    ` hsl(${third} 44% 11%) 100%)`,
  ].join('');
}

/**
 * A matching accent colour for text/motifs drawn on top of a poster gradient.
 * @param {number|string|null|undefined} hue
 * @returns {string} an hsl() colour string
 */
export function hueToAccent(hue) {
  const base = normaliseHue(hue);
  return `hsl(${(base + 14) % 360} 82% 64%)`;
}

/**
 * Turn a raw progress value (seconds) into "12:05" / "1:12:05".
 * @param {number|string|null|undefined} seconds
 * @param {string} [fallback='0:00']
 * @returns {string}
 */
export function formatProgress(seconds, fallback = '0:00') {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return fallback;
  const whole = Math.floor(total);
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`;
}

/**
 * Derive initials from a person's name, e.g. "Chika Okoye" -> "CO".
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
  if (typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Split a comma-separated cast list into a trimmed array.
 * @param {string|string[]|null|undefined} castList
 * @returns {string[]}
 */
export function parseCastList(castList) {
  if (Array.isArray(castList)) return castList.map((n) => String(n).trim()).filter(Boolean);
  if (typeof castList !== 'string') return [];
  return castList
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
}

const format = {
  formatRuntime,
  formatDate,
  formatDateTime,
  formatYear,
  formatRating,
  formatProgress,
  pluralise,
  pluralize,
  truncate,
  hueToGradient,
  hueToAccent,
  normaliseHue,
  toDate,
  initials,
  parseCastList,
};

export default format;