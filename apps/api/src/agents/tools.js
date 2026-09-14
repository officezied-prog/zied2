/**
 * Tool definitions (JSON schema for Claude) + executors (local functions over the store, n8n, algorithms).
 * The same executors are used by the offline planner, so behaviour is identical with or without Claude.
 */
import * as store from "../store/jsonStore.js";
import { computeFraud, explainFraud } from "../algorithms/fraud.js";
import { matchCampaign } from "../algorithms/matching.js";
import { TEMPLATES, getTemplate, pickTemplate, deriveVars, render, followUpFor } from "../algorithms/outreach.js";
import * as n8n from "../integrations/n8n.js";

export function searchCreators(q = {}) {
  let items = store.all("creators");
  const s = (q.q || "").toLowerCase();
  if (s) items = items.filter((c) => [c.name, c.handle, c.bio, c.city, ...(c.niche || [])].join(" ").toLowerCase().includes(s));
  if (q.platform) items = items.filter((c) => c.platform === q.platform);
  if (q.niche) { const ns = String(q.niche).toLowerCase().split(",").map((x) => x.trim()); items = items.filter((c) => (c.niche || []).some((n) => ns.includes(n.toLowerCase()))); }
  if (q.tier) { const ts = String(q.tier).split(","); items = items.filter((c) => ts.includes(c.tier)); }
  if (q.city) items = items.filter((c) => c.city.toLowerCase() === String(q.city).toLowerCase() || (c.audience?.topCities || []).map((x) => x.toLowerCase()).includes(String(q.city).toLowerCase()));
  if (q.minFollowers) items = items.filter((c) => c.followers >= Number(q.minFollowers));
  if (q.maxFollowers) items = items.filter((c) => c.followers <= Number(q.maxFollowers));
  if (q.maxFraud != null && q.maxFraud !== "") items = items.filter((c) => (c.fraudScore ?? 0) <= Number(q.maxFraud));
  if (q.minEngagement) items = items.filter((c) => c.engagementRate >= Number(q.minEngagement));
  if (q.language) items = items.filter((c) => (c.languages || []).includes(q.language));
  const sort = q.sort || "score";
  const key = { followers: (c) => c.followers, engagement: (c) => c.engagementRate, fraud: (c) => (c.fraudScore ?? 0), trust: (c) => -(c.fraudScore ?? 0), price: (c) => -(c.priceIDR?.post || 0),
    score: (c) => (100 - (c.fraudScore ?? 0)) * 0.5 + Math.min(c.engagementRate, 12) * 4 + (c.verified ? 5 : 0) }[sort] || ((c) => 0);
  items = [...items].sort((a, b) => key(b) - key(a));
  const total = items.length;
  const offset = Number(q.offset || 0), limit = Math.min(Number(q.limit || 24), 200);
  return { items: items.slice(offset, offset + limit), total };
}

const slim = (c) => c && ({ id: c.id, handle: c.handle, name: c.name, platform: c.platform, tier: c.tier, followers: c.followers, engagementRate: c.engagementRate, avgViews: c.avgViews, niche: c.niche, city: c.city, languages: c.languages, priceIDR: c.priceIDR, fraudScore: c.fraudScore, fraudFlags: c.fraudFlags, verified: c.verified });

