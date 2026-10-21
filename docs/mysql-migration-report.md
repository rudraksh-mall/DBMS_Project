# MySQL Migration Report

**Project:** CivicFix AI — backend data layer
**Change:** Migrate the REST API backend from MongoDB/Mongoose to hosted MySQL
(`mysql2/promise`), preserving the public API contract and all existing
integrity/authorization behaviour.
**Status:** Complete — schema applied, demo data seeded, 28/28 automated tests
passing.

Related documents:

- [`mysql-migration-audit.md`](./mysql-migration-audit.md) — Phase 1 audit.
- [`mysql-schema.md`](./mysql-schema.md) — schema, constraints, indexes, geo notes.
- [`local-setup.md`](./local-setup.md) — how to run everything.
- [`demo-credentials.md`](./demo-credentials.md) — seeded accounts.

---

## 1. Summary

| Area | Before | After |
| --- | --- | --- |
| Driver | Mongoose | `mysql2/promise` (pool + transactions) |
| Schema source | Mongoose models (implicit) | `database/schema.sql` (explicit DDL) |
| IDs | MongoDB `ObjectId` | `INT UNSIGNED AUTO_INCREMENT`, serialized to **strings** in `_id` |
| Geo containment | `$geoIntersects` | `ST_Intersects(boundary, ST_GeomFromGeoJSON(?))`, SRID 4326 |
| Ward↔authority link | `wards.admins[]` array | normalized `ward_admins` join table |
| Status auditing | none | `complaint_status_history` (additive) |
| Refresh sessions | Mongo collection | `refresh_tokens` table (hashed secrets) |

The public JSON responses are unchanged: identifiers remain string `_id`,
timestamps remain ISO-8601 UTC strings, and populated references still appear as
`{ _id, name, city }` objects.

## 2. Architecture

Request flow is unchanged at the edges; only the data-access layer changed:

```
routes → controllers → repositories → src/db/mysql.js (pool / transactions)
```

- **`src/db/mysql.js`** — lazy pool, TLS config, `query`/`exec`,
  `withTransaction` (with deadlock retry), `verifyConnection`, `closePool`.
- **`src/repositories/*`** — parameterized SQL. `mappers.js` converts rows to the
  exact legacy JSON shapes.
- **`src/db/errors.js`** — translates MySQL errors (`ER_DUP_ENTRY`, FK) into
  `ApiError`s so status codes match the previous behaviour.
- **`src/services/authToken.service.js`** — access-token signing and hashed,
  rotating refresh sessions.

All queries are parameterized prepared statements. There is no dynamic string
interpolation of user input anywhere in the data layer.

## 3. Schema

Seven tables: `wards`, `users`, `ward_admins`, `complaints`, `votes`,
`complaint_status_history`, `refresh_tokens`. Highlights:

- ENUM/CHECK constraints mirror the former Mongoose validators (role, status,
  category, severity).
- Foreign keys with the intended `ON DELETE`/`ON UPDATE` behaviour.
- Unique keys reproduce previous invariants: `users.email`,
  `votes(complaint_id, user_id)`, `ward_admins(ward_id, user_id)`.
- A `SPATIAL INDEX` on `wards.boundary` powers point-in-ward lookups.

See [`mysql-schema.md`](./mysql-schema.md) for the full listing and the small,
documented 3NF exceptions (`users.providers`, `complaints.ai_keywords`).

## 4. Behaviour preserved

- **Response shapes** — verified by tests: `_id` strings, `location.lat/lng`
  numbers, `wardId` populated object or null, `hasUpvoted`, ISO timestamps.
- **Auth** — JWT payload `{ _id, role, wardId }` with numeric ids; refresh token
  format `<sessionId>.<secret>` with the secret bcrypt-hashed and rotated on use.
- **Authorization** — citizens only create/edit/delete their own submitted
  reports; authorities only act on their own ward; status transitions validated.
- **Route quirks intentionally kept** — `PUT /complaint/:id` (authority status
  update) does **not** recompute priority, matching the original; the admin PATCH
  route does.
