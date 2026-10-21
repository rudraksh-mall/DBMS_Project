# CivicFix AI — MongoDB → Hosted MySQL Migration Audit (Phase 1)

Status: **Phase 1 inspection complete — no application code changed.**
Date: 2026-10-16
Inspector: automated repository audit

> Secret handling: only environment **variable names** are listed below. No secret
> values are reproduced in this document.

---

## 1. Repository structure and entry points

There is **no monorepo tooling** (no root `package.json`, no npm/pnpm/yarn
workspaces, no Turborepo/Nx). The repository is two independent projects plus a
root README:

```
DBMS_Project/
├── README.md            (UTF-16 LE, docs only)
├── backend/             (Express API, ESM)
└── frontend/            (Vite + React 19 SPA)
```

### Backend
- Package manager: **npm** (`package-lock.json` present).
- Module system: **ESM** (`"type": "module"`).
- Entry point: `backend/src/index.js` → imports `backend/src/app.js` (Express app).
- Startup order issue already handled: `index.js` calls `connectDB()` then `app.listen()`.
  `connectDB()` currently `process.exit(1)`s on Mongo failure.
- `app.js` mounts routes, then a global error middleware that serializes
  `{ success, message, errors, stack? }`.

### Frontend
- Vite + React 19, Zustand stores, axios services. No react-router; navigation
  is a Zustand `currentScreen` string. No direct database access from frontend.

### Deployment configuration
- **None present.** No `vercel.json`, `netlify.toml`, `render.yaml`,
  `railway.json`, `Procfile`, `Dockerfile`, or compose file anywhere in the repo.
- Frontend API base URL is `import.meta.env.VITE_API_URL || "http://localhost:8000/api"`.
- Hosting setup therefore cannot be "inspected" beyond this; deployment must be
  documented rather than modified.

---

## 2. Backend package manager, scripts, Node version, tests

`backend/package.json`:
- `scripts`: `dev` (nodemon), `seed` (`node src/seed.js`), `seed-admin`
  (`node scripts/seedAdmin.js`), `import-wards`, `import-wards-prayagraj`,
  `import-wards-gorakhpur`.
- **No `test`, `lint`, or `typecheck` scripts. No test framework installed. No test files exist.**
- No `engines` field. Root README states Node **v18+**.
- Local environment observed: **Node v24.14.1, npm 11.6.0**.

Runtime dependencies: `axios`, `bcrypt`, `cloudinary`, `cookie-parser`, `cors`,
`crypto`, `dotenv`, `express` v5, `google-auth-library`, `jsonwebtoken`,
`mongoose` v9, `multer`, `multer-storage-cloudinary`, `nodemailer`, `openai`,
`uuid`.

Notable: `src/services/scheduler.service.js` imports **`node-cron` which is NOT
declared in `package.json` and is not installed**. It is also never imported
anywhere (dead code).

Frontend scripts: `dev`, `build`, `lint` (eslint), `preview`.

---

## 3. Mongoose models, schemas, hooks, methods, virtuals

### `src/models/user.model.js`
Embedded `refreshSessionSchema`: `tokenHash` (required, bcrypt hash), `device`,
`ip`, `createdAt`, `expiresAt` (required) — an array `refreshSessions` on User.

User fields: `name` (required), `email` (unique, required, lowercased/trim),
`password` (required, min 6), `role` enum `citizen|authority|admin` (default
citizen), `wardId` (ObjectId ref Ward, default null), `phone`, `avatar`,
`otp { code, expiresAt }`, `isVerified` (default false), `isActive` (default
true), `refreshSessions[]`, `googleId`, `providers[]` enum `local|google`
(default `["local"]`), `timestamps: true`.

Hooks/methods:
- `pre("save")` — bcrypt.hash(password, 10) when modified.
- `isPasswordCorrect(password)` — bcrypt.compare.
- `generateAccessToken()` — JWT signed `{ _id, role, wardId }` with
  `ACCESS_TOKEN_SECRET` / `ACCESS_TOKEN_EXPIRY`.
- `addRefreshSession(expiresAt, device, ip)` — creates a `new ObjectId()` session
  id + 40 random bytes secret, stores `bcrypt.hash(secret,10)` as `tokenHash`,
  pushes, saves, returns ``${sessionId}.${secret}``.

