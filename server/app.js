require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const createSessionMiddleware = require('./config/session');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Required so secure cookies work behind a TLS-terminating proxy.
app.set('trust proxy', 1);
app.disable('x-powered-by');

const ALLOWED_ORIGIN_PATTERN = /^https:\/\/([a-z0-9-]+\.)*arx-app\.com(:\d+)?$/i;
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin / non-browser clients (curl, health checks) which send no Origin.
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGIN_PATTERN.test(origin) || LOCAL_ORIGIN_PATTERN.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// Sessions (MySQL-backed). If the store cannot be created we keep the API alive
// so that /health and public read endpoints still respond.
try {
  app.use(createSessionMiddleware());
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[nollywood] Failed to initialise session middleware:', err.message);
  app.use((req, res, next) => {
    if (!req.session) req.session = {};
    next();
  });
}

// Tiny request logger.
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(`[nollywood] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;