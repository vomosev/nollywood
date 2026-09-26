require('dotenv/config');

const fs = require('fs');
const http = require('http');
const https = require('https');

const app = require('./app');
const { pool, checkDatabaseConnection } = require('./config/db');

const PORT = parseInt(process.env.PORT, 10) || 50109;
const HOST = '0.0.0.0';
const PUBLIC_URL = 'https://nollywood-api.arx-app.com:50109';

const SSL_ENABLED = String(process.env.SSL_ENABLED || '').toLowerCase() === 'true';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '/home/arx-app/backends/certs/certificate.crt';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '/home/arx-app/backends/certs/private.key';
const SSL_CA_PATH = process.env.SSL_CA_PATH || '';

function readSslOptions() {
  if (!SSL_ENABLED) return null;

  try {
    if (!fs.existsSync(SSL_CERT_PATH) || !fs.existsSync(SSL_KEY_PATH)) {
      console.warn(
        `[nollywood-api] SSL_ENABLED=true but certificate or key not found (cert: ${SSL_CERT_PATH}, key: ${SSL_KEY_PATH}). Falling back to HTTP.`
      );
      return null;
    }

    const options = {
      cert: fs.readFileSync(SSL_CERT_PATH),
      key: fs.readFileSync(SSL_KEY_PATH),
    };

    if (SSL_CA_PATH && fs.existsSync(SSL_CA_PATH)) {
      options.ca = fs.readFileSync(SSL_CA_PATH);
    }

    return options;
  } catch (err) {
    console.warn('[nollywood-api] Failed to read TLS material, falling back to HTTP:', err.message);
    return null;
  }
}

const sslOptions = readSslOptions();
const server = sslOptions ? https.createServer(sslOptions, app) : http.createServer(app);

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[nollywood-api] Port ${PORT} is already in use. Shutting down.`);
  } else {
    console.error('[nollywood-api] Server error:', err && err.message ? err.message : err);
  }
  process.exit(1);
});

server.listen(PORT, HOST, async () => {
  const scheme = sslOptions ? 'https' : 'http';
  console.log(`[nollywood-api] Listening on ${scheme}://${HOST}:${PORT}`);
  console.log(`[nollywood-api] Public API URL: ${PUBLIC_URL}`);
  console.log(`[nollywood-api] Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    const ok = await checkDatabaseConnection();
    if (ok) {
      console.log(`[nollywood-api] Database connection OK (${process.env.DB_NAME || 'unknown database'})`);
    } else {
      console.warn('[nollywood-api] WARNING: database unreachable. API is up but data endpoints will fail.');
    }
  } catch (err) {
    console.warn(
      '[nollywood-api] WARNING: database connection check failed:',
      err && err.message ? err.message : err
    );
  }
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[nollywood-api] Received ${signal}. Closing server...`);

  const forceExit = setTimeout(() => {
    console.error('[nollywood-api] Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);

  if (typeof forceExit.unref === 'function') forceExit.unref();

  server.close(async () => {
    try {
      if (pool && typeof pool.end === 'function') {
        await pool.end();
        console.log('[nollywood-api] Database pool closed.');
      }
    } catch (err) {
      console.warn('[nollywood-api] Error closing database pool:', err && err.message ? err.message : err);
    }

    clearTimeout(forceExit);
    console.log('[nollywood-api] Shutdown complete.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[nollywood-api] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[nollywood-api] Uncaught exception:', err && err.stack ? err.stack : err);
});

module.exports = server;