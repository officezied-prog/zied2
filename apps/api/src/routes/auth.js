import { Router } from "express";
import * as store from "../store/jsonStore.js";
import { validatePassword } from "../auth/passwords.js";
import { ROLES, SIGNUP_ROLES, createUser, findByEmail, findById, publicUser, validateRegistration, checkPassword, setPassword, normEmail } from "../auth/users.js";
import * as sessions from "../auth/sessions.js";

export const auth = Router();
const err = (res, status, code, message) => res.status(status).json({ error: { code, message } });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ── brute-force guard: per email+ip, in memory ── */
const MAX_ATTEMPTS = 8, WINDOW_MS = 15 * 60e3;
const attempts = new Map();
function tooManyAttempts(key) {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) { attempts.delete(key); return false; }
  return rec.count >= MAX_ATTEMPTS;
}
function noteFailure(key) {
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else rec.count++;
  if (attempts.size > 5000) for (const [k, v] of attempts) if (Date.now() - v.first > WINDOW_MS) attempts.delete(k);
}
const clearAttempts = (key) => attempts.delete(key);
export const _resetAttempts = () => attempts.clear();

const sessionResponse = (req, user) => {
  const { token, expiresAt } = sessions.issue(user.id, { userAgent: req.get("user-agent"), ip: req.ip });
  store.update("users", user.id, { lastLoginAt: new Date().toISOString() });
  return { token, expiresAt, user: publicUser(findById(user.id)) };
};

/* ── public ── */
auth.post("/register", wrap(async (req, res) => {
  const { email, password, name, role = "brand", company, handle, country, lang } = req.body || {};
  const problem = validateRegistration({ email, password, name, role });
  if (problem) return err(res, 400, "validation", problem);
  const user = await createUser({ email, password, name, role, company, handle, country, lang });
  res.status(201).json(sessionResponse(req, user));
}));

auth.post("/login", wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return err(res, 400, "validation", "email and password are required");
  const key = `${normEmail(email)}|${req.ip}`;
  if (tooManyAttempts(key)) return err(res, 429, "too_many_attempts", "too many failed attempts — try again in 15 minutes");
  const user = findByEmail(email);
  const ok = await checkPassword(user, password);
  if (!ok) { noteFailure(key); return err(res, 401, "invalid_credentials", "wrong email or password"); }
  clearAttempts(key);
  res.json(sessionResponse(req, user));
}));

auth.post("/logout", (req, res) => { if (req.token) sessions.revoke(req.token); res.json({ ok: true }); });

/* ── own account ── */
auth.get("/me", (req, res) => (req.user ? res.json({ user: publicUser(req.user) }) : err(res, 401, "unauthorized", "not signed in")));

auth.patch("/me", sessions.requireAuth, (req, res) => {
  const patch = {};
  if (req.body?.name !== undefined) { const n = String(req.body.name).trim(); if (!n) return err(res, 400, "validation", "name cannot be empty"); patch.name = n; }
  if (req.body?.lang !== undefined) patch.lang = String(req.body.lang).slice(0, 5);
  if (req.body?.avatar !== undefined) patch.avatar = String(req.body.avatar).slice(0, 500);
  res.json({ user: publicUser(store.update("users", req.user.id, patch)) });
});

auth.post("/password", sessions.requireAuth, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!(await checkPassword(req.user, currentPassword))) return err(res, 401, "invalid_credentials", "current password is wrong");
  const problem = validatePassword(newPassword);
  if (problem) return err(res, 400, "validation", problem);
  await setPassword(req.user.id, newPassword);
  sessions.revokeAllForUser(req.user.id); // every other device is signed out
  res.json(sessionResponse(req, findById(req.user.id)));
}));

auth.get("/sessions", sessions.requireAuth, (req, res) => {
  const items = store.all("sessions").filter((s) => s.userId === req.user.id)
    .map((s) => ({ id: s.id, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt, userAgent: s.userAgent, current: s.id === req.session?.id }));
  res.json({ items });
});
auth.delete("/sessions", sessions.requireAuth, (req, res) => {
  let n = 0;
  for (const s of store.all("sessions").filter((x) => x.userId === req.user.id && x.id !== req.session?.id)) { store.remove("sessions", s.id); n++; }
  res.json({ ok: true, revoked: n });
});

/* ── admin: user management ── */
auth.get("/users", sessions.requireRole("admin"), (req, res) => {
  let items = store.all("users").map(publicUser);
  if (req.query.role) items = items.filter((u) => u.role === req.query.role);
  if (req.query.q) { const q = String(req.query.q).toLowerCase(); items = items.filter((u) => (u.name + " " + u.email).toLowerCase().includes(q)); }
  res.json({ items, total: items.length });
});

auth.post("/users", sessions.requireRole("admin"), wrap(async (req, res) => {
  const { email, password, name, role = "brand", company, handle, lang } = req.body || {};
  if (!ROLES.includes(role)) return err(res, 400, "validation", `role must be one of: ${ROLES.join(", ")}`);
  const problem = validateRegistration({ email, password, name, role: SIGNUP_ROLES.includes(role) ? role : "brand" });
  if (problem) return err(res, 400, "validation", problem);
  const user = await createUser({ email, password, name, role: SIGNUP_ROLES.includes(role) ? role : "brand", company, handle, lang, createdBy: req.user.id });
  if (role === "admin") store.update("users", user.id, { role: "admin" });
  res.status(201).json({ user: publicUser(findById(user.id)) });
}));

auth.patch("/users/:id", sessions.requireRole("admin"), (req, res) => {
  const target = findById(req.params.id);
  if (!target) return err(res, 404, "not_found", "user not found");
  const patch = {};
  if (req.body?.role !== undefined) {
    if (!ROLES.includes(req.body.role)) return err(res, 400, "validation", `role must be one of: ${ROLES.join(", ")}`);
    if (target.id === req.user.id && req.body.role !== "admin") return err(res, 400, "validation", "you cannot remove your own admin role");
    patch.role = req.body.role;
  }
  if (req.body?.status !== undefined) {
    if (!["active", "suspended"].includes(req.body.status)) return err(res, 400, "validation", "status must be active or suspended");
    if (target.id === req.user.id && req.body.status !== "active") return err(res, 400, "validation", "you cannot suspend your own account");
    patch.status = req.body.status;
    if (req.body.status === "suspended") sessions.revokeAllForUser(target.id);
  }
  if (req.body?.name !== undefined) patch.name = String(req.body.name).trim();
  if (req.body?.brandId !== undefined) patch.brandId = req.body.brandId || null;
  if (req.body?.creatorId !== undefined) patch.creatorId = req.body.creatorId || null;
  res.json({ user: publicUser(store.update("users", target.id, patch)) });
});

auth.delete("/users/:id", sessions.requireRole("admin"), (req, res) => {
  if (req.params.id === req.user.id) return err(res, 400, "validation", "you cannot delete your own account");
  if (!findById(req.params.id)) return err(res, 404, "not_found", "user not found");
  sessions.revokeAllForUser(req.params.id);
  res.json({ ok: store.remove("users", req.params.id) });
});

auth.post("/users/:id/password", sessions.requireRole("admin"), wrap(async (req, res) => {
  const target = findById(req.params.id);
  if (!target) return err(res, 404, "not_found", "user not found");
  const problem = validatePassword(req.body?.newPassword);
  if (problem) return err(res, 400, "validation", problem);
  await setPassword(target.id, req.body.newPassword);
  sessions.revokeAllForUser(target.id);
  res.json({ ok: true, user: publicUser(findById(target.id)) });
}));
