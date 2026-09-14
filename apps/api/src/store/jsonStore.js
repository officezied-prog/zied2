/**
 * Minimal JSON document store with atomic writes.
 * Collections: creators, brands, campaigns, outreach, runs, posts, users, sessions.
 * Swap for Postgres/Supabase later — the API layer only uses this interface.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeFraud } from "../algorithms/fraud.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.RABITH_DATA_DIR || path.resolve(here, "../../data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const SEED_FILE = path.resolve(here, "../seed/seed.json");

const COLLECTIONS = ["creators", "brands", "campaigns", "outreach", "runs", "posts", "users", "sessions"];
const PREFIX = { creators: "cr", brands: "br", campaigns: "cp", outreach: "or", runs: "run", posts: "sp", users: "us", sessions: "se" };

let db = null;
let writeTimer = null;

function emptyDb() {
  const d = { _meta: { version: 1, seededAt: null, counters: {} } };
  for (const c of COLLECTIONS) d[c] = [];
  return d;
}

export function load() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch { db = null; }
  }
  if (!db) db = emptyDb();
  for (const c of COLLECTIONS) if (!Array.isArray(db[c])) db[c] = [];
  if (!db._meta.seededAt) seed();
  return db;
}

export function seed({ force = false } = {}) {
  if (!db) db = emptyDb();
  if (db._meta.seededAt && !force) return db;
  const s = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  db.creators = s.creators.map((c) => ({ ...c, ...computeFraud(c), createdAt: now() }));
  db.brands = s.brands.map((b) => ({ ...b, createdAt: now() }));
  db.campaigns = []; db.outreach = []; db.runs = []; db.posts = [];
  // users and sessions are deliberately preserved: re-seeding demo data must not delete accounts.
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.sessions)) db.sessions = [];
  db._meta.seededAt = now();
  db._meta.counters = { creators: db.creators.length, brands: db.brands.length };
  flush();
  return db;
}

export function reset() { db = emptyDb(); seed({ force: true }); }

function flush() {
  if (!db) return;
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}
export function save() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, 50);
}
export function flushSync() { clearTimeout(writeTimer); flush(); }

export const now = () => new Date().toISOString();

export function nextId(col) {
  const d = load();
  const n = (d._meta.counters[col] || 0) + 1;
  d._meta.counters[col] = n;
  return `${PREFIX[col]}_${String(n).padStart(4, "0")}`;
}

export function all(col) { return load()[col]; }
export function get(col, id) { return load()[col].find((x) => x.id === id) || null; }
export function insert(col, doc) {
  const d = load();
  const item = { id: doc.id || nextId(col), ...doc, createdAt: doc.createdAt || now(), updatedAt: now() };
  d[col].push(item);
  save();
  return item;
}
export function upsert(col, doc, key = "id") {
  const d = load();
  const idx = d[col].findIndex((x) => x[key] === doc[key]);
  if (idx === -1) return insert(col, doc);
  d[col][idx] = { ...d[col][idx], ...doc, updatedAt: now() };
  save();
  return d[col][idx];
}
export function update(col, id, patch) {
  const d = load();
  const idx = d[col].findIndex((x) => x.id === id);
  if (idx === -1) return null;
  d[col][idx] = { ...d[col][idx], ...patch, id, updatedAt: now() };
  save();
  return d[col][idx];
}
export function remove(col, id) {
  const d = load();
  const before = d[col].length;
  d[col] = d[col].filter((x) => x.id !== id);
  save();
  return d[col].length !== before;
}
