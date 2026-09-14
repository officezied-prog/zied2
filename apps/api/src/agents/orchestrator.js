/**
 * Orchestrator runtime.
 *  runAgent({ agent, message, context }) → AgentRun
 *  - Claude mode: manual tool-use loop (Plan → Act → Reflect); `delegate` spawns a specialist run.
 *  - Offline mode: deterministic keyword planner that calls the same tools, so the product works without credentials.
 */
import * as store from "../store/jsonStore.js";
import { AGENTS, byId } from "./registry.js";
import { toolsFor, execute } from "./tools.js";
import { createMessage, isOnline, textOf, describeError, MODEL } from "../integrations/claude.js";

const MAX_ITER = 12;
const MAX_DEPTH = 2;

function contextBlock(context = {}) {
  const parts = [];
  if (context.brandId) { const b = store.get("brands", context.brandId); if (b) parts.push(`Brand in focus: ${JSON.stringify({ id: b.id, name: b.name, type: b.type, industry: b.industry, country: b.country, pipeline: b.pipeline, budgetIDR: b.budgetIDR, products: b.products, targetAudience: b.targetAudience, contacts: b.contacts, notes: b.notes })}`); }
  if (context.campaignId) { const c = store.get("campaigns", context.campaignId); if (c) parts.push(`Campaign in focus: ${JSON.stringify({ ...c, matches: (c.matches || []).slice(0, 10) })}`); }
  if (context.creatorId) { const c = store.get("creators", context.creatorId); if (c) parts.push(`Creator in focus: ${JSON.stringify(c)}`); }
  if (context.lang) parts.push(`Preferred reply language: ${context.lang}`);
  parts.push(`Today: ${new Date().toISOString().slice(0, 10)}. Time zone: Asia/Jakarta (WIB).`);
  return parts.join("\n");
}

export async function runAgent({ agent = "orchestrator", message, context = {}, depth = 0, parentRunId = null }) {
  const def = byId[agent];
  if (!def) throw new Error(`unknown agent: ${agent}`);
  const run = store.insert("runs", { agent, input: message, context, status: "running", plan: [], steps: [], output: "", usage: { input_tokens: 0, output_tokens: 0 }, mode: isOnline() ? "claude" : "offline", model: isOnline() ? MODEL : null, parentRunId, depth });
  const t0 = Date.now();
  try {
    const out = isOnline() ? await runClaude(def, run, message, context, depth) : await runOffline(def, run, message, context, depth);
    store.update("runs", run.id, { status: "done", output: out, ms: Date.now() - t0 });
  } catch (e) {
    const err = describeError(e);
    store.update("runs", run.id, { status: "error", error: err, output: `⚠️ ${err.message}`, ms: Date.now() - t0 });
  }
  return store.get("runs", run.id);
}

/** Rewrites the delegate tool so its description and enum list the agents that actually exist right now. */
function withRoster(tools) {
  const specialists = AGENTS.filter((a) => a.id !== "orchestrator");
  return tools.map((t) => t.name !== "delegate" ? t : {
    ...t,
    description: `Delegate a sub-task to a specialist agent. Returns the specialist's answer. Call several in parallel when sub-tasks are independent.\nAvailable specialists:\n${specialists.map((a) => `- ${a.id} (${a.glyph}): ${a.description?.en || ""}`).join("\n")}`,
    input_schema: { type: "object", properties: {
      agent: { type: "string", enum: specialists.map((a) => a.id), description: "Specialist id from the list above." },
      task: { type: "string", description: "Clear, self-contained instruction incl. ids (brandId, campaignId, creatorIds) the specialist needs." },
    }, required: ["agent", "task"] },
  });
}

function makeCtx(def, run, context, depth) {
  return {
    agentId: def.id,
    delegate: async (agentId, task) => {
      if (depth >= MAX_DEPTH) return { error: "max delegation depth reached — answer directly" };
      if (!byId[agentId] || agentId === "orchestrator") return { error: `unknown specialist ${agentId}` };
      const child = await runAgent({ agent: agentId, message: task, context, depth: depth + 1, parentRunId: run.id });
      return { agent: agentId, runId: child.id, status: child.status, answer: child.output, stepsUsed: child.steps.length };
    },
  };
}

function record(run, step) {
  const r = store.get("runs", run.id);
  store.update("runs", run.id, { steps: [...(r.steps || []), step] });
}

