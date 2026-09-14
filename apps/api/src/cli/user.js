#!/usr/bin/env node
/**
 * Account management from the terminal — for the team accounts you do not want to
 * create through a browser (first admin on a server, onboarding a teammate, a reset).
 *
 *   npm run user -- list
 *   npm run user -- add zied@rabith.id --name "Zied" --role admin
 *   npm run user -- promote teammate@rabith.id --role admin
 *   npm run user -- password teammate@rabith.id
 *   npm run user -- suspend teammate@rabith.id      (and: activate, delete)
 *
 * Passwords are generated and printed once. They are never stored in plain text.
 */
import "../env.js";
import { randomInt } from "node:crypto";
import * as store from "../store/jsonStore.js";
import { ROLES, createUser, findByEmail, setPassword, publicUser, normEmail, validateRegistration } from "../auth/users.js";
import { revokeAllForUser } from "../auth/sessions.js";
import { validatePassword } from "../auth/passwords.js";

/** Readable, strong, no look-alike characters. */
export function generatePassword(groups = 4, size = 4) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const chunk = () => Array.from({ length: size }, () => alphabet[randomInt(alphabet.length)]).join("");
  return Array.from({ length: groups }, chunk).join("-");
}

export function parseArgs(argv) {
  const [command, target, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith("--")) continue;
    const key = rest[i].slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) flags[key] = true;
    else { flags[key] = next; i++; }
  }
  return { command, target, flags };
}

const USAGE = `Rabith accounts —  npm run user -- <command>

  list                            show every account
  add <email> --name "Full Name" [--role admin|brand|creator] [--password X] [--company X] [--lang ar|en|id]
  promote <email> --role admin    change an existing account's role
  password <email> [--password X] reset a password (all sessions are signed out)
  suspend <email>                 block sign-in and kill live sessions
  activate <email>                undo a suspension
  delete <email>                  remove the account for good

Roles: admin = your team (sees the operations room) · brand = a company · creator = an influencer.`;

export async function run(argv, log = console.log) {
  const { command, target, flags } = parseArgs(argv);
  store.load();

  const need = (email) => {
    const u = email ? findByEmail(email) : null;
    if (!u) throw new Error(`no account for ${email || "(missing email)"}`);
    return u;
  };
  const show = (u) => `${u.role.padEnd(7)} ${u.status === "active" ? " " : "✗"} ${u.email.padEnd(30)} ${u.name}`;

  switch (command) {
    case "list": {
      const users = store.all("users");
      if (!users.length) return log("no accounts yet — create one with:  npm run user -- add you@example.com --name \"You\" --role admin");
      log(`${users.length} account(s):`);
      for (const u of users) log("  " + show(u));
      return;
    }
    case "add": {
      const email = normEmail(target);
      const role = flags.role || "admin";
      if (!ROLES.includes(role)) throw new Error(`--role must be one of: ${ROLES.join(", ")}`);
      const name = typeof flags.name === "string" ? flags.name : "";
      const password = typeof flags.password === "string" ? flags.password : generatePassword();
      const problem = validateRegistration({ email, password, name, role: role === "admin" ? "brand" : role });
      if (problem) throw new Error(problem);
      const user = await createUser({ email, password, name, role: role === "admin" ? "brand" : role, company: flags.company, handle: flags.handle, lang: flags.lang || "ar", createdBy: "cli" });
      if (role === "admin") store.update("users", user.id, { role: "admin" });
      store.flushSync();
      log(`✓ created ${email} as ${role}`);
      log(`  password: ${password}`);
      log("  Hand it over on a private channel. They can change it from the account panel.");
      return publicUser(findByEmail(email));
    }
    case "promote": {
      const u = need(target);
      const role = flags.role || "admin";
      if (!ROLES.includes(role)) throw new Error(`--role must be one of: ${ROLES.join(", ")}`);
      store.update("users", u.id, { role });
      store.flushSync();
      log(`✓ ${u.email} is now ${role}`);
      return publicUser(findByEmail(u.email));
    }
    case "password": {
      const u = need(target);
      const password = typeof flags.password === "string" ? flags.password : generatePassword();
      const problem = validatePassword(password);
      if (problem) throw new Error(problem);
      await setPassword(u.id, password);
      revokeAllForUser(u.id);
      store.flushSync();
      log(`✓ new password for ${u.email}: ${password}`);
      log("  Every device signed in as this account was signed out.");
      return true;
    }
    case "suspend":
    case "activate": {
      const u = need(target);
      const status = command === "suspend" ? "suspended" : "active";
      store.update("users", u.id, { status });
      if (status === "suspended") revokeAllForUser(u.id);
      store.flushSync();
      log(`✓ ${u.email} is now ${status}`);
      return publicUser(findByEmail(u.email));
    }
    case "delete": {
      const u = need(target);
      revokeAllForUser(u.id);
      store.remove("users", u.id);
      store.flushSync();
      log(`✓ deleted ${u.email}`);
      return true;
    }
    default:
      log(USAGE);
      return null;
  }
}

if (process.argv[1] && process.argv[1].endsWith("user.js")) {
  run(process.argv.slice(2)).catch((e) => { console.error("✗ " + e.message); process.exit(1); });
}
