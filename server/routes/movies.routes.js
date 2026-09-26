'use strict';

const express = require('express');
const { listMovies, getMovie, getFilterOptions } = require('../controllers/moviesController');
const { attachUser } = require('../middleware/auth');

const router = express.Router();

// Attach the signed-in user (when a session exists) so responses can include
// personalised flags such as `in_watchlist` without requiring authentication.
router.use(attachUser);

// GET /api/movies — catalogue listing with q, genre, year, language, featured,
// sort, limit and offset query parameters.
router.get('/', listMovies);

// GET /api/movies/filters — distinct genres, years and languages for the FilterBar.
router.get('/filters', getFilterOptions);

// GET /api/movies/:idOrSlug — single movie detail by numeric id or slug.
router.get('/:idOrSlug', getMovie);

module.exports = router;