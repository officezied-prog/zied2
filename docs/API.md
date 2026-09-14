# Rabith API Contract (v1)

Base URL: `http://localhost:8787/api` (configurable via `PORT`).
All responses are JSON. Errors: `{ "error": { "code": string, "message": string } }`.
Auth between services: header `x-rabith-secret: $RABITH_WEBHOOK_SECRET` (required on `/webhooks/*` only).

## Entities

### Creator
```json
{
  "id": "cr_0001", "handle": "@name", "name": "…", "platform": "tiktok|instagram|youtube",
  "followers": 12500, "following": 800, "posts": 340,
  "engagementRate": 6.4, "avgViews": 9800, "avgLikes": 780, "avgComments": 42,
  "growth30d": 4.2, "genericCommentRatio": 0.12,
  "niche": ["beauty","skincare"], "city": "Jakarta", "languages": ["id","en"],
  "tier": "nano|micro|mid|macro|mega",
  "priceIDR": { "post": 350000, "story": 120000, "video": 900000, "live": 1500000 },
  "audience": { "femalePct": 78, "age18_24": 41, "age25_34": 38, "topCities": ["Jakarta","Bandung"] },
  "fraudScore": 8, "fraudFlags": [], "verified": true, "bio": "…", "avatar": "https://…",
  "contact": { "email": "…", "whatsapp": "+62…" }
}
```
### Brand / Company / Client (single entity, `type` distinguishes)
```json
{
  "id": "br_0001", "name": "Somethinc", "type": "brand|agency|company",
  "industry": "beauty", "size": "startup|smb|enterprise", "country": "ID|SA|AE|…",
  "website": "…", "logo": "…",
  "contacts": [{ "id": "ct_1", "name": "…", "role": "Brand Manager", "email": "…", "linkedin": "…", "lang": "en|ar|id" }],
  "products": ["…"], "targetAudience": "…", "budgetIDR": 150000000,
  "pipeline": "lead|contacted|replied|pilot|active|churned",
  "source": "manual|n8n|discovery", "lastOutreachAt": null, "notes": "…"
}
```
### Campaign
```json
{
  "id": "cp_0001", "brandId": "br_0001", "name": "…", "objective": "awareness|sales|launch|ugc",
  "budgetIDR": 50000000, "kpi": { "type": "reach|clicks|sales|cpa", "target": 500000 },
  "platforms": ["tiktok"], "niches": ["beauty"], "tiers": ["nano","micro"],
  "cities": ["Jakarta"], "startDate": "2026-10-01", "endDate": "2026-10-31",
  "status": "draft|matching|outreach|live|reporting|done",
  "matches": [{ "creatorId": "cr_0001", "score": 87.4, "breakdown": { "niche": 100, "audience": 80, "engagement": 90, "budget": 85, "trust": 92, "platform": 100, "location": 70 }, "estCostIDR": 350000, "estReach": 9800 }],
  "plan": { "selected": ["cr_0001"], "totalCostIDR": 0, "expectedReach": 0 }
}
```
### Outreach
```json
{ "id": "or_1", "brandId": "br_0001", "contactId": "ct_1", "templateId": "beauty_en", "lang": "en",
  "channel": "email|linkedin|whatsapp", "subject": "…", "body": "…", "sequenceStep": 0,
  "status": "draft|scheduled|sent|replied|bounced", "scheduledAt": null, "sentAt": null }
```
### AgentRun
```json
{ "id": "run_1", "agent": "orchestrator", "input": "…", "status": "running|done|error",
  "plan": ["…"], "steps": [{ "agent": "discovery", "tool": "search_creators", "input": {}, "output": {} , "ms": 120 }],
  "output": "…", "usage": { "input_tokens": 0, "output_tokens": 0 }, "mode": "claude|offline", "createdAt": "…" }
```
### SocialPost
```json
{ "id": "sp_1", "account": "@rabith.id", "platform": "instagram|tiktok|linkedin|x", "caption": "…",
  "hashtags": ["…"], "mediaUrl": null, "lang": "id", "scheduledAt": "…", "status": "draft|scheduled|published|failed", "agent": "marketing" }
```