### `src/models/complaint.model.js`
`reportedBy` (ref User, required), `description` (required, trim),
`imageUrl` (required + default placeholder URL), `location { lat, lng }`
(required), `wardId` (ref Ward, required), `aiCategory` enum
(`garbage|road|drainage|lighting|water|traffic|infrastructure|obstruction|other`,
default other), `aiSeverity` enum (`low|medium|high`, default medium),
`aiKeywords [String]`, `aiConfidence` (0..1, default null), `aiRejectionReason`
(default null, **never actually written by controllers**), `aiStatus` enum
(`ai|fallback`, default ai), `priorityScore` (default 0, **indexed**),
`upvoteCount` (default 0), `status` enum
(`submitted|acknowledged|in_progress|resolved`, default submitted),
`authorityRemarks`, `afterFixImageUrl`, `resolvedAt`, `timestamps: true`.
Virtual `hasUpvoted` (get/set backed by `_hasUpvoted`).

### `src/models/vote.model.js`
`complaintId` (ref Complaint, required), `userId` (ref User, required),
`createdAt` (default now). **Unique compound index `{complaintId:1, userId:1}`.**

### `src/models/ward.model.js`
`name` (required), `city` (required), `boundary` (Mixed/Object, default null),
`admins [ObjectId ref User]` (**never read or written by application logic**).
**`boundary` has a `2dsphere` index.**

---

## 4. MongoDB query / operator inventory (by file)

### `src/controllers/auth.controller.js`
- `User.findOne({ email })` in `googleAuth`, `register`, `verifyOtp`, `login`.
- `User.create(...)` (register, googleAuth).
- `user.save()` after mutation (otp set, isVerified, providers push, refresh sessions).
- `User.findById(req.user._id).select("-password -refreshSessions")` (`getMe`).
- Refresh rotation: `User.findOne({ "refreshSessions._id": sessionId })`,
  `user.refreshSessions.id(sessionId)`, `session.tokenHash = ...`,
  `session.expiresAt = ...`, `session.deleteOne()`, `user.save()`.
- Logout: `User.findById`, session match + `deleteOne()`.

### `src/controllers/complaint.controller.js`
- `Ward.findOne({ boundary: { $geoIntersects: { $geometry: { type:"Point", coordinates:[lng,lat] } } } })`
  in `createComplaint` and `updateComplaint` (**geospatial containment**).
- `Complaint.create(...)` + `calculatePriority` + `complaint.save()`.
- `getAllComplaints`:
  - optional `Ward.find({ city: new RegExp(cityName,"i") }, "_id")`.
  - `Complaint.find(filter).populate("wardId","name city").sort(sortOption).lean()`
    with filters: `wardId`, `{wardId: {$in: wardIds}}`, sort
    `{createdAt:-1}` or `{upvoteCount:-1, createdAt:-1}`.
  - In-memory haversine nearby filter + distance sort (no DB sort).
  - **N+1**: for each complaint, `Vote.findOne({ complaintId, userId })` to set `hasUpvoted`.
- `getComplaintById`: `Complaint.findById` + `Vote.findOne({complaintId, userId})`.
- `updateComplaintStatus` (authority): `Complaint.findById`,
  `complaint.wardId.equals(user.wardId)` guard, mutate status/remarks/afterFix/resolvedAt, save.
- `updateComplaint` (citizen edit): `Complaint.findById`, ownership check via
  `reportedBy.toString()`, status must be `submitted`, optional new ward via
  `$geoIntersects`, AI re-analysis, save.
- `deleteComplaint`: `Complaint.findById`, ownership/status guard, `findByIdAndDelete`.
- `getWardComplaints`: `Complaint.find({wardId: req.user.wardId}).populate("wardId","name city").sort({priorityScore:-1, createdAt:-1})`.
- `getMyComplaints`: `Complaint.find({reportedBy:userId}).populate("wardId","name city").sort({createdAt:-1}).lean()` + per-row `Vote.findOne` (**N+1**).

### `src/controllers/vote.controller.js`
- `Complaint.findById` then `Vote.create({complaintId,userId})` catching
  `err.code === 11000` (duplicate key) → HTTP 400.
- Increment `complaint.upvoteCount`, recompute priority, save.
- `removeUpvote`: `Vote.findOneAndDelete`, decrement count (floor at 0), save.