/* ───────────── Claude mode ───────────── */
async function runClaude(def, run, message, context, depth) {
  const tools = withRoster(toolsFor(def));
  const ctx = makeCtx(def, run, context, depth);
  const system = [
    { type: "text", text: def.system, cache_control: { type: "ephemeral" } },
    { type: "text", text: contextBlock(context) },
  ];
  const messages = [{ role: "user", content: message }];
  let usage = { input_tokens: 0, output_tokens: 0 };
  let finalText = "";

  for (let i = 0; i < MAX_ITER; i++) {
    const res = await createMessage({ system, messages, tools, effort: depth > 0 ? "medium" : undefined });
    usage = { input_tokens: usage.input_tokens + (res.usage?.input_tokens || 0), output_tokens: usage.output_tokens + (res.usage?.output_tokens || 0) };
    store.update("runs", run.id, { usage });

    if (res.stop_reason === "refusal") { finalText = "The model declined this request (safety policy)."; break; }
    if (res.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: res.content }); continue; }

    const toolUses = res.content.filter((b) => b.type === "tool_use");
    const text = textOf(res);
    if (text && i === 0 && toolUses.length) store.update("runs", run.id, { plan: text.split("\n").filter(Boolean).slice(0, 8) });

    if (!toolUses.length || res.stop_reason === "end_turn") { finalText = text; break; }

    messages.push({ role: "assistant", content: res.content });
    // Execute all tool calls concurrently, return all results in ONE user message.
    const results = await Promise.all(toolUses.map(async (tu) => {
      const t = Date.now();
      let output, isError = false;
      try { output = await execute(tu.name, tu.input, ctx); } catch (e) { output = { error: e.message }; isError = true; }
      record(run, { agent: def.id, tool: tu.name, input: tu.input, output: trim(output), ms: Date.now() - t, error: isError });
      return { type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(output).slice(0, 60000), is_error: isError };
    }));
    messages.push({ role: "user", content: results });
  }
  return finalText || "(no answer)";
}

function trim(o) { const s = JSON.stringify(o) || ""; return s.length > 4000 ? { truncated: true, bytes: s.length, preview: s.slice(0, 1500) } : o; }

/* ───────────── Offline mode (rule-based planner) ───────────── */
const KW = {
  discovery: /(find|search|match|shortlist|creator|influencer|kol|koc|nano|micro|مؤثر|ابحث|مطابق|cari|kreator|influencer)/i,
  fraud: /(fraud|fake|bot|pod|احتيال|وهمي|مزيف|palsu|audit|فحص)/i,
  sales: /(outreach|email|pitch|lead|cold|template|رسالة|تواصل|عميل|بريد|prospek|penawaran|linkedin)/i,
  marketing: /(\bposts?\b|caption|calendar|social|\bpages?\b|منشور|صفحة|تقويم|محتوى أسبوع|konten|jadwal)/i,
  finance: /(cost|price|budget|tax|pph|escrow|fee|تكلفة|ميزانية|ضريب|سعر|biaya|anggaran|pajak)/i,
  legal: /(contract|agreement|legal|kuhperdata|عقد|قانون|kontrak|hukum)/i,
  campaign: /(campaign|\bplan\b|\bkpi\b|\bbrief\b|حملة|خطة|kampanye|rencana)/i,
  analytics: /(report|analytics|stats|roi|تقرير|إحصاء|تحليل|laporan|statistik)/i,
  strategy: /(strategy|gtm|market entry|استراتيج|دخول السوق|strategi)/i,
  live: /(\blive\b|live commerce|شوبي|بث مباشر|siaran langsung)/i,
  negotiation: /(negotiat\w*|\brates?\b|rate card|تفاوض|negosiasi|tarif)/i,
  crisis: /(crisis|scandal|backlash|أزمة|فضيحة|krisis)/i,
  onboarding: /(onboard|welcome|invite|تأهيل|ترحيب|دعوة|undang)/i,
  trend: /(trend|viral|ترند|رائج|tren)/i,
  retention: /(renew|upsell|retention|تجديد|ترقية|perpanjang)/i,
  creatordev: /(coach|grow my|academy|أكاديمية|تدريب|latih)/i,
  community: /(community|whatsapp group|مجتمع|komunitas)/i,
  quality: /(review|qc|quality|جودة|مراجعة|kualitas)/i,
  halal: /(halal|haram|certif\w*|bpjph|\bmui\b|حلال|حرام|شهادة|sertifikat|kosher)/i,
};
const NICHES = ["beauty", "skincare", "makeup", "fashion", "hijab", "modest", "food", "halal", "coffee", "tech", "gaming", "lifestyle", "travel", "parenting", "fitness", "finance", "umkm"];
const NICHE_AR = { تجميل: "beauty", جمال: "beauty", بشرة: "skincare", مكياج: "makeup", أزياء: "fashion", موضة: "fashion", حجاب: "hijab", طعام: "food", أكل: "food", حلال: "halal", قهوة: "coffee", تقنية: "tech", ألعاب: "gaming", سفر: "travel", رياضة: "fitness", لياقة: "fitness", أمومة: "parenting", kecantikan: "beauty", makanan: "food", teknologi: "tech", olahraga: "fitness" };
const CITIES = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Medan", "Semarang", "Bali", "Makassar", "Malang", "Bekasi"];
const CITY_AR = { جاكرتا: "Jakarta", باندونغ: "Bandung", سورابايا: "Surabaya", بالي: "Bali", يوجياكارتا: "Yogyakarta", ميدان: "Medan" };

