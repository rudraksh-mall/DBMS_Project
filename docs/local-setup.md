# Local Setup

## Prerequisites

- Node.js 20+ (developed and tested on Node 24)
- A MySQL 8.0+ server. This project targets a hosted instance (e.g. Aiven),
  but any MySQL 8.0+ with InnoDB and spatial support works.
- An OpenAI API key (optional — the classifier falls back gracefully).
- Cloudinary account (optional — only needed to upload complaint images).
- SMTP credentials for OTP email (optional — needed only for registration).

## 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

## 2. Configure the backend

Copy the example file and fill in real values:

```bash
cd backend
cp .env.example .env     # Windows: Copy-Item .env.example .env
```

Key variables:

| Variable | Purpose |
| --- | --- |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | Database connection. |
| `MYSQL_SSL` | Set `true` for hosted providers — TLS verification is never disabled. |
| `MYSQL_CA_PATH` | Path to the provider CA bundle (defaults to `certs/ca.pem`). |
| `ACCESS_TOKEN_SECRET` | Long random string used to sign JWTs. |
| `CORS_ORIGIN` | Frontend origin, e.g. `http://localhost:5173`. |
| `MYSQL_TEST_DATABASE` | Isolated database used by `npm test`. |
| `SEED_ALLOWED_DATABASES` | Extra DB names the seed may target (comma separated). |

> The demo seed refuses to run unless the target database name clearly looks
> like a development/test/demo database (`civicfix`, `*_dev`, `*_test`,
> `*_demo`, `*_local`) or is listed in `SEED_ALLOWED_DATABASES`, and it always
> refuses when `NODE_ENV=production`.

## 3. Create the schema

Applies `database/schema.sql` (idempotent, `CREATE TABLE IF NOT EXISTS`):

```bash
npm run db:setup
```

Verify connectivity at any time with the read-only check:

```bash
npm run db:check
```

## 4. Seed demo data

```bash
npm run seed
```

This creates the admin, authorities, citizens, wards, complaints, votes and
status history listed in [demo-credentials.md](./demo-credentials.md). It is
safe to run repeatedly.

## 5. Run the backend

```bash
npm run dev      # nodemon, auto-reload
# or
npm start
```

The API is served from `http://localhost:8000` (`/api/...`).

## 6. Run the frontend

```bash
cd ../frontend
npm run dev
```

## 7. Run the tests

```bash
cd backend
npm test
```

Tests use Node's built-in test runner against the isolated
`MYSQL_TEST_DATABASE` database (default `civicfix_test`) and never touch the
demo database. They create their own schema and clean up only their own rows.

## Useful scripts

| Script | Description |
| --- | --- |
| `npm run db:check` | Read-only connectivity + schema diagnostics. |
| `npm run db:check -- --create-db` | Also create the database if missing. |
| `npm run db:setup` | Apply `database/schema.sql`. |
| `npm run seed` | Idempotent demo seed. |
| `npm run seed-admin` | Create just the admin account. |
| `npm run import-wards` | Import ward boundaries from `data/*.geojson`. |
| `npm test` | Run the automated test suite. |