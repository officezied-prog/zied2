import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.RABITH_SKIP_ENV_FILE = "1";
process.env.RABITH_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rabith-cli-"));
const { run, generatePassword, parseArgs } = await import("../src/cli/user.js");
const { findByEmail } = await import("../src/auth/users.js");
const { checkPassword } = await import("../src/auth/users.js");

const lines = [];
const log = (...a) => lines.push(a.join(" "));
const out = () => lines.join("\n");
const grabPassword = () => out().match(/[a-z2-9]{4}(?:-[a-z2-9]{4}){3}/)[0];

test("parseArgs reads the command, the email and the flags", () => {
  const p = parseArgs(["add", "a@b.id", "--name", "Full Name", "--role", "admin", "--force"]);
  assert.equal(p.command, "add"); assert.equal(p.target, "a@b.id");
  assert.equal(p.flags.name, "Full Name"); assert.equal(p.flags.role, "admin"); assert.equal(p.flags.force, true);
});

test("generated passwords are readable, strong and unique", () => {
  const a = generatePassword(), b = generatePassword();
  assert.match(a, /^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
  assert.notEqual(a, b);
  assert.ok(!/[0o1li]/.test(a), "no look-alike characters");
});

test("add creates a working admin and prints the password once", async () => {
  lines.length = 0;
  const user = await run(["add", "TEAM@Rabith.id", "--name", "Team Mate", "--role", "admin"], log);
  assert.equal(user.email, "team@rabith.id", "the email is normalised");
  assert.equal(user.role, "admin");
  const printed = grabPassword();
  assert.ok(await checkPassword(findByEmail("team@rabith.id"), printed), "the printed password really signs in");
  assert.ok(!out().includes("scrypt"), "the hash is never printed");
});

test("add refuses a duplicate, a bad email, a weak password and an unknown role", async () => {
  await assert.rejects(() => run(["add", "team@rabith.id", "--name", "x", "--role", "admin"], log), /already exists/);
  await assert.rejects(() => run(["add", "not-an-email", "--name", "x"], log), /valid email/);
  await assert.rejects(() => run(["add", "weak@rabith.id", "--name", "x", "--password", "123"], log), /at least 8/);
  await assert.rejects(() => run(["add", "role@rabith.id", "--name", "x", "--role", "wizard"], log), /--role must be one of/);
});

test("a brand signup can be promoted to the team later", async () => {
  const created = await run(["add", "late@rabith.id", "--name", "Late Joiner", "--role", "brand", "--company", "Late Co"], log);
  assert.equal(created.role, "brand");
  assert.ok(created.brandId, "a brand account still gets its CRM row");
  const promoted = await run(["promote", "late@rabith.id", "--role", "admin"], log);
  assert.equal(promoted.role, "admin");
  await assert.rejects(() => run(["promote", "nobody@rabith.id"], log), /no account for/);
});

test("password reset changes the password and signs every device out", async () => {
  lines.length = 0;
  const { issue, resolve } = await import("../src/auth/sessions.js");
  const user = findByEmail("team@rabith.id");
  const { token } = issue(user.id);
  assert.ok(resolve(token), "the session starts out valid");
  await run(["password", "team@rabith.id"], log);
  const fresh = grabPassword();
  assert.ok(await checkPassword(findByEmail("team@rabith.id"), fresh));
  assert.equal(resolve(token), null, "the old session is gone");
});

test("suspend blocks sign-in, activate restores it, delete removes the account", async () => {
  await run(["suspend", "late@rabith.id"], log);
  assert.equal(findByEmail("late@rabith.id").status, "suspended");
  assert.equal(await checkPassword(findByEmail("late@rabith.id"), "whatever"), false);
  await run(["activate", "late@rabith.id"], log);
  assert.equal(findByEmail("late@rabith.id").status, "active");
  await run(["delete", "late@rabith.id"], log);
  assert.equal(findByEmail("late@rabith.id"), null);
});

test("list prints every account, and an unknown command prints the usage", async () => {
  lines.length = 0; await run(["list"], log);
  assert.match(out(), /team@rabith.id/);
  lines.length = 0; await run([], log);
  assert.match(out(), /npm run user/);
});

test("the store picks up an account written by another process", async () => {
  const store = await import("../src/store/jsonStore.js");
  store.flushSync();
  const file = path.join(process.env.RABITH_DATA_DIR, "db.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  raw.users.push({ id: "us_external", email: "external@rabith.id", name: "Written Outside", role: "admin", status: "active", passwordHash: "x" });
  fs.writeFileSync(file, JSON.stringify(raw));
  fs.utimesSync(file, new Date(), new Date(Date.now() + 2000)); // make the newer mtime unambiguous
  assert.ok(store.all("users").some((u) => u.email === "external@rabith.id"), "a running server must see CLI changes");
});
