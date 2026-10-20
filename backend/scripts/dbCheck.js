/**
 * Read-only diagnostics for the configured MySQL server.
 * Usage:
 *   node --env-file=.env scripts/dbCheck.js
 *   node --env-file=.env scripts/dbCheck.js --create-db
 *
 * Never prints credentials.
 */
import "dotenv/config";
import { createConnection } from "../src/db/mysql.js";

const createDb = process.argv.includes("--create-db");

const conn = await createConnection({ database: null });

const [[ver]] = await conn.query(
  "SELECT VERSION() AS v, @@version_comment AS c, @@default_storage_engine AS e, @@lower_case_table_names AS lctn"
);
console.log(`MySQL version : ${ver.v} (${ver.c})`);
console.log(`Storage engine: ${ver.e}`);
console.log(`lower_case_table_names: ${ver.lctn}`);

const [grants] = await conn.query("SHOW GRANTS");
console.log("Grants:");
for (const g of grants) console.log("  " + Object.values(g)[0]);

const [dbs] = await conn.query("SHOW DATABASES");
console.log("Databases: " + dbs.map((r) => Object.values(r)[0]).join(", "));

const target = process.env.MYSQL_DATABASE || "civicfix";

if (createDb) {
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${target}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
  );
  console.log(`Ensured database exists: ${target}`);
}

const [[spatial]] = await conn.query(
  "SELECT COUNT(*) AS n FROM information_schema.ST_SPATIAL_REFERENCE_SYSTEMS WHERE SRS_ID = 4326"
);
console.log(`SRID 4326 registered: ${spatial.n > 0 ? "yes" : "no"}`);

await conn.end();