/**
 * Builds one self-contained HTML file: markup, styles, logic and the seed data
 * in a single document that runs by double-clicking it, with no server.
 *
 *   node apps/web/build-single.mjs [output.html]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.resolve(here, "../../dist/rabith-app.html");
const read = (p) => fs.readFileSync(path.resolve(here, p), "utf8");

const html = read("index.html");
const css = read("styles.css");
const fallback = read("data/fallback.js");
const app = read("app.js");

const banner = `<!--
  رابط · Rabith — single-file build (${new Date().toISOString().slice(0, 10)})
  The whole platform UI in one document: open it in any browser, no install.
  It runs on its bundled dataset and stores what you change in that browser only.
  Sign in as admin@rabith.id / rabith-admin to reach the staff-only operations room.
  Full system (API, agents, automation): apps/api + n8n in the repository.
-->`;

// Replacer functions, never strings: the sources contain $$ and $` which
// String.replace would otherwise treat as substitution patterns and mangle.
const single = html
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script src="data/fallback.js"></script>', () => `<script>\n${fallback}\n</script>`)
  .replace('<script src="app.js"></script>', () => `<script>\nwindow.RABITH_FORCE_OFFLINE = true;\n${app}\n</script>`)
  .replace("<!DOCTYPE html>", () => `<!DOCTYPE html>\n${banner}`);

for (const marker of ["<style>", "window.RABITH_FORCE_OFFLINE"]) {
  if (!single.includes(marker)) { console.error(`✗ inlining failed: ${marker} missing`); process.exit(1); }
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, single);
console.log(`✓ ${out} — ${(single.length / 1024).toFixed(0)} KB, ${single.split("\n").length} lines`);
