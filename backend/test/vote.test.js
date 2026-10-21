import test, { after, before } from "node:test";
import assert from "node:assert/strict";

import * as h from "../test-utils/harness.js";

let server;
let ward;

before(async () => {
  server = await h.startServer();
  ward = await h.createWard();
});

after(async () => {
  await server.close();
  await h.closePool();
});

async function tokensFor(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await h.createUser();
    const session = await h.login(server.baseUrl, user.email, user.password);
    users.push({ user, token: session.accessToken });
  }
  return users;
}

test("upvote, duplicate rejection, and removal", async () => {
  const [citizen] = await tokensFor(1);
  const complaintId = await h.createComplaint({ reporterId: citizen.user.id, wardId: ward.id });

  const first = await h.api(server.baseUrl, "POST", `/api/vote/complaints/${complaintId}/vote`, {
    token: citizen.token,
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.upvoted, true);
  assert.equal(first.body.data.count, 1);

  const dup = await h.api(server.baseUrl, "POST", `/api/vote/complaints/${complaintId}/vote`, {
    token: citizen.token,
  });
  assert.equal(dup.status, 400);

  const remove = await h.api(server.baseUrl, "DELETE", `/api/vote/complaints/${complaintId}/vote`, {
    token: citizen.token,
  });
  assert.equal(remove.status, 200);
  assert.equal(remove.body.data.upvoted, false);
  assert.equal(remove.body.data.count, 0);

  const removeAgain = await h.api(
    server.baseUrl,
    "DELETE",
    `/api/vote/complaints/${complaintId}/vote`,
    { token: citizen.token }
  );
  assert.equal(removeAgain.status, 400);
});

test("only citizens may vote and only on existing complaints", async () => {
  const [citizen] = await tokensFor(1);
  const complaintId = await h.createComplaint({ reporterId: citizen.user.id, wardId: ward.id });

  const authority = await h.createUser({ role: "authority", wardId: ward.id });
  const authorityToken = (await h.login(server.baseUrl, authority.email, authority.password)).accessToken;

  const asAuthority = await h.api(
    server.baseUrl,
    "POST",
    `/api/vote/complaints/${complaintId}/vote`,
    { token: authorityToken }
  );
  assert.equal(asAuthority.status, 403);

  const missing = await h.api(
    server.baseUrl,
    "POST",
    "/api/vote/complaints/999999999/vote",
    { token: citizen.token }
  );
  assert.equal(missing.status, 404);
});

test("concurrent upvotes are counted exactly once each", async () => {
  const voters = await tokensFor(6);
  const complaintId = await h.createComplaint({ reporterId: voters[0].user.id, wardId: ward.id });

  const results = await Promise.all(
    voters.map((v) =>
      h.api(server.baseUrl, "POST", `/api/vote/complaints/${complaintId}/vote`, {
        token: v.token,
      })
    )
  );
  assert.ok(results.every((r) => r.status === 200));

  const [[row]] = await h.getPool().query(
    "SELECT upvote_count FROM complaints WHERE id = ?",
    [complaintId]
  );
  assert.equal(Number(row.upvote_count), voters.length);
});