/**
 * Shared test harness.
 *
 * Runs against an ISOLATED database (default `civicfix_test`) so tests never
 * touch the demo/development data in `civicfix`. The database name is set
 * BEFORE any application module is imported, because the MySQL pool reads it
 * from the environment on first use.
 */
import "dotenv/config";
import http from "node:http";
import crypto from "node:crypto";
import bcrypt from "bcrypt";

export const TEST_DB = process.env.MYSQL_TEST_DATABASE || "civicfix_test";

process.env.MYSQL_DATABASE = TEST_DB;
process.env.NODE_ENV = process.env.NODE_ENV || "test";

// Imported AFTER the environment override above.
const { createConnection, getPool, closePool, exec } = await import("../src/db/mysql.js");
const { applySchema } = await import("../scripts/dbSetup.js");
const { app } = await import("../src/app.js");
const usersRepo = await import("../src/repositories/users.repo.js");
const wardsRepo = await import("../src/repositories/wards.repo.js");
const complaintsRepo = await import("../src/repositories/complaints.repo.js");

export { getPool, closePool, exec, usersRepo, wardsRepo, complaintsRepo };

export const uniq = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);

let dbReady = false;

export async function initDb() {
  if (dbReady) return;
  const admin = await createConnection({ database: null });
  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
  } finally {
    await admin.end();
  }
  const conn = await createConnection();
  try {
    await applySchema(conn);
  } finally {
    await conn.end();
  }
  dbReady = true;
}

export async function startServer() {
  await initDb();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export async function api(baseUrl, method, path, { token, body, headers } = {}) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

export async function login(baseUrl, email, password) {
  const { status, body } = await api(baseUrl, "POST", "/api/auth/login", {
    body: { email, password },
  });
  if (status !== 200) {
    throw new Error(`login failed (${status}): ${JSON.stringify(body)}`);
  }
  return body.data;
}

const DEFAULT_PASSWORD = "Passw0rd!";

export async function createUser({
  role = "citizen",
  wardId = null,
  password = DEFAULT_PASSWORD,
  name = "Test User",
  verified = true,
  active = true,
  otpCode = null,
  otpExpiresAt = null,
} = {}) {
  const email = `${uniq()}@test.local`;
  const id = await usersRepo.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role,
    wardId,
    isVerified: verified,
    isActive: active,
    providers: ["local"],
    otpCode,
    otpExpiresAt,
  });
  return { id: Number(id), email, password, role, wardId };
}

/**
 * Creates a ward in a coordinate region (lng/lat ~10,10) that cannot collide
 * with the demo seed's Indian city polygons.
 */
export async function createWard({ city = "Testville", name } = {}) {
  const wardName = name || `Ward ${uniq()}`;
  const boundaryGeoJson = JSON.stringify({
    type: "Polygon",
    coordinates: [
      [
        [10.0, 10.0],
        [10.2, 10.0],
        [10.2, 10.2],
        [10.0, 10.2],
        [10.0, 10.0],
      ],
    ],
  });
  const id = await wardsRepo.insert({ name: wardName, city, boundaryGeoJson });
  return { id: Number(id), name: wardName, city };
}

export async function createComplaint({
  reporterId,
  wardId,
  lat = 10.1,
  lng = 10.1,
  status = "submitted",
  severity = "medium",
  category = "road",
  description,
} = {}) {
  const id = await complaintsRepo.insert({
    reportedBy: reporterId,
    description: description || `Test complaint ${uniq()}`,
    imageUrl: "https://example.com/test.jpg",
    lat,
    lng,
    wardId,
    aiCategory: category,
    aiSeverity: severity,
    aiKeywords: ["test"],
    aiConfidence: 0.9,
    aiStatus: "ai",
  });
  if (status !== "submitted") {
    await complaintsRepo.updateStatusFields(id, {
      status,
      authorityRemarks: null,
      afterFixImageUrl: null,
      resolvedAt: null,
      priorityScore: 55,
    });
  }
  return Number(id);
}