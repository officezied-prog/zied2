#!/usr/bin/env node
/**
 * Rabith n8n workflow validator.
 *
 *   node n8n/validate.js            # validates every n8n/workflows/*.json against docs/API.md
 *
 * Checks
 *   1. file is valid JSON with the n8n v1 shape (name, nodes[], connections{}, settings.executionOrder = v1)
 *   2. node names are unique; every connection source/target names an existing node; output index is within range
 *   3. every $('Node name') reference inside expressions / Code nodes points at an existing node
 *   4. every Webhook node path is one of the API → n8n paths in docs/API.md (or a documented public entry point)
 *      and every path listed in docs/API.md is implemented by some workflow
 *   5. every HTTP Request node that calls the Rabith API sends the x-rabith-secret header
 *   6. every Rabith API path used by an HTTP Request node exists in the docs/API.md endpoint table (method + path)
 *   7. typeVersion of well-known node types matches what these workflows were written against
 *   8. Code nodes parse as JavaScript
 *
 * Exit code 1 on any error. Warnings do not fail the run.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WF_DIR = path.join(__dirname, 'workflows');
const API_MD = path.join(ROOT, 'docs', 'API.md');

// Webhook paths that are intentionally NOT called by the API (public intake endpoints).
const PUBLIC_ENTRY_PATHS = new Set(['rabith-lead', 'rabith-whatsapp-inbound']);

const EXPECTED_TYPE_VERSIONS = {
  'n8n-nodes-base.webhook': 2,
  'n8n-nodes-base.httpRequest': 4.2,
  'n8n-nodes-base.if': 2,
  'n8n-nodes-base.switch': 3,
  'n8n-nodes-base.code': 2,
  'n8n-nodes-base.wait': 1.1,
  'n8n-nodes-base.scheduleTrigger': 1.2,
  'n8n-nodes-base.gmail': 2.1,
  'n8n-nodes-base.emailSend': 2.1,
  'n8n-nodes-base.set': 3.4,
  'n8n-nodes-base.splitInBatches': 3,
  'n8n-nodes-base.slack': 2.2,
  'n8n-nodes-base.respondToWebhook': 1.1,
  'n8n-nodes-base.noOp': 1,
  'n8n-nodes-base.gmailTrigger': 1.2,
};

// ── parse docs/API.md ───────────────────────────────────────────────────────
const apiMd = fs.readFileSync(API_MD, 'utf8');

const outboundPaths = new Set();
{
  const section = apiMd.split(/Outbound \(API → n8n/)[1] || '';
  const table = section.split(/Inbound \(n8n → API/)[0];
  for (const m of table.matchAll(/^\|\s*`(rabith-[a-z0-9-]+)`/gm)) outboundPaths.add(m[1]);
}
const inboundEvents = new Set();
{
  const section = apiMd.split(/Inbound \(n8n → API/)[1] || '';
  for (const m of section.matchAll(/^\|\s*`([a-z]+\.[a-z]+)`/gm)) inboundEvents.add(m[1]);
}
const endpoints = [];
for (const m of apiMd.matchAll(/^\|\s*(GET|POST|PATCH|PUT|DELETE)\s*\|\s*`([^`]+)`/gm)) {
  const [, method, p] = m;
  const re = new RegExp('^' + p.replace(/\//g, '\\/').replace(/:[a-zA-Z]+/g, '[^/]+') + '$');
  endpoints.push({ method, path: p, re });
}
if (!outboundPaths.size || !endpoints.length || !inboundEvents.size) {
  console.error('Could not parse docs/API.md (outbound paths / endpoints / inbound events)');
  process.exit(1);
}

// ── helpers ─────────────────────────────────────────────────────────────────
function outputsOf(node) {
  switch (node.type) {
    case 'n8n-nodes-base.if': return 2;
    case 'n8n-nodes-base.splitInBatches': return 2;
    case 'n8n-nodes-base.switch': {
      const rules = ((node.parameters.rules || {}).values || []).length;
      const fb = (node.parameters.options || {}).fallbackOutput;
      return rules + (fb === 'extra' ? 1 : 0);
    }
    default: return 1;
  }
}

function walkStrings(v, fn) {
  if (typeof v === 'string') fn(v);
  else if (Array.isArray(v)) v.forEach(x => walkStrings(x, fn));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => walkStrings(x, fn));
}

// Turn an n8n URL expression into an API path pattern: "={{ $env.RABITH_API_BASE }}/creators/{{ $json.id }}" → "/creators/:x"
function apiPathOf(url) {
  if (typeof url !== 'string' || !url.includes('RABITH_API_BASE')) return null;
  let s = url.replace(/^=/, '').replace(/\{\{\s*\$env\.RABITH_API_BASE\s*\}\}/, '');
  s = s.replace(/\{\{[^}]*\}\}/g, ':x');
  s = s.split('?')[0];
  return s;
}

const seenWebhookPaths = new Set();
const seenWebhookKeys = new Set();
const seenEvents = new Set();
let errors = 0, warnings = 0;
const err = (f, msg) => { errors++; console.log(`  ERROR  ${f}: ${msg}`); };
const warn = (f, msg) => { warnings++; console.log(`  WARN   ${f}: ${msg}`); };

const files = fs.readdirSync(WF_DIR).filter(f => f.endsWith('.json')).sort();
if (!files.length) { console.error('no workflows found in', WF_DIR); process.exit(1); }

for (const file of files) {
  const f = file;
  let wf;
  try { wf = JSON.parse(fs.readFileSync(path.join(WF_DIR, file), 'utf8')); }
  catch (e) { err(f, 'invalid JSON: ' + e.message); continue; }

  // 1. shape
  for (const k of ['name', 'nodes', 'connections', 'settings']) if (!(k in wf)) err(f, `missing top-level "${k}"`);
  if (!Array.isArray(wf.nodes) || !wf.nodes.length) { err(f, 'nodes[] empty'); continue; }
  if ((wf.settings || {}).executionOrder !== 'v1') err(f, 'settings.executionOrder must be "v1"');

  // 2. nodes + connections
  const byName = new Map();
  for (const n of wf.nodes) {
    for (const k of ['parameters', 'id', 'name', 'type', 'typeVersion', 'position']) if (!(k in n)) err(f, `node "${n.name || '?'}" missing "${k}"`);
    if (byName.has(n.name)) err(f, `duplicate node name "${n.name}"`);
    byName.set(n.name, n);
    const expected = EXPECTED_TYPE_VERSIONS[n.type];
    if (expected !== undefined && n.typeVersion !== expected) err(f, `node "${n.name}" ${n.type} typeVersion ${n.typeVersion}, expected ${expected}`);
    if (n.type === 'n8n-nodes-base.webhook' && !n.webhookId) warn(f, `webhook node "${n.name}" has no webhookId`);
  }
  const targets = new Set();
  for (const [src, conn] of Object.entries(wf.connections)) {
    if (!byName.has(src)) { err(f, `connection source "${src}" is not a node`); continue; }
    const outs = (conn.main || []);
    const max = outputsOf(byName.get(src));
    outs.forEach((list, idx) => {
      if (idx >= max) err(f, `"${src}" uses output ${idx} but has only ${max} output(s)`);
      for (const c of list) {
        if (!byName.has(c.node)) err(f, `connection "${src}" → "${c.node}": target is not a node`);
        else targets.add(c.node);
        if (c.type !== 'main') err(f, `connection "${src}" → "${c.node}": type must be "main"`);
      }
    });
  }
  const TRIGGERS = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.gmailTrigger']);
  for (const n of wf.nodes) {
    const isTrigger = TRIGGERS.has(n.type);
    const hasOut = !!wf.connections[n.name];
    if (!isTrigger && !targets.has(n.name)) warn(f, `node "${n.name}" has no incoming connection`);
    if (isTrigger && !hasOut) err(f, `trigger "${n.name}" has no outgoing connection`);
  }
  if (!wf.nodes.some(n => TRIGGERS.has(n.type))) err(f, 'no trigger node');

  // 3. $('Node') references
  for (const n of wf.nodes) {
    walkStrings(n.parameters, s => {
      for (const m of s.matchAll(/\$\(\s*'([^']+)'\s*\)/g)) if (!byName.has(m[1])) err(f, `node "${n.name}" references unknown node $('${m[1]}')`);
    });
  }

  // 4. webhook paths
  for (const n of wf.nodes.filter(n => n.type === 'n8n-nodes-base.webhook')) {
    const p = n.parameters.path;
    if (!p) { err(f, `webhook "${n.name}" has no path`); continue; }
    const method = n.parameters.httpMethod || 'GET';
    const key = method + ' ' + p;
    if (seenWebhookKeys.has(key)) err(f, `webhook ${key} defined more than once`);
    seenWebhookKeys.add(key);
    seenWebhookPaths.add(p);
    if (!outboundPaths.has(p) && !PUBLIC_ENTRY_PATHS.has(p)) err(f, `webhook path "${p}" is not in docs/API.md (n8n events → Outbound)`);
    if (outboundPaths.has(p) && method !== 'POST') err(f, `webhook "${n.name}" httpMethod is ${method}, the API sends POST`);
  }

  // 5 + 6. HTTP nodes calling the API
  for (const n of wf.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest')) {
    const url = n.parameters.url || '';
    const callsApi = url.includes('RABITH_API_BASE');
    const callsN8n = url.includes('N8N_WEBHOOK_BASE');
    if (callsApi || callsN8n) {
      const headers = ((n.parameters.headerParameters || {}).parameters || []);
      const hasSecret = n.parameters.sendHeaders === true && headers.some(h => h.name === 'x-rabith-secret' && /RABITH_WEBHOOK_SECRET/.test(h.value));
      if (!hasSecret) err(f, `HTTP node "${n.name}" calls ${callsApi ? 'the API' : 'n8n'} without the x-rabith-secret header`);
    }
    if (callsApi) {
      const p = apiPathOf(url);
      const method = (n.parameters.method || 'GET').toUpperCase();
      const ok = endpoints.some(e => e.method === method && e.re.test(p));
      if (!ok) err(f, `HTTP node "${n.name}" calls ${method} ${p} which is not in docs/API.md`);
      if (p === '/webhooks/n8n') {
        const body = n.parameters.jsonBody || '';
        const m = body.match(/event:\s*'([a-z]+\.[a-z]+)'/);
        if (!m) err(f, `HTTP node "${n.name}" posts to /webhooks/n8n without a literal event name`);
        else if (!inboundEvents.has(m[1])) err(f, `HTTP node "${n.name}" posts unknown inbound event "${m[1]}"`);
        else seenEvents.add(m[1]);
      }
      if (n.parameters.sendBody && n.parameters.specifyBody !== 'json') err(f, `HTTP node "${n.name}" must use specifyBody: "json"`);
    }
  }

  // 8. Code nodes parse
  for (const n of wf.nodes.filter(n => n.type === 'n8n-nodes-base.code')) {
    try { new Function('$input', '$json', '$env', '$now', '$getWorkflowStaticData', '$', n.parameters.jsCode); }
    catch (e) { err(f, `Code node "${n.name}" does not parse: ${e.message}`); }
  }

  console.log(`  ok     ${f} — ${wf.nodes.length} nodes, ${Object.keys(wf.connections).length} connection sources`);
}

// cross-workflow coverage
for (const p of outboundPaths) if (!seenWebhookPaths.has(p)) err('coverage', `API.md outbound path "${p}" is not implemented by any workflow`);
for (const e of inboundEvents) if (!seenEvents.has(e)) warn('coverage', `inbound event "${e}" is never posted by n8n (may be posted by the API itself or by a channel not automated yet)`);

console.log(`\nwebhook paths: ${[...seenWebhookPaths].sort().join(', ')}`);
console.log(`inbound events posted: ${[...seenEvents].sort().join(', ')}`);
console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
