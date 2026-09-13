/**
 * Creator ↔ campaign matching.
 *  scoreCreator(creator, campaign, brand) -> { score, breakdown, estCostIDR, estReach }
 *  buildPlan(matches, budget) -> greedy budget-constrained selection maximising quality-weighted reach.
 */
const W = { niche: 0.25, audience: 0.12, engagement: 0.15, budget: 0.10, trust: 0.18, platform: 0.10, location: 0.06, language: 0.04 };

const DELIVERABLE = { awareness: "video", sales: "video", launch: "video", ugc: "post" };
const REACH_MULT = { post: 0.35, story: 0.15, video: 1.0, live: 0.8 };

const jaccard = (a = [], b = []) => {
  const A = new Set(a.map((x) => String(x).toLowerCase())), B = new Set(b.map((x) => String(x).toLowerCase()));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
};
const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

export function scoreCreator(c, cp, brand) {
  const b = {};
  // niche relevance (partial credit for parent niche match)
  const j = jaccard(c.niche, cp.niches);
  const parentHit = (cp.niches || []).some((n) => (c.niche || []).includes(n));
  b.niche = clamp(Math.round((j * 70 + (parentHit ? 30 : 0)) * 1.2));

  // audience fit: gender + age target heuristics from brand.targetAudience text
  const ta = String(brand?.targetAudience || cp.targetAudience || "").toLowerCase();
  const fem = c.audience?.femalePct ?? 50;
  let aud = 60;
  if (/women|female|hijab|beauty|perempuan|نساء/.test(ta)) aud = fem;
  else if (/men|male|pria|رجال/.test(ta)) aud = 100 - fem;
  if (/gen z|18|student|mahasiswa|شباب/.test(ta)) aud = (aud + (c.audience?.age18_24 ?? 35) * 1.6) / 2;
  if (/25|profession|karyawan|families|keluarga|عائل/.test(ta)) aud = (aud + (c.audience?.age25_34 ?? 35) * 1.6) / 2;
  b.audience = clamp(Math.round(aud));

  // engagement quality relative to tier expectation (cap bonus so pods don't win)
  const exp = { nano: 7.5, micro: 4.8, mid: 3.1, macro: 2.0, mega: 1.4 }[c.tier] || 4;
  const r = (c.engagementRate || 0) / exp;
  b.engagement = clamp(Math.round(r >= 1 ? 80 + Math.min(20, (r - 1) * 25) : r * 80));

  // budget fit: can we afford at least one deliverable, and is the price efficient (CPM)?
  const deliverable = DELIVERABLE[cp.objective] || "post";
  const price = c.priceIDR?.[deliverable] || c.priceIDR?.post || 0;
  const estReach = Math.round((c.avgViews || c.followers * 0.3) * (REACH_MULT[deliverable] || 0.5));
  const cpm = estReach ? (price / estReach) * 1000 : 1e9; // IDR per 1000 reach
  const affordable = cp.budgetIDR ? price <= cp.budgetIDR : true;
  b.budget = clamp(Math.round(!affordable ? 5 : cpm < 20000 ? 100 : cpm < 50000 ? 85 : cpm < 100000 ? 65 : cpm < 200000 ? 45 : 25));

  b.trust = clamp(100 - (c.fraudScore ?? 30) + (c.verified ? 5 : 0));
  b.platform = (cp.platforms || []).length ? ((cp.platforms || []).includes(c.platform) ? 100 : 15) : 80;
  b.location = (cp.cities || []).length ? ((cp.cities || []).includes(c.city) ? 100 : (c.audience?.topCities || []).some((x) => cp.cities.includes(x)) ? 70 : 30) : 80;
  b.language = (cp.languages || []).length ? ((cp.languages || []).some((l) => (c.languages || []).includes(l)) ? 100 : 30) : 90;

  // tier preference is a hard-ish filter: outside requested tiers => strong penalty
  const tierOk = !(cp.tiers || []).length || cp.tiers.includes(c.tier);
  let score = 0;
  for (const k in W) score += W[k] * b[k];
  if (!tierOk) score *= 0.55;
  if ((c.fraudScore ?? 0) >= 50) score *= 0.5; // high-risk accounts never rank near the top

  return { creatorId: c.id, score: Math.round(score * 10) / 10, breakdown: b, deliverable, estCostIDR: price, estReach, cpmIDR: Math.round(cpm) };
}

export function matchCampaign(creators, campaign, brand, { limit = 20 } = {}) {
  const scored = creators.map((c) => scoreCreator(c, campaign, brand)).sort((a, b) => b.score - a.score);
  const matches = scored.slice(0, limit);
  const plan = buildPlan(matches, campaign.budgetIDR || 0);
  return { matches, plan };
}

/** Greedy knapsack by value density (score-weighted reach per rupiah), budget-constrained. */
export function buildPlan(matches, budget) {
  if (!budget) return { selected: matches.slice(0, 5).map((m) => m.creatorId), totalCostIDR: matches.slice(0, 5).reduce((s, m) => s + m.estCostIDR, 0), expectedReach: matches.slice(0, 5).reduce((s, m) => s + m.estReach, 0), note: "no budget set — top 5 by score" };
  const ranked = [...matches]
    .filter((m) => m.score >= 40 && m.estCostIDR > 0)
    .map((m) => ({ ...m, density: (m.estReach * (m.score / 100)) / m.estCostIDR }))
    .sort((a, b) => b.density - a.density);
  const selected = []; let cost = 0, reach = 0;
  for (const m of ranked) {
    if (cost + m.estCostIDR <= budget) { selected.push(m.creatorId); cost += m.estCostIDR; reach += m.estReach; }
  }
  const utilisation = Math.round((cost / budget) * 100);
  return { selected, totalCostIDR: cost, expectedReach: reach, budgetIDR: budget, utilisationPct: utilisation, avgCpmIDR: reach ? Math.round((cost / reach) * 1000) : null };
}
