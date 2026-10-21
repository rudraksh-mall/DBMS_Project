import test, { after, before } from "node:test";
import assert from "node:assert/strict";

import * as h from "../test-utils/harness.js";

let server;
before(async () => {
  server = await h.startServer();
});
after(async () => {
  await server.close();
  await h.closePool();
});

test("login returns access + refresh tokens and /me works", async () => {
  const user = await h.createUser();
  const session = await h.login(server.baseUrl, user.email, user.password);

  assert.equal(session.user._id, String(user.id));
  assert.ok(session.accessToken);
  assert.match(session.refreshToken, /^[0-9a-f-]+\.[0-9a-f]+$/);

  const me = await h.api(server.baseUrl, "GET", "/api/auth/me", {
    token: session.accessToken,
  });
  assert.equal(me.status, 200);
  assert.equal(me.body.data._id, String(user.id));
  assert.equal(me.body.data.email, user.email);
});

test("login rejects bad password and unverified accounts", async () => {
  const user = await h.createUser();
  const bad = await h.api(server.baseUrl, "POST", "/api/auth/login", {
    body: { email: user.email, password: "wrong-password" },
  });
  assert.equal(bad.status, 400);

  const unverified = await h.createUser({ verified: false });
  const res = await h.api(server.baseUrl, "POST", "/api/auth/login", {
    body: { email: unverified.email, password: unverified.password },
  });
  assert.equal(res.status, 401);
});

test("login rejects an email that does not exist in the database", async () => {
  const res = await h.api(server.baseUrl, "POST", "/api/auth/login", {
    body: { email: `no-such-user-${h.uniq()}@test.local`, password: "Whatever@123" },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /Invalid credentials/);
  assert.equal(res.body.data, undefined);
  assert.equal(res.body.accessToken, undefined);
  assert.equal(res.body.refreshToken, undefined);
});

test("login rejects a wrong password for an existing user without issuing tokens", async () => {
  const user = await h.createUser();
  const res = await h.api(server.baseUrl, "POST", "/api/auth/login", {
    body: { email: user.email, password: "definitely-wrong" },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /Invalid credentials/);
  assert.equal(res.body.data, undefined);
});

test("protected route rejects missing/invalid tokens", async () => {
  const missing = await h.api(server.baseUrl, "GET", "/api/auth/me");
  assert.equal(missing.status, 401);

  const invalid = await h.api(server.baseUrl, "GET", "/api/auth/me", {
    token: "not-a-jwt",
  });
  assert.equal(invalid.status, 401);
});

test("refresh rotates the token and invalidates the old one", async () => {
  const user = await h.createUser();
  const session = await h.login(server.baseUrl, user.email, user.password);

  const first = await h.api(server.baseUrl, "POST", "/api/auth/refresh", {
    body: { refreshToken: session.refreshToken },
  });
  assert.equal(first.status, 200);
  assert.ok(first.body.data.accessToken);
  assert.notEqual(first.body.data.refreshToken, session.refreshToken);

  const reuse = await h.api(server.baseUrl, "POST", "/api/auth/refresh", {
    body: { refreshToken: session.refreshToken },
  });
  assert.equal(reuse.status, 401);
});

test("logout revokes the refresh session", async () => {
  const user = await h.createUser();
  const session = await h.login(server.baseUrl, user.email, user.password);

  const out = await h.api(server.baseUrl, "POST", "/api/auth/logout", {
    token: session.accessToken,
    body: { refreshToken: session.refreshToken },
  });
  assert.equal(out.status, 200);

  const reuse = await h.api(server.baseUrl, "POST", "/api/auth/refresh", {
    body: { refreshToken: session.refreshToken },
  });
  assert.equal(reuse.status, 401);
});

test("verify-otp completes registration using the stored OTP", async () => {
  const user = await h.createUser({
    verified: false,
    otpCode: "123456",
    otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  const wrong = await h.api(server.baseUrl, "POST", "/api/auth/verify-otp", {
    body: { email: user.email, otp: "000000" },
  });
  assert.equal(wrong.status, 400);

  const ok = await h.api(server.baseUrl, "POST", "/api/auth/verify-otp", {
    body: { email: user.email, otp: "123456" },
  });
  assert.equal(ok.status, 200);

  const login = await h.login(server.baseUrl, user.email, user.password);
  assert.ok(login.accessToken);
});

test("register enforces role rules without sending email", async () => {
  const missing = await h.api(server.baseUrl, "POST", "/api/auth/register", {
    body: { email: "x@test.local" },
  });
  assert.equal(missing.status, 400);

  const authority = await h.api(server.baseUrl, "POST", "/api/auth/register", {
    body: { name: "A", email: `${h.uniq()}@test.local`, password: "pw", role: "authority" },
  });
  assert.equal(authority.status, 403);

  const invalidRole = await h.api(server.baseUrl, "POST", "/api/auth/register", {
    body: { name: "A", email: `${h.uniq()}@test.local`, password: "pw", role: "superuser" },
  });
  assert.equal(invalidRole.status, 400);
});
