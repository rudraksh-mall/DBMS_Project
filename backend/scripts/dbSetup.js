/**
 * Apply database/schema.sql to the configured MySQL server.
 *
 * Usage:
 *   node --env-file=.env scripts/dbSetup.js
 *
 * - Creates the target database if it does not exist.
 * - Runs every statement in schema.sql (which itself uses
 *   CREATE TABLE IF NOT EXISTS, so re-running is safe and non-destructive).
 * - Never seeds data and never drops existing objects.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "../src/db/mysql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../../database/schema.sql");

/**
 * Split a SQL script into statements on top-level semicolons, ignoring
 * semicolons inside string literals, quoted identifiers and comments.
 */
export function splitSql(sql) {
  const statements = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        current += ch;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === "-" && next === "-") {
        inLineComment = true;
        i++;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
    }

    if (ch === "'" && !inDouble && !inBacktick) {
      inSingle = !inSingle;
      current += ch;
      continue;
    }
    if (ch === '"' && !inSingle && !inBacktick) {
      inDouble = !inDouble;
      current += ch;
      continue;
    }
    if (ch === "`" && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      current += ch;
      continue;
    }

    if (ch === ";" && !inSingle && !inDouble && !inBacktick) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

async function main() {
  const database = process.env.MYSQL_DATABASE || "civicfix";

  const admin = await createConnection({ database: null });
  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
    console.log(`Database ready: ${database}`);
  } finally {
    await admin.end();
  }

  const conn = await createConnection();
  try {
    const tables = await applySchema(conn);
    console.log("Tables: " + tables.join(", "));
  } finally {
    await conn.end();
  }
}

/**
 * Apply schema.sql using an existing connection. Returns the list of tables.
 * Exported so tests can initialize an isolated schema.
 */
export async function applySchema(conn) {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.sql not found at ${schemaPath}`);
  }
  const sql = fs.readFileSync(schemaPath, "utf8");
  const statements = splitSql(sql);
  for (const statement of statements) {
    await conn.query(statement);
  }
  console.log(`Applied ${statements.length} schema statements.`);
  const [tables] = await conn.query("SHOW TABLES");
  return tables.map((r) => Object.values(r)[0]);
}

// Only execute when run directly (not when imported by tests/tooling).
const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((error) => {
    console.error("Schema setup failed:", error.message);
    process.exit(1);
  });
}