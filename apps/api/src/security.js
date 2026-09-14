/**
 * Production hardening: response headers, an origin allowlist, and request throttling.
 * Everything is permissive in development and strict once NODE_ENV=production,
 * so nothing here gets in the way while you build.
 */
const isProd = () => process.env.NODE_ENV === "production";
const list = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

/** Security headers. The app itself is same-origin, so the policy can stay tight. */
export function securityHeaders(req, res, next) {
  res.set("x-content-type-options", "nosniff");
  res.set("x-frame-options", "DENY");
  res.set("referrer-policy", "strict-origin-when-cross-origin");
  res.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.set("cross-origin-opener-policy", "same-origin");
  if (isProd() && (req.secure || req.get("x-forwarded-proto") === "https")) {
    res.set("strict-transport-security", "max-age=15552000; includeSubDomains");
  }
  if (!/^(0|false|off)$/i.test(String(process.env.RABITH_CSP ?? ""))) {
    // 'unsafe-inline' is required by the current markup (inline styles and onerror handlers).
    res.set("content-security-policy", [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "));
  }
  next();
}

/**
 * CORS. In development any origin may call the API (handy for file:// and other ports).
 * In production only RABITH_ALLOWED_ORIGINS may, and same-origin requests need no header at all.
 */
export function cors(req, res, next) {
  const origin = req.get("origin");
  const allowed = list(process.env.RABITH_ALLOWED_ORIGINS);
  const ok = !isProd() || (origin && allowed.includes(origin));
  if (origin && ok) {
    res.set("access-control-allow-origin", origin);
    res.set("vary", "origin");
    res.set("access-control-allow-headers", "content-type, x-rabith-secret, authorization");
    res.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.set("access-control-max-age", "600");
  }
  if (req.method === "OPTIONS") return res.sendStatus(ok ? 204 : 403);
  if (origin && !ok) return res.status(403).json({ error: { code: "forbidden_origin", message: "origin not allowed" } });
  next();
}

/**
 * Fixed-window throttle, in memory. Two budgets: a wide one for the API and a
 * narrow one for agent runs, which cost real money on every call.
 */
const buckets = new Map();
export function _resetLimits() { buckets.clear(); }

function hit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { count: 1, reset: now + windowMs }); return { ok: true, remaining: limit - 1, reset: now + windowMs }; }
  b.count++;
  if (buckets.size > 10000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), reset: b.reset };
}

/** `limit` may be a function so the budget can be read from the environment per request. */
export function rateLimit({ limit, windowMs, keyFn, name }) {
  return (req, res, next) => {
    if (/^(0|false|off)$/i.test(String(process.env.RABITH_RATE_LIMIT ?? ""))) return next();
    const max = typeof limit === "function" ? limit() : limit;
    const key = `${name}:${keyFn(req)}`;
    const r = hit(key, max, windowMs);
    res.set("x-ratelimit-limit", String(max));
    res.set("x-ratelimit-remaining", String(r.remaining));
    if (r.ok) return next();
    res.set("retry-after", String(Math.ceil((r.reset - Date.now()) / 1000)));
    return res.status(429).json({ error: { code: "rate_limited", message: "too many requests — slow down" } });
  };
}

const ipOf = (req) => req.ip || req.socket?.remoteAddress || "unknown";
export const apiLimiter = rateLimit({ name: "api", limit: () => Number(process.env.RABITH_RATE_API || 600), windowMs: 60_000, keyFn: ipOf });
export const agentLimiter = rateLimit({ name: "agent", limit: () => Number(process.env.RABITH_RATE_AGENT || 60), windowMs: 60 * 60_000, keyFn: (req) => req.user?.id || ipOf(req) });