export const TOOL_DEFS = {
  delegate: { description: "Delegate a sub-task to a specialist agent. Returns the specialist's answer. Call several in parallel when sub-tasks are independent.",
    input_schema: { type: "object", properties: { agent: { type: "string", description: "Specialist id: discovery, content, legal, campaign, support, marketing, finance, quality, fraud, analytics, sales, retention, live, negotiation, crisis, onboarding, trend, creatordev, strategy, community" }, task: { type: "string", description: "Clear, self-contained instruction incl. ids (brandId, campaignId, creatorIds) the specialist needs." } }, required: ["agent", "task"] } },
  search_creators: { description: "Search the creator database with filters. Returns slim creator records incl. fraudScore (0-100, higher=riskier) and prices in IDR.",
    input_schema: { type: "object", properties: { q: { type: "string" }, platform: { type: "string", enum: ["tiktok", "instagram", "youtube"] }, niche: { type: "string", description: "comma-separated, e.g. beauty,skincare" }, tier: { type: "string", description: "comma-separated: nano,micro,mid,macro,mega" }, city: { type: "string" }, minFollowers: { type: "integer" }, maxFollowers: { type: "integer" }, maxFraud: { type: "integer" }, minEngagement: { type: "number" }, language: { type: "string" }, sort: { type: "string", enum: ["score", "followers", "engagement", "fraud", "trust", "price"], description: "fraud = riskiest first, trust = safest first" }, limit: { type: "integer" } } } },
  get_brand: { description: "Get a brand/company/client record by id (or exact name).", input_schema: { type: "object", properties: { brandId: { type: "string" }, name: { type: "string" } } } },
  list_brands: { description: "List brands/companies/agencies with optional filters.", input_schema: { type: "object", properties: { q: { type: "string" }, type: { type: "string", enum: ["brand", "agency", "company"] }, pipeline: { type: "string" }, industry: { type: "string" }, country: { type: "string" }, limit: { type: "integer" } } } },
  update_brand: { description: "Patch a brand record (pipeline stage, notes, budget…).", input_schema: { type: "object", properties: { brandId: { type: "string" }, patch: { type: "object" } }, required: ["brandId", "patch"] } },
  get_campaign: { description: "Get a campaign by id, including matches and plan if computed.", input_schema: { type: "object", properties: { campaignId: { type: "string" } }, required: ["campaignId"] } },
  match_campaign: { description: "Run AI matching for a campaign (by id) OR an ad-hoc brief. Returns ranked matches with score breakdown and a budget-optimised plan.",
    input_schema: { type: "object", properties: { campaignId: { type: "string" }, brief: { type: "object", description: "Ad-hoc: { brandId?, objective, budgetIDR, platforms[], niches[], tiers[], cities[], languages[] }" }, limit: { type: "integer" } } } },
  fraud_audit: { description: "Explain fraud/authenticity signals for one or more creators.", input_schema: { type: "object", properties: { creatorIds: { type: "array", items: { type: "string" } } }, required: ["creatorIds"] } },
  generate_outreach: { description: "Render an outreach message from a template for a brand contact. Returns subject/body with variables filled (not saved, not sent).",
    input_schema: { type: "object", properties: { brandId: { type: "string" }, contactId: { type: "string" }, templateId: { type: "string", description: "One of: " + TEMPLATES.items.map((t) => t.id).join(", ") + ". Omit to auto-pick." }, vars: { type: "object" } }, required: ["brandId"] } },
  save_outreach: { description: "Save an outreach draft (status draft) for human approval / n8n sending.", input_schema: { type: "object", properties: { brandId: { type: "string" }, contactId: { type: "string" }, templateId: { type: "string" }, lang: { type: "string" }, channel: { type: "string", enum: ["email", "linkedin", "whatsapp"] }, subject: { type: "string" }, body: { type: "string" } }, required: ["brandId", "subject", "body"] } },
  generate_social_post: { description: "Save a social post draft for a page (Rabith's or a client's).", input_schema: { type: "object", properties: { account: { type: "string" }, platform: { type: "string", enum: ["instagram", "tiktok", "linkedin", "x"] }, caption: { type: "string" }, hashtags: { type: "array", items: { type: "string" } }, lang: { type: "string" }, scheduledAt: { type: "string" }, brandId: { type: "string" } }, required: ["platform", "caption"] } },
  trigger_n8n: { description: "Fire an n8n workflow webhook (the hands). Paths: rabith-outreach-send, rabith-social-publish, rabith-discovery-scan, rabith-fraud-audit, rabith-notify.", input_schema: { type: "object", properties: { path: { type: "string" }, payload: { type: "object" } }, required: ["path", "payload"] } },
  save_note: { description: "Append a note to a brand or campaign record.", input_schema: { type: "object", properties: { brandId: { type: "string" }, campaignId: { type: "string" }, note: { type: "string" } }, required: ["note"] } },
  platform_stats: { description: "Aggregate platform statistics (counts, pipeline funnel, fraud distribution, tier mix).", input_schema: { type: "object", properties: {} } },
};

export function toolsFor(agent) {
  return agent.tools.filter((t) => TOOL_DEFS[t]).map((t) => ({ name: t, ...TOOL_DEFS[t] }));
}

export function stats() {
  const creators = store.all("creators"), brands = store.all("brands");
  const pipeline = {}; for (const b of brands) pipeline[b.pipeline || "lead"] = (pipeline[b.pipeline || "lead"] || 0) + 1;
  const tiers = {}; for (const c of creators) tiers[c.tier] = (tiers[c.tier] || 0) + 1;
  const fraud = { low: 0, medium: 0, high: 0 }; for (const c of creators) fraud[c.fraudRisk || "low"]++;
  const platforms = {}; for (const c of creators) platforms[c.platform] = (platforms[c.platform] || 0) + 1;
  const outreach = store.all("outreach"); const oStatus = {}; for (const o of outreach) oStatus[o.status] = (oStatus[o.status] || 0) + 1;
  const campaigns = store.all("campaigns");
  return { creators: creators.length, brands: brands.length, campaigns: campaigns.length, outreach: outreach.length, posts: store.all("posts").length, runs: store.all("runs").length,
    pipeline, tiers, fraud, platforms, outreachStatus: oStatus, avgEngagement: Math.round((creators.reduce((s, c) => s + c.engagementRate, 0) / (creators.length || 1)) * 100) / 100,
    verifiedPct: Math.round((creators.filter((c) => c.verified).length / (creators.length || 1)) * 100),
    campaignBudgetIDR: campaigns.reduce((s, c) => s + (c.budgetIDR || 0), 0) };
}

