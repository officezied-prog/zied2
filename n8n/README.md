# Rabith · n8n workflows ("the hands")

Claude is the **brain** (orchestrator + 20 specialist agents inside `apps/api`). n8n is the **hands**:
channels (Gmail, WhatsApp, LinkedIn, X, Instagram, TikTok, Slack), schedulers, scrapers and notifications.
The protocol between them is in [`docs/N8N.md`](../docs/N8N.md); the HTTP contract is [`docs/API.md`](../docs/API.md).

```
n8n/
├── workflows/
│   ├── 01-outreach-sequencer.json   send outreach → +4d follow-up 1 → +8d follow-up 2 → stop; reply capture
│   ├── 02-inbound-lead.json         public lead form → lead.new → orchestrator → founder ping
│   ├── 03-social-publisher.json     publish to IG / TikTok / LinkedIn / X + daily 09:00 scheduler
│   ├── 04-creator-discovery.json    scraper / enrichment → creator.discovered (batches of 25) + weekly scan
│   ├── 05-fraud-audit-nightly.json  02:00 deep audit of top-200 creators → fraud.result → fraud agent summary
│   ├── 06-agent-heartbeat.json      hourly /health alarm + Monday 08:00 weekly report e-mail
│   └── 07-notify.json               single notification sink: slack / whatsapp / email
├── validate.js                      static checks against docs/API.md (run in CI)
└── README.md
```

All workflows import as **inactive**. Activate them one by one after the credentials below exist.

---

## 1. Import

**UI:** *Workflows → ⋯ → Import from File* — pick each `workflows/*.json`.
Or drag the file onto the canvas. Keep the names (`Rabith 01 · …`) so the docs match.

**CLI (inside the n8n container):**

```bash
n8n import:workflow --separate --input=/data/rabith/workflows
```

**Validate before importing** (also run in CI):

```bash
node n8n/validate.js
```

## 2. Environment variables (n8n container)

The workflows read configuration with `$env.*`, so the n8n process needs these variables
and `N8N_BLOCK_ENV_ACCESS_IN_NODE` must **not** be `true`.

