'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const {
  isEmail,
  requireFields,
  sanitiseText,
  HttpError,
} = require('../utils/validate');

const SALT_ROUNDS = 10;
const COOKIE_NAME = 'nollywood.sid';

function safeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.regenerate !== 'function') {
      resolve();
      return;
    }
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.save !== 'function') {
      resolve();
      return;
    }
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.destroy !== 'function') {
      resolve();
      return;
    }
    req.session.destroy((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function signup(req, res, next) {
  try {
    const body = req.body || {};
    const missing = requireFields(body, ['name', 'email', 'password']);
    if (missing.length) {
      throw new HttpError(400, `Missing required fields: ${missing.join(', ')}`);
    }

    const name = sanitiseText(body.name, 120);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (name.length < 2) {
      throw new HttpError(400, 'Please enter your full name (at least 2 characters).');
    }
    if (!isEmail(email)) {
      throw new HttpError(400, 'Please enter a valid email address.');
    }
    if (password.length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters long.');
    }
    if (password.length > 200) {
      throw new HttpError(400, 'Password is too long.');
    }

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (existing.length > 0) {
      throw new HttpError(409, 'An account with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    let insertResult;
    try {
      [insertResult] = await pool.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, passwordHash, 'viewer']
      );
    } catch (dbErr) {
      if (dbErr && dbErr.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'An account with that email already exists.');
      }
      throw dbErr;
    }

    const userId = insertResult.insertId;

    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    const user = safeUser(rows[0]);

    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.role = user.role;
    await saveSession(req);

    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const body = req.body || {};
    const missing = requireFields(body, ['email', 'password']);
    if (missing.length) {
      throw new HttpError(400, `Missing required fields: ${missing.join(', ')}`);
    }

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!isEmail(email)) {
      throw new HttpError(400, 'Please enter a valid email address.');
    }

    const [rows] = await pool.execute(
      'SELECT id, name, email, role, password_hash, created_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    const row = rows[0];
    if (!row) {
      throw new HttpError(401, 'Invalid email or password.');
    }

    const matches = await bcrypt.compare(password, row.password_hash || '');
    if (!matches) {
      throw new HttpError(401, 'Invalid email or password.');
    }

    const user = safeUser(row);

    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.role = user.role;
    await saveSession(req);

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    await destroySession(req);
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.SESSION_COOKIE_DOMAIN || '.arx-app.com',
      path: '/',
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function session(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      return res.json({ user: null });
    }

    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!rows.length) {
      await destroySession(req);
      return res.json({ user: null });
    }

    return res.json({ user: safeUser(rows[0]) });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  signup,
  login,
  logout,
  session,
};