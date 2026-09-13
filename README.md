# رابط · Rabith — AI-orchestrated Influencer × Brand Platform (Indonesia)

<p dir="rtl">
منصة تربط العلامات التجارية والشركات والوكالات بصنّاع المحتوى الموثّقين في إندونيسيا، ويديرها فريق من 21 وكيلًا ذكيًا بعقل
</p>

Claude

<p dir="rtl">
وأيدٍ منفّذة عبر
</p>

n8n

<p dir="rtl">
: اكتشاف المؤثرين، كشف الاحتيال، مطابقة الحملات، التواصل البارد مع الشركات (عربي/إنجليزي/إندونيسي)، إدارة صفحات التواصل الاجتماعي، العقود والمدفوعات.
</p>

```
Brand / Company / Creator / Admin
        │  (web app · apps/web)
        ▼
┌──────────────────────────────┐        ┌─────────────────────────┐
│  Rabith API  (apps/api)      │◄──────►│  n8n  (n8n/workflows)   │
│  • data: creators, brands,   │ webhook│  • send email/WA/LinkedIn│
│    campaigns, outreach, posts│        │  • publish social posts  │
│  • algorithms: fraud, match  │        │  • scrape/enrich creators│
│  • agents: 总 orchestrator + │        │  • nightly fraud audit   │
│    20 specialists (Claude)   │        │  • notify founder        │
└──────────────────────────────┘        └─────────────────────────┘
```

## Quick start

```bash
cp .env.example .env            # add ANTHROPIC_API_KEY to enable the Claude brain (optional)
npm install
npm run dev                     # API + web app on http://localhost:8787
npm test                        # 27 tests: fraud, matching, outreach, HTTP API
```

Open http://localhost:8787 — the web app is served by the API. Without an API key the platform runs in **offline mode**: same data, same tools, a rule-based planner instead of Claude. Without `N8N_WEBHOOK_BASE` all sends/publishes are recorded as *scheduled* instead of executed.

Full stack with n8n:

```bash
docker compose up --build       # API on :8787, n8n on :5678 (import n8n/workflows/*.json)
```

## What is inside

| Path | What |
|---|---|
| `apps/web/` | Single-page app (AR/EN/ID, RTL) — Discover, Brands CRM, Campaigns, Outreach, Agents console, Social, Legal, Pricing. Works online (API) and offline (embedded seed + localStorage). |
| `apps/api/src/algorithms/fraud.js` | Fake-follower / engagement-pod / follower-spike scoring (0–100) with explainable flags. |
| `apps/api/src/algorithms/matching.js` | 8-factor creator↔campaign scoring + budget-constrained plan (greedy knapsack on quality-weighted reach per rupiah). |
| `apps/api/src/algorithms/outreach.js` | Template engine for the outreach playbook (beauty / FMCG / agency / Gulf-Arabic / local-Indonesian / follow-ups / creator WhatsApp invite). |
| `apps/api/src/agents/registry.js` | The 21 agents: role prompts + allowed tools, 5 groups. |
| `apps/api/src/agents/tools.js` | Tool schemas (Claude tool-use) + executors over the store, algorithms and n8n. |
| `apps/api/src/agents/orchestrator.js` | Plan → Act → Reflect loop with parallel tool calls and delegation; offline planner. |
| `apps/api/src/integrations/` | `claude.js` (model, effort, server-side refusal fallbacks), `n8n.js` (outbound webhooks), `vision.js` (image analysis: brand safety, product detection, quality, authenticity). |
| `apps/api/src/routes/api.js` | REST API — contract in `docs/API.md`. |
| `n8n/workflows/` | Importable workflows: outreach sequencer, inbound lead, social publisher, creator discovery, nightly fraud audit, heartbeat/weekly report, notify. |
| `docs/` | `API.md`, `ARCHITECTURE.md`, `AGENTS.md`, `N8N.md`. |
| `legacy/lamha-mobile.html` | The unrelated file that was previously at the repo root (kept untouched). |

## The agent team (总 + 20)

| Group | Agents |
|---|---|
| Core | 配 Discovery & Matching · 创 Content Studio · 约 Legal & Contracts · 智 Campaign Manager · 服 Support · 宣 Marketing & Social Pages |
| Operations | 财 Finance & Payments · 质 Quality Control · 防 Fraud Surveillance |
| Intelligence | 析 Business Analytics · 销 Sales & Growth · 留 Retention & Upsell |
| Specialized | 播 Live Commerce · 谈 Negotiation · 危 Crisis Management · 迎 Onboarding |
| Development | 势 Trend Intelligence · 育 Creator Development · 策 Brand Strategy · 群 Community |

The orchestrator receives a request (from the web app, from n8n, or from you), plans, delegates sub-tasks in parallel via the `delegate` tool, reconciles, and answers. Side-effects (send, publish, notify) always go through n8n so a human can approve drafts first. See `docs/AGENTS.md`.

## Configuration

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables Claude. Model defaults to `claude-opus-5` (`CLAUDE_MODEL`), effort `high` (`CLAUDE_EFFORT`). Server-side refusal fallbacks are on. |
| `N8N_WEBHOOK_BASE` | e.g. `http://localhost:5678/webhook`. |
| `RABITH_WEBHOOK_SECRET` | Shared secret header `x-rabith-secret` in both directions. |
| `RABITH_FOUNDER_NAME`, `RABITH_FOUNDER_PHONE` | Signature in outreach messages. |
| `RABITH_DATA_DIR` | Where `db.json` lives (default `apps/api/data`). |

## Roadmap (not in this version)
Postgres/Supabase store · auth & roles · real platform connectors (TikTok/Meta/YouTube APIs via n8n) · PrivyID e-signature · Midtrans/Xendit escrow · BPJS integration · mobile app.