- **Analytics** — still returns a raw object (not the `ApiResponse` envelope)
  with the same keys and stringified `avgResolutionTime`.
- **Scheduler/geo services** — ported off Mongoose; no behaviour change.

## 5. Bugs found and fixed during migration

These were latent issues surfaced by running the new data layer against MySQL
and the concurrency test suite:

1. **JWT `wardId` was lost.** `signAccessToken` read `user.wardId`, but raw MySQL
   rows expose `ward_id`, so authority tokens carried `wardId: null` and *every*
   ward-scoped status update returned `403`. `signAccessToken` now accepts either
   shape (`id`/`_id`, `wardId`/`ward_id`).
2. **Unsigned underflow on un-upvote.** `upvote_count` is `UNSIGNED`;
   `upvote_count - 1` at 0 raised a database error. Decrement now uses
   `GREATEST(CAST(upvote_count AS SIGNED) - 1, 0)`.
3. **Deadlock on concurrent upvotes.** Concurrent transactions touched the vote
   row and the complaint counter in different orders. The vote transactions now
   take the lock on the complaint row **first** (consistent order), and
   `withTransaction` retries transient `ER_LOCK_DEADLOCK` / `ER_LOCK_WAIT_TIMEOUT`
   with backoff. A 6-way concurrent upvote test now passes reliably.

## 6. Testing

Run with `npm test` (Node's built-in test runner, `--test-concurrency=1`).
**28 tests, 28 passing.** They run against an isolated database
(`MYSQL_TEST_DATABASE`, default `civicfix_test`) and never touch demo data.

Coverage:

- **Database/schema** — connectivity, expected tables, SRID 4326, spatial
  containment, unique-email and duplicate-vote rejection, FK enforcement.
- **Auth** — login, bad password, unverified account, protected-route rejects,
  refresh rotation + old-token invalidation, logout revocation, OTP verification,
  registration role rules.
- **Complaints** — feed shape, per-user `hasUpvoted`, my-reports scoping,
  role/ward boundary on status updates, status-history writes, resolved-without-
  after-fix-image guard, ownership/status-aware delete, SQL-injection resistance
  in query parameters.
- **Votes** — upvote/duplicate/remove, citizen-only + existence checks,
  concurrent upvotes counted exactly once.
- **Seeding** — refuses non-approved databases and `NODE_ENV=production`,
  idempotent and non-destructive across repeated runs.

Known gaps (documented, not automated): the OTP **email send** and the
**OpenAI/Cloudinary** upload paths require external services and were verified by
code inspection rather than live calls.

## 7. Operational notes

- **TLS is never disabled.** `MYSQL_SSL=true` enables verified TLS; the provider
  CA is pinned via `MYSQL_CA_PATH` (default `certs/ca.pem`).
- **Timezone** is fixed to `Z` and `decimalNumbers: true` is set so timestamps
  and DECIMAL coordinates round-trip exactly as before.
- **Schema is applied explicitly** (`npm run db:setup`); it is never run
  automatically at application startup.
- **Seed safety** — refuses production and non-obviously-dev databases, is
  idempotent, and only inserts missing rows.

## 8. Deferred / cleanup

- The legacy Mongoose models, `src/db/connection.js` and the `mongoose`
  dependency are intentionally **left in place** until the migration is verified
  in staging, then can be removed in a follow-up.
- Dead code noted in the audit (`scheduler.service.js` importing the uninstalled
  `node-cron`, the unused `geo.service.js`, `wards.admins[]`) is untouched.
- Recommended follow-ups: adopt a migration tool (e.g. dbmate/Prisma migrate)
  for versioned schema changes, wire the test suite into CI, and add a lint
  script for the backend (the backend currently has none).

## 9. Rollback

- **Code:** revert the backend commit; the previous Mongoose models and
  connection are still present.
- **Data:** the new schema is a separate database (`civicfix`); dropping it does
  not affect any existing Mongo data. `database/schema.sql` is additive
  (`CREATE TABLE IF NOT EXISTS`) and creates no data on its own.