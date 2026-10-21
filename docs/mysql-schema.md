# CivicFix AI — MySQL Schema Documentation

Companion to `database/schema.sql`. Verified against **MySQL 8.4.11** (InnoDB,
`utf8mb4_0900_ai_ci`, SRID 4326 spatial support enabled).

## 1. Overview

The MongoDB document model is replaced by seven normalized relational tables:

| Table | Purpose |
|---|---|
| `wards` | Ward polygon boundaries (SRID 4326 `GEOMETRY`) |
| `users` | Citizens, authorities, admins |
| `ward_admins` | Normalized former `Ward.admins[]` |
| `complaints` | Civic reports with AI fields + workflow status |
| `votes` | Community upvotes (unique per complaint+user) |
| `complaint_status_history` | Append-only status audit trail |
| `refresh_tokens` | Per-device hashed refresh sessions |

## 2. ER relationships

```
wards 1 ────< users            (users.ward_id, ON DELETE SET NULL)
wards 1 ────< complaints       (complaints.ward_id, ON DELETE RESTRICT)
users 1 ────< complaints       (complaints.reported_by, ON DELETE CASCADE)
users 1 ────< votes            (votes.user_id, ON DELETE CASCADE)
complaints 1 <──── votes       (votes.complaint_id, ON DELETE CASCADE)
complaints 1 <──── complaint_status_history (ON DELETE CASCADE)
users 1 ────< complaint_status_history      (changed_by, ON DELETE SET NULL)
users 1 ────< refresh_tokens   (ON DELETE CASCADE)
wards >────< users             via ward_admins (both CASCADE)
```

Cardinalities:
- A user has at most one home ward (`ward_id`, nullable for citizens).
- A complaint belongs to exactly one ward and one reporting user.
- A vote is unique per `(complaint_id, user_id)`.
- A refresh-token session belongs to exactly one user.

## 3. Table definitions (summary)

### wards
`id`, `name`, `city`, `boundary GEOMETRY NOT NULL SRID 4326`,
`created_at`, `updated_at`.
Unique `(city, name)`; non-spatial index on `city`; `SPATIAL INDEX` on
`boundary` (requires `NOT NULL`, which is enforced).

### users
`id`, `name`, `email UNIQUE`, `password` (bcrypt hash), `role ENUM`,
`ward_id FK`, `phone`, `avatar`, `otp_code`, `otp_expires_at`, `is_verified`,
`is_active`, `google_id`, `providers JSON` (default `["local"]`),
`created_at`, `updated_at`.

### complaints
`id`, `reported_by FK`, `description`, `image_url`, `lat DECIMAL(9,6)`,
`lng DECIMAL(9,6)`, `ward_id FK`, `ai_category ENUM`, `ai_severity ENUM`,
`ai_keywords JSON`, `ai_confidence DECIMAL(4,3)`, `ai_rejection_reason`,
`ai_status ENUM`, `priority_score INT`, `upvote_count INT UNSIGNED`,
`status ENUM`, `authority_remarks`, `after_fix_image_url`, `resolved_at`,
`created_at`, `updated_at`.

### votes
`id`, `complaint_id FK`, `user_id FK`, `created_at`.
`UNIQUE KEY uk_votes_complaint_user (complaint_id, user_id)` is the
**database-level duplicate-vote guard** required by the spec.

### complaint_status_history
`id`, `complaint_id FK`, `status ENUM`, `changed_by FK NULL`, `remarks`,
`created_at`.

### refresh_tokens
`id CHAR(36)` (public session id), `user_id FK`, `token_hash`, `device`, `ip`,
`expires_at`, `created_at`.

## 4. Constraints

- **ENUM** columns enforce valid `role`, `ai_category`, `ai_severity`,
  `ai_status`, and complaint `status` values. These match the values from the
  former Mongoose `enum` definitions exactly.
- **CHECK** constraints: latitude ∈ [-90, 90], longitude ∈ [-180, 180],
  `ai_confidence` NULL or ∈ [0, 1].
- **NOT NULL** applied to all fields Mongoose marked required plus explicitly
  defaulted numeric/count columns.
- **Foreign keys** (with delete/update behavior):

