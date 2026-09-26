'use strict';

const { pool } = require('../config/db');
const { clampInt, sanitiseText, HttpError } = require('../utils/validate');

/**
 * Resolve the numeric movie id from a route param that may be an id or slug.
 */
async function resolveMovieId(idOrSlug) {
  const raw = String(idOrSlug == null ? '' : idOrSlug).trim();
  if (!raw) {
    throw new HttpError(400, 'A movie identifier is required');
  }

  if (/^\d+$/.test(raw)) {
    const [rows] = await pool.execute('SELECT id FROM movies WHERE id = ? LIMIT 1', [
      Number(raw),
    ]);
    if (rows.length) return rows[0].id;
  }

  const [slugRows] = await pool.execute('SELECT id FROM movies WHERE slug = ? LIMIT 1', [raw]);
  if (slugRows.length) return slugRows[0].id;

  throw new HttpError(404, 'Movie not found');
}

/**
 * GET /api/movies/:movieId/reviews
 */
async function listReviews(req, res, next) {
  try {
    const movieId = await resolveMovieId(req.params.movieId);

    const [rows] = await pool.execute(
      `SELECT r.id,
              r.movie_id,
              r.user_id,
              r.rating,
              r.body,
              r.created_at,
              u.name AS user_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
        WHERE r.movie_id = ?
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 100`,
      [movieId]
    );

    const count = rows.length;
    const average =
      count > 0
        ? Math.round((rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / count) * 10) /
          10
        : 0;

    const currentUserId = req.session && req.session.userId ? Number(req.session.userId) : null;
    const mine = currentUserId
      ? rows.find((row) => Number(row.user_id) === currentUserId) || null
      : null;

    return res.json({
      items: rows,
      total: count,
      average,
      mine,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/movies/:movieId/reviews  (requireAuth)
 * Creates or updates the signed-in user's review for the movie.
 */
async function upsertReview(req, res, next) {
  try {
    const userId = req.session && req.session.userId ? Number(req.session.userId) : null;
    if (!userId) {
      throw new HttpError(401, 'Authentication required');
    }

    const movieId = await resolveMovieId(req.params.movieId);

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rating = clampInt(body.rating, 1, 5, 0);
    if (!rating) {
      throw new HttpError(400, 'A rating between 1 and 5 is required');
    }

    const text = sanitiseText(body.body, 1000);
    if (!text) {
      throw new HttpError(400, 'Please write a short review');
    }

    await pool.execute(
      `INSERT INTO reviews (user_id, movie_id, rating, body, created_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), body = VALUES(body)`,
      [userId, movieId, rating, text]
    );

    const [rows] = await pool.execute(
      `SELECT r.id,
              r.movie_id,
              r.user_id,
              r.rating,
              r.body,
              r.created_at,
              u.name AS user_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
        WHERE r.user_id = ? AND r.movie_id = ?
        LIMIT 1`,
      [userId, movieId]
    );

    if (!rows.length) {
      throw new HttpError(500, 'Review could not be saved');
    }

    const [aggRows] = await pool.execute(
      `SELECT COUNT(*) AS total, AVG(rating) AS average
         FROM reviews
        WHERE movie_id = ?`,
      [movieId]
    );

    const agg = aggRows[0] || { total: 0, average: 0 };

    return res.status(201).json({
      review: rows[0],
      total: Number(agg.total || 0),
      average: agg.average ? Math.round(Number(agg.average) * 10) / 10 : 0,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listReviews,
  upsertReview,
  resolveMovieId,
};