import { ENV_FILE } from "./env.js";   // must stay first: fills process.env before other modules read it
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { api } from "./routes/api.js";
import * as store from "./store/jsonStore.js";
import { isOnline, MODEL } from "./integrations/claude.js";
import * as n8n from "./integrations/n8n.js";
import { ensureDemoUsers } from "./auth/users.js";
import { agentsSummary } from "./agents/registry.js";
import { purgeExpired, authRequired } from "./auth/sessions.js";
import { securityHeaders, cors, apiLimiter } from "./security.js";
import * as backup from "./store/backup.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = process.env.RABITH_WEB_DIR || path.resolve(here, "../../web");

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", process.env.RABITH_TRUST_PROXY ? Number(process.env.RABITH_TRUST_PROXY) || 1 : false);
  app.use(securityHeaders);
  app.use(cors);
  app.use(express.json({ limit: "12mb" }));
  app.use("/api", apiLimiter, api);
  app.use(express.static(WEB_DIR, { extensions: ["html"] }));
  app.use("/api", (_req, res) => res.status(404).json({ error: { code: "not_found", message: "no such endpoint" } }));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    const status = err.status || 500;
    if (status >= 500) console.error("[api]", err);
    res.status(status).json({ error: { code: err.code || "internal", message: err.message || "internal error" } });
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  store.load();
  purgeExpired();
  backup.schedule();
  const accounts = await ensureDemoUsers();
  const port = Number(process.env.PORT || 8787);
  createApp().listen(port, () => {
    console.log(`Rabith API  → http://localhost:${port}/api   (web: ${WEB_DIR})`);
    console.log(`Brain       → ${isOnline() ? "Claude " + MODEL : "OFFLINE rule-based planner (set ANTHROPIC_API_KEY)"}`);
    console.log(`Hands (n8n) → ${n8n.isConfigured() ? process.env.N8N_WEBHOOK_BASE : "not configured (N8N_WEBHOOK_BASE)"}`);
    console.log(`Config      → ${ENV_FILE || "no .env file found (using shell environment only)"}`);
    const ag = agentsSummary();
    console.log(`Agents      → ${ag.total} total${ag.custom ? ` (${ag.custom} from ${ag.file})` : " (no custom agents — see config/agents.example.json)"}`);
    for (const e of ag.errors) console.log(`              ⚠ ${e}`);
    console.log(`Accounts    → sign-in ${authRequired() ? "REQUIRED for every write" : "optional (open demo mode)"}`);
    console.log(`Hardening   → ${process.env.NODE_ENV === "production" ? "production (origin allowlist, HSTS when behind TLS)" : "development (permissive CORS)"} · backups: ${backup.list().length}`);
    if (process.env.NODE_ENV === "production" && !authRequired()) console.log("              ⚠ running in production with open sign-in — set RABITH_AUTH_REQUIRED=1");
    if (accounts.created) {
      console.log(`              seeded ${accounts.created} accounts — admin: ${accounts.adminEmail}`);
      if (accounts.demo) console.log("              ⚠ demo passwords in use (rabith-admin / rabith-brand / rabith-creator) — set RABITH_ADMIN_PASSWORD and change them");
    }
  });
  process.on("SIGINT", () => { store.flushSync(); process.exit(0); });
  process.on("SIGTERM", () => { store.flushSync(); process.exit(0); });
}