function parseBrief(msg) {
  const lower = msg.toLowerCase();
  const niches = NICHES.filter((n) => lower.includes(n)); for (const k in NICHE_AR) if (msg.includes(k)) niches.push(NICHE_AR[k]);
  const cities = CITIES.filter((c) => lower.includes(c.toLowerCase())); for (const k in CITY_AR) if (msg.includes(k)) cities.push(CITY_AR[k]);
  const tiers = ["nano", "micro", "mid", "macro", "mega"].filter((t) => lower.includes(t)); if (/نانو/.test(msg)) tiers.push("nano"); if (/مايكرو|ميكرو/.test(msg)) tiers.push("micro");
  const platforms = ["tiktok", "instagram", "youtube"].filter((p) => lower.includes(p)); if (/تيك ?توك/.test(msg)) platforms.push("tiktok"); if (/انستغرام|إنستغرام|انستا/.test(msg)) platforms.push("instagram");
  const n = Number((msg.match(/\b(\d{1,3})\b/) || [])[1] || 0);
  const budget = (() => { const m = msg.match(/(\d+[.,]?\d*)\s*(juta|jt|m|million|مليون)/i); if (!m) return 0; return Math.round(parseFloat(m[1].replace(",", ".")) * 1_000_000); })();
  return { niches: [...new Set(niches)], cities: [...new Set(cities)], tiers: [...new Set(tiers)], platforms: [...new Set(platforms)], limit: n && n <= 100 ? n : 10, budgetIDR: budget };
}

function findBrandIn(msg) {
  const brands = store.all("brands");
  const lower = msg.toLowerCase();
  return brands.find((b) => lower.includes(b.name.toLowerCase())) || brands.find((b) => b.name.split(/\s|—/)[0].length > 3 && lower.includes(b.name.split(/\s|—/)[0].toLowerCase())) || null;
}

const L = (ctx, ar, en, id) => (ctx.lang === "en" ? en : ctx.lang === "id" ? id : ar);
const fmtIDR = (n) => "Rp" + Math.round(n || 0).toLocaleString("en-US");

