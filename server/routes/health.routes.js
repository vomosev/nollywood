'use strict';

const express = require('express');
const { checkDatabaseConnection } = require('../config/db');

const router = express.Router();

/**
 * GET /health
 * Lightweight liveness probe. Never touches the database so it stays fast
 * and always returns 200 while the process is up.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'nollywood-api',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/db
 * Readiness probe: verifies the MySQL pool can hand out a live connection.
 */
router.get('/health/db', async (req, res) => {
  try {
    const ok = await checkDatabaseConnection();
    if (!ok) {
      return res.status(503).json({
        status: 'degraded',
        database: false,
        timestamp: new Date().toISOString()
      });
    }
    return res.status(200).json({
      status: 'ok',
      database: true,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // Never throw from a health probe — report degraded instead.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[health] database check failed:', err && err.message);
    }
    return res.status(503).json({
      status: 'degraded',
      database: false,
      error: 'Database unreachable',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;