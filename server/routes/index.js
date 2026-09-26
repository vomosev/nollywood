'use strict';

const express = require('express');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const moviesRoutes = require('./movies.routes');
const reviewsRoutes = require('./reviews.routes');
const watchlistRoutes = require('./watchlist.routes');

const router = express.Router();

// Health checks (no /api prefix so probes can hit /health directly)
router.use('/', healthRoutes);

// Authentication
router.use('/api/auth', authRoutes);

// Reviews are nested under /api/movies/:movieId/reviews — mount before the
// movies router so the more specific review paths are matched first.
router.use('/api/movies', reviewsRoutes);

// Movie catalogue
router.use('/api/movies', moviesRoutes);

// Watchlist + watch history (/api/watchlist, /api/history)
router.use('/api', watchlistRoutes);

// Simple API index so GET /api returns something useful instead of a 404.
router.get('/api', (req, res) => {
  res.json({
    name: 'Nollywood API',
    status: 'ok',
    endpoints: {
      health: '/health',
      healthDb: '/health/db',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        session: 'GET /api/auth/session'
      },
      movies: {
        list: 'GET /api/movies',
        filters: 'GET /api/movies/filters',
        detail: 'GET /api/movies/:idOrSlug',
        reviews: 'GET /api/movies/:movieId/reviews',
        createReview: 'POST /api/movies/:movieId/reviews'
      },
      watchlist: {
        list: 'GET /api/watchlist',
        add: 'POST /api/watchlist',
        remove: 'DELETE /api/watchlist/:movieId'
      },
      history: {
        list: 'GET /api/history',
        save: 'POST /api/history'
      }
    }
  });
});

module.exports = router;