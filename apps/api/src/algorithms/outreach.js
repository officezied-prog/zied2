/** Template filling + auto-var derivation for outreach. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES = JSON.parse(fs.readFileSync(path.resolve(here, "../seed/templates.json"), "utf8"));

export function getTemplate(id) { return TEMPLATES.items.find((t) => t.id === id) || null; }

export function pickTemplate(brand, contact) {
  const lang = contact?.lang || (["SA", "AE", "QA", "KW", "BH", "OM"].includes(brand?.country) ? "ar" : brand?.country === "ID" ? "id" : "en");
  if (brand?.type === "agency") return getTemplate("agency_en");
  if (lang === "ar") return getTemplate("gulf_ar");
  if (lang === "id") return getTemplate("local_id");
  if (brand?.industry === "fmcg") return getTemplate("fmcg_en");
  return getTemplate("beauty_en");
}

export function followUpFor(lang, step) {
  if (step === 1) return getTemplate(lang === "ar" ? "followup1_ar" : lang === "id" ? "followup1_id" : "followup1_en");
  if (step === 2) return getTemplate("followup2_en");
  return null;
}

export function deriveVars(brand, contact, extra = {}) {
  const firstName = (contact?.name || "").split(" ")[0] || "there";
  return {
    brandName: brand?.name || "", agencyName: brand?.name || "", firstName,
    product: brand?.products?.[0] || brand?.name || "", yourName: process.env.RABITH_FOUNDER_NAME || "Zied",
    phone: process.env.RABITH_FOUNDER_PHONE || "+62 8xx-xxxx-xxxx", ...extra,
  };
}

export function fill(str = "", vars = {}) {
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? `[${k}]`));
}

export function render(template, vars) {
  return { subject: fill(template.subject, vars), body: fill(template.body, vars), followUp: template.followUp ? fill(template.followUp, vars) : undefined };
}

export const wordCount = (s = "") => s.trim().split(/\s+/).filter(Boolean).length;
