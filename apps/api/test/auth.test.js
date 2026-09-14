import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RABITH_SKIP_ENV_FILE = "1";
process.env.RABITH_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rabith-auth-"));
delete process.env.ANTHROPIC_API_KEY; delete process.env.N8N_WEBHOOK_BASE; delete process.env.RABITH_AUTH_REQUIRED;
const { createApp } = await import("../src/server.js");
const { _resetAttempts } = await import("../src/routes/auth.js");

let server, base;
before(async () => { await new Promise((r) => { server = createApp().listen(0, () => { base = `http://127.0.0.1:${server.address().port}/api`; r(); }); }); });
after(() => new Promise((r) => server.close(r)));

const j = async (p, opt = {}) => {
  const headers = { "content-type": "application/json", ...(opt.token ? { authorization: `Bearer ${opt.token}` } : {}) };
  const res = await fetch(base + p, { method: opt.method || "GET", headers, body: opt.body ? JSON.stringify(opt.body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
const register = (over = {}) => j("/auth/register", { method: "POST", body: { email: `u${Math.random().toString(36).slice(2, 8)}@test.id`, password: "supersecret1", name: "Test User", role: "brand", ...over } });

test("demo accounts are seeded once on an empty install, never over real ones", async () => {
  const { ensureDemoUsers } = await import("../src/auth/users.js");
  const seeded = await ensureDemoUsers();
  assert.equal(seeded.created, 3);
  assert.equal(seeded.adminEmail, "admin@rabith.id");
  const login = await j("/auth/login", { method: "POST", body: { email: "admin@rabith.id", password: "rabith-admin" } });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, "admin");
  assert.equal((await ensureDemoUsers()).created, 0, "a second call must not touch an installation that already has users");
});

test("register: validation rejects bad email, weak password, unknown role", async () => {
  assert.equal((await register({ email: "nope" })).status, 400);
  assert.equal((await register({ password: "123" })).status, 400);
  assert.equal((await register({ password: "12345678" })).status, 400, "digits-only password must be refused");
  assert.equal((await register({ role: "admin" })).status, 400, "admin must never be self-assigned");
  assert.equal((await register({ name: " " })).status, 400);
});

test("register: brand signup creates the account, a session and a CRM brand row", async () => {
  const r = await register({ email: "founder@ziedstudio.id", name: "Zied Founder", role: "brand", company: "Zied Studio" });
  assert.equal(r.status, 201);
  assert.ok(r.body.token && r.body.expiresAt);
  assert.equal(r.body.user.role, "brand");
  assert.equal(r.body.user.email, "founder@ziedstudio.id");
  assert.equal(r.body.user.passwordHash, undefined, "the hash must never leave the API");
  assert.ok(r.body.user.brandId);
  const brand = await j("/brands/" + r.body.user.brandId, { token: r.body.token });
  assert.equal(brand.body.name, "Zied Studio");
  assert.equal(brand.body.pipeline, "lead");
  assert.equal(brand.body.source, "signup");
  assert.equal((await register({ email: "FOUNDER@ziedstudio.id" })).status, 400, "email uniqueness is case-insensitive");
});

test("login: correct password returns a session, wrong one does not, and attempts are throttled", async () => {
  _resetAttempts();
  await register({ email: "log@test.id", password: "supersecret1", name: "Log In" });
  const ok = await j("/auth/login", { method: "POST", body: { email: "log@test.id", password: "supersecret1" } });
  assert.equal(ok.status, 200); assert.ok(ok.body.token);
  const bad = await j("/auth/login", { method: "POST", body: { email: "log@test.id", password: "wrong-password" } });
  assert.equal(bad.status, 401); assert.equal(bad.body.error.code, "invalid_credentials");
  for (let i = 0; i < 8; i++) await j("/auth/login", { method: "POST", body: { email: "log@test.id", password: "still-wrong" } });
  const blocked = await j("/auth/login", { method: "POST", body: { email: "log@test.id", password: "supersecret1" } });
  assert.equal(blocked.status, 429, "the right password must not slip through the lockout");
  _resetAttempts();
  assert.equal((await j("/auth/login", { method: "POST", body: { email: "log@test.id", password: "supersecret1" } })).status, 200);
});

test("session: /auth/me needs a valid token; logout invalidates it", async () => {
  const r = await register({ email: "me@test.id" });
  const me = await j("/auth/me", { token: r.body.token });
  assert.equal(me.body.user.email, "me@test.id");
  assert.equal((await j("/auth/me")).status, 401);
  assert.equal((await j("/auth/me", { token: "not-a-real-token" })).status, 401);
  assert.equal((await j("/auth/logout", { method: "POST", token: r.body.token })).status, 200);
  assert.equal((await j("/auth/me", { token: r.body.token })).status, 401, "the token must die with the session");
});

test("profile update and password change (which signs other devices out)", async () => {
  const r = await register({ email: "prof@test.id", password: "supersecret1" });
  const other = await j("/auth/login", { method: "POST", body: { email: "prof@test.id", password: "supersecret1" } });
  const upd = await j("/auth/me", { method: "PATCH", token: r.body.token, body: { name: "Renamed", lang: "ar" } });
  assert.equal(upd.body.user.name, "Renamed"); assert.equal(upd.body.user.lang, "ar");
  assert.equal((await j("/auth/password", { method: "POST", token: r.body.token, body: { currentPassword: "wrong", newPassword: "brandnew123" } })).status, 401);
  const ch = await j("/auth/password", { method: "POST", token: r.body.token, body: { currentPassword: "supersecret1", newPassword: "brandnew123" } });
  assert.equal(ch.status, 200); assert.ok(ch.body.token);
  assert.equal((await j("/auth/me", { token: other.body.token })).status, 401, "other devices must be signed out");
  assert.equal((await j("/auth/me", { token: ch.body.token })).status, 200, "the caller keeps a working session");
  assert.equal((await j("/auth/login", { method: "POST", body: { email: "prof@test.id", password: "brandnew123" } })).status, 200);
});

test("roles: user management is admin-only and protected against self-lockout", async () => {
  const brand = await register({ email: "notadmin@test.id" });
  assert.equal((await j("/auth/users", { token: brand.body.token })).status, 403);
  assert.equal((await j("/auth/users")).status, 401);

  const admin = await j("/auth/login", { method: "POST", body: { email: "admin@rabith.id", password: "rabith-admin" } });
  assert.equal(admin.status, 200); assert.equal(admin.body.user.role, "admin");
  const list = await j("/auth/users", { token: admin.body.token });
  assert.ok(list.body.total >= 3);
  assert.ok(list.body.items.every((u) => u.passwordHash === undefined));

  const created = await j("/auth/users", { method: "POST", token: admin.body.token, body: { email: "new@test.id", password: "supersecret1", name: "New Person", role: "creator" } });
  assert.equal(created.status, 201); assert.equal(created.body.user.role, "creator");
  const promoted = await j("/auth/users/" + created.body.user.id, { method: "PATCH", token: admin.body.token, body: { role: "admin" } });
  assert.equal(promoted.body.user.role, "admin");
  assert.equal((await j("/auth/users/" + admin.body.user.id, { method: "PATCH", token: admin.body.token, body: { role: "brand" } })).status, 400);
  assert.equal((await j("/auth/users/" + admin.body.user.id, { method: "PATCH", token: admin.body.token, body: { status: "suspended" } })).status, 400);
  assert.equal((await j("/auth/users/" + admin.body.user.id, { method: "DELETE", token: admin.body.token })).status, 400);

  const victim = await register({ email: "victim@test.id", password: "supersecret1" });
  await j("/auth/users/" + victim.body.user.id, { method: "PATCH", token: admin.body.token, body: { status: "suspended" } });
  assert.equal((await j("/auth/me", { token: victim.body.token })).status, 401, "suspending must kill live sessions");
  assert.equal((await j("/auth/login", { method: "POST", body: { email: "victim@test.id", password: "supersecret1" } })).status, 401);
  assert.equal((await j("/auth/users/" + victim.body.user.id, { method: "DELETE", token: admin.body.token })).status, 200);
});

test("brand accounts only see their own brand, campaigns and outreach", async () => {
  const a = await register({ email: "a@scope.id", name: "Owner A", company: "Scope A" });
  const b = await register({ email: "b@scope.id", name: "Owner B", company: "Scope B" });
  const listA = await j("/brands", { token: a.body.token });
  assert.equal(listA.body.total, 1); assert.equal(listA.body.items[0].name, "Scope A");
  assert.equal((await j("/brands/" + b.body.user.brandId, { token: a.body.token })).status, 403);
  assert.equal((await j("/brands/" + b.body.user.brandId, { method: "PATCH", token: a.body.token, body: { pipeline: "active" } })).status, 403);

  const cp = await j("/campaigns", { method: "POST", token: a.body.token, body: { name: "Scoped campaign", brandId: b.body.user.brandId } });
  assert.equal(cp.status, 201);
  assert.equal(cp.body.brandId, a.body.user.brandId, "a brand account cannot create a campaign for someone else");
  assert.equal(cp.body.createdBy, a.body.user.id);
  assert.equal((await j("/campaigns", { token: b.body.token })).body.total, 0);
  assert.equal((await j("/campaigns/" + cp.body.id, { token: b.body.token })).status, 403);
  assert.ok((await j("/campaigns")).body.total >= 1, "the anonymous demo still sees everything");
});

test("the agent console is staff-only: customers are refused, machines and the open demo are not", async () => {
  const brand = await register({ email: "nosee@test.id" });
  assert.equal((await j("/agents", { token: brand.body.token })).status, 403, "a brand account must not even see the roster");
  assert.equal((await j("/agent/run", { method: "POST", token: brand.body.token, body: { message: "hi" } })).status, 403);
  assert.equal((await j("/agent/runs", { token: brand.body.token })).status, 403);

  const admin = await j("/auth/login", { method: "POST", body: { email: "admin@rabith.id", password: "rabith-admin" } });
  assert.equal((await j("/agents", { token: admin.body.token })).status, 200);
  assert.equal((await j("/agent/run", { method: "POST", token: admin.body.token, body: { message: "platform report", context: { lang: "en" } } })).status, 200);

  assert.equal((await j("/agents")).status, 200, "the anonymous open demo keeps working");

  process.env.RABITH_AUTH_REQUIRED = "1";
  process.env.RABITH_WEBHOOK_SECRET = "s3cret";
  try {
    assert.equal((await j("/agents")).status, 401, "with sign-in required, anonymous access closes");
    const viaSecret = await fetch(base + "/agent/run", { method: "POST", headers: { "content-type": "application/json", "x-rabith-secret": "s3cret" }, body: JSON.stringify({ message: "report", context: { lang: "en" } }) });
    assert.equal(viaSecret.status, 200, "n8n calls in with the shared secret, not a session");
  } finally { delete process.env.RABITH_AUTH_REQUIRED; delete process.env.RABITH_WEBHOOK_SECRET; }
});

test("RABITH_AUTH_REQUIRED gates every write but leaves reads and webhooks alone", async () => {
  const r = await register({ email: "gate@test.id" });
  process.env.RABITH_AUTH_REQUIRED = "1";
  try {
    assert.equal((await j("/health")).body.auth.required, true);
    assert.equal((await j("/brands")).status, 200, "reads stay open");
    assert.equal((await j("/brands", { method: "POST", body: { name: "No token" } })).status, 401);
    assert.equal((await j("/brands", { method: "POST", token: r.body.token, body: { name: "With token" } })).status, 201);
    assert.equal((await j("/webhooks/n8n", { method: "POST", body: { event: "bogus" } })).status, 400, "webhooks keep using the shared secret, not a session");
    assert.equal((await j("/auth/login", { method: "POST", body: { email: "gate@test.id", password: "supersecret1" } })).status, 200, "signing in must never require a session");
  } finally { delete process.env.RABITH_AUTH_REQUIRED; }
});
