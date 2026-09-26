'use strict';

const express = require('express');
const { listReviews, upsertReview } = require('../controllers/reviewsController');
const { requireAuth, attachUser } = require('../middleware/auth');

const router = express.Router();

// GET /api/movies/:movieId/reviews — public list of reviews for a movie
router.get('/:movieId/reviews', attachUser, listReviews);

// POST /api/movies/:movieId/reviews — create or update the signed-in user's review
router.post('/:movieId/reviews', requireAuth, attachUser, upsertReview);

module.exports = router;