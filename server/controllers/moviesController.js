'use strict';

const { pool } = require('../config/db');
const { clampInt, sanitiseText, HttpError } = require('../utils/validate');

const SORT_MAP = {
  newest: 'm.created_at DESC, m.id DESC',
  title: 'm.title ASC',
  year: 'm.release_year DESC, m.title ASC',
  oldest: 'm.created_at ASC, m.id ASC',
};

const BASE_SELECT = `
  SELECT
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
    m.created_at,
    COALESCE(r.avg_rating, 0) AS avg_rating,
    COALESCE(r.review_count, 0) AS review_count
  FROM movies m
  LEFT JOIN (
    SELECT movie_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
    FROM reviews
    GROUP BY movie_id
  ) r ON r.movie_id = m.id
`;

function shapeMovie(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis,
    release_year: row.release_year,
    runtime_minutes: row.runtime_minutes,
    genre: row.genre,
    language: row.language,
    rating_certificate: row.rating_certificate,
    director: row.director,
    cast_list: row.cast_list,
    poster_hue: row.poster_hue,
    stream_url: row.stream_url,
    trailer_url: row.trailer_url,
    is_featured: Number(row.is_featured) === 1,
    created_at: row.created_at,
    avg_rating: row.avg_rating === null ? 0 : Number(row.avg_rating),
    review_count: Number(row.review_count || 0),
  };
}

function buildFilters(query) {
  const where = [];
  const params = [];

  const q = sanitiseText(query.q || query.search || '', 120);
  if (q) {
    where.push('(m.title LIKE ? OR m.synopsis LIKE ? OR m.director LIKE ? OR m.cast_list LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const genre = sanitiseText(query.genre || '', 60);
  if (genre && genre.toLowerCase() !== 'all') {
    where.push('m.genre = ?');
    params.push(genre);
  }

  const language = sanitiseText(query.language || '', 60);
  if (language && language.toLowerCase() !== 'all') {
    where.push('m.language = ?');
    params.push(language);
  }

  const rawYear = query.year;
  if (rawYear !== undefined && rawYear !== null && String(rawYear).trim() !== '' && String(rawYear).toLowerCase() !== 'all') {
    const year = clampInt(rawYear, 1900, 2100, 0);
    if (year) {
      where.push('m.release_year = ?');
      params.push(year);
    }
  }

  const featured = query.featured;
  if (featured === 'true' || featured === '1' || featured === true || featured === 1) {
    where.push('m.is_featured = 1');
  }

  return { where, params };
}

async function listMovies(req, res, next) {
  try {
    const query = req.query || {};
    const { where, params } = buildFilters(query);

    const limit = clampInt(query.limit, 1, 48, 12);
    const offset = clampInt(query.offset, 0, 100000, 0);

    const sortKey = sanitiseText(query.sort || 'newest', 20).toLowerCase();
    const orderBy = SORT_MAP[sortKey] || SORT_MAP.newest;

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM movies m ${whereSql}`,
      params
    );
    const total = Number((countRows[0] && countRows[0].total) || 0);

    const sql = `${BASE_SELECT} ${whereSql} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await pool.execute(sql, params);

    res.json({
      items: rows.map(shapeMovie),
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
}

async function getMovie(req, res, next) {
  try {
    const raw = String(req.params.idOrSlug || req.params.id || '').trim();
    if (!raw) {
      throw new HttpError(400, 'A movie id or slug is required');
    }

    const isNumeric = /^\d+$/.test(raw);
    const sql = isNumeric
      ? `${BASE_SELECT} WHERE m.id = ? LIMIT 1`
      : `${BASE_SELECT} WHERE m.slug = ? LIMIT 1`;
    const param = isNumeric ? Number(raw) : sanitiseText(raw, 191);

    const [rows] = await pool.execute(sql, [param]);
    if (!rows.length) {
      throw new HttpError(404, 'Movie not found');
    }

    const movie = shapeMovie(rows[0]);

    let inWatchlist = false;
    const userId = req.session && req.session.userId ? req.session.userId : null;
    if (userId) {
      try {
        const [wl] = await pool.execute(
          'SELECT id FROM watchlist WHERE user_id = ? AND movie_id = ? LIMIT 1',
          [userId, movie.id]
        );
        inWatchlist = wl.length > 0;
      } catch (e) {
        inWatchlist = false;
      }
    }

    res.json({ movie: { ...movie, in_watchlist: inWatchlist } });
  } catch (err) {
    next(err);
  }
}

async function getFilterOptions(req, res, next) {
  try {
    const [genreRows] = await pool.execute(
      "SELECT DISTINCT genre FROM movies WHERE genre IS NOT NULL AND genre <> '' ORDER BY genre ASC"
    );
    const [yearRows] = await pool.execute(
      'SELECT DISTINCT release_year FROM movies WHERE release_year IS NOT NULL ORDER BY release_year DESC'
    );
    const [languageRows] = await pool.execute(
      "SELECT DISTINCT language FROM movies WHERE language IS NOT NULL AND language <> '' ORDER BY language ASC"
    );

    res.json({
      genres: genreRows.map((r) => r.genre),
      years: yearRows.map((r) => Number(r.release_year)),
      languages: languageRows.map((r) => r.language),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMovies,
  getMovie,
  getFilterOptions,
};