| Constraint | Delete | Update |
|---|---|---|
| `users.ward_id → wards.id` | SET NULL | CASCADE |
| `complaints.reported_by → users.id` | CASCADE | CASCADE |
| `complaints.ward_id → wards.id` | RESTRICT | CASCADE |
| `votes.complaint_id → complaints.id` | CASCADE | CASCADE |
| `votes.user_id → users.id` | CASCADE | CASCADE |
| `complaint_status_history.complaint_id → complaints.id` | CASCADE | CASCADE |
| `complaint_status_history.changed_by → users.id` | SET NULL | CASCADE |
| `refresh_tokens.user_id → users.id` | CASCADE | CASCADE |
| `ward_admins.*` | CASCADE | CASCADE |

Design note: MongoDB had no cascades, so deleting a complaint left orphaned
votes. The relational FK cascades make those invariants explicit. Ward deletion
is `RESTRICT` so complaints can never be orphaned from their ward.

## 5. Indexes (mapped to real query patterns)

| Index | Serves |
|---|---|
| `uk_users_email` | login/registration lookup, case-insensitive uniqueness |
| `idx_users_role` | admin `WHERE role = 'authority'` |
| `idx_users_ward` | authority/ward lookups |
| `uk_wards_city_name` | `importWards` existence check + dedupe |
| `idx_wards_city` | `SELECT ... WHERE city = ?`, `DISTINCT city` |
| `idx_wards_boundary` (SPATIAL) | `ST_Intersects` ward assignment/lookup |
| `idx_complaints_ward_status` | authority dashboards, `status` filter |
| `idx_complaints_ward_priority` | ward lists sorted by `priority_score` |
| `idx_complaints_reported_by` | `/complaint/my-reports` |
| `idx_complaints_status_created` | escalations + newest-first feeds |
| `idx_complaints_priority` | escalation `priority_score >= 80` |
| `idx_complaints_created` | `createdAt` sort/pagination |
| `idx_complaints_category` | category filters/analytics |
| `uk_votes_complaint_user` | duplicate-vote prevention + `hasUpvoted` lookup |
| `idx_votes_user` | votes-per-user queries |
| `idx_history_complaint` | history retrieval per complaint |
| `idx_refresh_tokens_user`, `idx_refresh_tokens_expires` | session lookup/cleanup |

## 6. Normalization

The schema is in **third normal form** for all scalar attributes. Each table
has a single-column surrogate primary key; no non-key attribute depends on
another non-key attribute; transitive dependencies are removed by joining
through FKs rather than duplicating ward/user fields on complaints.

Documented, justified JSON exceptions:
- `users.providers` — a tiny set of enum-like flags (`["local"]`,
  `["local","google"]`) read atomically via `.includes(...)`, never joined or
  filtered in SQL. Kept as a JSON array to preserve exact API semantics.
- `complaints.ai_keywords` — a variable-length list of short tokens that is
  never queried or aggregated; storing it as a child table would add joins with
  no read benefit. Kept as a JSON array.

Everything else that was an array or embedded document is normalized:
- `Ward.admins[]` → `ward_admins` join table.
- `User.refreshSessions[]` → `refresh_tokens` table.
- ObjectId references → integer FKs.

## 7. Identifier mapping and API stability

Primary keys are `BIGINT UNSIGNED`. The data-access layer serializes `id` into
the existing `_id` field **as a string**, and nested references (e.g.
`wardId`) keep their existing shapes (string in some responses, populated
`{_id, name, city}` object in list responses). This preserves every frontend
comparison and URL usage without touching the frontend.

## 8. Timezone and serialization

- All temporal columns are `DATETIME(3)` stored in **UTC**.
- The pool sets `timezone: 'Z'`, so writes/reads are interpreted as UTC.
- The mapper emits ISO-8601 strings (with `Z`) for all timestamps, matching the
  JSON produced by Mongoose `Date` values.
- `DECIMAL` columns (`lat`, `lng`, `ai_confidence`) are read as JS numbers
  (`decimalNumbers: true`) so arithmetic and `.toFixed()` in the frontend work
  exactly as before.

## 9. Geospatial model

- Wards store polygons as `GEOMETRY NOT NULL SRID 4326`, inserted from GeoJSON
  via `ST_GeomFromGeoJSON(?)`.
- Point-in-polygon uses `ST_Intersects(boundary, ST_GeomFromGeoJSON(?))` with a
  GeoJSON `Point` whose coordinates are `[lng, lat]`.
- Empirical verification on MySQL 8.4.11 confirmed: stored SRID is 4326;
  inside points match, outside points do not, and swapped (lat,lng) coordinates
  correctly do **not** match.
- This exactly replaces the former `$geoIntersects` queries in complaint
  creation/editing and `GET /api/wards/lookup`.