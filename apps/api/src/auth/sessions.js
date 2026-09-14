/**
 * Bearer-token sessions persisted in the store, so a restart does not log everyone out.
 * Only the SHA-256 of the token is stored: leaking db.json does not hand out live sessions.
 */
import * as store from "../store/jsonStore.js";
import { randomToken, sha256 } from "./passwords.js";
import { findById, publicUser } from "./users.js";

const TTL_DAYS = Number(process.env.RABITH_SESSION_DAYS || 30);

export function issue(userId, meta = {}) {
  const token = randomToken();
  const s = store.insert("sessions", {
    tokenHash: sha256(token), userId,
    expiresAt: new Date(Date.now() + TTL_DAYS * 864e5).toISOString(),
    lastSeenAt: new Date().toISOString(),
    userAgent: String(meta.userAgent || "").slice(0, 200), ip: meta.ip || null,
  });
  return { token, session: s, expiresAt: s.expiresAt };
}

export function resolve(token) {
  if (!token) return null;
  const s = store.all("sessions").find((x) => x.tokenHash === sha256(token));
  if (!s) return null;
  if (new Date(s.expiresAt) < new Date()) { store.remove("sessions", s.id); return null; }
  const user = findById(s.userId);
  if (!user || user.status !== "active") return null;
  if (Date.now() - new Date(s.lastSeenAt).getTime() > 3600e3) store.update("sessions", s.id, { lastSeenAt: new Date().toISOString() });
  return { session: s, user };
}

export const revoke = (token) => { const s = store.all("sessions").find((x) => x.tokenHash === sha256(token)); return s ? store.remove("sessions", s.id) : false; };
export const revokeAllForUser = (userId) => { let n = 0; for (const s of store.all("sessions").filter((x) => x.userId === userId)) { store.remove("sessions", s.id); n++; } return n; };
export function purgeExpired() { const now = new Date(); let n = 0; for (const s of [...store.all("sessions")]) if (new Date(s.expiresAt) < now) { store.remove("sessions", s.id); n++; } return n; }

/** Reads the token from the Authorization header (or the rabith_token cookie) and attaches req.user. */
export function attachUser(req, _res, next) {
  const h = req.get("authorization") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7).trim() : null;
  const cookie = (req.get("cookie") || "").split(";").map((c) => c.trim()).find((c) => c.startsWith("rabith_token="));
  const token = bearer || (cookie ? decodeURIComponent(cookie.split("=")[1]) : null);
  const found = token ? resolve(token) : null;
  req.token = token; req.user = found?.user || null; req.session = found?.session || null;
  next();
}

export const authRequired = () => /^(1|true|yes|on)$/i.test(String(process.env.RABITH_AUTH_REQUIRED || ""));

export function requireAuth(req, res, next) {
  if (req.user) return next();
  return res.status(401).json({ error: { code: "unauthorized", message: "sign in to continue" } });
}
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: { code: "unauthorized", message: "sign in to continue" } });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: { code: "forbidden", message: `requires role: ${roles.join(" or ")}` } });
  next();
};

export { publicUser };
