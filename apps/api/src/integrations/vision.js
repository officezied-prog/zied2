/**
 * Computer-vision tasks on creator/brand media via Claude vision.
 * Offline mode returns a structured "unavailable" answer so the UI degrades gracefully.
 */
import { createMessage, isOnline, textOf } from "./claude.js";

const TASKS = {
  brand_safety: "Assess brand safety: nudity, violence, alcohol, gambling, hate symbols, political content, competitor logos. Score 0-100 where 100 = fully safe.",
  product_detection: "Detect visible products, brands and logos; describe placement quality (visibility, duration cue, naturalness). Score 0-100 for product placement quality.",
  quality: "Evaluate production quality: lighting, framing, resolution, audio cues (if visible), text legibility. Score 0-100.",
  authenticity: "Look for signs the image is AI-generated, heavily retouched, stock, or reposted (watermarks, artifacts, inconsistent lighting). Score 0-100 where 100 = authentic original content.",
};

export async function analyze({ imageUrl, imageBase64, mediaType = "image/jpeg", task = "brand_safety", context = "" }) {
  const instruction = TASKS[task] || TASKS.brand_safety;
  if (!isOnline()) {
    return { task, score: null, findings: ["Vision analysis requires Claude credentials (ANTHROPIC_API_KEY)."], raw: null, mode: "offline" };
  }
  const source = imageBase64 ? { type: "base64", media_type: mediaType, data: imageBase64 } : { type: "url", url: imageUrl };
  const msg = await createMessage({
    effort: "medium",
    system: "You are Rabith's content-vision analyst for influencer marketing in Indonesia. Answer ONLY with compact JSON: {\"score\": number, \"findings\": string[], \"labels\": string[]}.",
    messages: [{ role: "user", content: [{ type: "image", source }, { type: "text", text: `${instruction}\nContext: ${context || "n/a"}` }] }],
    max_tokens: 2000,
  });
  const raw = textOf(msg);
  let parsed = null;
  try { parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); } catch { /* keep raw */ }
  return { task, score: parsed?.score ?? null, findings: parsed?.findings || [raw], labels: parsed?.labels || [], raw, mode: "claude" };
}