export function generateOutreach({ brandId, contactId, templateId, vars = {} }) {
  const brand = store.get("brands", brandId) || store.all("brands").find((b) => b.name.toLowerCase() === String(brandId).toLowerCase());
  if (!brand) throw new Error(`brand not found: ${brandId}`);
  const contact = brand.contacts?.find((c) => c.id === contactId) || brand.contacts?.[0] || null;
  const tpl = (templateId && getTemplate(templateId)) || pickTemplate(brand, contact);
  const v = deriveVars(brand, contact, vars);
  const out = render(tpl, v);
  return { brandId: brand.id, contactId: contact?.id || null, templateId: tpl.id, lang: tpl.lang, channel: tpl.channel, vars: v, ...out };
}

/** Execute a tool by name. `ctx.delegate` is injected by the orchestrator. */
export async function execute(name, input = {}, ctx = {}) {
  switch (name) {
    case "delegate": return ctx.delegate ? ctx.delegate(input.agent, input.task) : { error: "delegation unavailable in this context" };
    case "search_creators": { const r = searchCreators({ limit: 20, ...input }); return { total: r.total, items: r.items.map(slim) }; }
    case "get_brand": { const b = input.brandId ? store.get("brands", input.brandId) : null; const byName = !b && input.name ? store.all("brands").find((x) => x.name.toLowerCase().includes(String(input.name).toLowerCase())) : null; return b || byName || { error: "brand not found" }; }
    case "list_brands": { let items = store.all("brands"); const s = (input.q || "").toLowerCase(); if (s) items = items.filter((b) => (b.name + " " + b.industry + " " + (b.notes || "")).toLowerCase().includes(s)); for (const k of ["type", "pipeline", "industry", "country"]) if (input[k]) items = items.filter((b) => b[k] === input[k]); return { total: items.length, items: items.slice(0, input.limit || 30).map(({ id, name, type, industry, size, country, pipeline, budgetIDR, contacts, notes }) => ({ id, name, type, industry, size, country, pipeline, budgetIDR, contacts, notes })) }; }
    case "update_brand": { const b = store.update("brands", input.brandId, input.patch || {}); return b || { error: "brand not found" }; }
    case "get_campaign": return store.get("campaigns", input.campaignId) || { error: "campaign not found" };
    case "match_campaign": {
      let cp = input.campaignId ? store.get("campaigns", input.campaignId) : null;
      if (!cp && input.brief) cp = { id: "adhoc", ...input.brief };
      if (!cp) return { error: "campaignId or brief required" };
      const brand = cp.brandId ? store.get("brands", cp.brandId) : null;
      const { matches, plan } = matchCampaign(store.all("creators"), cp, brand, { limit: input.limit || 20 });
      if (cp.id !== "adhoc") store.update("campaigns", cp.id, { matches, plan, status: cp.status === "draft" ? "matching" : cp.status });
      const withNames = matches.map((m) => ({ ...m, creator: slim(store.get("creators", m.creatorId)) }));
      return { campaignId: cp.id, matches: withNames, plan };
    }
    case "fraud_audit": return { results: (input.creatorIds || []).map((id) => { const c = store.get("creators", id); return c ? { creatorId: id, handle: c.handle, ...explainFraud(c) } : { creatorId: id, error: "not found" }; }) };
    case "generate_outreach": return generateOutreach(input);
    case "save_outreach": { const o = store.insert("outreach", { status: "draft", sequenceStep: 0, channel: input.channel || "email", lang: input.lang || "en", ...input }); return o; }
    case "generate_social_post": { const p = store.insert("posts", { account: input.account || "@rabith.id", status: input.scheduledAt ? "scheduled" : "draft", hashtags: [], lang: "id", agent: ctx.agentId || "marketing", ...input }); return p; }
    case "trigger_n8n": return n8n.trigger(input.path, input.payload || {});
    case "save_note": {
      const stamp = `[${new Date().toISOString().slice(0, 16)} ${ctx.agentId || "agent"}] ${input.note}`;
      if (input.brandId) { const b = store.get("brands", input.brandId); if (b) store.update("brands", b.id, { notes: (b.notes ? b.notes + "\n" : "") + stamp }); }
      if (input.campaignId) { const c = store.get("campaigns", input.campaignId); if (c) store.update("campaigns", c.id, { notes: (c.notes ? c.notes + "\n" : "") + stamp }); }
      return { ok: true, note: stamp };
    }
    case "platform_stats": return stats();
    default: return { error: `unknown tool ${name}` };
  }
}

export { computeFraud, followUpFor };