### `src/controllers/ward.controller.js`
- `lookupWard`: `Ward.findOne({ boundary: { $geoIntersects ... } })`.
- `getWards`: `Ward.find({ city: { $regex: new RegExp(`^${city}$`, "i") } }).select("_id name city")`
  (note: unescaped user input in regex — see risks).
- `getCities`: `Ward.distinct("city")`.

### `src/controllers/admin.controller.js`
- `getWardComplaints`: `Complaint.find({wardId, status?, aiCategory?}).sort({priorityScore:-1}).populate("reportedBy","name email")`.
- `updateComplaintStatus`: `Complaint.findById`, ward guard, mutate, `calculatePriority`, save.
- `getEscalations`: `Complaint.find({ status:{$ne:"resolved"}, priorityScore:{$gte:80}, createdAt:{$lte:threshold} }).sort({priorityScore:-1})`.
- `getAuthorities`: `User.find({role:"authority"}, "name email wardId isActive createdAt").populate("wardId","name city")`.
- `createAuthority`: `User.findOne`, `Ward.findById`, `User.create({role:"authority",...})`.
- `updateAuthority`: `User.findById`, mutate name/wardId/isActive, save.
- `deactivateAuthority`: `User.findById`, `isActive=false`, save.

### `src/controllers/analytics.controller.js`
- `Complaint.find({wardId})` then **all aggregation performed in JavaScript**:
  category counts, priority buckets (`>=65` high, `>=40` medium, else low),
  status counts (keys `submitted|acknowledged|in_progress|resolved`),
  average resolution time in days (`updatedAt - createdAt`, `.toFixed(1)`),
  weekly trend for last 4 weeks with labels `Week 1..Week 4` and
  `{reported, resolved}` counts.

### `src/controllers/authorityDashboard.controller.js`
- `Complaint.countDocuments({wardId})`
- `Complaint.countDocuments({wardId, priorityScore:{$gte:65}, status:{$ne:"resolved"}})`
- `Complaint.countDocuments({wardId, status:"in_progress"})`
- `Complaint.countDocuments({wardId, status:"resolved", resolvedAt:{$gte: localMidnight}})`
- `Complaint.find({wardId, priorityScore:{$gte:65}, status:{$ne:"resolved"}}).populate("wardId","name city").sort({priorityScore:-1}).limit(5).lean()`
- `Complaint.find({wardId}).populate("wardId","name city").sort({createdAt:-1}).limit(15).lean()`

### Services with DB dependency
- `src/services/scheduler.service.js` — `Complaint.find({status:{$ne:"resolved"}})` + per-doc save. **Never wired; `node-cron` not installed.**
- `src/services/geo.service.js` — imports Complaint; `findNearbyComplaints` / `isDuplicateComplaint`. **Never imported** (dead code). Pure `priority.service.js` and `fallbackClassifier.js`. `ai.service.js` calls OpenAI only.

---

## 5. Authentication & authorization semantics (to preserve exactly)

- Registration (`register`): citizen-only, rejects `authority` explicitly;
  creates unverified user + OTP (10 min) and emails it.
- `verifyOtp`: checks code + expiry, sets `isVerified`, clears OTP.
- `login`: requires local provider, verified, active; bcrypt compare; issues
  access token (JWT `{_id, role, wardId}`, expiry `ACCESS_TOKEN_EXPIRY`) and a
  refresh token `<sessionId>.<secret>` (30 days).
- `refreshAccessToken`: split on `.`, look up session by id, bcrypt-verify secret,
  rotate secret + extend expiry, issue new access token.
- `logout`: authenticated; deletes the matching session.
- `googleAuth`: verifies Google id token, blocks admin OAuth, blocks inactive,
  links/creates citizen, issues tokens.
- Middleware `auth`: verifies JWT and sets `req.user` **from the token only**
  (no DB read). `wardId`/`role` therefore come from the token, not the DB.
- `authorize(...roles)` factory (used for admin-only authority management routes).

**Implication:** because tokens carry `wardId`, MySQL migration does not change
authorization behavior, but refresh-token storage must reproduce the
`<sessionId>.<secret>` scheme and per-device sessions.

---

## 6. API contracts and frontend assumptions

Response envelope: `ApiResponse { statusCode, data, message, success }`; errors
`{ success:false, message, errors }`.