async function runOffline(def, run, message, context, depth) {
  const ctx = makeCtx(def, run, context, depth);
  const lang = context.lang || (/[؀-ۿ]/.test(message) ? "ar" : /\b(cari|untuk|dengan|kampanye|kreator)\b/i.test(message) ? "id" : "en");
  const c = { lang };
  const call = async (tool, input) => { const t = Date.now(); const out = await execute(tool, input, ctx); record(run, { agent: def.id, tool, input, output: trim(out), ms: Date.now() - t }); return out; };

  // Specialist runs answer with their single most relevant tool.
  if (def.id !== "orchestrator") return specialistOffline(def, message, context, call, c);

  const hits = Object.keys(KW).filter((k) => KW[k].test(message));
  const brief = parseBrief(message);
  const brand = context.brandId ? store.get("brands", context.brandId) : findBrandIn(message);
  const plan = [];
  const sections = [];

  const wants = (k) => hits.includes(k);
  const onlySupport = hits.length === 0;
  if (!hits.length) hits.push("support");

  if (wants("discovery") || (wants("campaign") && !context.campaignId && brief.niches.length)) {
    plan.push(L(c, "配 الاكتشاف: بحث ومطابقة المؤثرين", "配 Discovery: search & match creators", "配 Discovery: cari & cocokkan kreator"));
    const cp = context.campaignId ? store.get("campaigns", context.campaignId) : null;
    const res = cp ? await call("match_campaign", { campaignId: cp.id, limit: brief.limit }) : await call("match_campaign", { brief: { brandId: brand?.id, objective: "awareness", budgetIDR: brief.budgetIDR || brand?.budgetIDR || 0, niches: brief.niches, cities: brief.cities, tiers: brief.tiers, platforms: brief.platforms }, limit: brief.limit });
    const rows = (res.matches || []).map((m, i) => `${i + 1}. ${m.creator?.handle} · ${m.creator?.platform} · ${fmtK(m.creator?.followers)} · ER ${m.creator?.engagementRate}% · ${L(c, "احتيال", "fraud", "fraud")} ${m.creator?.fraudScore} · ${fmtIDR(m.estCostIDR)} · ${L(c, "درجة", "score", "skor")} ${m.score}`);
    sections.push(`**${L(c, "قائمة المؤثرين المقترحة", "Suggested creators", "Kreator yang disarankan")}** (${brief.niches.join(", ") || "all"}${brief.cities.length ? " · " + brief.cities.join(", ") : ""})\n${rows.join("\n") || L(c, "لا نتائج", "no results", "tidak ada hasil")}\n\n${L(c, "الخطة", "Plan", "Rencana")}: ${res.plan?.selected?.length || 0} ${L(c, "مؤثر", "creators", "kreator")} · ${fmtIDR(res.plan?.totalCostIDR)} · ${L(c, "وصول متوقع", "expected reach", "jangkauan")} ${fmtK(res.plan?.expectedReach)}`);
  }
  if (wants("fraud")) {
    plan.push(L(c, "防 مراقبة الاحتيال: تدقيق الحسابات", "防 Fraud: audit accounts", "防 Fraud: audit akun"));
    const ids = context.creatorId ? [context.creatorId] : (await call("search_creators", { sort: "followers", limit: brief.limit || 10, ...(brief.niches[0] ? { niche: brief.niches.join(",") } : {}) })).items.map((x) => x.id);
    const res = await call("fraud_audit", { creatorIds: ids });
    const rows = res.results.map((r) => `• ${r.handle} → ${r.fraudScore} (${r.fraudScore < 20 ? "SAFE" : r.fraudScore < 50 ? "REVIEW" : "BLOCK"}) ${r.fraudFlags?.length ? "— " + r.fraudFlags.join(", ") : ""}`);
    sections.push(`**${L(c, "نتائج فحص الاحتيال", "Fraud audit", "Audit fraud")}**\n${rows.join("\n")}`);
  }
  if (wants("sales") || (brand && onlySupport)) {
    plan.push(L(c, "销 المبيعات: توليد رسالة تواصل", "销 Sales: generate outreach", "销 Sales: buat pesan outreach"));
    if (brand) {
      const o = await call("generate_outreach", { brandId: brand.id });
      const saved = await call("save_outreach", { brandId: brand.id, contactId: o.contactId, templateId: o.templateId, lang: o.lang, channel: o.channel, subject: o.subject, body: o.body });
      sections.push(`**${L(c, "مسودة تواصل محفوظة", "Outreach draft saved", "Draft outreach tersimpan")}** (${saved.id} · ${o.templateId} · ${o.lang})\n${L(c, "الموضوع", "Subject", "Subjek")}: ${o.subject}\n\n${o.body}\n\n_${L(c, "بانتظار موافقتك ثم الإرسال عبر n8n", "Awaiting your approval, then sent via n8n", "Menunggu persetujuan, lalu dikirim via n8n")}_`);
    } else {
      const leads = await call("list_brands", { pipeline: "lead", limit: 8 });
      sections.push(`**${L(c, "عملاء محتملون للتواصل", "Leads to contact", "Lead untuk dihubungi")}**\n${leads.items.map((b) => `• ${b.name} (${b.industry}, ${b.country}) — ${b.contacts?.[0]?.name || "?"}, ${b.contacts?.[0]?.role || ""}`).join("\n")}\n\n${L(c, "اذكر اسم الشركة لأحضّر الرسالة.", "Name a brand and I will draft the message.", "Sebutkan brand, saya siapkan pesannya.")}`);
    }
  }
  if (wants("marketing")) {
    plan.push(L(c, "宣 التسويق: تقويم محتوى أسبوعي", "宣 Marketing: weekly content calendar", "宣 Marketing: kalender konten mingguan"));
    const topics = [["instagram", L(c, "قصة نجاح مؤثر نانو مع UMKM", "Nano creator × UMKM success story", "Kisah sukses kreator nano × UMKM")], ["tiktok", L(c, "3 إشارات لكشف المتابعين الوهميين", "3 signs of fake followers", "3 tanda followers palsu")], ["linkedin", L(c, "لماذا تشتري العلامات نتائج قابلة للقياس في 2026", "Why brands buy measurable outcomes in 2026", "Mengapa brand membeli hasil terukur di 2026")], ["instagram", L(c, "خلف الكواليس: كيف يعمل الضمان escrow", "Behind the scenes: how escrow works", "Di balik layar: cara kerja escrow")], ["tiktok", L(c, "ترند الأسبوع + كيف تستخدمه علامتك", "Trend of the week + how your brand can ride it", "Tren minggu ini + cara brand memanfaatkannya")]];
    const posts = [];
    for (let i = 0; i < topics.length; i++) {
      const [platform, topic] = topics[i];
      const d = new Date(); d.setDate(d.getDate() + i + 1); d.setHours(19, 0, 0, 0);
      posts.push(await call("generate_social_post", { account: brand ? `@${brand.name.split(" ")[0].toLowerCase()}` : "@rabith.id", platform, caption: `${topic} ✨`, hashtags: ["#Rabith", "#InfluencerMarketing", "#Indonesia", platform === "tiktok" ? "#fyp" : "#KOL"], lang, scheduledAt: d.toISOString(), brandId: brand?.id }));
    }
    sections.push(`**${L(c, "تقويم المحتوى (5 منشورات مجدولة كمسودات)", "Content calendar (5 scheduled drafts)", "Kalender konten (5 draft terjadwal)")}**\n${posts.map((p) => `• ${p.scheduledAt.slice(0, 10)} 19:00 WIB · ${p.platform} · ${p.caption}`).join("\n")}`);
  }
  if (wants("finance")) {
    plan.push(L(c, "财 المالية: حساب التكاليف والضرائب", "财 Finance: costs & taxes", "财 Finance: biaya & pajak"));
    const cp = context.campaignId ? store.get("campaigns", context.campaignId) : null;
    const base = cp?.plan?.totalCostIDR || brief.budgetIDR || brand?.budgetIDR || 50_000_000;
    const fee = base * 0.15, vat = fee * 0.11, pph = base * 0.025;
    sections.push(`**${L(c, "الاقتصاديات", "Economics", "Ekonomi")}**\n• ${L(c, "أتعاب المؤثرين", "Creator fees", "Fee kreator")}: ${fmtIDR(base)}\n• ${L(c, "رسوم المنصة 15%", "Platform fee 15%", "Fee platform 15%")}: ${fmtIDR(fee)}\n• PPN 11% (${L(c, "على الرسوم", "on fee", "atas fee")}): ${fmtIDR(vat)}\n• PPh 21 (2.5%, ${L(c, "افتراض NPWP", "NPWP assumed", "asumsi NPWP")}): ${fmtIDR(pph)} ${L(c, "محتجزة", "withheld", "dipotong")}\n• ${L(c, "الإجمالي على العميل", "Total to client", "Total ke klien")}: ${fmtIDR(base + fee + vat)}\n• Escrow: 50% ${L(c, "عند العقد", "on contract", "saat kontrak")}, 50% ${L(c, "عند اعتماد المحتوى", "on content approval", "saat konten disetujui")}`);
  }
  if (wants("legal")) {
    plan.push(L(c, "约 القانوني: هيكل العقد", "约 Legal: contract skeleton", "约 Legal: kerangka kontrak"));
    sections.push(`**${L(c, "بنود العقد (KUHPerdata / UU ITE)", "Contract clauses (KUHPerdata / UU ITE)", "Klausul kontrak (KUHPerdata / UU ITE)")}**\n1. ${L(c, "الأطراف والنطاق والمخرجات", "Parties, scope, deliverables", "Para pihak, ruang lingkup, deliverable")}\n2. ${L(c, "حقوق الاستخدام ومدتها", "Usage rights & duration", "Hak pakai & durasi")}\n3. ${L(c, "الحصرية", "Exclusivity", "Eksklusivitas")}\n4. ${L(c, "الدفع عبر الضمان + PPh", "Payment via escrow + PPh", "Pembayaran via escrow + PPh")}\n5. ${L(c, "الإفصاح #iklan", "Disclosure #iklan", "Disclosure #iklan")}\n6. ${L(c, "الإنهاء والنزاعات (وساطة/BANI)", "Termination & disputes (mediation/BANI)", "Pengakhiran & sengketa (mediasi/BANI)")}\n7. ${L(c, "التوقيع الإلكتروني PrivyID", "e-Signature via PrivyID", "Tanda tangan elektronik PrivyID")}\n_${L(c, "ليس بديلاً عن محامٍ مرخّص.", "Not a substitute for a licensed lawyer.", "Bukan pengganti pengacara berlisensi.")}_`);
  }
  if (wants("analytics")) {
    plan.push(L(c, "析 التحليلات: تقرير المنصة", "析 Analytics: platform report", "析 Analitik: laporan platform"));
    const s = await call("platform_stats", {});
    sections.push(`**${L(c, "تقرير المنصة", "Platform report", "Laporan platform")}**\n• ${L(c, "مؤثرون", "Creators", "Kreator")}: ${s.creators} (${L(c, "موثّق", "verified", "terverifikasi")} ${s.verifiedPct}%) · ${L(c, "متوسط التفاعل", "avg ER", "rata-rata ER")} ${s.avgEngagement}%\n• ${L(c, "احتيال", "Fraud", "Fraud")}: low ${s.fraud.low} / medium ${s.fraud.medium} / high ${s.fraud.high}\n• ${L(c, "الشركات", "Brands", "Brand")}: ${s.brands} · ${L(c, "المسار", "pipeline", "pipeline")} ${Object.entries(s.pipeline).map(([k, v]) => `${k} ${v}`).join(", ")}\n• ${L(c, "الحملات", "Campaigns", "Kampanye")}: ${s.campaigns} · ${L(c, "التواصل", "outreach", "outreach")}: ${s.outreach} · ${L(c, "منشورات", "posts", "posting")}: ${s.posts}`);
  }
  for (const k of ["halal", "strategy", "live", "negotiation", "crisis", "onboarding", "trend", "retention", "creatordev", "community", "quality", "campaign", "support"]) {
    if (wants(k) && !sections.some((s) => s.includes(byId[k].glyph))) {
      plan.push(`${byId[k].glyph} ${byId[k].name[lang] || byId[k].name.en}`);
      const child = await ctx.delegate(k, message);
      sections.push(`**${byId[k].glyph} ${byId[k].name[lang] || byId[k].name.en}**\n${child.answer}`);
    }
  }
  store.update("runs", run.id, { plan });
  const head = L(c, "🧠 وضع بلا اتصال (قواعد): تم توجيه الطلب إلى الوكلاء التاليين:", "🧠 Offline mode (rule-based): request routed to:", "🧠 Mode offline (berbasis aturan): permintaan dialihkan ke:");
  return `${head}\n${plan.map((p) => "• " + p).join("\n")}\n\n${sections.join("\n\n")}\n\n${L(c, "أضف ANTHROPIC_API_KEY لتفعيل عقل Claude الكامل.", "Set ANTHROPIC_API_KEY to enable the full Claude brain.", "Atur ANTHROPIC_API_KEY untuk mengaktifkan otak Claude penuh.")}`;
}

