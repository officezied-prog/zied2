import { Router } from "express";
import * as store from "../store/jsonStore.js";
import { computeFraud, explainFraud } from "../algorithms/fraud.js";
import { matchCampaign } from "../algorithms/matching.js";
import { TEMPLATES, followUpFor, deriveVars, render } from "../algorithms/outreach.js";
import { searchCreators, generateOutreach, stats, execute } from "../agents/tools.js";
import { publicList, GROUPS } from "../agents/registry.js";
import { runAgent } from "../agents/orchestrator.js";
import { createMessage, isOnline, textOf, MODEL } from "../integrations/claude.js";
import * as n8n from "../integrations/n8n.js";
import * as vision from "../integrations/vision.js";

export const api = Router();
const err = (res, status, code, message) => res.status(status).json({ error: { code, message } });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ── health / stats ── */
api.get("/health", wrap(async (_req, res) => res.json({ ok: true, mode: isOnline() ? "claude" : "offline", model: isOnline() ? MODEL : null, n8n: n8n.isConfigured(), n8nReachable: await n8n.ping(), version: "1.0.0", time: new Date().toISOString() })));
api.get("/stats", (_req, res) => res.json(stats()));
api.get("/n8n/events", (_req, res) => res.json({ items: n8n.events.slice(0, 50) }));

/* ── creators ── */
api.get("/creators", (req, res) => res.json(searchCreators(req.query)));
api.get("/creators/:id", (req, res) => { const c = store.get("creators", req.params.id); return c ? res.json(c) : err(res, 404, "not_found", "creator not found"); });
api.post("/creators", (req, res) => {
  const b = req.body || {};
  if (!b.handle || !b.platform) return err(res, 400, "validation", "handle and platform are required");
  const doc = { name: b.name || b.handle, followers: 0, following: 0, engagementRate: 0, niche: [], languages: ["id"], priceIDR: {}, audience: {}, source: "manual", ...b };
  const existing = store.all("creators").find((c) => c.handle === doc.handle && c.platform === doc.platform);
  const merged = { ...(existing || {}), ...doc };
  const saved = existing ? store.update("creators", existing.id, { ...merged, ...computeFraud(merged) }) : store.insert("creators", { ...merged, ...computeFraud(merged) });
  res.status(existing ? 200 : 201).json(saved);
});
api.post("/creators/:id/audit", (req, res) => {
  const c = store.get("creators", req.params.id); if (!c) return err(res, 404, "not_found", "creator not found");
  const f = computeFraud(c); store.update("creators", c.id, f);
  res.json({ creatorId: c.id, ...explainFraud(c), auditedAt: new Date().toISOString() });
});

/* ── brands ── */
api.get("/brands", (req, res) => {
  let items = store.all("brands"); const q = req.query;
  const s = (q.q || "").toLowerCase(); if (s) items = items.filter((b) => (b.name + " " + b.industry + " " + (b.notes || "")).toLowerCase().includes(s));
  for (const k of ["type", "pipeline", "industry", "country", "size"]) if (q[k]) items = items.filter((b) => b[k] === q[k]);
  res.json({ items, total: items.length });
});
api.get("/brands/:id", (req, res) => { const b = store.get("brands", req.params.id); return b ? res.json(b) : err(res, 404, "not_found", "brand not found"); });
api.post("/brands", (req, res) => {
  const b = req.body || {}; if (!b.name) return err(res, 400, "validation", "name is required");
  const doc = { type: "brand", industry: "", size: "smb", country: "ID", contacts: [], products: [], pipeline: "lead", source: "manual", budgetIDR: 0, ...b };
  doc.contacts = (doc.contacts || []).map((c, i) => ({ id: c.id || `ct_${Date.now().toString(36)}${i}`, lang: c.lang || (doc.country === "ID" ? "id" : "en"), ...c }));
  res.status(201).json(store.insert("brands", doc));
});
api.patch("/brands/:id", (req, res) => { const b = store.update("brands", req.params.id, req.body || {}); return b ? res.json(b) : err(res, 404, "not_found", "brand not found"); });
api.delete("/brands/:id", (req, res) => res.json({ ok: store.remove("brands", req.params.id) }));

