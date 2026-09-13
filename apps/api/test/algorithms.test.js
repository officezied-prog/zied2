import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFraud, tierOf } from "../src/algorithms/fraud.js";
import { scoreCreator, buildPlan, matchCampaign } from "../src/algorithms/matching.js";
import { fill, pickTemplate, deriveVars, render, getTemplate, followUpFor, wordCount, TEMPLATES } from "../src/algorithms/outreach.js";

const organic = { platform: "tiktok", followers: 8000, following: 900, engagementRate: 7.2, avgViews: 6000, avgLikes: 560, avgComments: 25, growth30d: 4, genericCommentRatio: 0.1 };

test("tierOf boundaries", () => {
  assert.equal(tierOf(999), "nano"); assert.equal(tierOf(10_000), "micro"); assert.equal(tierOf(100_000), "mid"); assert.equal(tierOf(500_000), "macro"); assert.equal(tierOf(2_000_000), "mega");
});
test("fraud: organic nano account scores low", () => {
  const f = computeFraud(organic);
  assert.ok(f.fraudScore < 20, `score ${f.fraudScore}`); assert.equal(f.fraudRisk, "low"); assert.deepEqual(f.fraudFlags, []);
});
test("fraud: engagement pod + generic comments scores high", () => {
  const f = computeFraud({ ...organic, engagementRate: 24, genericCommentRatio: 0.7 });
  assert.ok(f.fraudScore >= 50, `score ${f.fraudScore}`); assert.ok(f.fraudFlags.includes("engagement_pod_suspected")); assert.ok(f.fraudFlags.includes("generic_comments"));
});
test("fraud: bought followers (tiny ER, follow-for-follow) scores high", () => {
  const f = computeFraud({ ...organic, engagementRate: 0.9, following: 7500 });
  assert.ok(f.fraudScore >= 50, `score ${f.fraudScore}`); assert.ok(f.fraudFlags.includes("bought_followers_suspected"));
});
test("fraud: follower spike without engagement is flagged", () => {
  const f = computeFraud({ ...organic, growth30d: 110, engagementRate: 3 });
  assert.ok(f.fraudFlags.includes("follower_spike")); assert.ok(f.fraudScore >= 50, `score ${f.fraudScore}`);
});
test("fraud: score is bounded 0..100 and deterministic", () => {
  const a = computeFraud({ ...organic, engagementRate: 400, growth30d: 900, genericCommentRatio: 1, following: 1e6 });
  assert.ok(a.fraudScore <= 100 && a.fraudScore >= 0); assert.equal(computeFraud(organic).fraudScore, computeFraud(organic).fraudScore);
});

const cp = { objective: "sales", budgetIDR: 5_000_000, platforms: ["tiktok"], niches: ["beauty", "skincare"], tiers: ["nano", "micro"], cities: ["Jakarta"] };
const brand = { targetAudience: "Women 18–34, urban Java" };
const good = { id: "a", ...organic, tier: "nano", niche: ["beauty", "skincare"], city: "Jakarta", priceIDR: { post: 150000, video: 400000 }, audience: { femalePct: 80, age18_24: 45, age25_34: 35, topCities: ["Jakarta"] }, fraudScore: 5, verified: true, languages: ["id"] };
const bad = { ...good, id: "b", niche: ["gaming"], platform: "youtube", city: "Medan", fraudScore: 70, audience: { femalePct: 20, age18_24: 20, age25_34: 30, topCities: ["Medan"] } };

test("matching: relevant, trusted creator outscores irrelevant risky one", () => {
  const a = scoreCreator(good, cp, brand), b = scoreCreator(bad, cp, brand);
  assert.ok(a.score > 75, `a=${a.score}`); assert.ok(b.score < 35, `b=${b.score}`);
  assert.equal(a.breakdown.platform, 100); assert.equal(a.breakdown.location, 100); assert.ok(a.breakdown.niche >= 90);
  assert.equal(a.deliverable, "video"); assert.equal(a.estCostIDR, 400000);
});
test("matching: high fraud halves the score", () => {
  const clean = scoreCreator(good, cp, brand).score, risky = scoreCreator({ ...good, fraudScore: 60 }, cp, brand).score;
  assert.ok(risky < clean * 0.6, `${risky} vs ${clean}`);
});
test("plan: greedy selection respects budget", () => {
  const matches = Array.from({ length: 30 }, (_, i) => ({ creatorId: "c" + i, score: 90 - i, estCostIDR: 300000 + i * 10000, estReach: 5000 + i * 100 }));
  const plan = buildPlan(matches, 2_000_000);
  assert.ok(plan.totalCostIDR <= 2_000_000); assert.ok(plan.selected.length >= 5); assert.ok(plan.utilisationPct > 80);
});
test("plan: no budget falls back to top 5", () => { assert.equal(buildPlan([{ creatorId: "x", score: 80, estCostIDR: 1, estReach: 1 }], 0).selected.length, 1); });
test("matchCampaign returns sorted matches with plan", () => {
  const r = matchCampaign([bad, good], cp, brand, { limit: 5 });
  assert.equal(r.matches[0].creatorId, "a"); assert.ok(r.plan.selected.includes("a")); assert.ok(!r.plan.selected.includes("b"));
});

test("outreach: template fill replaces vars and marks missing", () => {
  assert.equal(fill("Hi {{firstName}} from {{brandName}} {{ nope }}", { firstName: "Ana", brandName: "X" }), "Hi Ana from X [nope]");
});
test("outreach: template auto-pick by audience", () => {
  assert.equal(pickTemplate({ type: "agency", country: "SG" }, { lang: "en" }).id, "agency_en");
  assert.equal(pickTemplate({ type: "brand", country: "SA" }, null).id, "gulf_ar");
  assert.equal(pickTemplate({ type: "brand", country: "ID" }, { lang: "id" }).id, "local_id");
  assert.equal(pickTemplate({ type: "brand", country: "ID", industry: "fmcg" }, { lang: "en" }).id, "fmcg_en");
  assert.equal(pickTemplate({ type: "brand", country: "ID", industry: "beauty" }, { lang: "en" }).id, "beauty_en");
});
test("outreach: every template renders with derived vars and cold emails stay ≤ 150 words", () => {
  const vars = deriveVars({ name: "Somethinc", products: ["Serum"] }, { name: "Rania Halim" });
  assert.equal(vars.firstName, "Rania");
  for (const t of TEMPLATES.items) { const r = render(t, vars); assert.ok(!/\{\{/.test(r.body), t.id); if (t.channel === "email" && !t.sequenceStep) assert.ok(wordCount(r.body) <= 150, `${t.id}: ${wordCount(r.body)} words`); }
});
test("outreach: follow-ups exist per language, max two steps", () => {
  assert.equal(followUpFor("ar", 1).id, "followup1_ar"); assert.equal(followUpFor("id", 1).id, "followup1_id"); assert.equal(followUpFor("en", 2).id, "followup2_en"); assert.equal(followUpFor("en", 3), null);
  assert.ok(getTemplate("creator_invite_id").channel === "whatsapp");
});
