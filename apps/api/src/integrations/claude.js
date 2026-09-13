/**
 * Claude client — the "brain". Single place that knows the model, effort and fallbacks.
 * Offline mode (no credentials) is supported everywhere via isOnline().
 */
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
export const EFFORT = EFFORTS.includes(process.env.CLAUDE_EFFORT) ? process.env.CLAUDE_EFFORT : "high";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client = null;
export function isOnline() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}
export function getClient() {
  if (!client) client = new Anthropic({ maxRetries: 2 });
  return client;
}

/**
 * One request to Claude (beta namespace so server-side refusal fallbacks are available).
 * @param {object} p  { system, messages, tools?, max_tokens?, effort? }
 */
export async function createMessage(p) {
  const c = getClient();
  const req = {
    model: MODEL,
    max_tokens: p.max_tokens ?? 16000,
    system: p.system,
    messages: p.messages,
    thinking: { type: "adaptive" },
    output_config: { effort: p.effort || EFFORT },
    betas: [FALLBACK_BETA],
    fallbacks: "default",
  };
  if (p.tools?.length) req.tools = p.tools;
  if (p.stream) {
    const s = c.beta.messages.stream(req);
    if (p.onText) s.on("text", p.onText);
    return s.finalMessage();
  }
  return c.beta.messages.create(req);
}

export function textOf(msg) {
  return (msg?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

export function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return { code: "auth", message: "Invalid Anthropic credentials" };
  if (err instanceof Anthropic.RateLimitError) return { code: "rate_limit", message: "Rate limited — retry later" };
  if (err instanceof Anthropic.BadRequestError) return { code: "bad_request", message: err.message };
  if (err instanceof Anthropic.APIConnectionError) return { code: "network", message: "Cannot reach Anthropic API" };
  if (err instanceof Anthropic.APIError) return { code: `api_${err.status}`, message: err.message };
  return { code: "unknown", message: err?.message || String(err) };
}