/* ── campaigns ── */
api.get("/campaigns", (req, res) => { let items = store.all("campaigns"); if (req.query.brandId) items = items.filter((c) => c.brandId === req.query.brandId); if (req.query.status) items = items.filter((c) => c.status === req.query.status); res.json({ items, total: items.length }); });
api.get("/campaigns/:id", (req, res) => { const c = store.get("campaigns", req.params.id); return c ? res.json(c) : err(res, 404, "not_found", "campaign not found"); });
api.post("/campaigns", (req, res) => {
  const b = req.body || {}; if (!b.name) return err(res, 400, "validation", "name is required");
  if (b.brandId && !store.get("brands", b.brandId)) return err(res, 400, "validation", "unknown brandId");
  const doc = { objective: "awareness", budgetIDR: 0, kpi: { type: "reach", target: 0 }, platforms: [], niches: [], tiers: [], cities: [], languages: [], status: "draft", matches: [], plan: null, ...b };
  res.status(201).json(store.insert("campaigns", doc));
});
api.patch("/campaigns/:id", (req, res) => { const c = store.update("campaigns", req.params.id, req.body || {}); return c ? res.json(c) : err(res, 404, "not_found", "campaign not found"); });
api.post("/campaigns/:id/match", (req, res) => {
  const cp = store.get("campaigns", req.params.id); if (!cp) return err(res, 404, "not_found", "campaign not found");
  const brand = cp.brandId ? store.get("brands", cp.brandId) : null;
  const { matches, plan } = matchCampaign(store.all("creators"), cp, brand, { limit: Number(req.body?.limit || 20) });
  const updated = store.update("campaigns", cp.id, { matches, plan, status: cp.status === "draft" ? "matching" : cp.status });
  res.json(updated);
});
api.post("/match", (req, res) => { // ad-hoc brief without saving a campaign
  const brief = req.body || {}; const brand = brief.brandId ? store.get("brands", brief.brandId) : null;
  res.json(matchCampaign(store.all("creators"), brief, brand, { limit: Number(brief.limit || 20) }));
});

/* ── templates & outreach ── */
api.get("/templates", (_req, res) => res.json(TEMPLATES));
api.post("/outreach/generate", wrap(async (req, res) => {
  const { brandId, contactId, templateId, vars, personalize } = req.body || {};
  if (!brandId) return err(res, 400, "validation", "brandId is required");
  let out; try { out = generateOutreach({ brandId, contactId, templateId, vars }); } catch (e) { return err(res, 404, "not_found", e.message); }
  out.personalized = false; out.wordCount = out.body.trim().split(/\s+/).length;
  if (personalize && isOnline()) {
    const brand = store.get("brands", out.brandId);
    const msg = await createMessage({ effort: "medium", max_tokens: 2000,
      system: "You are Rabith's Sales agent. Rewrite ONLY the first paragraph of the outreach message so it opens with one specific, plausible observation about the brand (its products, market, audience or notes). Keep the rest identical, keep the language, keep under 120 words total. Return JSON {\"subject\": string, \"body\": string}.",
      messages: [{ role: "user", content: `Brand: ${JSON.stringify({ name: brand.name, industry: brand.industry, country: brand.country, products: brand.products, targetAudience: brand.targetAudience, notes: brand.notes })}\nSubject: ${out.subject}\nBody:\n${out.body}` }] });
    try { const t = textOf(msg); const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); if (j.body) { out.subject = j.subject || out.subject; out.body = j.body; out.personalized = true; } } catch { /* keep template */ }
  }
  res.json(out);
}));
api.get("/outreach", (req, res) => { let items = store.all("outreach"); if (req.query.brandId) items = items.filter((o) => o.brandId === req.query.brandId); if (req.query.status) items = items.filter((o) => o.status === req.query.status); res.json({ items: items.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), total: items.length }); });
api.post("/outreach", (req, res) => {
  const b = req.body || {}; if (!b.brandId || !b.body) return err(res, 400, "validation", "brandId and body are required");
  res.status(201).json(store.insert("outreach", { status: "draft", channel: "email", lang: "en", sequenceStep: 0, subject: "", ...b }));
});
api.post("/outreach/:id/send", wrap(async (req, res) => {
  const o = store.get("outreach", req.params.id); if (!o) return err(res, 404, "not_found", "outreach not found");
  const brand = store.get("brands", o.brandId); const contact = brand?.contacts?.find((c) => c.id === o.contactId) || brand?.contacts?.[0] || null;
  const scheduleAt = req.body?.scheduleAt || null; const channel = req.body?.channel || o.channel;
  const followUps = [1, 2].map((s) => { const t = followUpFor(o.lang, s); return t ? { step: s, delayDays: t.delayDays, ...render(t, deriveVars(brand, contact)) } : null; }).filter(Boolean);
  const rec = await n8n.trigger("rabith-outreach-send", { outreach: { ...o, channel }, brand: brand && { id: brand.id, name: brand.name, type: brand.type, country: brand.country }, contact, followUps, scheduleAt });
  const status = rec.ok ? (scheduleAt ? "scheduled" : "sent") : rec.skipped ? "scheduled" : "failed";
  const updated = store.update("outreach", o.id, { status, channel, scheduledAt: scheduleAt, sentAt: status === "sent" ? new Date().toISOString() : null, n8n: { ok: rec.ok, status: rec.status, error: rec.error, skipped: rec.skipped } });
  if (brand && ["sent", "scheduled"].includes(status) && brand.pipeline === "lead") store.update("brands", brand.id, { pipeline: "contacted", lastOutreachAt: new Date().toISOString() });
  res.json(updated);
}));

