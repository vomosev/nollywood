/**
 * MySQL connection helper.
 *
 * Creates a single shared mysql2/promise connection pool for the whole API and
 * exposes a lightweight health check used by the /health/db route and at boot.
 */

require('dotenv').config();

const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nollywood',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  multipleStatements: false,
};

let pool;

try {
  pool = mysql.createPool(dbConfig);
} catch (err) {
  // Creating a pool should not throw under normal circumstances, but if the
  // configuration is invalid we log loudly and re-throw so the process fails fast.
  console.error('[db] Failed to create MySQL pool:', err.message);
  throw err;
}

/**
 * Acquire a connection, ping the server and release it again.
 * Never throws — resolves to true/false so callers can degrade gracefully.
 *
 * @returns {Promise<boolean>} true when the database is reachable.
 */
async function checkDatabaseConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    return true;
  } catch (err) {
    console.error('[db] Database connection check failed:', err.message);
    return false;
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseErr) {
        console.error('[db] Failed to release connection:', releaseErr.message);
      }
    }
  }
}

/**
 * Close the pool (used during graceful shutdown).
 * @returns {Promise<void>}
 */
async function closePool() {
  try {
    await pool.end();
  } catch (err) {
    console.error('[db] Error while closing MySQL pool:', err.message);
  }
}

module.exports = { pool, dbConfig, checkDatabaseConnection, closePool };