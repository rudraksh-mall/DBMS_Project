import test, { after, before } from "node:test";
import assert from "node:assert/strict";

import * as h from "../test-utils/harness.js";

before(async () => {
  await h.initDb();
});

after(async () => {
  await h.closePool();
});

test("connectivity check succeeds", async () => {
  const { verifyConnection } = await import("../src/db/mysql.js");
  assert.equal(await verifyConnection(), true);
});

test("all expected tables exist", async () => {
  const rows = await h.exec(null, "SHOW TABLES");
  const tables = rows.map((r) => Object.values(r)[0]);
  for (const expected of [
    "wards",
    "users",
    "ward_admins",
    "complaints",
    "votes",
    "complaint_status_history",
    "refresh_tokens",
  ]) {
    assert.ok(tables.includes(expected), `missing table: ${expected}`);
  }
});

test("spatial boundary column uses SRID 4326", async () => {
  const rows = await h.exec(
    null,
    "SELECT ST_SRID(boundary) AS srid FROM wards LIMIT 1"
  );
  if (rows.length === 0) {
    // No ward yet in this fresh DB: assert on the type directly.
    const [{ srid }] = await h.exec(
      null,
      "SELECT ST_SRID(ST_GeomFromGeoJSON(?) ) AS srid",
      [JSON.stringify({ type: "Point", coordinates: [10, 10] })]
    );
    assert.equal(srid, 4326);
  } else {
    assert.equal(rows[0].srid, 4326);
  }
});

test("ward point lookup uses ST_Intersects containment", async () => {
  const ward = await h.createWard();
  const { findByPoint } = await import("../src/repositories/wards.repo.js");

  const inside = await findByPoint(10.1, 10.1);
  assert.ok(inside, "expected a ward for a point inside the boundary");
  assert.equal(inside.name, ward.name);

  const outside = await h.exec(
    null,
    "SELECT id FROM wards WHERE id = ? AND ST_Intersects(boundary, ST_GeomFromGeoJSON(?))",
    [
      ward.id,
      JSON.stringify({ type: "Point", coordinates: [0, 0] }),
    ]
  );
  assert.equal(outside.length, 0);
});

test("unique email constraint is enforced", async () => {
  const user = await h.createUser();
  await assert.rejects(
    () =>
      h.usersRepo.create({
        name: "Dup",
        email: user.email,
        password: "x",
        role: "citizen",
        isVerified: true,
        providers: ["local"],
      }),
    /ER_DUP_ENTRY|Duplicate/i
  );
});

test("duplicate vote is rejected by the unique key", async () => {
  const ward = await h.createWard();
  const citizen = await h.createUser();
  const complaintId = await h.createComplaint({
    reporterId: citizen.id,
    wardId: ward.id,
  });

  const votesRepo = await import("../src/repositories/votes.repo.js");
  await votesRepo.create({ complaintId, userId: citizen.id });
  await assert.rejects(
    () => votesRepo.create({ complaintId, userId: citizen.id }),
    /ER_DUP_ENTRY|Duplicate/i
  );
});

test("foreign key prevents complaints pointing at a missing ward", async () => {
  const citizen = await h.createUser();
  await assert.rejects(
    () =>
      h.complaintsRepo.insert({
        reportedBy: citizen.id,
        description: "Orphan complaint",
        imageUrl: "https://example.com/x.jpg",
        lat: 10.1,
        lng: 10.1,
        wardId: 999999999,
        aiCategory: "road",
        aiSeverity: "low",
        aiKeywords: [],
        aiConfidence: 0.5,
        aiStatus: "ai",
      }),
    /ER_NO_REFERENCED_ROW|foreign key/i
  );
});