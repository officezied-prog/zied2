/**
 * Loads the .env file before any other module reads process.env.
 * Must be the FIRST import in server.js (ESM evaluates imports in order).
 * Real environment variables always win, so docker-compose `env_file` and
 * shell exports keep priority over the file — same semantics as dotenv's default.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export function loadEnv() {
  if (process.env.RABITH_SKIP_ENV_FILE) return null;
  const candidates = [
    process.env.RABITH_ENV_FILE,
    path.resolve(process.cwd(), ".env"),
    path.resolve(here, "../../../.env"), // repo root
    path.resolve(here, "../.env"),       // apps/api/.env
  ].filter(Boolean);
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      if (typeof process.loadEnvFile === "function") process.loadEnvFile(file);
      else parseInto(fs.readFileSync(file, "utf8"));
      return file;
    } catch (e) { console.warn(`[env] could not read ${file}: ${e.message}`); }
  }
  return null;
}

/** Fallback parser for Node < 20.12 (no process.loadEnvFile). Never overrides a set variable. */
function parseInto(text) {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export const ENV_FILE = loadEnv();
