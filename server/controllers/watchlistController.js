'use strict';

const { pool } = require('../config/db');
const { clampInt, HttpError } = require('../utils/validate');

/**
 * GET /api/watchlist
 * Returns the signed-in user's watchlist joined to the movies table.
 */
async function listWatchlist(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      throw new HttpError(401, 'Authentication required');
    }

    const [rows] = await pool.execute(
      `SELECT
         m.id,
         m.slug,
         m.title,
         m.synopsis,
         m.release_year,
         m.runtime_minutes,
         m.genre,
         m.language,
         m.rating_certificate,
         m.director,
         m.cast_list,
         m.poster_hue,
         m.stream_url,
         m.trailer_url,
         m.is_featured,
         w.created_at AS added_at
       FROM watchlist w
       INNER JOIN movies m ON m.id = w.movie_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );

    res.json({ items: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/watchlist  body { movieId }
 */
async function addToWatchlist(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      throw new HttpError(401, 'Authentication required');
    }

    const body = req.body || {};
    const movieId = clampInt(body.movieId, 1, Number.MAX_SAFE_INTEGER, 0);
    if (!movieId) {
      throw new HttpError(400, 'A valid movieId is required');
    }

    const [movies] = await pool.execute(
      'SELECT id FROM movies WHERE id = ? LIMIT 1',
      [movieId]
    );
    if (!movies.length) {
      throw new HttpError(404, 'Movie not found');
    }

    await pool.execute(
      'INSERT IGNORE INTO watchlist (user_id, movie_id) VALUES (?, ?)',
      [userId, movieId]
    );

    res.status(201).json({ ok: true, movieId });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/watchlist/:movieId
 */
async function removeFromWatchlist(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      throw new HttpError(401, 'Authentication required');
    }

    const movieId = clampInt(req.params.movieId, 1, Number.MAX_SAFE_INTEGER, 0);
    if (!movieId) {
      throw new HttpError(400, 'A valid movieId is required');
    }

    const [result] = await pool.execute(
      'DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?',
      [userId, movieId]
    );

    res.json({ ok: true, removed: result.affectedRows > 0 });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/history  body { movieId, seconds }
 * Upserts a watch_history row for the user/movie pair.
 */
async function recordProgress(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      throw new HttpError(401, 'Authentication required');
    }

    const body = req.body || {};
    const movieId = clampInt(body.movieId, 1, Number.MAX_SAFE_INTEGER, 0);
    if (!movieId) {
      throw new HttpError(400, 'A valid movieId is required');
    }
    const seconds = clampInt(body.seconds, 0, 86400, 0);

    const [movies] = await pool.execute(
      'SELECT id FROM movies WHERE id = ? LIMIT 1',
      [movieId]
    );
    if (!movies.length) {
      throw new HttpError(404, 'Movie not found');
    }

    const [existing] = await pool.execute(
      'SELECT id FROM watch_history WHERE user_id = ? AND movie_id = ? LIMIT 1',
      [userId, movieId]
    );

    if (existing.length) {
      await pool.execute(
        'UPDATE watch_history SET progress_seconds = ?, watched_at = NOW() WHERE id = ?',
        [seconds, existing[0].id]
      );
    } else {
      await pool.execute(
        'INSERT INTO watch_history (user_id, movie_id, progress_seconds, watched_at) VALUES (?, ?, ?, NOW())',
        [userId, movieId, seconds]
      );
    }

    res.json({ ok: true, movieId, progressSeconds: seconds });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/history
 * Most recent 25 watch history rows joined to movies.
 */
async function listHistory(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      throw new HttpError(401, 'Authentication required');
    }

    const [rows] = await pool.execute(
      `SELECT
         h.id,
         h.progress_seconds,
         h.watched_at,
         m.id AS movie_id,
         m.slug,
         m.title,
         m.genre,
         m.language,
         m.release_year,
         m.runtime_minutes,
         m.poster_hue
       FROM watch_history h
       INNER JOIN movies m ON m.id = h.movie_id
       WHERE h.user_id = ?
       ORDER BY h.watched_at DESC
       LIMIT 25`,
      [userId]
    );

    res.json({ items: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  recordProgress,
  listHistory,
};