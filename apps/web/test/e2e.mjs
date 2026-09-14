// End-to-end smoke test. Run from apps/web:  npm i -g playwright && npx playwright install chromium
//   node test/e2e.mjs online   (API running on :8787)   |   node test/e2e.mjs offline   (file:// mode)
// Screenshots land in ./shots/. Exit code 1 on any failed check or page error.
import { chromium } from "playwright";
const MODE = process.argv[2] || "online";
const URL = MODE === "online" ? (process.env.RABITH_URL || "http://localhost:8787/") : "file://" + process.cwd() + "/index.html";
const SHOTS = "./shots/";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("[console] " + m.text()); });
await page.route(/^(?!.*(localhost|file:)).*$/, (r) => r.abort());
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
const results = [];
const check = (name, ok, extra = "") => { results.push(`${ok ? "✅" : "❌"} ${name} ${extra}`); };
const shot = (n) => page.screenshot({ path: `${SHOTS}${MODE}-${n}.png`, fullPage: false });
try {
  await page.goto(URL, { waitUntil: "load" }); await page.waitForTimeout(1500);
  const chip = await page.locator("#mode-chip").getAttribute("class");
  check("mode chip", MODE === "online" ? chip.includes("online") : chip.includes("offline"), chip);
  // Home
  const stats = await page.locator("#home-stats .counter-num").allTextContents(); check("home stats", Number(stats[0].replace(/,/g, "")) >= 120, stats.join("/"));
  check("ops room hidden from customers", !(await page.locator("#team-strip").isVisible()) && !(await page.locator('.nav-tab[data-page="agents"]').isVisible()));
  await shot("1-home");
  // Discover
  await page.click('.nav-tab[data-page="discover"]'); await page.waitForTimeout(600);
  const n0 = await page.locator("#disc-grid .creator-card").count(); check("discover cards", n0 === 24, String(n0));
  await page.selectOption("#f-platform", "tiktok"); await page.selectOption("#f-tier", "nano"); await page.waitForTimeout(500);
  const cnt = await page.locator("#disc-count").textContent(); check("discover filter", /\d+/.test(cnt), cnt.trim());
  await page.fill("#f-q", "beauty"); await page.waitForTimeout(600); const n1 = await page.locator("#disc-grid .creator-card").count(); check("discover search", n1 > 0 && n1 <= 24, String(n1));
  await page.locator("#disc-grid .creator-card").first().click(); await page.waitForTimeout(400); check("creator drawer", await page.locator("#drawer.show").count() === 1);
  await page.click('[data-action="creator-audit"]'); await page.waitForTimeout(800); check("audit result", (await page.locator("#audit-out .bar-row").count()) >= 5);
  await shot("2-discover"); await page.keyboard.press("Escape"); await page.waitForTimeout(300); check("esc closes drawer", await page.locator("#drawer.show").count() === 0);
  // Brands
  await page.click('.nav-tab[data-page="brands"]'); await page.waitForTimeout(600); check("kanban cols", (await page.locator(".kcol").count()) === 6);
  const kc = await page.locator(".kcard").count(); check("kanban cards", kc >= 26, String(kc));
  await page.locator('.kcol[data-col="lead"] [data-action="brand-move"][data-dir="1"]').first().click(); await page.waitForTimeout(500);
  check("brand moved", (await page.locator("#toast").textContent()).length > 0, await page.locator("#toast").textContent());
  await page.click('[data-action="brand-new"]'); await page.waitForTimeout(300); await page.fill("#bf-name", "E2E Brand"); await page.fill("#bf-industry", "beauty"); await page.fill("#bf-cname", "Test Person"); await page.click('[data-action="brand-save"]'); await page.waitForTimeout(600);
  check("brand created", (await page.locator(".kcard", { hasText: "E2E Brand" }).count()) === 1); await shot("3-brands");
  // Campaigns
  await page.click('.nav-tab[data-page="campaigns"]'); await page.waitForTimeout(500); await page.click('[data-action="camp-new"]'); await page.waitForTimeout(300);
  await page.fill("#cw-name", "E2E Nano Pilot"); await page.click('[data-action="camp-create"]'); await page.waitForTimeout(2500);
  const rows = await page.locator("#camp-detail tbody tr").count(); check("campaign matched", rows >= 10, `${rows} rows`);
  check("plan box", (await page.locator(".plan-box").count()) === 1); await shot("4-campaigns");
  // Outreach
  await page.click('.nav-tab[data-page="outreach"]'); await page.waitForTimeout(500); await page.click('[data-action="o-generate"]'); await page.waitForTimeout(800);
  const subj = await page.locator("#o-preview .subj").textContent(); check("outreach preview", subj.length > 5 && !subj.includes("{{"), subj.slice(0, 50));
  await page.click('[data-action="o-save"]'); await page.waitForTimeout(500); await page.click('[data-itab="o-seq"]'); await page.waitForTimeout(500); check("sequence list", (await page.locator(".seq-item").count()) >= 1);
  await page.click('[data-itab="o-tpl"]'); await page.waitForTimeout(300); check("templates", (await page.locator(".tpl-card").count()) === 11); await shot("5-outreach");
  // Ops room — staff only, so sign in as the demo admin first
  await page.click("#auth-btn"); await page.waitForTimeout(400);
  await page.fill("#a-email", "admin@rabith.id"); await page.fill("#a-password", "rabith-admin");
  await page.click('[data-auth="submit"]'); await page.waitForTimeout(1400);
  const staffHidden = await page.$$eval("[data-staff]", (els) => els.map((e) => e.hidden));
  check("ops room appears for staff", (await page.locator('.nav-tab[data-page="agents"]').isVisible()) && staffHidden.every((h) => h === false), `${staffHidden.length} staff surfaces`);
  await page.click('.nav-tab[data-page="agents"]'); await page.waitForTimeout(500); check("22 agents", (await page.locator(".agent-tile").count()) === 22);
  await page.locator("[data-quick='q1']").click(); await page.waitForTimeout(MODE === "online" ? 3000 : 1500);
  const bot = await page.locator(".msg.bot").last().textContent(); check("agent reply", bot.includes("@") && (await page.locator(".msg.bot .step").count()) >= 1, bot.slice(0, 60).replace(/\n/g, " "));
  check("runs list", (await page.locator(".run-item").count()) >= 1); await shot("6-agents");
  // Social
  await page.click('.nav-tab[data-page="social"]'); await page.waitForTimeout(500); await page.fill("#sp-topic", "Nano creators for UMKM"); await page.click('[data-action="sp-generate"]'); await page.waitForTimeout(800);
  check("post generated", (await page.inputValue("#sp-caption")).includes("Nano")); await page.fill("#sp-when", "2026-10-01T19:00"); await page.click('[data-action="sp-schedule"]'); await page.waitForTimeout(600);
  check("post scheduled", (await page.locator(".post-card").count()) >= 1); await shot("7-social");
  // Legal
  await page.click('.nav-tab[data-page="legal"]'); await page.waitForTimeout(500); await page.click('[data-action="lg-generate"]'); await page.waitForTimeout(400);
  check("contract", (await page.locator("#contract-out .c-row").count()) >= 8); await shot("8-legal");
  // Pricing + language
  await page.click('.nav-tab[data-page="pricing"]'); await page.waitForTimeout(300); await page.click('[data-plan="creator"]'); check("pricing toggle", await page.locator("#plans-creator").isVisible());
  await page.click('.lang-btn[data-lang="en"]'); await page.waitForTimeout(300); check("lang en", (await page.locator('.nav-tab[data-page="discover"] [data-k]').textContent()) === "Discover" && (await page.getAttribute("html", "dir")) === "ltr");
  await page.click('.lang-btn[data-lang="id"]'); await page.waitForTimeout(300); check("lang id", (await page.locator('.nav-tab[data-page="discover"] [data-k]').textContent()) === "Temukan");
  await page.click('.nav-tab[data-page="home"]'); await page.waitForTimeout(400); await shot("9-home-id");
  // Mobile
  await page.setViewportSize({ width: 400, height: 800 }); await page.click('.nav-tab[data-page="discover"]'); await page.waitForTimeout(500);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth); check("no horizontal scroll @400", sw <= 401, String(sw)); await shot("10-mobile");
} catch (e) { results.push("💥 " + e.message); }
console.log(`=== ${MODE} ===`); console.log(results.join("\n")); console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
process.exit(results.some((r) => r.startsWith("❌") || r.startsWith("💥")) || errors.length ? 1 : 0);
