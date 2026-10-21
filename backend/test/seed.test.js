import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as h from "../test-utils/harness.js";

const run = promisify(execFile);
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runSeed(env) {
  return run(process.execPath, ["src/seed.js"], {
    cwd: backendRoot,
    env: { ...process.env, ...env },
  });
}

/**
 * Counts only rows owned by the demo seed (identified by the demo email domain
 * and demo cities), so results are independent of other test files running
 * against the same shared test database.
 */
async function counts() {
  const [[row]] = await h.getPool().query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE email LIKE '%@civicfix.test') AS users,
       (SELECT COUNT(*) FROM wards WHERE city IN ('Lucknow','Prayagraj','Gorakhpur')) AS wards,
       (SELECT COUNT(*) FROM complaints
          WHERE reported_by IN (SELECT id FROM users WHERE email LIKE '%@civicfix.test')) AS complaints,
       (SELECT COUNT(*) FROM votes
          WHERE complaint_id IN (
            SELECT id FROM complaints
             WHERE reported_by IN (SELECT id FROM users WHERE email LIKE '%@civicfix.test'))) AS votes,
       (SELECT COUNT(*) FROM complaint_status_history
          WHERE complaint_id IN (
            SELECT id FROM complaints
             WHERE reported_by IN (SELECT id FROM users WHERE email LIKE '%@civicfix.test'))) AS history`
  );
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v)]));
}

before(async () => {
  await h.initDb();
});

after(async () => {
  await h.closePool();
});

test("seed refuses non-approved databases", async () => {
  await assert.rejects(
    () => runSeed({ MYSQL_DATABASE: `civicfix_${h.uniq()}`, NODE_ENV: "development" }),
    /Refusing to seed/
  );
});

test("seed refuses when NODE_ENV=production", async () => {
  await assert.rejects(
    () => runSeed({ MYSQL_DATABASE: h.TEST_DB, NODE_ENV: "production" }),
    /Refusing to seed/
  );
});

test("seed is idempotent and non-destructive", async () => {
  const first = await runSeed({ MYSQL_DATABASE: h.TEST_DB, NODE_ENV: "test" });
  assert.match(first.stdout, /Seed complete/);
  const countsAfterFirst = await counts();

  const second = await runSeed({ MYSQL_DATABASE: h.TEST_DB, NODE_ENV: "test" });
  assert.match(second.stdout, /Seed complete/);
  const countsAfterSecond = await counts();

  assert.deepEqual(countsAfterSecond, countsAfterFirst);
  assert.ok(countsAfterSecond.users >= 8);
  assert.ok(countsAfterSecond.complaints >= 10);
});