async function specialistOffline(def, message, context, call, c) {
  const brand = context.brandId ? store.get("brands", context.brandId) : findBrandIn(message);
  const brief = parseBrief(message);
  switch (def.id) {
    case "discovery": { const r = await call("match_campaign", context.campaignId ? { campaignId: context.campaignId, limit: brief.limit } : { brief: { brandId: brand?.id, niches: brief.niches, cities: brief.cities, tiers: brief.tiers, platforms: brief.platforms, budgetIDR: brief.budgetIDR || brand?.budgetIDR || 0, objective: "awareness" }, limit: brief.limit }); return r.matches.map((m, i) => `${i + 1}. ${m.creator?.handle} (${m.creator?.tier}, fraud ${m.creator?.fraudScore}) score ${m.score} · ${fmtIDR(m.estCostIDR)}`).join("\n"); }
    case "fraud": { const ids = context.creatorId ? [context.creatorId] : (await call("search_creators", { limit: 10, sort: "followers" })).items.map((x) => x.id); const r = await call("fraud_audit", { creatorIds: ids }); return r.results.map((x) => `${x.handle}: ${x.fraudScore} — ${x.explanation?.join(" ")}`).join("\n"); }
    case "sales": { if (!brand) return L(c, "حدّد الشركة.", "Specify the brand.", "Sebutkan brand."); const o = await call("generate_outreach", { brandId: brand.id }); return `${o.subject}\n\n${o.body}`; }
    case "analytics": { const s = await call("platform_stats", {}); return JSON.stringify(s, null, 1); }
    case "finance": { const base = brief.budgetIDR || brand?.budgetIDR || 50_000_000; return `Creator fees ${fmtIDR(base)} · platform fee 15% ${fmtIDR(base * 0.15)} · PPN ${fmtIDR(base * 0.15 * 0.11)} · PPh21 2.5% ${fmtIDR(base * 0.025)} · total ${fmtIDR(base * 1.1665)}`; }
    case "strategy": return L(c, `خطة 90 يوماً لـ ${brand?.name || "العلامة"}: (1) الشهر 1: تموضع + 20 مؤثر نانو تجريبي + TikTok Shop. (2) الشهر 2: توسيع لـ 100 نانو + 5 مايكرو + بث مباشر أسبوعي. (3) الشهر 3: برنامج دائم + سفراء + قياس CPA. المخاطر: الملاءمة الثقافية/الحلال، الشحن، الأسعار.`, `90-day GTM for ${brand?.name || "the brand"}: M1 positioning + 20-nano pilot + TikTok Shop; M2 scale to 100 nano + 5 micro + weekly live; M3 always-on + ambassadors + CPA tracking. Risks: halal/cultural fit, logistics, pricing.`, `GTM 90 hari untuk ${brand?.name || "brand"}: B1 positioning + pilot 20 nano + TikTok Shop; B2 skala ke 100 nano + 5 micro + live mingguan; B3 always-on + ambassador + CPA. Risiko: kecocokan halal/budaya, logistik, harga.`);
    case "live": { const r = await call("search_creators", { platform: "tiktok", tier: "micro,mid", maxFraud: 20, limit: 5, sort: "engagement" }); return L(c, "مضيفو بث مقترحون: ", "Suggested live hosts: ", "Host live yang disarankan: ") + r.items.map((x) => `${x.handle} (ER ${x.engagementRate}%)`).join(", ") + L(c, " · الأوقات 19:00–22:00 WIB · KPI: GMV, CTR, add-to-cart.", " · slots 19:00–22:00 WIB · KPIs: GMV, CTR, add-to-cart.", " · slot 19:00–22:00 WIB · KPI: GMV, CTR, add-to-cart."); }
    case "negotiation": return L(c, "نطاقات عادلة (لكل فيديو): نانو 150–600 ألف، مايكرو 0.6–4 مليون، متوسط 4–15 مليون روبية. اربط 20% بمكافأة أداء، واطلب حقوق استخدام 90 يوماً.", "Fair ranges (per video): nano IDR 150k–600k, micro 0.6–4M, mid 4–15M. Tie 20% to a performance bonus; ask for 90-day usage rights.", "Kisaran wajar (per video): nano Rp150rb–600rb, micro 0,6–4 jt, mid 4–15 jt. Ikat 20% ke bonus performa; minta hak pakai 90 hari.");
    case "crisis": { await call("trigger_n8n", { path: "rabith-notify", payload: { channel: "whatsapp", text: `Crisis flagged: ${message.slice(0, 200)}` } }); return L(c, "خطة 24 ساعة: إيقاف المنشورات، بيان مؤقت (ID/EN)، استبدال المؤثر، مراجعة قانونية. تم إخطار المؤسس عبر n8n.", "24-hour playbook: pause posts, holding statement (ID/EN), creator swap, legal review. Founder notified via n8n.", "Playbook 24 jam: hentikan posting, pernyataan sementara (ID/EN), ganti kreator, tinjauan hukum. Founder diberi tahu via n8n."); }
    case "halal": {
      const products = brand?.products?.length ? brand.products.join(c.lang === "ar" ? "، " : ", ") : L(c, "المنتج المطلوب", "the product", "produk terkait");
      return L(c,
        `**الحكم: يحتاج تحقّق** — ${brand?.name || "العلامة"} · ${products}\n\nما يجب التحقّق منه:\n1. شهادة BPJPH: الرقم، تاريخ الانتهاء، وهل تغطي هذا المنتج تحديدًا لا العلامة كلها.\n2. المكوّنات الحسّاسة: الجيلاتين والكولاجين (المصدر)، المستحلبات مثل E471، الإيثانول ومذيبات العطور، الإنزيمات الحيوانية، القرمز، الجلسرين، والتلوّث المتبادل على خطوط الإنتاج المشتركة.\n3. الادّعاءات: كلمة «حلال» لا تُستعمل بلا شهادة سارية، و«خالٍ من لحم الخنزير» ليست حلالًا.\n4. المحتوى: مراجعة حساب المؤثر والسكريبت من ناحية الكحول والتقديم المحتشم، وجدولة تراعي رمضان وأوقات الصلاة.\n\nالمستندات المطلوبة من العلامة: نسخة الشهادة، قائمة المكوّنات الكاملة، وشهادات الموردين.\n\nالمخاطرة إن أُطلقت الحملة بلا تحقّق: سحب المحتوى وغرامات تنظيمية وضرر سمعة يطال المؤثرين أيضًا.\n\n_لست جهة تصديق._`,
        `**Verdict: VERIFY** — ${brand?.name || "the brand"} · ${products}\n\nWhat to check:\n1. BPJPH certificate: number, expiry, and whether it covers this exact product rather than the brand.\n2. Ingredients to scrutinise: gelatin and collagen (source), emulsifiers such as E471, ethanol and fragrance solvents, animal enzymes, carmine, glycerin, shared-line cross-contamination.\n3. Claims: "halal" needs a valid certificate; "no pork" is not halal.\n4. Content: review the creator's feed and the script for alcohol and framing, and schedule around Ramadan and prayer times.\n\nDocuments to request: the certificate, the full ingredient list, supplier certificates.\n\nRisk if it ships unverified: content takedown, regulatory fines, and reputational damage that reaches the creators too.\n\n_Not a certification body._`,
        `**Putusan: PERLU VERIFIKASI** — ${brand?.name || "brand"} · ${products}\n\nYang harus dicek:\n1. Sertifikat BPJPH: nomor, masa berlaku, dan apakah mencakup produk ini, bukan sekadar brand-nya.\n2. Bahan yang perlu diteliti: gelatin dan kolagen (sumbernya), emulsifier seperti E471, etanol dan pelarut parfum, enzim hewani, karmin, gliserin, kontaminasi silang di lini produksi.\n3. Klaim: "halal" hanya dengan sertifikat berlaku; "tanpa babi" bukan halal.\n4. Konten: tinjau feed kreator dan skrip soal alkohol dan penyajian, jadwalkan dengan mempertimbangkan Ramadan dan waktu salat.\n\nDokumen yang diminta: sertifikat, daftar bahan lengkap, sertifikat pemasok.\n\nRisiko bila tayang tanpa verifikasi: konten ditarik, sanksi regulator, dan kerusakan reputasi yang ikut mengenai kreator.\n\n_Bukan lembaga sertifikasi._`);
    }
    case "onboarding": return L(c, "قائمة التأهيل: الملف، المنتجات، الجمهور، الميزانية، KPI، الموقّع، NPWP. للمؤثرين: KYC، بطاقة الأسعار، BPJS، المحفظة، البورتفوليو.", "Onboarding checklist — brand: profile, products, audience, budget, KPI, signatory, NPWP. Creator: KYC, rate card, BPJS opt-in, e-wallet, portfolio.", "Checklist onboarding — brand: profil, produk, audiens, anggaran, KPI, penandatangan, NPWP. Kreator: KYC, rate card, BPJS, e-wallet, portofolio.");
    case "trend": return L(c, "لحظات موسمية قادمة: يوم الراتب 25، Harbolnas 11.11 و 12.12، رمضان. صيغ رائجة: GRWM، فتح الصناديق، «POV»، البث المباشر مع القسائم.", "Upcoming moments: payday 25th, Harbolnas 11.11 & 12.12, Ramadan. Hot formats: GRWM, unboxing, POV skits, live with vouchers.", "Momen mendatang: gajian 25, Harbolnas 11.11 & 12.12, Ramadan. Format hot: GRWM, unboxing, POV, live dengan voucher.");
    case "retention": { const r = await call("list_brands", { pipeline: "active", limit: 10 }); return L(c, "عملاء نشطون للتجديد: ", "Active clients for renewal: ", "Klien aktif untuk perpanjangan: ") + (r.items.map((b) => b.name).join(", ") || "-") + L(c, " · اعرض 3 مستويات: نانو دائم، نانو+بث، سفراء.", " · offer 3 tiers: always-on nano, nano+live, ambassadors.", " · tawarkan 3 tingkat: nano always-on, nano+live, ambassador."); }
    case "creatordev": return L(c, "خطة نمو: 3 منشورات/أسبوع، خطاف في أول ثانيتين، إضاءة طبيعية، تخصص واضح، بطاقة أسعار مبنية على CPM، وتجنّب مجموعات التفاعل.", "Growth plan: 3 posts/week, hook in 2s, natural light, clear niche, CPM-based rate card, avoid engagement pods.", "Rencana tumbuh: 3 posting/minggu, hook 2 detik, cahaya alami, niche jelas, rate card berbasis CPM, hindari engagement pod.");
    case "community": return L(c, "برنامج المجتمع: ترحيب + قواعد، طقس أسبوعي (تحدي محتوى)، تكريم شهري، إحالة بمكافأة، بث للفرص.", "Community program: welcome + rules, weekly ritual (content challenge), monthly recognition, referral bonus, opportunity broadcasts.", "Program komunitas: sambutan + aturan, ritual mingguan (tantangan konten), apresiasi bulanan, bonus referral, broadcast peluang.");
    case "quality": return L(c, "قائمة مراجعة: الرسائل الأساسية، #iklan، سلامة العلامة، ظهور المنتج، الكابشن، الهاشتاقات، الرابط/الكود. النتيجة: PASS/REVISE.", "QC checklist: key messages, #iklan disclosure, brand safety, product visibility, caption, hashtags, link/code. Verdict: PASS/REVISE.", "Checklist QC: pesan kunci, #iklan, brand safety, visibilitas produk, caption, hashtag, link/kode. Hasil: PASS/REVISE.");
    case "legal": return L(c, "هيكل عقد KUHPerdata/UU ITE: الأطراف، النطاق، الحقوق، الحصرية، الضمان + PPh، الإفصاح، الإنهاء، النزاعات، التوقيع الإلكتروني.", "KUHPerdata/UU ITE contract skeleton: parties, scope, rights, exclusivity, escrow + PPh, disclosure, termination, disputes, e-signature.", "Kerangka kontrak KUHPerdata/UU ITE: pihak, ruang lingkup, hak, eksklusivitas, escrow + PPh, disclosure, pengakhiran, sengketa, tanda tangan elektronik.");
    case "campaign": return L(c, "خطة الحملة: الهدف → KPI → تقسيم الميزانية (70% أتعاب، 15% إنتاج، 10% ترويج، 5% احتياط) → جدول 4 أسابيع → مزيج نانو/مايكرو → تتبع UTM وأكواد.", "Campaign plan: objective → KPI → budget split (70% fees, 15% production, 10% boosting, 5% contingency) → 4-week timeline → nano/micro mix → UTM + promo codes.", "Rencana kampanye: tujuan → KPI → pembagian anggaran (70% fee, 15% produksi, 10% boosting, 5% cadangan) → timeline 4 minggu → mix nano/micro → UTM + kode promo.");
    case "marketing": return L(c, "تقويم أسبوعي: الاثنين تعليمي، الأربعاء قصة نجاح، الجمعة ترند، الأحد خلف الكواليس. أفضل الأوقات 12:00 و19:00 WIB.", "Weekly calendar: Mon educational, Wed success story, Fri trend, Sun behind-the-scenes. Best times 12:00 & 19:00 WIB.", "Kalender mingguan: Sen edukasi, Rab kisah sukses, Jum tren, Min behind-the-scenes. Waktu terbaik 12:00 & 19:00 WIB.");
    case "content": return L(c, "بريف المحتوى: الخطاف، 3 رسائل أساسية، افعل/لا تفعل، CTA، الهاشتاقات، مدة 15–45 ثانية.", "Content brief: hook, 3 key messages, do/don't, CTA, hashtags, 15–45s.", "Brief konten: hook, 3 pesan kunci, do/don't, CTA, hashtag, 15–45 detik.");
    default: {
      // Custom agents have no offline rule of their own: state what they are and what they would reach for.
      const own = def.description?.[c.lang] || def.description?.en || "";
      const tools = (def.tools || []).join(", ");
      if (def.source === "custom") return `${own}\n\n` + L(c, `هذا وكيل مخصّص. بلا مفتاح Claude لا يمكنه التفكير، لكنه سيستخدم عند التفعيل: ${tools}`, `This is a custom agent. Without a Claude key it cannot reason, but once enabled it will use: ${tools}`, `Ini agen kustom. Tanpa kunci Claude ia belum bisa bernalar, tetapi akan memakai: ${tools}`);
      return L(c, "كيف أستطيع المساعدة؟ اسأل عن المؤثرين، الشركات، الحملات، الرسائل، الاحتيال، العقود أو إدارة الصفحات.", "How can I help? Ask about creators, brands, campaigns, outreach, fraud, contracts or page management.", "Ada yang bisa dibantu? Tanyakan tentang kreator, brand, kampanye, outreach, fraud, kontrak, atau pengelolaan halaman.");
    }
  }
}

function fmtK(n = 0) { return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n); }

export { AGENTS };
