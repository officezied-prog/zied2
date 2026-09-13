# The Rabith Agent Team

The orchestrator (总) is the only agent the outside world talks to. It uses the `delegate` tool to run specialists as child runs (max depth 2), executes independent tool calls in parallel, and reconciles conflicting advice with a bias to caution (fraud, legal, finance override growth).

| id | Glyph | Group | Mission | Tools |
|---|---|---|---|---|
| orchestrator | 总 | core | Plan → Act → Reflect, unify the answer | delegate + all data tools |
| discovery | 配 | core | Find & rank creators for a brief/campaign | search_creators, match_campaign, fraud_audit |
| content | 创 | core | Briefs, scripts, captions (AR/EN/ID) | get_brand, get_campaign, generate_social_post |
| legal | 约 | core | KUHPerdata / UU ITE / UU PDP contracts | get_brand, get_campaign, save_note |
| campaign | 智 | core | Plan, budget split, timeline, KPIs | get_campaign, match_campaign, trigger_n8n |
| support | 服 | core | Creator & brand help | get_brand, search_creators |
| marketing | 宣 | core | Social page management (Rabith + clients) | generate_social_post, trigger_n8n |
| finance | 财 | ops | Fees, PPh, PPN, escrow schedule | get_campaign, platform_stats |
| quality | 质 | ops | Content QC vs brief | get_campaign, get_brand |
| fraud | 防 | ops | Fake followers / pods verdicts | fraud_audit, search_creators |
| analytics | 析 | intel | Reports, ROI, funnel | platform_stats, list_brands |
| sales | 销 | intel | Lead qualification + cold outreach | generate_outreach, save_outreach, update_brand |
| retention | 留 | intel | Renewals, upsell | list_brands, generate_outreach |
| live | 播 | spec | TikTok / Shopee Live runs | search_creators |
| negotiation | 谈 | spec | Rates, terms, bonus structures | search_creators, get_campaign |
| crisis | 危 | spec | 24h playbooks, statements, founder alert | save_note, trigger_n8n |
| onboarding | 迎 | spec | Checklists, WhatsApp invites | update_brand, generate_outreach |
| trend | 势 | dev | Seasonal moments, formats | search_creators |
| creatordev | 育 | dev | Academy coaching | search_creators, fraud_audit |
| strategy | 策 | dev | 90-day Indonesia GTM (Gulf bridge) | list_brands, platform_stats |
| community | 群 | dev | Private creator community programs | trigger_n8n, generate_social_post |

## How to talk to the team

```bash
curl -X POST localhost:8787/api/agent/run -H 'content-type: application/json' \
  -d '{"message":"ابحث عن 20 مؤثر نانو للتجميل في جاكرتا وافحص الاحتيال وحضّر رسالة لـ Somethinc","context":{"lang":"ar"}}'
```

Response = `AgentRun`: `plan[]` (the orchestrator's first-turn plan), `steps[]` (every tool call with input/output/ms, including delegated specialists' run ids), `output` (final answer), `usage`.

Direct specialist call: `{"agent":"fraud","message":"…","context":{"creatorId":"cr_0007"}}`.

## Adding an agent
1. Add an entry to `AGENTS` in `registry.js` (id, glyph, group, names in 3 languages, description, tools, system prompt).
2. If it needs a new capability, add a tool schema + executor in `tools.js`.
3. For offline mode, add a keyword rule and a `specialistOffline` branch in `orchestrator.js`.
4. The web app's Agents page renders the registry automatically.

## Model settings
`claude-opus-5`, adaptive thinking, effort `high` for the orchestrator and `medium` for delegated specialists, `max_tokens` 16000, prompt caching on the role prompt, server-side refusal fallbacks (`fallbacks: "default"`). Change with `CLAUDE_MODEL` / `CLAUDE_EFFORT`.