| Variable | Example | Used by |
|---|---|---|
| `RABITH_API_BASE` | `http://api:8787/api` (compose) · `http://localhost:8787/api` (local) | every workflow — base URL of the Rabith API |
| `RABITH_WEBHOOK_SECRET` | `change-me` (same value as the API's `.env`) | every workflow — value of `x-rabith-secret` |
| `N8N_WEBHOOK_BASE` | `http://localhost:5678/webhook` | workflows that notify through 07 (n8n calling itself) |
| `GENERIC_TIMEZONE` | `Asia/Jakarta` | schedules (workflow settings also pin `Asia/Jakarta`) |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | `false` | allows `$env` in expressions / Code nodes |
| `FOUNDER_NOTIFY_CHANNEL` | `slack` \| `whatsapp` \| `email` | default channel for founder pings |
| `FOUNDER_EMAIL` | `founder@rabith.id` | 06 weekly report, 07 email channel |
| `FOUNDER_WHATSAPP` | `+62812…` | 07 whatsapp channel |
| `SLACK_ALERT_CHANNEL` | `#rabith-alerts` | 07 slack channel |
| `WHATSAPP_PHONE_NUMBER_ID` | `1234567890` | 01, 07 — WhatsApp Business Cloud sender |
| `WHATSAPP_VERIFY_TOKEN` | random string | 01 — Meta webhook subscription handshake |
| `IG_USER_ID` | `1784…` | 03 — Instagram professional account id |
| `LINKEDIN_ORG_ID` | `12345678` | 03 — company page (`urn:li:organization:<id>`) |
| `APIFY_ACTOR_ID`, `APIFY_TOKEN` | `apify~instagram-search-scraper` | 04 — placeholder enrichment source |
| `DISCOVERY_NICHES`, `DISCOVERY_LIMIT_PER_COMBO` | `beauty,skincare,fmcg` · `50` | 04 — weekly scan matrix |
| `FRAUD_SIGNALS_URL` | `https://api.modash.io/v1` | 05 — placeholder external audit API |

docker-compose snippet for the `n8n` service (the root compose file is owned by another engineer; add these under `environment:`):

```yaml
      - RABITH_API_BASE=http://api:8787/api
      - RABITH_WEBHOOK_SECRET=${RABITH_WEBHOOK_SECRET}
      - N8N_WEBHOOK_BASE=http://localhost:5678/webhook
      - GENERIC_TIMEZONE=Asia/Jakarta
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=false
      - FOUNDER_NOTIFY_CHANNEL=slack
      - FOUNDER_EMAIL=${FOUNDER_EMAIL}
      - FOUNDER_WHATSAPP=${FOUNDER_WHATSAPP}
      - SLACK_ALERT_CHANNEL=#rabith-alerts
      - WHATSAPP_PHONE_NUMBER_ID=${WHATSAPP_PHONE_NUMBER_ID}
      - WHATSAPP_VERIFY_TOKEN=${WHATSAPP_VERIFY_TOKEN}
      - IG_USER_ID=${IG_USER_ID}
      - LINKEDIN_ORG_ID=${LINKEDIN_ORG_ID}
```

The API side needs `N8N_WEBHOOK_BASE=http://n8n:5678/webhook` (compose) so `POST /outreach/:id/send`,
`POST /social/posts/:id/publish` etc. reach n8n.

## 3. Credentials to create in n8n

Create these under *Credentials*, then open each workflow and assign them to the nodes named below
(the nodes carry a note saying which credential they expect). Credentials are **not** embedded in the JSON.

| Credential (n8n type) | Suggested name | Nodes |
|---|---|---|
| **Gmail OAuth2** (`gmailOAuth2`) | `Rabith Gmail` | 01 `Send email (Gmail)`, 01 `Gmail reply trigger`, 06 `Email report to founder`, 07 `Email to founder` |
| **Header Auth** — `Authorization: Bearer <WhatsApp system-user token>` | `WhatsApp Cloud API` | 01 `Send WhatsApp`, 07 `WhatsApp to founder` |
| **Header Auth** — `Authorization: Bearer <Page/IG token with instagram_content_publish>` | `Meta Graph` | 03 `IG create container`, `IG publish`, `IG permalink` |
| **Header Auth** — `Authorization: Bearer <TikTok access token (video.publish)>` | `TikTok` | 03 `TikTok direct post` |
| **Header Auth** — `Authorization: Bearer <LinkedIn token (w_organization_social)>` | `LinkedIn` | 03 `LinkedIn ugcPost` |
| **Header Auth** — `Authorization: Bearer <X OAuth 2.0 user-context token (tweet.write)>` | `X API` | 03 `X create tweet` |
| **Header Auth** — vendor key for the fraud/enrichment API | `Fraud signals API` | 05 `External signals` |
| **Slack API** (`slackApi`, bot token with `chat:write`) | `Rabith Slack` | 07 `Slack message` |

Instead of Header Auth you can switch the HTTP Request nodes to n8n's built-in OAuth2 credentials
(*Authentication → Predefined → LinkedIn / X / Facebook Graph*); the request bodies do not change.

The Apify node in 04 uses `$env.APIFY_TOKEN` in the query string and needs no credential
(swap it for Modash / HypeAuditor / your own scraper — only the `Map to Creator schema` Code node knows the field names).

## 4. The secret header — how trust works both ways

* **API → n8n**: every webhook the API calls (`rabith-outreach-send`, `rabith-social-publish`, `rabith-discovery-scan`,
  `rabith-fraud-audit`, `rabith-notify`) carries `x-rabith-secret: $RABITH_WEBHOOK_SECRET`.
  The first node after each Webhook trigger is `Verify secret` (IF). A mismatch answers **401** and stops.
* **n8n → API**: every HTTP Request node that talks to the API sends the same header
  (`validate.js` fails if one does not). The API only *requires* it on `/webhooks/n8n`, but sending it everywhere costs nothing.
* **Public entry points** (no secret, because the caller is a browser / Meta):
  `rabith-lead` (validated + honeypot in the Code node) and `rabith-whatsapp-inbound`
  (GET handshake checked against `WHATSAPP_VERIFY_TOKEN`; POST payloads only produce an effect when the sender matches a known contact).
  Put these two behind your reverse proxy's rate limiting.

## 5. Workflow ↔ API map

| Workflow | Trigger(s) | API endpoints called | Inbound events posted |
|---|---|---|---|
| **01 Outreach Sequencer** | Webhook `rabith-outreach-send`; Gmail poll (15 min); Webhook `rabith-whatsapp-inbound` (GET+POST) | `POST /webhooks/n8n`, `GET /brands/:id`, `GET /outreach?brandId=`, `POST /outreach/generate`, `POST /outreach`, `POST /outreach/:id/send`, `GET /outreach?status=sent`, `GET /brands` | `outreach.sent`, `outreach.replied` |
| **02 Inbound Lead** | Webhook `rabith-lead` (public) | `POST /webhooks/n8n`, `GET /brands?q=&pipeline=lead`, `POST /agent/run` (orchestrator) | `lead.new` |
| **03 Social Publisher** | Webhook `rabith-social-publish`; Schedule daily 09:00 | `POST /webhooks/n8n`, `GET /social/posts?status=scheduled`, `POST /social/posts/:id/publish` | `social.published` |
| **04 Creator Discovery** | Webhook `rabith-discovery-scan`; Schedule Monday 06:00 | `POST /webhooks/n8n` (batches of 25) | `creator.discovered` |
| **05 Fraud Audit Nightly** | Schedule 02:00; Webhook `rabith-fraud-audit` | `GET /creators?sort=followers&limit=200`, `GET /creators/:id`, `POST /webhooks/n8n`, `GET /creators?sort=fraud&limit=25`, `POST /agent/run` (fraud) | `fraud.result` |
| **06 Agent Heartbeat** | Schedule hourly; Schedule Monday 08:00 | `GET /health`, `GET /stats`, `POST /agent/run` (analytics) | — |
| **07 Notify** | Webhook `rabith-notify` | — (Slack / WhatsApp / Gmail) | — |

Workflows 01–06 all send founder notifications by POSTing to `rabith-notify` (workflow 07), so 07 must be active first.

### Sequencer state machine (01)

```
step 0  send ──► outreach.sent ──► wait 4d ──► reply? ──no──► generate followup1_<lang> ──► POST /outreach (step 1) ──► POST /outreach/:id/send
                                                 │yes                                                                      │
                                                 ▼                                                                         ▼ (API forwards to rabith-outreach-send)
                                               stop                                                    step 1  send ──► wait 8d ──► reply? ──no──► followup2 (step 2) ──► send
                                                                                                                                                       │
                                                                                                                             step 2  send ──► "Sequence complete" (never a 3rd)
```

Every step is its **own execution** and the API's `Outreach.sequenceStep` is the only state — restarting n8n never loses a sequence,
and re-sending an already-sent outreach is a no-op (`route = skip`).

## 6. Testing with curl

Set `N8N=http://localhost:5678/webhook` (use `/webhook-test/` while the workflow is open in *Test workflow* mode) and
`SECRET=$RABITH_WEBHOOK_SECRET`.

**01 — outreach**

```bash
curl -s -X POST $N8N/rabith-outreach-send -H "x-rabith-secret: $SECRET" -H 'content-type: application/json' -d '{
  "outreach": { "id": "or_test1", "brandId": "br_0001", "contactId": "ct_1", "templateId": "beauty_en", "lang": "en",
                "channel": "email", "subject": "Nano-creator network for Somethinc", "body": "Hi Dina, …", "sequenceStep": 0, "status": "scheduled" },
  "brand":   { "id": "br_0001", "name": "Somethinc", "pipeline": "contacted", "contacts": [{ "id": "ct_1", "name": "Dina Putri", "email": "you+test@gmail.com", "lang": "en" }] },
  "contact": { "id": "ct_1", "name": "Dina Putri", "email": "you+test@gmail.com", "lang": "en" }
}'
# → {"ok":true,"accepted":"or_test1","step":0}; a wrong secret → 401
```

Simulate a WhatsApp reply (Meta payload shape):

```bash
curl -s -X POST $N8N/rabith-whatsapp-inbound -H 'content-type: application/json' -d '{
  "entry":[{"changes":[{"value":{"messages":[{"from":"6281234567890","id":"wamid.test","type":"text","text":{"body":"Ya, tertarik. Kirim brief-nya."}}]}}]}]}'
curl -s "$N8N/rabith-whatsapp-inbound?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=12345"   # → 12345
```

**02 — lead**

```bash
curl -s -X POST $N8N/rabith-lead -H 'content-type: application/json' -d '{
  "company": "Azarine Cosmetics", "name": "Rani S.", "email": "rani@azarine.co.id", "industry": "beauty",
  "budget": "75.000.000", "lang": "id", "website": "https://azarine.co.id", "message": "Ingin coba kampanye nano-creator untuk sunscreen baru" }'
# → {"ok":true,"message":"Terima kasih! …"}; missing email → 400
```

**03 — social**

```bash
curl -s -X POST $N8N/rabith-social-publish -H "x-rabith-secret: $SECRET" -H 'content-type: application/json' -d '{
  "post": { "id": "sp_test1", "account": "@rabith.id", "platform": "x", "caption": "Creator marketing that pays for results.", "hashtags": ["influencer","Indonesia"], "mediaUrl": null, "lang": "en" } }'
```

**04 — discovery**

```bash
curl -s -X POST $N8N/rabith-discovery-scan -H "x-rabith-secret: $SECRET" -H 'content-type: application/json' \
  -d '{ "query": "skincare jakarta", "platform": "instagram", "niche": "skincare" }'
```

**05 — fraud audit (on demand)**

```bash
curl -s -X POST $N8N/rabith-fraud-audit -H "x-rabith-secret: $SECRET" -H 'content-type: application/json' -d '{ "creatorIds": ["cr_0001","cr_0002"] }'
```

**06 — heartbeat / weekly report** — open the workflow and press *Test workflow* on either Schedule node,
or temporarily point `RABITH_API_BASE` at a dead port to see the 🔴 alert (alerts are de-duplicated for 6 h via workflow static data).

**07 — notify**

```bash
curl -s -X POST $N8N/rabith-notify -H "x-rabith-secret: $SECRET" -H 'content-type: application/json' -d '{ "channel": "slack", "text": "hello from curl" }'
```

**End-to-end through the API** (what the product actually does):

```bash
API=http://localhost:8787/api
curl -s -X POST $API/outreach -H 'content-type: application/json' -d '{"brandId":"br_0001","contactId":"ct_1","templateId":"beauty_en","lang":"en","channel":"email","subject":"…","body":"…"}'
curl -s -X POST $API/outreach/or_1/send -d '{}'          # → API forwards to rabith-outreach-send
curl -s -X POST $API/social/posts/sp_1/publish -d '{}'   # → API forwards to rabith-social-publish
```

## 7. Operating notes

* **Retries**: API calls retry 3× (2 s apart). Agent runs (`/agent/run`) do not retry — a slow Claude run must not be run twice.
  External channel calls use *continue on error* and report failure through 07 instead of crashing the execution.
* **Idempotency keys**: `outreachId` (01), `postId` (03), `creatorId + auditedAt` (05), brand name + email (02). See `docs/N8N.md`.
* **Timezone**: all schedules are `Asia/Jakarta` (workflow setting). Nightly audit 02:00, social publish 09:00, discovery Monday 06:00, report Monday 08:00.
* **Wait nodes** (4 d / 8 d) persist in the n8n database; use Postgres in production so restarts do not lose them.
* **UU PDP**: workflows store only business contact fields (`name, role, email, linkedin, whatsapp, lang`) — raw form bodies and scraped
  private fields are never forwarded to the API. Bios are truncated to 300 chars.