Routes (all under `/api`):
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | – | send OTP |
| POST | `/auth/verify-otp` | – | |
| POST | `/auth/login` | – | |
| POST | `/auth/google` | – | |
| POST | `/auth/refresh` | – | |
| POST | `/auth/logout` | JWT | |
| GET | `/auth/me` | JWT | excludes password + sessions |
| POST | `/complaint` | JWT | multipart, image mandatory |
| GET | `/complaint/my-reports` | JWT | |
| GET | `/complaint/allComplaints` | JWT | scope/lat/lng/wardId/city/radius |
| PATCH | `/complaint/:complaintId` | JWT | citizen edit, multipart optional |
| GET | `/complaint/ward` | JWT | authority's ward |
| PUT | `/complaint/:complaintId` | JWT | status update, multipart optional |
| GET | `/complaint/:complaintId` | JWT | detail + `hasUpvoted` |
| DELETE | `/complaint/:complaintId` | JWT | |
| GET | `/wards/cities` | – | |
| GET | `/wards/lookup?lat&lng` | – | geo lookup |
| GET | `/wards?city=` | – | |
| POST/DELETE | `/vote/complaints/:complaintId/vote` | JWT | |
| GET | `/admin/complaints` | JWT | |
| PATCH | `/admin/complaints/:complaintId/status` | JWT | |
| GET | `/admin/escalations` | JWT | |
| GET/POST/PUT/PATCH | `/admin/authorities...` | admin | |
| GET | `/authority/dashboard` | JWT | |
| GET | `/authority/analytics` | JWT | |

Frontend assumptions verified by source inspection:
- Records are keyed by **`_id`** everywhere (`key={issue._id}`, URL strings,
  list `filter(id)` equality). IDs are treated opaquely (no parsing), so integer
  IDs serialized back as **strings** preserve all comparisons.
- `wardId` is sometimes a **string** (own reports/user) and sometimes a
  **populated object** `{_id, name, city}` (list views). Must preserve both shapes.
- `reportedBy` populated as `{name,email}` in admin ward list (not consumed by UI
  beyond availability).
- `wardId` string used in authority complaint updates (`complaint.wardId.equals`).
- Timestamps rendered via `new Date(...)` → any ISO-8601 string works; Mongo
  returns ISO strings and MySQL mapper must match.
- `fetchCities`/`fetchWards` read `res.data.data` (array of strings / `{_id,name,city}`).
- `status` union is `submitted|acknowledged|in_progress|resolved`; legacy
  `"in-progress"` normalization exists in analytics only.
- The frontend never talks to Mongo directly. **No shared package. No Mongo usage in scripts other than backend seed/import scripts.**

---

## 7. Environment variables (NAMES ONLY)

Backend (`backend/.env`, `.env.sample`):
`PORT`, `CORS_ORIGIN`, `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`,
`MONGODB_URI`, `CLOUD_NAME`, `CLOUD_KEY`, `CLOUD_SECRET`, `EMAIL_USER`,
`EMAIL_PASS`, `GOOGLE_CLIENT_ID`, `OPENAI_API_KEY`.

