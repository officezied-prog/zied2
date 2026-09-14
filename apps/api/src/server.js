import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { api } from "./routes/api.js";
import * as store from "./store/jsonStore.js";
import { isOnline, MODEL } from "./integrations/claude.js";
import * as n8n from "./integrations/n8n.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = process.env.RABITH_WEB_DIR || path.resolve(here, "../../web");

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "12mb" }));
  app.use((req, res, next) => { // permissive CORS for the SPA / n8n
    res.set("access-control-allow-origin", req.get("origin") || "*");
    res.set("access-control-allow-headers", "content-type, x-rabith-secret, authorization");
    res.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use("/api", api);
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
  const port = Number(process.env.PORT || 8787);
  createApp().listen(port, () => {
    console.log(`Rabith API  → http://localhost:${port}/api   (web: ${WEB_DIR})`);
    console.log(`Brain       → ${isOnline() ? "Claude " + MODEL : "OFFLINE rule-based planner (set ANTHROPIC_API_KEY)"}`);
    console.log(`Hands (n8n) → ${n8n.isConfigured() ? process.env.N8N_WEBHOOK_BASE : "not configured (N8N_WEBHOOK_BASE)"}`);
  });
  process.on("SIGINT", () => { store.flushSync(); process.exit(0); });
  process.on("SIGTERM", () => { store.flushSync(); process.exit(0); });
}
