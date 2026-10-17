import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_DATABASE = "civicfix";

function isTruthy(value) {
  return ["true", "1", "yes", "required", "on"].includes(
    String(value ?? "").toLowerCase()
  );
}

/**
 * Build the TLS configuration for the hosted provider.
 *
 * TLS verification is NEVER disabled. If a provider CA is supplied via
 * MYSQL_CA_PATH (or the repository default certs/ca.pem) it is pinned.
 */
function buildSslConfig() {
  if (!isTruthy(process.env.MYSQL_SSL)) return undefined;

  const ssl = { rejectUnauthorized: true };

  const caPath =
    process.env.MYSQL_CA_PATH ||
    path.resolve(__dirname, "../../certs/ca.pem");

  if (caPath && fs.existsSync(caPath)) {
    ssl.ca = fs.readFileSync(caPath);
  }

  return ssl;
}

function baseConfig() {
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    multipleStatements: false,
    charset: "utf8mb4",
    // Store and read all timestamps in UTC to avoid implicit shifts.
    timezone: "Z",
    // Return DECIMAL columns (lat/lng, ai confidence) as JS numbers so the
    // API shape matches the previous MongoDB doubles.
    decimalNumbers: true,
    connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT || 20000),
    ssl: buildSslConfig(),
  };
}

let pool = null;

/**
 * Get (lazily create) the shared connection pool.
 */
export function getPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    ...baseConfig(),
    database: process.env.MYSQL_DATABASE || DEFAULT_DATABASE,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
    queueLimit: 0,
    enableKeepAlive: true,
  });

  return pool;
}

/**
 * Create a standalone connection (used by tooling such as schema setup where a
 * pool is unnecessary or a database may not exist yet).
 *
 * Pass `{ database: null }` to connect without selecting a schema.
 */
export async function createConnection(overrides = {}) {
  const { database, ...rest } = overrides;
  const config = { ...baseConfig(), ...rest };
  const selected =
    database === null
      ? null
      : database ?? process.env.MYSQL_DATABASE ?? DEFAULT_DATABASE;
  if (selected) config.database = selected;
  return mysql.createConnection(config);
}

/**
 * Execute a parameterized statement (prepared statement) on the pool.
 */
export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

/**
 * Execute a parameterized statement on either an explicit transaction
 * connection or the shared pool. Used by repositories so the same query code
 * works inside and outside transactions.
 */
export async function exec(connection, sql, params = []) {
  const target = connection || getPool();
  const [rows] = await target.execute(sql, params);
  return rows;
}

/**
 * MySQL error codes that indicate a transient lock conflict where retrying the
 * whole transaction is safe and expected (e.g. concurrent upvotes on the same
 * complaint updating its counters).
 */
function isRetryableTransactionError(error) {
  return (
    error?.errno === 1213 || // ER_LOCK_DEADLOCK
    error?.errno === 1205 || // ER_LOCK_WAIT_TIMEOUT
    error?.code === "ER_LOCK_DEADLOCK" ||
    error?.code === "ER_LOCK_WAIT_TIMEOUT"
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn(connection)` inside a transaction, committing on success and rolling
 * back on any error. The connection is always released.
 *
 * Transient deadlock/lock-timeout failures are retried a few times with a
 * short backoff so that concurrent counter updates converge instead of
 * surfacing spurious 500s. Any other error (including ApiError thrown by the
 * caller) propagates immediately.
 */
export async function withTransaction(fn, { retries = 5 } = {}) {
  let attempt = 0;

  for (;;) {
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      const result = await fn(connection);
      await connection.commit();
      connection.release();
      return result;
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // rollback failures must not mask the original error
      }
      connection.release();

      if (isRetryableTransactionError(error) && attempt < retries) {
        attempt += 1;
        await sleep(20 * attempt);
        continue;
      }
      throw error;
    }
  }
}

/**
 * Lightweight connectivity check with a clear failure mode.
 */
export async function verifyConnection() {
  const connection = await getPool().getConnection();
  try {
    const [[row]] = await connection.query("SELECT 1 AS ok");
    return row.ok === 1;
  } finally {
    connection.release();
  }
}

export async function closePool() {
  if (!pool) return;
  const closing = pool;
  pool = null;
  await closing.end();
}

export { DEFAULT_DATABASE };