## Endpoints

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/health` | | `{ ok, mode: "claude"\|"offline", n8n: bool, version }` |
| GET | `/creators` | `q, platform, niche, tier, city, minFollowers, maxFollowers, maxFraud, minEngagement, sort=score\|followers\|engagement\|fraud, limit, offset` | `{ items: Creator[], total }` |
| GET | `/creators/:id` | | `Creator` |
| POST | `/creators` | Creator (partial) | `Creator` (fraudScore computed) |
| POST | `/creators/:id/audit` | | `{ fraudScore, flags[], signals{} }` |
| GET | `/brands` | `q, type, pipeline, industry, country` | `{ items: Brand[], total }` |
| GET | `/brands/:id` | | `Brand` |
| POST | `/brands` | Brand (partial) | `Brand` |
| PATCH | `/brands/:id` | partial | `Brand` |
| GET | `/campaigns` | `brandId, status` | `{ items }` |
| GET | `/campaigns/:id` | | `Campaign` |
| POST | `/campaigns` | Campaign (partial) | `Campaign` (status draft) |
| PATCH | `/campaigns/:id` | partial | `Campaign` |
| POST | `/campaigns/:id/match` | `{ limit?: 20 }` | `Campaign` with `matches[]` + `plan` (budget-optimised selection) |
| GET | `/templates` | | `{ items: [{ id, name, lang, channel, audience, subject, body, vars[] }] }` |
| POST | `/outreach/generate` | `{ brandId, contactId?, templateId, lang?, vars?: {}, personalize?: bool }` | `{ subject, body, templateId, lang, personalized: bool }` |
| POST | `/outreach` | Outreach (draft) | `Outreach` |
| POST | `/outreach/:id/send` | `{ channel?, scheduleAt? }` | `Outreach` (status scheduled/sent; forwarded to n8n `rabith-outreach-send`) |
| GET | `/outreach` | `brandId, status` | `{ items }` |
| GET | `/agents` | | `{ items: [{ id, glyph, name: {ar,en,id}, group, description, tools[] }] }` |
| POST | `/agent/run` | `{ agent?: "orchestrator"\|id, message, context?: { brandId?, campaignId?, creatorId?, lang? } }` | `AgentRun` |
| GET | `/agent/runs` | `limit` | `{ items }` |
| GET | `/agent/runs/:id` | | `AgentRun` |
| GET | `/social/posts` | `status, platform` | `{ items }` |
| POST | `/social/posts` | SocialPost | `SocialPost` |
| POST | `/social/generate` | `{ topic, platform, lang, tone?, brandId? }` | `{ caption, hashtags[], bestTime }` |
| POST | `/social/posts/:id/publish` | | `SocialPost` (forwarded to n8n `rabith-social-publish`) |
| POST | `/vision/analyze` | `{ imageUrl?, imageBase64?, mediaType?, task: "brand_safety"\|"product_detection"\|"quality"\|"authenticity" }` | `{ task, findings, score, raw }` |
| GET | `/stats` | | `{ creators, brands, campaigns, outreach, runs, pipeline: {lead:n,…} }` |
| POST | `/webhooks/n8n` | `{ event, data }` (+ secret header) | `{ ok, handled: event }` |

### n8n events

Outbound (API → n8n, `POST $N8N_WEBHOOK_BASE/<path>`, header `x-rabith-secret`):

| Path | Payload | Purpose |
|---|---|---|
| `rabith-outreach-send` | `{ outreach, brand, contact }` | send email / LinkedIn / WhatsApp, then schedule follow-ups (+4d, +12d) |
| `rabith-social-publish` | `{ post }` | publish to IG / TikTok / LinkedIn / X |
| `rabith-discovery-scan` | `{ query, platform, niche }` | run scraper / API enrichment, POST results back |
| `rabith-fraud-audit` | `{ creatorIds[] }` | nightly deep audit via external APIs |
| `rabith-notify` | `{ channel, text }` | Slack / WhatsApp notification to the founder |

Inbound (n8n → API `POST /api/webhooks/n8n`):

| event | data | Effect |
|---|---|---|
| `lead.new` | Brand partial | upsert brand with `pipeline: lead`, run orchestrator "qualify lead" |
| `outreach.sent` | `{ outreachId, sentAt }` | mark sent |
| `outreach.replied` | `{ outreachId, text }` | mark replied, brand → replied, run negotiation agent |
| `creator.discovered` | Creator[] | upsert creators (fraud score computed) |
| `social.published` | `{ postId, url }` | mark published |
| `fraud.result` | `{ creatorId, signals }` | merge signals, recompute score |

n8n may also call `POST /api/agent/run` directly for any decision ("which 20 creators for this brief?").
