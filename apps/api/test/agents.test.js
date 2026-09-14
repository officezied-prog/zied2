import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RABITH_SKIP_ENV_FILE = "1";
process.env.RABITH_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rabith-agents-"));
const cfgDir = fs.mkdtempSync(path.join(os.tmpdir(), "rabith-cfg-"));
const cfg = path.join(cfgDir, "agents.json");
fs.writeFileSync(cfg, JSON.stringify([
  { id: "custom_qc", glyph: "查", group: "spec", name: { ar: "تدقيق", en: "Custom QC", id: "QC Kustom" }, description: { en: "Checks halal compliance." }, tools: ["get_brand", "save_note"], system: "You are the custom QC agent." },
  { id: "sales", system: "Retuned sales voice." },                                  // override: keeps the built-in tools
  { id: "onelang", glyph: "一", group: "dev", name: "One Language", description: "Same text in every language.", tools: ["platform_stats"], system: "prompt" },
  { id: "BAD ID", glyph: "x", group: "spec", name: "x", system: "x" },              // invalid id
  { id: "nogroup", glyph: "x", group: "nope", name: "x", system: "x" },             // unknown group
  { id: "notools", glyph: "x", group: "spec", name: "x", system: "x", tools: ["delete_everything"] }, // unknown tool
  { id: "noprompt", glyph: "x", group: "spec", name: "x" },                         // missing system prompt
  { id: "custom_qc", glyph: "x", group: "spec", name: "x", system: "x" },          // duplicate
]));
process.env.RABITH_AGENTS_FILE = cfg;
const { AGENTS, byId, agentsSummary, publicList } = await import("../src/agents/registry.js");
const { runAgent } = await import("../src/agents/orchestrator.js");

test("the built-in halal agent ships with the platform", () => {
  const h = byId.halal;
  assert.equal(h.glyph, "清"); assert.equal(h.group, "spec"); assert.equal(h.source, undefined, "it is built in, not loaded from config");
  assert.ok(h.tools.includes("get_campaign"));
  assert.match(h.system, /BPJPH/);
});

test("a custom agent joins the roster with its own glyph, group and tools", () => {
  const a = byId.custom_qc;
  assert.ok(a, "the custom agent must be registered");
  assert.equal(a.glyph, "查"); assert.equal(a.group, "spec"); assert.equal(a.source, "custom");
  assert.deepEqual(a.tools, ["get_brand", "save_note"]);
  assert.equal(a.name.en, "Custom QC");
  assert.equal(AGENTS.length, 22 + 2, "two valid new agents on top of the built-in 22");
});

test("a plain string name or description fills all three languages", () => {
  assert.equal(byId.onelang.name.ar, "One Language");
  assert.equal(byId.onelang.description.id, "Same text in every language.");
});

test("reusing a built-in id patches that agent instead of adding one", () => {
  assert.equal(byId.sales.system, "Retuned sales voice.");
  assert.equal(byId.sales.glyph, "销", "untouched fields survive");
  assert.ok(byId.sales.tools.includes("generate_outreach"), "the built-in tool list is kept when the override omits it");
  assert.equal(AGENTS.filter((a) => a.id === "sales").length, 1);
});

test("every broken entry is reported and skipped, never fatal", () => {
  const { errors } = agentsSummary();
  assert.equal(errors.length, 5);
  assert.ok(errors.some((e) => /id must be lowercase/.test(e)));
  assert.ok(errors.some((e) => /group must be one of/.test(e)));
  assert.ok(errors.some((e) => /unknown tools — delete_everything/.test(e)));
  assert.ok(errors.some((e) => /system prompt is required/.test(e)));
  assert.ok(errors.some((e) => /duplicate id/.test(e)));
  for (const bad of ["nogroup", "notools", "noprompt"]) assert.equal(byId[bad], undefined);
});

test("the public listing marks where each agent came from", () => {
  const list = publicList();
  assert.equal(list.find((a) => a.id === "custom_qc").source, "custom");
  assert.equal(list.find((a) => a.id === "discovery").source, "built-in");
  assert.ok(list.every((a) => a.color));
});

test("a custom agent runs and explains itself while the brain is offline", async () => {
  const run = await runAgent({ agent: "custom_qc", message: "check this brand", context: { lang: "en" } });
  assert.equal(run.status, "done");
  assert.match(run.output, /Checks halal compliance/);
  assert.match(run.output, /get_brand, save_note/);
});

test("a missing or malformed config file degrades quietly", async () => {
  const { loadCustomAgents } = await import("../src/agents/custom.js");
  process.env.RABITH_AGENTS_FILE = path.join(cfgDir, "does-not-exist.json");
  assert.deepEqual(loadCustomAgents({ groups: { spec: {} }, builtInIds: [] }), { agents: [], errors: [], file: null });
  const broken = path.join(cfgDir, "broken.json");
  fs.writeFileSync(broken, "{ not json");
  process.env.RABITH_AGENTS_FILE = broken;
  const r = loadCustomAgents({ groups: { spec: {} }, builtInIds: [] });
  assert.equal(r.agents.length, 0); assert.match(r.errors[0], /not valid JSON/);
  fs.writeFileSync(broken, '{"agents": "nope"}');
  assert.match(loadCustomAgents({ groups: { spec: {} }, builtInIds: [] }).errors[0], /expected an array/);
  process.env.RABITH_AGENTS_FILE = cfg;
});