Referenced but not in `.env.sample`: `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`ADMIN_NAME` (used by `scripts/seedAdmin.js` with hardcoded defaults),
`NODE_ENV`.

**Already present in `backend/.env` (Aiven hosted MySQL):** `MYSQL_HOST`,
`MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_SSL`.
A TLS CA file exists at `backend/certs/ca.pem` (note: `certs/` is git-ignored).
No code currently reads any `MYSQL_*` variable.

Frontend (`frontend/.env`): `VITE_GOOGLE_CLIENT_ID`; `VITE_API_URL` referenced
with a localhost default (not currently set).

---

## 8. Affected-file inventory

Must be rewritten (data layer):
- `src/db/connection.js` (replace with MySQL pool) — or add `src/db/mysql.js`.
- `src/controllers/auth.controller.js`, `complaint.controller.js`,
  `vote.controller.js`, `ward.controller.js`, `admin.controller.js`,
  `analytics.controller.js`, `authorityDashboard.controller.js`.
- `src/seed.js`, `scripts/seedAdmin.js`, `scripts/importWards.js`.
- `src/services/geo.service.js` and `src/services/scheduler.service.js` (DB-touching).
- `src/index.js` (connect/shutdown).
- `src/constants.js` (DB name constant).

Likely leave in place (verify then deprecate):
- `src/models/*.js`, `src/db/connection.js`, `mongoose` dependency.

New files planned: `src/db/mysql.js`, repository modules, `database/schema.sql`,
`database/seed.sql`, `docs/mysql-schema.md`, `docs/local-setup.md`, tests.

Unaffected: all of `frontend/**`, `src/app.js`, routes, `src/middleware/*`,
`src/services/ai.service.js`, `fallbackClassifier.js`, `priority.service.js`,
`src/utils/*`, `src/db/cloudinary.js`, `scripts/generateWardData.js`,
`scripts/testHFConnection.js`, `data/*.geojson`.

---

## 9. Dependency map (Mongo → MySQL)

| Mongo construct | Where | MySQL replacement |
|---|---|---|
| ObjectId refs | all models | `BIGINT UNSIGNED` FK columns |
| `populate("wardId"/"reportedBy")` | complaint/admin/dashboard | `JOIN wards` / `JOIN users` |
| `$geoIntersects` point-in-polygon | complaint create/update, ward lookup | `ST_Intersects(boundary, ST_SRID(POINT(lng,lat),4326))` with `ST_GeomFromText` |
| `2dsphere` index | ward.boundary | `SPATIAL INDEX` on `GEOMETRY NOT NULL SRID 4326` |
| `distinct("city")` | ward.getCities | `SELECT DISTINCT city` |
| `$regex` city match | ward.getWards | `WHERE city = ?` (case-insensitive collation) |
| `$in` ward ids by city | complaint.getAllComplaints | `JOIN wards w ... WHERE w.city = ?` |
| `countDocuments` | authority dashboard | `COUNT(*)` with `WHERE` |
| `findOneAndDelete` | vote.removeUpvote | `DELETE ... WHERE` + `affectedRows` |
| unique index 11000 | vote create | `UNIQUE(complaint_id,user_id)` + ER_DUP_ENTRY handling |
| embedded `refreshSessions[]` | auth | `refresh_tokens` table |
| in-memory analytics | analytics controller | SQL `GROUP BY` / aggregate queries |
| in-memory haversine nearby | getAllComplaints | keep application-side haversine (matches existing behavior) or SQL expression |

---

## 10. Risks, ambiguities, and gaps

1. **Identifier type change.** Mongo ObjectIds → integer PKs. Mitigation: serialize
   `id` back as a **string** in the `_id` field and any nested refs so frontend
   equality/URLs are unaffected.
2. **Geospatial.** Requires MySQL 8.0+ with InnoDB `SRID 4326` spatial indexes.
   Aiven MySQL is 8.x (to be confirmed in Phase 3). If spatial ops are
   unavailable, fall back to storing GeoJSON and doing point-in-polygon in app
   code with a documented algorithm. Existing ward seeds are **axis-aligned grid
   rectangles**, so a bounding-box + ray-cast test is a correct fallback.
3. **Existing `.env` already points at hosted MySQL (`defaultdb`)** and contains
   a CA cert. Seeding `defaultdb` is risky; a dedicated `civicfix` schema is
   preferable. **Needs a decision.**
4. **No backend tests/lint.** A test harness must be introduced (planned:
   Node built-in `node:test`, no new runtime dependency). There is no existing
   command to "run tests", so "tests pass" will be a genuinely new command.
5. **`complaint_status_history` is not implemented today.** Adding it is an
   additive, non-breaking feature but is beyond a pure 1:1 migration.
   **Needs a decision.**
6. **`wards.admins[]` is dead data.** Options: normalize to `ward_admins` join
   table, or drop it. **Needs a decision.**
7. **`ai.service.js` vector store:** none exists — only OpenAI chat completions.
   No vector DB to migrate. No action needed.
8. **N+1 vote lookups** in list endpoints — replace with a single `LEFT JOIN votes`.
9. **Regex injection** in `ward.getWards` (unescaped `new RegExp(city)`) — will be
   replaced by a parameterized equality against a case-insensitive collation.
10. **`node-cron` missing dependency** — scheduler is dead code; will be ported
    or documented as intentionally unused (must not silently drop a feature, but
    it is not wired to anything).
11. **Foreign keys vs. current workloads:** deleting a complaint cascades votes +
    history; deleting a ward is restricted; deleting a user cascades their
    complaints (matches "owner deletes") — to be reviewed against current
    `findByIdAndDelete` behavior (Mongo had no cascades; votes then became
    orphans). This is an intentional integrity improvement and will be documented.
12. **Timezone:** Mongo stored UTC instants and serialized ISO. MySQL will store
    UTC with pool `timezone:'Z'`; mappers will emit `ISO` with `Z`.

---

## 11. Proposed relational schema (Phase 2 preview)

- `wards(id PK, name, city, boundary GEOMETRY NOT NULL SRID 4326, created_at, updated_at)`
  - `UNIQUE(city, name)`, `INDEX(city)`, `SPATIAL INDEX(boundary)`
- `users(id PK, name, email UNIQUE, password, role ENUM, ward_id FK→wards NULL, phone,
  avatar, otp_code, otp_expires_at, is_verified, is_active, google_id,
  providers JSON, created_at, updated_at)`
  - `INDEX(role)`, `INDEX(ward_id)`
- `complaints(id PK, reported_by FK→users, description, image_url, lat DECIMAL(9,6),
  lng DECIMAL(9,6), ward_id FK→wards, ai_category ENUM, ai_severity ENUM,
  ai_keywords JSON, ai_confidence DECIMAL(4,3) NULL, ai_rejection_reason, ai_status ENUM,
  priority_score INT, upvote_count INT UNSIGNED, status ENUM, authority_remarks,
  after_fix_image_url, resolved_at, created_at, updated_at)`
  - `INDEX(ward_id,status)`, `INDEX(ward_id,priority_score)`, `INDEX(reported_by)`,
    `INDEX(status,created_at)`, `INDEX(priority_score)`, `INDEX(created_at)`
- `votes(id PK, complaint_id FK→complaints, user_id FK→users, created_at)`
  - `UNIQUE(complaint_id,user_id)`, `INDEX(user_id)` — **DB-level duplicate guard**
- `complaint_status_history(id PK, complaint_id FK→complaints, status ENUM,
  changed_by FK→users NULL, remarks, created_at)` — additive
- `refresh_tokens(id CHAR(36) PK, user_id FK→users, token_hash, device, ip,
  expires_at, created_at)`
- `ward_admins(ward_id FK→wards, user_id FK→users, PRIMARY KEY(ward_id,user_id))`

Normalization notes: `ai_keywords` and `providers` kept as JSON arrays (documented
3NF exception) because they are atomic, never filtered/joined on, and preserve the
current array semantics; `ward_admins` normalizes the former embedded array.

---

## 12. Migration plan (Phase 2 → 8)

1. **Phase 2** — `database/schema.sql` (idempotent `CREATE TABLE IF NOT EXISTS`),
   `docs/mysql-schema.md` (ER + normalization + timezone).
2. **Phase 3** — `src/db/mysql.js` (`mysql2/promise` pool, `MYSQL_*` env,
   TLS/CA, `verifyConnection`, graceful `closePool`); repository modules under
   `src/db/repositories/` (users, wards, complaints, votes, tokens, history).
3. **Phase 4** — rewrite controllers/services to call repositories, preserving
   routes, middleware, validation, envelopes, pagination/sort semantics;
   `JOIN`s replace `populate`; transactions for vote + status changes; allowlists
   for sort/filter identifiers; FK/ER_DUP_ENTRY → `ApiError`.
4. **Phase 5** — geolocation (ST_Intersects) + Cloudinary + OpenAI unchanged;
   external calls kept out of transactions.
5. **Phase 6** — idempotent seed script with guard that refuses non-dev DB;
   fictional demo data (admin, authorities, citizens, wards, complaints in all
   statuses, unique votes, status history).
6. **Phase 7** — `.env.example` + `docs/local-setup.md` / deployment notes;
   never run schema/seed automatically at startup.
7. **Phase 8** — `node:test` suites (connection/schema, auth, complaints,
   filtering/sort/pagination, votes + concurrency, RBAC, FK failures, SQLi,
   ward/geo, seed repeatability, rollback) against an isolated test schema; run
   `npm run lint` in frontend; report exact results.
8. **Final** — migration report; keep Mongoose code until verified, then
   deprecate (decision pending).

---

## 13. What remains undiscovered

- Exact hosted MySQL version / spatial capability and available privileges
  (will be measured in Phase 3 with a read-only `SELECT VERSION()`).
- Real deployment/hosting target for backend and frontend (no config in repo).
- Whether production data exists in the current MongoDB cluster that must be
  considered (explicitly out of scope per instructions — fresh seed only).