// Accounts end-to-end: sign in, roles, account drawer, admin user management.
//   node test/e2e-auth.mjs online   (API on :8787, demo accounts seeded)   |   node test/e2e-auth.mjs offline
import { chromium } from "playwright";
const MODE = process.argv[2] || "online";
const URL = MODE === "online" ? "http://localhost:8787/" : "file://" + process.cwd() + "/index.html";
const SHOTS = "./shots/";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = []; const out = [];
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("[console] " + m.text()); });
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
await page.route(/^(?!.*(localhost|file:)).*$/, (r) => r.abort());
const check = (n, ok, extra = "") => out.push(`${ok ? "✅" : "❌"} ${n} ${extra}`);
const visibleTabs = () => page.$$eval(".nav-tab:not([hidden])", (els) => els.map((e) => e.dataset.page));
try {
  await page.goto(URL, { waitUntil: "load" }); await page.waitForTimeout(1500);
  check("sign-in button visible", await page.locator("#auth-btn").isVisible());
  check("user chip hidden", !(await page.locator("#user-chip").isVisible()));
  await page.click("#auth-btn"); await page.waitForTimeout(400);
  check("auth modal open", await page.locator("#modal.show .auth-tabs").count() === 1);
  await page.screenshot({ path: `${SHOTS}${MODE}-auth-1-modal.png` });
  // wrong password
  await page.fill("#a-email", "admin@rabith.id"); await page.fill("#a-password", "definitely-wrong"); await page.click('[data-auth="submit"]'); await page.waitForTimeout(900);
  check("wrong password shows error", await page.locator(".auth-err").count() === 1, (await page.locator(".auth-err").textContent().catch(() => "")).slice(0, 40));
  // correct
  await page.fill("#a-email", "admin@rabith.id"); await page.fill("#a-password", "rabith-admin"); await page.click('[data-auth="submit"]'); await page.waitForTimeout(1200);
  check("signed in as admin", await page.locator("#user-chip").isVisible() && (await page.locator("#user-name").textContent()).includes("Rabith"), await page.locator("#user-role").textContent());
  check("login button gone", !(await page.locator("#auth-btn").isVisible()));
  const adminTabs = await visibleTabs(); check("staff sees every tab incl. the ops room", adminTabs.length === 9 && adminTabs.includes("agents"), adminTabs.join(","));
  await page.screenshot({ path: `${SHOTS}${MODE}-auth-2-signed-in.png` });
  // account drawer + admin user list
  await page.click("#user-chip"); await page.waitForTimeout(900);
  check("account drawer", await page.locator("#drawer.show").count() === 1);
  const rows = await page.locator("#admin-users .user-row").count(); check("admin user list", rows >= 3, `${rows} users`);
  await page.screenshot({ path: `${SHOTS}${MODE}-auth-3-account.png` });
  // profile save
  await page.fill("#p-name", "Rabith Boss"); await page.click('[data-auth="save-profile"]'); await page.waitForTimeout(800);
  check("profile saved", (await page.locator("#user-name").textContent()) === "Rabith Boss", await page.locator("#toast").textContent());
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  // session survives reload
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1600);
  check("session persists after reload", await page.locator("#user-chip").isVisible(), await page.locator("#user-name").textContent());
  // logout
  await page.click("#user-chip"); await page.waitForTimeout(700); await page.click('[data-auth="logout"]'); await page.waitForTimeout(700);
  check("signed out", await page.locator("#auth-btn").isVisible() && !(await page.locator("#user-chip").isVisible()));
  // register a brand account
  await page.click("#auth-btn"); await page.waitForTimeout(300); await page.click('[data-auth="tab"][data-tab="register"]'); await page.waitForTimeout(300);
  check("role picker", await page.locator(".role-pick button").count() === 2);
  const mail = `owner${Date.now()}@example.id`;
  await page.fill("#a-name", "Zied Founder"); await page.fill("#a-company", "Zied Studio"); await page.fill("#a-email", mail); await page.fill("#a-password", "supersecret1");
  await page.click('[data-auth="submit"]'); await page.waitForTimeout(1400);
  check("registered brand account", await page.locator("#user-chip").isVisible(), await page.locator("#user-role").textContent());
  const brandTabs = await visibleTabs();
  check("brand role hides internal tabs and the ops room", !brandTabs.includes("brands") && !brandTabs.includes("outreach") && !brandTabs.includes("agents") && brandTabs.includes("campaigns"), brandTabs.join(","));
  check("ops room content hidden for a customer", !(await page.locator("#team-strip").isVisible()));
  await page.evaluate(() => (location.hash = "#agents")); await page.waitForTimeout(600);
  check("a customer cannot deep-link into the ops room", !(await page.locator("#page-agents").isVisible()), await page.evaluate(() => location.hash));
  await page.screenshot({ path: `${SHOTS}${MODE}-auth-4-brand-role.png` });
  if (MODE === "online") {
    await page.click('.nav-tab[data-page="campaigns"]'); await page.waitForTimeout(900);
    const own = await page.evaluate(() => window.Rabith.S.campaigns.length);
    check("brand sees only its own campaigns", own === 0, `${own} campaigns`);
  }
  // creator role
  await page.click("#user-chip"); await page.waitForTimeout(600); await page.click('[data-auth="logout"]'); await page.waitForTimeout(600);
  await page.click("#auth-btn"); await page.waitForTimeout(300);
  await page.fill("#a-email", "creator@rabith.id"); await page.fill("#a-password", "rabith-creator"); await page.click('[data-auth="submit"]'); await page.waitForTimeout(1200);
  const ct = await visibleTabs(); check("creator role sees a reduced menu", ct.length <= 4 && !ct.includes("agents"), ct.join(","));
  check("non-admin has no user management", await page.locator("#admin-users").count() === 0);
} catch (e) { out.push("💥 " + e.message); }
console.log(`=== auth ${MODE} ===`); console.log(out.join("\n")); console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
process.exit(out.some((r) => r.startsWith("❌") || r.startsWith("💥")) || errors.length ? 1 : 0);
