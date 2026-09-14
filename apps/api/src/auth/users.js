/**
 * User accounts. Roles:
 *   admin   — Rabith staff: full access, manages users.
 *   brand   — a company/agency account, linked to a brand record (its own campaigns).
 *   creator — an influencer account, linked to a creator profile when the handle matches.
 */
import * as store from "../store/jsonStore.js";
import { hashPassword, verifyPassword, validatePassword } from "./passwords.js";

export const ROLES = ["admin", "brand", "creator"];
export const SIGNUP_ROLES = ["brand", "creator"]; // admin is never self-assigned

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normEmail = (e) => String(e || "").trim().toLowerCase();

/** The only shape that ever leaves the API — never exposes passwordHash. */
export function publicUser(u) {
  if (!u) return null;
  const { id, email, name, role, status, brandId, creatorId, lang, avatar, createdAt, lastLoginAt } = u;
  return { id, email, name, role, status, brandId, creatorId, lang, avatar, createdAt, lastLoginAt };
}

export const findByEmail = (email) => store.all("users").find((u) => u.email === normEmail(email)) || null;
export const findById = (id) => store.get("users", id);

export function validateRegistration({ email, password, name, role }) {
  if (!EMAIL_RE.test(normEmail(email))) return "a valid email is required";
  if (!String(name || "").trim()) return "name is required";
  if (!SIGNUP_ROLES.includes(role)) return `role must be one of: ${SIGNUP_ROLES.join(", ")}`;
  const pwErr = validatePassword(password);
  if (pwErr) return pwErr;
  if (findByEmail(email)) return "an account with this email already exists";
  return null;
}

/**
 * Creates the account and its linked record:
 *  - brand signup  → a brand row in the CRM (pipeline "lead", source "signup") so real signups land in the funnel.
 *  - creator signup → links to an existing creator profile when the handle matches, otherwise leaves it unlinked.
 */
export async function createUser({ email, password, name, role, company, handle, country = "ID", lang = "id", createdBy = null }) {
  const user = {
    email: normEmail(email), name: String(name).trim(), role,
    passwordHash: await hashPassword(password),
    status: "active", brandId: null, creatorId: null, lang,
    avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(String(name).trim())}`,
    lastLoginAt: null, createdBy,
  };
  if (role === "brand") {
    const brandName = String(company || name).trim();
    const existing = store.all("brands").find((b) => b.name.toLowerCase() === brandName.toLowerCase());
    const brand = existing || store.insert("brands", {
      name: brandName, type: "brand", industry: "", size: "smb", country, website: "",
      logo: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(brandName)}`,
      contacts: [{ id: `ct_${Date.now().toString(36)}`, name: String(name).trim(), role: "Account owner", email: normEmail(email), lang }],
      products: [], targetAudience: "", budgetIDR: 0, pipeline: "lead", source: "signup", notes: "Self-registered through the platform.",
    });
    user.brandId = brand.id;
  }
  if (role === "creator" && handle) {
    const h = String(handle).trim().replace(/^@?/, "@").toLowerCase();
    const match = store.all("creators").find((c) => c.handle.toLowerCase() === h);
    if (match) user.creatorId = match.id;
    user.handle = h;
  }
  return store.insert("users", user);
}

export async function checkPassword(user, password) {
  return user && user.status === "active" && verifyPassword(password, user.passwordHash);
}

export async function setPassword(userId, password) {
  return store.update("users", userId, { passwordHash: await hashPassword(password), passwordChangedAt: new Date().toISOString() });
}

/** Demo accounts, created once on an empty user table so the login button is usable immediately. */
export async function ensureDemoUsers() {
  if (store.all("users").length) return { created: 0 };
  const adminEmail = process.env.RABITH_ADMIN_EMAIL || "admin@rabith.id";
  const adminPassword = process.env.RABITH_ADMIN_PASSWORD || "rabith-admin";
  const somethinc = store.all("brands").find((b) => b.name === "Somethinc");
  const accounts = [
    { email: adminEmail, password: adminPassword, name: "Rabith Admin", role: "admin", lang: "ar" },
    { email: "brand@rabith.id", password: "rabith-brand", name: "Rania Halim", role: "brand", company: somethinc ? somethinc.name : "Demo Brand", lang: "en" },
    { email: "creator@rabith.id", password: "rabith-creator", name: "Ayu Anggraini", role: "creator", handle: store.all("creators")[0]?.handle, lang: "id" },
  ];
  for (const a of accounts) {
    const u = await createUser({ ...a, createdBy: "seed" });
    if (a.role === "admin") store.update("users", u.id, { role: "admin" });
  }
  return { created: accounts.length, adminEmail, demo: !process.env.RABITH_ADMIN_PASSWORD };
}
