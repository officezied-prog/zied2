import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RABITH_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rabith-test-"));
delete process.env.ANTHROPIC_API_KEY; delete process.env.N8N_WEBHOOK_BASE; process.env.RABITH_WEBHOOK_SECRET = "s3cret";
const { createApp } = await import("../src/server.js");

let server, base;
before(async () => { await new Promise((r) => { server = createApp().listen(0, () => { base = `http://127.0.0.1:${server.address().port}/api`; r(); }); }); });
after(() => new Promise((r) => server.close(r)));
const j = async (p, opt = {}) => { const res = await fetch(base + p, { method: opt.method || "GET", headers: { "content-type": "application/json", ...(opt.headers || {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined }); return { status: res.status, body: await res.json() }; };

test("health reports offline mode without credentials", async () => { const r = await j("/health"); assert.equal(r.status, 200); assert.equal(r.body.mode, "offline"); assert.equal(r.body.n8n, false); });
test("seeded creators searchable with filters + sort", async () => {
  const r = await j("/creators?niche=beauty&tier=nano,micro&maxFraud=20&platform=tiktok&limit=5");
  assert.equal(r.status, 200); assert.ok(r.body.total > 0); assert.ok(r.body.items.length <= 5);
  for (const c of r.body.items) { assert.equal(c.platform, "tiktok"); assert.ok(c.fraudScore <= 20); assert.ok(["nano", "micro"].includes(c.tier)); }
  const f = await j("/creators?sort=fraud&limit=2"); assert.ok(f.body.items[0].fraudScore >= f.body.items[1].fraudScore);
});
test("creator create computes fraud; audit explains", async () => {
  const r = await j("/creators", { method: "POST", body: { handle: "@podqueen", platform: "instagram", followers: 20000, following: 500, engagementRate: 30, genericCommentRatio: 0.8, avgViews: 3000 } });
  assert.equal(r.status, 201); assert.ok(r.body.fraudScore >= 50); const a = await j(`/creators/${r.body.id}/audit`, { method: "POST" }); assert.ok(a.body.explanation.length >= 1);
  const dup = await j("/creators", { method: "POST", body: { handle: "@podqueen", platform: "instagram", followers: 21000 } }); assert.equal(dup.status, 200); assert.equal(dup.body.id, r.body.id);
});
test("brand CRUD + pipeline patch", async () => {
  const c = await j("/brands", { method: "POST", body: { name: "Test Brand", industry: "beauty", country: "ID", contacts: [{ name: "Ani Wati", role: "KOL Manager", email: "ani@test.id" }] } });
  assert.equal(c.status, 201); assert.equal(c.body.pipeline, "lead"); assert.ok(c.body.contacts[0].id);
  const p = await j(`/brands/${c.body.id}`, { method: "PATCH", body: { pipeline: "contacted" } }); assert.equal(p.body.pipeline, "contacted");
  const l = await j("/brands?pipeline=contacted&q=test"); assert.ok(l.body.items.some((b) => b.id === c.body.id));
  assert.equal((await j("/brands/nope")).status, 404);
});
test("campaign create → match → plan within budget", async () => {
  const c = await j("/campaigns", { method: "POST", body: { brandId: "br_0001", name: "Pilot", objective: "sales", budgetIDR: 3_000_000, platforms: ["tiktok"], niches: ["beauty"], tiers: ["nano"], cities: ["Jakarta"] } });
  assert.equal(c.status, 201); const m = await j(`/campaigns/${c.body.id}/match`, { method: "POST", body: { limit: 15 } });
  assert.equal(m.status, 200); assert.equal(m.body.status, "matching"); assert.equal(m.body.matches.length, 15); assert.ok(m.body.plan.totalCostIDR <= 3_000_000); assert.ok(m.body.matches[0].score >= m.body.matches[1].score);
  assert.equal((await j("/campaigns", { method: "POST", body: { name: "x", brandId: "nope" } })).status, 400);
});
test("outreach generate → save → send (n8n unconfigured ⇒ scheduled) → brand contacted", async () => {
  const g = await j("/outreach/generate", { method: "POST", body: { brandId: "br_0016" } }); assert.equal(g.body.templateId, "gulf_ar"); assert.ok(g.body.body.includes("Fatimah"));
  const s = await j("/outreach", { method: "POST", body: { brandId: "br_0003", contactId: "ct_0003a", templateId: "local_id", lang: "id", subject: g.body.subject, body: g.body.body } }); assert.equal(s.status, 201);
  const sent = await j(`/outreach/${s.body.id}/send`, { method: "POST", body: {} }); assert.equal(sent.body.status, "scheduled"); assert.equal(sent.body.n8n.skipped, true);
  const b = await j("/brands/br_0003"); assert.equal(b.body.pipeline, "contacted");
});
test("agents list has 21 agents in 5 groups; orchestrator run works offline (ar)", async () => {
  const a = await j("/agents"); assert.equal(a.body.items.length, 21); assert.equal(Object.keys(a.body.groups).length, 5);
  const r = await j("/agent/run", { method: "POST", body: { message: "ابحث عن 3 مؤثر نانو للتجميل في جاكرتا" } });
  assert.equal(r.status, 200); assert.equal(r.body.status, "done"); assert.equal(r.body.mode, "offline"); assert.ok(r.body.plan.length >= 1); assert.ok(r.body.steps.some((s) => s.tool === "match_campaign")); assert.ok(r.body.output.includes("@"));
  const runs = await j("/agent/runs?limit=5"); assert.ok(runs.body.items.some((x) => x.id === r.body.id));
  assert.equal((await j("/agent/run", { method: "POST", body: {} })).status, 400);
});
test("specialist agent (fraud) runs offline", async () => { const r = await j("/agent/run", { method: "POST", body: { agent: "fraud", message: "audit top accounts", context: { lang: "en" } } }); assert.equal(r.body.agent, "fraud"); assert.ok(r.body.steps.some((s) => s.tool === "fraud_audit")); });
test("social generate + post + publish (offline)", async () => {
  const g = await j("/social/generate", { method: "POST", body: { topic: "Nano creators", platform: "linkedin", lang: "en" } }); assert.ok(g.body.caption.includes("Nano creators")); assert.equal(g.body.bestTime, "08:30 WIB");
  const p = await j("/social/posts", { method: "POST", body: { platform: "linkedin", caption: g.body.caption, scheduledAt: "2026-01-01T12:00:00Z" } }); assert.equal(p.body.status, "scheduled");
  const due = await j("/social/posts?due=1"); assert.ok(due.body.items.some((x) => x.id === p.body.id));
  const pub = await j(`/social/posts/${p.body.id}/publish`, { method: "POST" }); assert.equal(pub.body.status, "scheduled"); assert.equal(pub.body.n8n.skipped, true);
});
test("webhook: secret enforced; lead.new creates brand + runs orchestrator; creator.discovered upserts", async () => {
  assert.equal((await j("/webhooks/n8n", { method: "POST", body: { event: "lead.new", data: {} } })).status, 401);
  const H = { headers: { "x-rabith-secret": "s3cret" } };
  const l = await j("/webhooks/n8n", { method: "POST", ...H, body: { event: "lead.new", data: { name: "Wardah", industry: "beauty", country: "ID", contacts: [{ name: "Dina L", role: "KOL Manager", email: "d@w.id", lang: "id" }] } } });
  assert.equal(l.status, 200); assert.ok(l.body.result.brandId); assert.ok(l.body.result.output.includes("Dina"));
  const d = await j("/webhooks/n8n", { method: "POST", ...H, body: { event: "creator.discovered", data: [{ handle: "@newbie", platform: "tiktok", followers: 5000, engagementRate: 8, niche: ["food"] }, { handle: "", platform: "x" }] } });
  assert.equal(d.body.result.upserted, 1);
  assert.equal((await j("/webhooks/n8n", { method: "POST", ...H, body: { event: "bogus" } })).status, 400);
});
test("vision analyze degrades gracefully offline", async () => { const r = await j("/vision/analyze", { method: "POST", body: { imageUrl: "https://example.com/x.jpg", task: "brand_safety" } }); assert.equal(r.body.mode, "offline"); assert.equal((await j("/vision/analyze", { method: "POST", body: {} })).status, 400); });
test("stats + 404 shape", async () => { const s = await j("/stats"); assert.ok(s.body.creators >= 120); const n = await j("/nothing"); assert.equal(n.status, 404); assert.equal(n.body.error.code, "not_found"); });
