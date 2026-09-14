import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RABITH_SKIP_ENV_FILE = "1";
process.env.RABITH_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rabith-hard-"));
delete process.env.ANTHROPIC_API_KEY; delete process.env.N8N_WEBHOOK_BASE; delete process.env.RABITH_AUTH_REQUIRED;
const { createApp } = await import("../src/server.js");
const { _resetLimits } = await import("../src/security.js");
const backup = await import("../src/store/backup.js");
const store = await import("../src/store/jsonStore.js");

let server, base;
before(async () => { await new Promise((r) => { server = createApp().listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }); });
after(() => new Promise((r) => server.close(r)));
const call = (p, opt = {}) => fetch(base + p, opt);

test("security headers are set on every response", async () => {
  const res = await call("/api/health");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.match(res.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(res.headers.get("permissions-policy"), /camera=\(\)/);
  assert.equal(res.headers.get("x-powered-by"), null, "the server must not advertise itself");
});

test("development lets any origin call the API", async () => {
  const res = await call("/api/health", { headers: { origin: "http://localhost:5678" } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5678");
});

test("production only answers origins on the allowlist", async () => {
  process.env.NODE_ENV = "production";
  process.env.RABITH_ALLOWED_ORIGINS = "https://app.rabith.id";
  try {
    const good = await call("/api/health", { headers: { origin: "https://app.rabith.id" } });
    assert.equal(good.status, 200);
    assert.equal(good.headers.get("access-control-allow-origin"), "https://app.rabith.id");
    const bad = await call("/api/health", { headers: { origin: "https://evil.example" } });
    assert.equal(bad.status, 403);
    const sameOrigin = await call("/api/health");
    assert.equal(sameOrigin.status, 200, "same-origin requests carry no Origin header and must still work");
    const preflight = await call("/api/health", { method: "OPTIONS", headers: { origin: "https://evil.example" } });
    assert.equal(preflight.status, 403);
  } finally { delete process.env.NODE_ENV; delete process.env.RABITH_ALLOWED_ORIGINS; }
});

test("the API throttles a flood and says when to come back", async () => {
  _resetLimits();
  process.env.RABITH_RATE_API = "5";
  try {
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await call("/api/stats")).status);
    assert.deepEqual(codes.slice(0, 5), [200, 200, 200, 200, 200]);
    assert.equal(codes[5], 429);
    const limited = await call("/api/stats");
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
    assert.equal((await limited.json()).error.code, "rate_limited");
  } finally { delete process.env.RABITH_RATE_API; _resetLimits(); }
});

test("agent runs have their own hourly budget", async () => {
  _resetLimits();
  process.env.RABITH_RATE_AGENT = "2";
  try {
    const body = JSON.stringify({ message: "platform report", context: { lang: "en" } });
    const headers = { "content-type": "application/json" };
    assert.equal((await call("/api/agent/run", { method: "POST", headers, body })).status, 200);
    assert.equal((await call("/api/agent/run", { method: "POST", headers, body })).status, 200);
    assert.equal((await call("/api/agent/run", { method: "POST", headers, body })).status, 429, "the third run this hour is refused");
    assert.equal((await call("/api/stats")).status, 200, "the wider API budget is untouched");
  } finally { delete process.env.RABITH_RATE_AGENT; _resetLimits(); }
});

test("backups snapshot the database and keep only the newest files", () => {
  store.flushSync();
  const first = backup.snapshot();
  assert.ok(fs.existsSync(first));
  assert.ok(JSON.parse(fs.readFileSync(first, "utf8")).creators.length >= 120, "a snapshot is a usable database");
  for (let i = 0; i < 5; i++) fs.writeFileSync(path.join(path.dirname(first), `db-2020-01-0${i}T00-00.json`), "{}");
  backup.prune(3);
  assert.equal(backup.list().length, 3, "older snapshots are pruned");
});

test("the readiness check blocks on demo passwords, sample data and a missing brain", async () => {
  const { collect } = await import("../src/cli/preflight.js");
  const { ensureDemoUsers } = await import("../src/auth/users.js");
  await ensureDemoUsers();
  const checks = await collect();
  const by = (name) => checks.find((c) => c.name === name);
  assert.equal(by("demo passwords retired").status, "FAIL");
  assert.equal(by("real creator data").status, "FAIL");
  assert.equal(by("Claude brain").status, "FAIL");
  assert.equal(by("Node.js 20+").status, "PASS");
  assert.equal(by("agent roster").status, "PASS");
  assert.ok(checks.every((c) => ["PASS", "WARN", "FAIL"].includes(c.status)));
  assert.ok(checks.filter((c) => c.status !== "PASS").every((c) => c.fix), "every problem names its fix");
});
