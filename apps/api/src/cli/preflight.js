#!/usr/bin/env node
/**
 * Launch readiness check:  npm run preflight
 * Reads the real configuration and the real database and reports what still
 * stands between this install and paying customers. Exits 1 on any FAIL.
 */
import "../env.js";
import fs from "node:fs";
import path from "node:path";
import { ENV_FILE } from "../env.js";
import * as store from "../store/jsonStore.js";
import * as backup from "../store/backup.js";
import { checkPassword, findByEmail } from "../auth/users.js";
import { authRequired } from "../auth/sessions.js";
import { isOnline, MODEL } from "../integrations/claude.js";
import { agentsSummary } from "../agents/registry.js";

const DEMO = [["admin@rabith.id", "rabith-admin"], ["brand@rabith.id", "rabith-brand"], ["creator@rabith.id", "rabith-creator"]];

export async function collect() {
  const prod = process.env.NODE_ENV === "production";
  const checks = [];
  const add = (group, name, status, detail, fix) => checks.push({ group, name, status, detail, fix });

  /* ── configuration ── */
  const major = Number(process.version.slice(1).split(".")[0]);
  add("Configuration", "Node.js 20+", major >= 20 ? "PASS" : "FAIL", process.version, "install Node 20 or newer");
  add("Configuration", "NODE_ENV=production", prod ? "PASS" : "WARN", process.env.NODE_ENV || "development", "set NODE_ENV=production before going live");
  add("Configuration", "config file loaded", ENV_FILE ? "PASS" : "WARN", ENV_FILE || "shell environment only", "cp .env.example .env");
  add("Configuration", "Claude brain", isOnline() ? "PASS" : "FAIL", isOnline() ? MODEL : "offline rule planner", "set ANTHROPIC_API_KEY — without it the agents cannot reason");

  /* ── security ── */
  add("Security", "sign-in required", authRequired() ? "PASS" : prod ? "FAIL" : "WARN", authRequired() ? "on" : "open demo mode", "set RABITH_AUTH_REQUIRED=1");
  const live = [];
  for (const [email, password] of DEMO) { const u = findByEmail(email); if (u && await checkPassword(u, password)) live.push(email); }
  add("Security", "demo passwords retired", live.length ? "FAIL" : "PASS", live.length ? `still valid: ${live.join(", ")}` : "none in use", "npm run user -- password <email>  (or delete the demo accounts)");
  const admins = store.all("users").filter((u) => u.role === "admin" && u.status === "active");
  const realAdmins = admins.filter((u) => !DEMO.some(([e]) => e === u.email));
  add("Security", "real team accounts", realAdmins.length ? "PASS" : "WARN", `${realAdmins.length} of ${admins.length} admins are not demo accounts`, 'npm run user -- add you@yourdomain.com --name "You" --role admin');
  const secret = process.env.RABITH_WEBHOOK_SECRET || "";
  add("Security", "webhook secret", secret.length >= 16 ? "PASS" : secret ? "WARN" : process.env.N8N_WEBHOOK_BASE ? "FAIL" : "WARN", secret ? `${secret.length} characters` : "not set", "set a long random RABITH_WEBHOOK_SECRET on both sides");
  const origins = (process.env.RABITH_ALLOWED_ORIGINS || "").split(",").filter(Boolean);
  add("Security", "browser origin allowlist", !prod ? "WARN" : origins.length ? "PASS" : "WARN", origins.join(", ") || "same-origin only", "set RABITH_ALLOWED_ORIGINS if another domain calls the API");
  const url = process.env.RABITH_PUBLIC_URL || "";
  add("Security", "public URL over HTTPS", url.startsWith("https://") ? "PASS" : "WARN", url || "not set", "terminate TLS in front of the app and set RABITH_PUBLIC_URL");
  add("Security", "rate limiting", /^(0|false|off)$/i.test(String(process.env.RABITH_RATE_LIMIT ?? "")) ? "WARN" : "PASS", `${process.env.RABITH_RATE_API || 600}/min api · ${process.env.RABITH_RATE_AGENT || 60}/hour agent runs`, "leave RABITH_RATE_LIMIT unset");

  /* ── data ── */
  const creators = store.all("creators"), brands = store.all("brands");
  const seeded = creators.filter((c) => c.source === "seed").length;
  add("Data", "real creator data", seeded ? "FAIL" : creators.length ? "PASS" : "FAIL", `${creators.length} creators, ${seeded} of them generated samples`, "import real profiles (POST /api/creators or the n8n discovery workflow)");
  const realBrands = brands.filter((b) => b.source !== "seed").length;
  add("Data", "real brands", realBrands ? "PASS" : "WARN", `${realBrands} of ${brands.length} brands are not samples`, "add your own pipeline, or let signups fill it");
  const backups = backup.list();
  add("Data", "backups", backups.length ? "PASS" : "WARN", backups.length ? `${backups.length} snapshots, newest ${path.basename(backups.at(-1).file)}` : "none yet", "they run every RABITH_BACKUP_HOURS hours once the server is up");
  const dataDir = process.env.RABITH_DATA_DIR || "apps/api/data";
  let writable = true; try { fs.accessSync(dataDir, fs.constants.W_OK); } catch { writable = false; }
  add("Data", "database writable", writable ? "PASS" : "FAIL", dataDir, "check the volume mount and its permissions");
  add("Data", "storage engine", "WARN", "JSON file store (single process)", "move to Postgres before several people write at once all day");

  /* ── integrations ── */
  add("Integrations", "automation engine", process.env.N8N_WEBHOOK_BASE ? "PASS" : "WARN", process.env.N8N_WEBHOOK_BASE || "not configured", "run n8n and import n8n/workflows — nothing is sent or published without it");
  add("Integrations", "payments & escrow", "WARN", "not integrated (Midtrans / Xendit)", "wire the payment provider before you hold client money");
  add("Integrations", "e-signature", "WARN", "not integrated (PrivyID)", "wire e-signature before contracts are binding");
  const ag = agentsSummary();
  add("Integrations", "agent roster", ag.errors.length ? "FAIL" : "PASS", `${ag.total} agents${ag.custom ? `, ${ag.custom} from ${ag.file}` : ""}`, ag.errors.join("; ") || "");

  return checks;
}

const ICON = { PASS: "✓", WARN: "!", FAIL: "✗" };

export async function run(log = console.log) {
  store.load();
  const checks = await collect();
  const fails = checks.filter((c) => c.status === "FAIL");
  const warns = checks.filter((c) => c.status === "WARN");
  let group = "";
  log("\nRabith · launch readiness\n");
  for (const c of checks) {
    if (c.group !== group) { group = c.group; log(`  ${group}`); }
    log(`    ${ICON[c.status]} ${c.name.padEnd(26)} ${c.detail}`);
    if (c.status !== "PASS" && c.fix) log(`      → ${c.fix}`);
  }
  log(`\n  ${checks.length - fails.length - warns.length} passed · ${warns.length} to review · ${fails.length} blocking\n`);
  log(fails.length ? "  NOT READY — clear the blocking items above.\n" : warns.length ? "  Ready for a controlled pilot. Review the items marked ! before a public launch.\n" : "  Ready.\n");
  return { checks, fails, warns };
}

if (process.argv[1] && process.argv[1].endsWith("preflight.js")) {
  run().then(({ fails }) => process.exit(fails.length ? 1 : 0)).catch((e) => { console.error("✗ " + e.message); process.exit(1); });
}
