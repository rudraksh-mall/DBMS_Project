import test, { after, before } from "node:test";
import assert from "node:assert/strict";

import * as h from "../test-utils/harness.js";

let server;
let adminToken;
let ward;

before(async () => {
  server = await h.startServer();
  ward = await h.createWard();
  const admin = await h.createUser({ role: "admin" });
  adminToken = (await h.login(server.baseUrl, admin.email, admin.password)).accessToken;
});

after(async () => {
  await server.close();
  await h.closePool();
});

test("admin authority management enforces role and validation", async () => {
  const citizen = await h.createUser();
  const citizenToken = (await h.login(server.baseUrl, citizen.email, citizen.password)).accessToken;

  const forbidden = await h.api(server.baseUrl, "GET", "/api/admin/authorities", {
    token: citizenToken,
  });
  assert.equal(forbidden.status, 403);

  const missing = await h.api(server.baseUrl, "POST", "/api/admin/authorities", {
    token: adminToken,
    body: { name: "No Ward" },
  });
  assert.equal(missing.status, 400);

  const badWard = await h.api(server.baseUrl, "POST", "/api/admin/authorities", {
    token: adminToken,
    body: { name: "A", email: `${h.uniq()}@test.local`, wardId: 999999999 },
  });
  assert.equal(badWard.status, 404);

  const created = await h.api(server.baseUrl, "POST", "/api/admin/authorities", {
    token: adminToken,
    body: { name: "New Officer", email: `${h.uniq()}@test.local`, wardId: ward.id },
  });
  assert.equal(created.status, 201);
  assert.equal(typeof created.body.data.id, "string");
  assert.equal(typeof created.body.data.tempPassword, "string");
  assert.equal(created.body.data.wardId, String(ward.id));

  const list = await h.api(server.baseUrl, "GET", "/api/admin/authorities", {
    token: adminToken,
  });
  assert.equal(list.status, 200);
  const found = list.body.data.find((a) => a._id === created.body.data.id);
  assert.ok(found);
  assert.equal(found.wardId._id, String(ward.id));
  assert.equal(found.wardId.city, "Testville");

  const updated = await h.api(server.baseUrl, "PUT", `/api/admin/authorities/${created.body.data.id}`, {
    token: adminToken,
    body: { name: "Renamed Officer" },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.name, "Renamed Officer");

  const deactivated = await h.api(
    server.baseUrl,
    "PATCH",
    `/api/admin/authorities/${created.body.data.id}/deactivate`,
    { token: adminToken }
  );
  assert.equal(deactivated.status, 200);

  const login = await h.api(server.baseUrl, "POST", "/api/auth/login", {
    body: { email: created.body.data.email, password: created.body.data.tempPassword },
  });
  assert.equal(login.status, 403);
});

test("escalations are admin-only", async () => {
  const authority = await h.createUser({ role: "authority", wardId: ward.id });
  const authorityToken = (await h.login(server.baseUrl, authority.email, authority.password)).accessToken;

  const forbidden = await h.api(server.baseUrl, "GET", "/api/admin/escalations", {
    token: authorityToken,
  });
  assert.equal(forbidden.status, 403);

  const ok = await h.api(server.baseUrl, "GET", "/api/admin/escalations", {
    token: adminToken,
  });
  assert.equal(ok.status, 200);
  assert.ok(Array.isArray(ok.body.data));
});

test("admin ward complaints endpoint filters by the caller's ward", async () => {
  const authority = await h.createUser({ role: "authority", wardId: ward.id });
  const citizen = await h.createUser();
  const complaintId = await h.createComplaint({ reporterId: citizen.id, wardId: ward.id });
  const authorityToken = (await h.login(server.baseUrl, authority.email, authority.password)).accessToken;

  const res = await h.api(server.baseUrl, "GET", "/api/admin/complaints", {
    token: authorityToken,
  });
  assert.equal(res.status, 200);
  const ids = res.body.data.map((c) => c._id);
  assert.ok(ids.includes(String(complaintId)));
});

test("authority dashboard shape and role guard", async () => {
  const citizen = await h.createUser();
  const citizenToken = (await h.login(server.baseUrl, citizen.email, citizen.password)).accessToken;

  const forbidden = await h.api(server.baseUrl, "GET", "/api/authority/dashboard", {
    token: citizenToken,
  });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.body.message, "Access denied");

  const authority = await h.createUser({ role: "authority", wardId: ward.id });
  const authorityToken = (await h.login(server.baseUrl, authority.email, authority.password)).accessToken;

  const dash = await h.api(server.baseUrl, "GET", "/api/authority/dashboard", {
    token: authorityToken,
  });
  assert.equal(dash.status, 200);
  for (const key of ["total", "highPriority", "inProgress", "resolvedToday"]) {
    assert.equal(typeof dash.body.data.stats[key], "number");
  }
  assert.ok(Array.isArray(dash.body.data.highPriorityIssues));
  assert.ok(Array.isArray(dash.body.data.recent));
});

test("analytics returns the legacy raw shape and role guard", async () => {
  const citizen = await h.createUser();
  const citizenToken = (await h.login(server.baseUrl, citizen.email, citizen.password)).accessToken;

  const forbidden = await h.api(server.baseUrl, "GET", "/api/authority/analytics", {
    token: citizenToken,
  });
  assert.equal(forbidden.status, 403);

  const authority = await h.createUser({ role: "authority", wardId: ward.id });
  const authorityToken = (await h.login(server.baseUrl, authority.email, authority.password)).accessToken;

  const res = await h.api(server.baseUrl, "GET", "/api/authority/analytics", {
    token: authorityToken,
  });
  assert.equal(res.status, 200);
  // Raw object (not wrapped in ApiResponse envelope).
  assert.equal(res.body.success, undefined);
  for (const key of ["categoryMap", "priority", "status", "avgResolutionTime", "trend"]) {
    assert.ok(key in res.body, `missing analytics key: ${key}`);
  }
  assert.equal(typeof res.body.avgResolutionTime, "string");
  assert.ok(Array.isArray(res.body.trend));
  assert.equal(res.body.trend.length, 4);
});

test("admin-only routes reject unauthenticated requests", async () => {
  const res = await h.api(server.baseUrl, "GET", "/api/admin/authorities");
  assert.equal(res.status, 401);
});
