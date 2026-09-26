// lib/api.js
// Browser-side API client for the Nollywood platform.
// Nothing in this module executes network calls at import time.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nollywood-api.arx-app.com:50109';

export class ApiError extends Error {
  constructor({ status = 0, message = 'Request failed', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path, params) {
  const base = String(API_BASE_URL).replace(/\/+$/, '');
  const suffix = String(path || '').startsWith('/') ? path : `/${path}`;
  let url = `${base}${suffix}`;

  if (params && typeof params === 'object') {
    const search = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (value === undefined || value === null || value === '') return;
      if (typeof value === 'boolean') {
        search.append(key, value ? 'true' : 'false');
        return;
      }
      search.append(key, String(value));
    });
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }

  return url;
}

async function parseBody(response) {
  const contentType = response.headers && response.headers.get
    ? response.headers.get('content-type') || ''
    : '';

  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      return { message: text };
    }
  } catch (err) {
    return null;
  }
}

/**
 * Core request helper. Always includes credentials so the session cookie
 * is sent cross-subdomain, and normalises errors into ApiError.
 */
export async function request(path, options = {}) {
  const { params, body, method, headers, signal, ...rest } = options || {};

  const finalHeaders = { Accept: 'application/json', ...(headers || {}) };
  let payload;

  if (body !== undefined && body !== null) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      payload = body;
    } else {
      finalHeaders['Content-Type'] = 'application/json';
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  const url = buildUrl(path, params);

  let response;
  try {
    response = await fetch(url, {
      method: method || (payload ? 'POST' : 'GET'),
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store',
      headers: finalHeaders,
      ...(payload !== undefined ? { body: payload } : {}),
      ...(signal ? { signal } : {}),
      ...rest,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new ApiError({ status: 0, message: 'Request cancelled' });
    }
    throw new ApiError({
      status: 0,
      message: 'Unable to reach the Nollywood API. Please check your connection and try again.',
    });
  }

  const data = await parseBody(response);

  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError({
      status: response.status,
      message,
      details: (data && data.details) || null,
    });
  }

  return data;
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export function getHealth() {
  return request('/health');
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export function signup(name, email, password) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: { name, email, password },
  });
}

export function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function getSession() {
  return request('/api/auth/session');
}

/* ------------------------------------------------------------------ */
/* Movies                                                              */
/* ------------------------------------------------------------------ */

export function getMovies(params = {}) {
  return request('/api/movies', { params });
}

export function getMovie(idOrSlug) {
  return request(`/api/movies/${encodeURIComponent(idOrSlug)}`);
}

export function getFilterOptions() {
  return request('/api/movies/filters');
}

/* ------------------------------------------------------------------ */
/* Watchlist & history                                                 */
/* ------------------------------------------------------------------ */

export function getWatchlist() {
  return request('/api/watchlist');
}

export function addToWatchlist(movieId) {
  return request('/api/watchlist', {
    method: 'POST',
    body: { movieId },
  });
}

export function removeFromWatchlist(movieId) {
  return request(`/api/watchlist/${encodeURIComponent(movieId)}`, {
    method: 'DELETE',
  });
}

export function getWatchHistory() {
  return request('/api/history');
}

export function saveWatchProgress(movieId, seconds) {
  return request('/api/history', {
    method: 'POST',
    body: { movieId, seconds: Math.max(0, Math.floor(Number(seconds) || 0)) },
  });
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export function getReviews(movieId) {
  return request(`/api/movies/${encodeURIComponent(movieId)}/reviews`);
}

export function createReview(movieId, { rating, body } = {}) {
  return request(`/api/movies/${encodeURIComponent(movieId)}/reviews`, {
    method: 'POST',
    body: { rating, body },
  });
}

const api = {
  API_BASE_URL,
  ApiError,
  request,
  getHealth,
  signup,
  login,
  logout,
  getSession,
  getMovies,
  getMovie,
  getFilterOptions,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getReviews,
  createReview,
  getWatchHistory,
  saveWatchProgress,
};

export default api;