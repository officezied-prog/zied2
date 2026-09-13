/** Outbound calls to n8n webhooks (the "hands"). Fire-and-record; never throws to callers. */
const BASE = () => (process.env.N8N_WEBHOOK_BASE || "").replace(/\/$/, "");
const SECRET = () => process.env.RABITH_WEBHOOK_SECRET || "";

export const events = [];
export function isConfigured() { return Boolean(BASE()); }

export async function trigger(path, payload, { timeoutMs = 8000 } = {}) {
  const rec = { path, at: new Date().toISOString(), ok: false, status: null, error: null };
  events.unshift(rec); if (events.length > 200) events.pop();
  if (!isConfigured()) { rec.error = "n8n not configured (N8N_WEBHOOK_BASE)"; rec.skipped = true; return rec; }
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE()}/${path}`, {
      method: "POST", signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-rabith-secret": SECRET() },
      body: JSON.stringify({ ...payload, sentAt: rec.at, source: "rabith-api" }),
    });
    rec.status = res.status; rec.ok = res.ok;
    try { rec.response = await res.json(); } catch { /* n8n may return empty body */ }
  } catch (e) { rec.error = e.name === "AbortError" ? "timeout" : e.message; }
  finally { clearTimeout(t); }
  return rec;
}

export async function ping() {
  if (!isConfigured()) return false;
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${BASE().replace(/\/webhook$/, "")}/healthz`, { signal: ctrl.signal });
    clearTimeout(t); return res.ok;
  } catch { return false; }
}
