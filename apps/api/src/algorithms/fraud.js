/**
 * Fraud / authenticity scoring for creator accounts.
 * Pure function: (creator) -> { fraudScore 0..100 (higher = riskier), fraudFlags[], signals{} }
 *
 * Signals (each 0..1 risk contribution):
 *  - erAnomaly     : engagement far above OR below the expected band for the follower tier
 *                    (too high => engagement pods / bought likes; too low => bought followers)
 *  - followRatio   : following/followers close to 1 on small accounts => follow-for-follow growth
 *  - growthSpike   : >40% growth in 30 days without matching engagement => purchased followers
 *  - genericComments: high share of generic/emoji-only comments => comment pods / bots
 *  - viewsRatio    : avg views vs followers far below platform norm => inactive/fake audience
 *  - commentLikeRatio: comments/likes outside natural range
 */
export const EXPECTED_ER = { nano: 7.5, micro: 4.8, mid: 3.1, macro: 2.0, mega: 1.4 };
const VIEW_NORM = { tiktok: 0.6, instagram: 0.25, youtube: 0.35 };
const WEIGHTS = { erAnomaly: 0.28, followRatio: 0.12, growthSpike: 0.22, genericComments: 0.2, viewsRatio: 0.1, commentLikeRatio: 0.08 };

export function tierOf(followers) {
  if (followers < 10_000) return "nano";
  if (followers < 100_000) return "micro";
  if (followers < 500_000) return "mid";
  if (followers < 2_000_000) return "macro";
  return "mega";
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));

export function computeFraud(c) {
  const tier = c.tier || tierOf(c.followers || 0);
  const expected = EXPECTED_ER[tier];
  const er = Number(c.engagementRate ?? (c.followers ? ((c.avgLikes || 0) + (c.avgComments || 0)) / c.followers * 100 : 0));
  const ratio = expected ? er / expected : 1;

  const signals = {};
  const flags = [];

  // 1. Engagement anomaly (symmetric in log-space)
  const logDev = Math.abs(Math.log(Math.max(ratio, 0.01)));
  signals.erAnomaly = clamp01((logDev - 0.35) / 1.1); // deviation >~1.4x starts counting
  if (ratio > 2.2) flags.push("engagement_pod_suspected");
  if (ratio < 0.35) flags.push("bought_followers_suspected");

  // 2. Follow ratio (only meaningful on small accounts)
  const fr = c.followers ? (c.following || 0) / c.followers : 0;
  signals.followRatio = tier === "nano" || tier === "micro" ? clamp01((fr - 0.35) / 0.9) : 0;
  if (signals.followRatio > 0.5) flags.push("follow_for_follow");

  // 3. Growth spike without engagement
  const g = Number(c.growth30d || 0);
  signals.growthSpike = g > 40 ? clamp01(((g - 40) / 80) + (ratio < 0.8 ? 0.35 : 0)) : 0;
  if (signals.growthSpike > 0.4) flags.push("follower_spike");

  // 4. Generic comment share
  const gc = Number(c.genericCommentRatio ?? 0.12);
  signals.genericComments = clamp01((gc - 0.3) / 0.5);
  if (gc > 0.5) flags.push("generic_comments");

  // 5. Views ratio
  const vn = VIEW_NORM[c.platform] || 0.3;
  const vr = c.followers ? (c.avgViews || 0) / c.followers : vn;
  signals.viewsRatio = clamp01((vn * 0.3 - vr) / (vn * 0.3));
  if (signals.viewsRatio > 0.6) flags.push("low_reach_vs_followers");

  // 6. Comment/like ratio
  const clr = c.avgLikes ? (c.avgComments || 0) / c.avgLikes : 0.04;
  signals.commentLikeRatio = clr > 0.25 ? clamp01((clr - 0.25) / 0.5) : clr < 0.005 ? 0.5 : 0;

  let score = 0;
  for (const k of Object.keys(WEIGHTS)) score += WEIGHTS[k] * (signals[k] || 0);
  // Strong single signals are decisive on their own; multiple independent flags compound.
  const strongest = Math.max(...Object.values(signals));
  score = Math.max(score * 1.6, strongest * 0.55) + (flags.length >= 2 ? 0.12 : 0) + (flags.length >= 3 ? 0.1 : 0);
  const fraudScore = Math.round(clamp01(score) * 100);

  const risk = fraudScore < 20 ? "low" : fraudScore < 50 ? "medium" : "high";
  return { fraudScore, fraudFlags: flags, fraudRisk: risk, signals: roundAll(signals), tier };
}

function roundAll(o) { const r = {}; for (const k in o) r[k] = Math.round(o[k] * 100) / 100; return r; }

/** Human explanation for the UI / agents */
export function explainFraud(c) {
  const { fraudScore, fraudFlags, signals } = computeFraud(c);
  const lines = [];
  if (fraudFlags.includes("engagement_pod_suspected")) lines.push("Engagement is far above the norm for this follower tier — typical of engagement pods or bought likes.");
  if (fraudFlags.includes("bought_followers_suspected")) lines.push("Engagement is far below the norm — audience is likely inflated with inactive or purchased followers.");
  if (fraudFlags.includes("follower_spike")) lines.push(`Followers grew ${c.growth30d}% in 30 days without matching engagement.`);
  if (fraudFlags.includes("generic_comments")) lines.push(`${Math.round((c.genericCommentRatio || 0) * 100)}% of comments are generic/emoji-only.`);
  if (fraudFlags.includes("follow_for_follow")) lines.push("Following/followers ratio suggests follow-for-follow growth.");
  if (fraudFlags.includes("low_reach_vs_followers")) lines.push("Average views are unusually low relative to follower count.");
  if (!lines.length) lines.push("No anomalies detected; metrics are consistent with an organic audience.");
  return { fraudScore, fraudFlags, signals, explanation: lines };
}
