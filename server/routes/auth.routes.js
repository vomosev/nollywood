'use strict';

const express = require('express');
const { signup, login, logout, session } = require('../controllers/authController');
const { attachUser } = require('../middleware/auth');

const router = express.Router();

// Register a new viewer account
router.post('/signup', signup);

// Sign in with email + password
router.post('/login', login);

// Destroy the session (safe to call even when not signed in)
router.post('/logout', logout);

// Current session user (returns { user: null } when anonymous)
router.get('/session', attachUser, session);

module.exports = router;