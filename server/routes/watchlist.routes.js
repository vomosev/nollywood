'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  listWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  recordProgress,
  listHistory,
} = require('../controllers/watchlistController');

const router = express.Router();

router.get('/watchlist', requireAuth, listWatchlist);
router.post('/watchlist', requireAuth, addToWatchlist);
router.delete('/watchlist/:movieId', requireAuth, removeFromWatchlist);

router.get('/history', requireAuth, listHistory);
router.post('/history', requireAuth, recordProgress);

module.exports = router;