/* ── agents ── */
api.get("/agents", (_req, res) => res.json({ items: publicList(), groups: GROUPS, mode: isOnline() ? "claude" : "offline" }));
api.post("/agent/run", wrap(async (req, res) => {
  const { agent = "orchestrator", message, context = {} } = req.body || {};
  if (!message || typeof message !== "string") return err(res, 400, "validation", "message is required");
  const run = await runAgent({ agent, message, context });
  res.json(run);
}));
api.get("/agent/runs", (req, res) => { const items = [...store.all("runs")].filter((r) => !r.parentRunId || req.query.all).reverse().slice(0, Number(req.query.limit || 30)); res.json({ items }); });
api.get("/agent/runs/:id", (req, res) => { const r = store.get("runs", req.params.id); if (!r) return err(res, 404, "not_found", "run not found"); const children = store.all("runs").filter((x) => x.parentRunId === r.id); res.json({ ...r, children }); });

/* ── social ── */
api.get("/social/posts", (req, res) => { let items = store.all("posts"); if (req.query.status) items = items.filter((p) => p.status === req.query.status); if (req.query.platform) items = items.filter((p) => p.platform === req.query.platform); if (req.query.due) { const now = new Date().toISOString(); items = items.filter((p) => p.status === "scheduled" && p.scheduledAt && p.scheduledAt <= now); } res.json({ items: items.sort((a, b) => (a.scheduledAt || "") < (b.scheduledAt || "") ? -1 : 1), total: items.length }); });
api.post("/social/posts", (req, res) => { const b = req.body || {}; if (!b.platform || !b.caption) return err(res, 400, "validation", "platform and caption are required"); res.status(201).json(store.insert("posts", { account: "@rabith.id", status: b.scheduledAt ? "scheduled" : "draft", hashtags: [], lang: "id", agent: "human", ...b })); });
api.patch("/social/posts/:id", (req, res) => { const p = store.update("posts", req.params.id, req.body || {}); return p ? res.json(p) : err(res, 404, "not_found", "post not found"); });
api.post("/social/posts/:id/publish", wrap(async (req, res) => {
  const p = store.get("posts", req.params.id); if (!p) return err(res, 404, "not_found", "post not found");
  const rec = await n8n.trigger("rabith-social-publish", { post: p });
  const status = rec.ok ? "publishing" : rec.skipped ? "scheduled" : "failed";
  res.json(store.update("posts", p.id, { status, n8n: { ok: rec.ok, status: rec.status, error: rec.error, skipped: rec.skipped } }));
}));
api.post("/social/generate", wrap(async (req, res) => {
  const { topic, platform = "instagram", lang = "id", tone = "friendly", brandId } = req.body || {};
  if (!topic) return err(res, 400, "validation", "topic is required");
  const brand = brandId ? store.get("brands", brandId) : null;
  const bestTime = { instagram: "19:00 WIB", tiktok: "20:00 WIB", linkedin: "08:30 WIB", x: "12:00 WIB" }[platform] || "19:00 WIB";
  if (!isOnline()) {
    const tags = ["#Rabith", "#InfluencerMarketingIndonesia", platform === "tiktok" ? "#fyp" : "#KOL", "#UMKM"];
    const caption = lang === "ar" ? `${topic} ✨\n\nفي رابط نربط العلامات بمؤثرين موثّقين ونتائج قابلة للقياس. تواصل معنا اليوم.` : lang === "en" ? `${topic} ✨\n\nAt Rabith we connect brands with verified creators and measurable results. DM us today.` : `${topic} ✨\n\nDi Rabith kami menghubungkan brand dengan kreator terverifikasi dan hasil terukur. DM kami hari ini.`;
    return res.json({ caption, hashtags: tags, bestTime, platform, lang, mode: "offline" });
  }
  const msg = await createMessage({ effort: "medium", max_tokens: 1500,
    system: `You are Rabith's Marketing & Social Pages agent. Write one ${platform} post in language "${lang}" (ar/en/id) with tone "${tone}". Return JSON {"caption": string, "hashtags": string[]}. Hook in the first line; platform-native length (TikTok/IG ≤ 150 words, LinkedIn ≤ 220 words, X ≤ 260 chars). No emojis overload.`,
    messages: [{ role: "user", content: `Topic: ${topic}\n${brand ? "Brand context: " + JSON.stringify({ name: brand.name, industry: brand.industry, products: brand.products, targetAudience: brand.targetAudience }) : "Account: Rabith's own page (influencer platform for Indonesia)."}` }] });
  const t = textOf(msg); let j = {}; try { j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch { j = { caption: t, hashtags: [] }; }
  res.json({ caption: j.caption || t, hashtags: j.hashtags || [], bestTime, platform, lang, mode: "claude" });
}));

/* ── vision ── */
api.post("/vision/analyze", wrap(async (req, res) => {
  const { imageUrl, imageBase64, mediaType, task, context } = req.body || {};
  if (!imageUrl && !imageBase64) return err(res, 400, "validation", "imageUrl or imageBase64 is required");
  res.json(await vision.analyze({ imageUrl, imageBase64, mediaType, task, context }));
}));

/* ── webhooks (n8n → API) ── */
api.post("/webhooks/n8n", wrap(async (req, res) => {
  const secret = process.env.RABITH_WEBHOOK_SECRET;
  if (secret && req.get("x-rabith-secret") !== secret) return err(res, 401, "unauthorized", "bad secret");
  const { event, data = {} } = req.body || {};
  if (!event) return err(res, 400, "validation", "event is required");
  let result = null;
  switch (event) {
    case "lead.new": {
      const doc = { type: "brand", pipeline: "lead", source: "n8n", contacts: [], products: [], budgetIDR: 0, ...data };
      doc.contacts = (doc.contacts || []).map((c, i) => ({ id: c.id || `ct_${Date.now().toString(36)}${i}`, ...c }));
      const existing = store.all("brands").find((b) => b.name.toLowerCase() === String(doc.name || "").toLowerCase());
      const brand = existing ? store.update("brands", existing.id, doc) : store.insert("brands", doc);
      const run = await runAgent({ agent: "orchestrator", message: `Qualify this new lead and draft the first outreach message: ${brand.name}`, context: { brandId: brand.id, lang: data.lang || "en" } });
      result = { brandId: brand.id, runId: run.id, output: run.output }; break;
    }
    case "outreach.sent": { const o = store.update("outreach", data.outreachId, { status: "sent", sentAt: data.sentAt || new Date().toISOString(), sequenceStep: data.sequenceStep ?? 0, channel: data.channel }); result = o || { warning: "outreach not found" }; break; }
    case "outreach.replied": {
      const o = store.update("outreach", data.outreachId, { status: "replied", repliedAt: new Date().toISOString(), replyText: data.text });
      if (o) { store.update("brands", o.brandId, { pipeline: "replied" }); const run = await runAgent({ agent: "negotiation", message: `The brand replied to our outreach: """${data.text || ""}""". Propose the next message and the pilot offer.`, context: { brandId: o.brandId } }); result = { outreach: o, runId: run.id, output: run.output }; } else result = { warning: "outreach not found" };
      break;
    }
    case "creator.discovered": {
      const list = Array.isArray(data) ? data : data.items || [];
      const saved = list.filter((c) => c.handle && c.platform).map((c) => { const existing = store.all("creators").find((x) => x.handle === c.handle && x.platform === c.platform); const merged = { source: "n8n", niche: [], languages: ["id"], priceIDR: {}, audience: {}, ...(existing || {}), ...c }; const f = computeFraud(merged); return existing ? store.update("creators", existing.id, { ...merged, ...f }) : store.insert("creators", { ...merged, ...f }); });
      result = { upserted: saved.length, ids: saved.map((c) => c.id) }; break;
    }
    case "social.published": { result = store.update("posts", data.postId, { status: "published", publishedAt: new Date().toISOString(), url: data.url }) || { warning: "post not found" }; break; }
    case "fraud.result": { const c = store.get("creators", data.creatorId); if (c) { const merged = { ...c, ...(data.signals || {}) }; result = store.update("creators", c.id, { ...(data.signals || {}), ...computeFraud(merged), lastAuditAt: new Date().toISOString() }); } else result = { warning: "creator not found" }; break; }
    default: return err(res, 400, "unknown_event", `unknown event ${event}`);
  }
  res.json({ ok: true, handled: event, result });
}));

/* ── admin ── */
api.post("/admin/reset", (req, res) => { if (process.env.NODE_ENV === "production") return err(res, 403, "forbidden", "disabled in production"); store.reset(); res.json({ ok: true, ...stats() }); });
