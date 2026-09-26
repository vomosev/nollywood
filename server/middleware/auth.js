'use strict';

const { pool } = require('../config/db');

/**
 * Guards a route so only signed-in sessions may continue.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
}

/**
 * Guards a route so only admin sessions may continue.
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  return next();
}

/**
 * Best-effort user loader. Never fails the request: if the session is missing
 * or the lookup errors, req.user is simply left as null so public routes still
 * work when the database is briefly unavailable.
 */
async function attachUser(req, res, next) {
  req.user = null;

  if (!req.session || !req.session.userId) {
    return next();
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      req.user = rows[0];
      req.session.role = rows[0].role;
    } else {
      // Session points at a user that no longer exists — clear it quietly.
      if (typeof req.session.destroy === 'function') {
        req.session.destroy(() => {});
      }
    }
  } catch (err) {
    console.error('[auth] attachUser failed:', err.message);
  }

  return next();
}

module.exports = { requireAuth, requireAdmin, attachUser };