/**
 * Custom agents — add or reshape agents without touching code.
 *
 * Put a JSON file at config/agents.json (or point RABITH_AGENTS_FILE at one):
 *   [{ "id": "halal", "glyph": "清", "group": "spec",
 *      "name": { "ar": "وكيل الحلال", "en": "Halal Compliance", "id": "Kepatuhan Halal" },
 *      "description": { "ar": "…", "en": "…", "id": "…" },
 *      "tools": ["get_brand", "search_creators", "save_note"],
 *      "system": "You are the Halal Compliance agent …" }]
 *
 * Reusing a built-in id overrides only the fields you provide (prompt, tools, names),
 * so you can retune the sales agent's voice without forking the registry.
 * Invalid entries are skipped and reported — a typo never takes the platform down.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_DEFS } from "./tools.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FILE = path.resolve(here, "../../../../config/agents.json");
const LANGS = ["ar", "en", "id"];
const ID_RE = /^[a-z][a-z0-9_-]{1,30}$/;

const asML = (v) => (typeof v === "string" ? Object.fromEntries(LANGS.map((l) => [l, v])) : v);

/** Returns { agents, errors, file } — never throws, so a broken config cannot stop the server. */
export function loadCustomAgents({ groups, builtInIds } = {}) {
  const file = process.env.RABITH_AGENTS_FILE || DEFAULT_FILE;
  const out = { agents: [], errors: [], file: null };
  if (!fs.existsSync(file)) return out;
  out.file = file;
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { out.errors.push(`${path.basename(file)}: not valid JSON — ${e.message}`); return out; }

  const list = Array.isArray(raw) ? raw : Array.isArray(raw.agents) ? raw.agents : null;
  if (!list) { out.errors.push(`${path.basename(file)}: expected an array of agents, or { "agents": [...] }`); return out; }

  const seen = new Set();
  for (const [i, a] of list.entries()) {
    const where = `agent #${i + 1}${a?.id ? ` (${a.id})` : ""}`;
    if (!a || typeof a !== "object") { out.errors.push(`${where}: not an object`); continue; }
    if (!ID_RE.test(String(a.id || ""))) { out.errors.push(`${where}: id must be lowercase letters, digits, - or _`); continue; }
    if (seen.has(a.id)) { out.errors.push(`${where}: duplicate id`); continue; }
    const isOverride = builtInIds?.includes(a.id);
    if (!isOverride) {
      if (!groups || !groups[a.group]) { out.errors.push(`${where}: group must be one of ${Object.keys(groups || {}).join(", ")}`); continue; }
      if (!a.system || typeof a.system !== "string") { out.errors.push(`${where}: a system prompt is required for a new agent`); continue; }
      if (!a.name) { out.errors.push(`${where}: name is required`); continue; }
    }
    if (a.tools !== undefined) {
      if (!Array.isArray(a.tools)) { out.errors.push(`${where}: tools must be an array`); continue; }
      const unknown = a.tools.filter((t) => !TOOL_DEFS[t]);
      if (unknown.length) { out.errors.push(`${where}: unknown tools — ${unknown.join(", ")}. Available: ${Object.keys(TOOL_DEFS).join(", ")}`); continue; }
    }
    seen.add(a.id);
    const entry = { id: a.id, override: Boolean(isOverride), source: "custom" };
    if (a.glyph) entry.glyph = String(a.glyph).slice(0, 2);
    if (a.group) entry.group = a.group;
    if (a.name) entry.name = asML(a.name);
    if (a.description) entry.description = asML(a.description);
    if (a.tools) entry.tools = a.tools;
    if (a.system) entry.system = a.system;
    out.agents.push(entry);
  }
  return out;
}

/** Merges custom entries into the built-in list: same id patches in place, new id is appended. */
export function mergeAgents(builtIn, custom) {
  const merged = builtIn.map((b) => {
    const patch = custom.find((c) => c.id === b.id);
    return patch ? { ...b, ...patch, name: { ...b.name, ...(patch.name || {}) }, description: { ...b.description, ...(patch.description || {}) } } : b;
  });
  for (const c of custom) {
    if (merged.some((m) => m.id === c.id)) continue;
    merged.push({ glyph: "★", tools: ["search_creators", "get_brand", "save_note"], description: c.name, ...c });
  }
  return merged;
}
