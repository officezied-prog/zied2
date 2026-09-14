# Rabith Architecture

## Layers

1. **Client layer** — `apps/web` (vanilla JS SPA, RTL-first, AR/EN/ID). Talks only to `/api`. Degrades to offline mode with embedded seed data.
2. **API + brain** — `apps/api` (Node 22, Express, ESM).
   - `store/` JSON document store with atomic writes (swap for Postgres later; the API only uses `all/get/insert/update/upsert/remove`).
   - `algorithms/` pure, tested functions: fraud scoring, matching + budget plan, outreach templating.
   - `agents/` the 21-agent team. `registry.js` = who they are; `tools.js` = what they can do; `orchestrator.js` = how they run.
   - `integrations/` Claude (model, effort, fallbacks), n8n (outbound), vision.
3. **Hands** — n8n workflows (`n8n/workflows`). Every side-effect with the outside world (email, WhatsApp, LinkedIn, Instagram/TikTok publishing, scraping, notifications) lives here, so channel credentials never touch the API and every send is auditable in n8n executions.

## Request flow: "Find 20 nano beauty creators in Jakarta and draft outreach for Somethinc"

```
web → POST /api/agent/run {message, context:{lang:'ar'}}
  orchestrator (Claude, tools) 
    ├─ delegate(discovery, "…")  → specialist run → search_creators / match_campaign
    ├─ delegate(fraud, "…")      → fraud_audit
    └─ generate_outreach(brandId) → save_outreach (status draft)
  reconcile → unified answer + next actions
web ← AgentRun {plan[], steps[], output, usage}
human approves draft → POST /api/outreach/:id/send → n8n rabith-outreach-send → Gmail/WA
n8n → POST /api/webhooks/n8n {event:'outreach.sent'|'outreach.replied'} → pipeline updates → negotiation agent
```

## Design rules

- **Claude decides, n8n executes, humans approve.** Drafts (outreach, posts, contracts) are saved with status `draft`; sending requires an explicit API call that the UI exposes as a button and n8n executes.
- **Same tools online and offline.** The offline planner calls the exact tool executors Claude would call, so the product is demoable and testable without credentials.
- **Explainability.** Fraud scores carry flags and signals; match scores carry an 8-factor breakdown; agent runs carry every tool call with inputs/outputs.
- **Prompt caching.** Agent system prompts are stable and marked `cache_control`; volatile context (brand/campaign JSON, date) comes after.
- **Parallel tools.** All `tool_use` blocks in one assistant turn are executed concurrently and returned in a single user message.
- **Safety.** `fallbacks: "default"` + `stop_reason === "refusal"` handled; secrets only via env; UU PDP: minimal personal data in agent outputs.

## Data model
See `docs/API.md`. IDs: `cr_`, `br_`, `cp_`, `or_`, `run_`, `sp_`.

## Fraud model (algorithms/fraud.js)
Weighted signals → score 0–100 (higher = riskier). Strong single signals are decisive (`max(weighted*1.6, strongest*0.55)`), multiple independent flags compound (+12 / +22). Bands: SAFE < 20, REVIEW 20–49, BLOCK ≥ 50. On the seed set of 120 creators (12% synthetic fraud injected) → 103 low / 6 medium / 11 high.

## Matching model (algorithms/matching.js)
`score = 0.25 niche + 0.12 audience + 0.15 engagement + 0.10 budget(CPM) + 0.18 trust + 0.10 platform + 0.06 location + 0.04 language`, ×0.55 if outside requested tiers, ×0.5 if fraud ≥ 50. Plan = greedy selection by `(estReach × score) / cost` under budget.

## Scaling path
JSON store → Postgres (same interface) · queue agent runs (BullMQ) · SSE streaming of agent steps · per-tenant workspaces (agencies white-label) · vector search on creator content (embeddings) for semantic discovery.
