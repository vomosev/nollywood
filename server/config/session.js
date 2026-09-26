/**
 * server/config/session.js
 *
 * Configured express-session middleware backed by express-mysql-session.
 *
 * IMPORTANT deployment notes:
 *  - The API is served from https://nollywood-api.arx-app.com:50109 while the
 *    frontend lives at https://nollywood.arx-app.com. For the session cookie to
 *    be shared between those two subdomains the cookie must be issued with
 *    `domain: '.arx-app.com'`, `sameSite: 'none'` and `secure: true`.
 *  - Because the cookie is marked `secure`, Express must trust the proxy that
 *    terminates TLS (or TLS must be terminated in-process via SSL_ENABLED).
 *    server/app.js therefore calls `app.set('trust proxy', 1)` BEFORE this
 *    middleware is mounted — without it, express-session will refuse to set a
 *    secure cookie over what it believes is a plain HTTP connection.
 *  - The session store writes into the `sessions` table created by schema.sql
 *    (session_id VARCHAR(128) PK, expires INT UNSIGNED, data MEDIUMTEXT).
 */

'use strict';

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const { pool } = require('./db');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

let cachedStore = null;

/**
 * Build (once) the MySQL-backed session store, reusing the application's
 * mysql2/promise pool so we do not open a second connection pool.
 */
function getStore() {
  if (cachedStore) return cachedStore;

  try {
    cachedStore = new MySQLStore(
      {
        createDatabaseTable: true,
        clearExpired: true,
        checkExpirationInterval: 15 * 60 * 1000, // every 15 minutes
        expiration: SEVEN_DAYS_MS,
        schema: {
          tableName: 'sessions',
          columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data',
          },
        },
      },
      // express-mysql-session accepts a mysql2 pool as its second argument.
      pool
    );

    cachedStore.on('error', (err) => {
      // Never crash the API because the session store hiccuped.
      console.error('[session] store error:', err && err.message ? err.message : err);
    });
  } catch (err) {
    console.error(
      '[session] failed to initialise MySQL session store, falling back to in-memory store:',
      err && err.message ? err.message : err
    );
    cachedStore = null;
  }

  return cachedStore;
}

/**
 * Factory returning the configured express-session middleware.
 * Usage: app.use(createSessionMiddleware());
 */
function createSessionMiddleware() {
  const secret = process.env.SESSION_SECRET || 'nollywood-development-session-secret';

  if (!process.env.SESSION_SECRET) {
    console.warn(
      '[session] SESSION_SECRET is not set — using an insecure development default. ' +
        'Set SESSION_SECRET in your environment for production.'
    );
  }

  const options = {
    name: 'nollywood.sid',
    secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.SESSION_COOKIE_DOMAIN || '.arx-app.com',
      path: '/',
      maxAge: SEVEN_DAYS_MS,
    },
  };

  const store = getStore();
  if (store) {
    options.store = store;
  }

  return session(options);
}

/**
 * Gracefully close the session store (used during shutdown).
 */
async function closeSessionStore() {
  if (!cachedStore) return;
  await new Promise((resolve) => {
    try {
      // `false` => do not close the underlying pool; server/index.js owns it.
      cachedStore.close(false, () => resolve());
    } catch (err) {
      resolve();
    }
  });
  cachedStore = null;
}

module.exports = createSessionMiddleware;
module.exports.createSessionMiddleware = createSessionMiddleware;
module.exports.closeSessionStore = closeSessionStore;
module.exports.SEVEN_DAYS_MS = SEVEN_DAYS_MS;