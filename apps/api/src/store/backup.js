/**
 * Rotating snapshots of the database file. A JSON store has no write-ahead log,
 * so a scheduled copy is the difference between a bad deploy and a lost pipeline.
 */
import fs from "node:fs";
import path from "node:path";

const dir = () => path.join(process.env.RABITH_DATA_DIR || path.resolve(import.meta.dirname, "../../data"), "backups");
const dbFile = () => path.join(process.env.RABITH_DATA_DIR || path.resolve(import.meta.dirname, "../../data"), "db.json");
const KEEP = Number(process.env.RABITH_BACKUP_KEEP || 24);

export function snapshot() {
  const src = dbFile();
  if (!fs.existsSync(src)) return null;
  fs.mkdirSync(dir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const dest = path.join(dir(), `db-${stamp}.json`);
  fs.copyFileSync(src, dest);
  prune();
  return dest;
}

export function prune(keep = KEEP) {
  if (!fs.existsSync(dir())) return [];
  const files = fs.readdirSync(dir()).filter((f) => f.startsWith("db-") && f.endsWith(".json")).sort();
  const remove = files.slice(0, Math.max(0, files.length - keep));
  for (const f of remove) fs.rmSync(path.join(dir(), f), { force: true });
  return remove;
}

export function list() {
  if (!fs.existsSync(dir())) return [];
  return fs.readdirSync(dir()).filter((f) => f.startsWith("db-")).sort()
    .map((f) => ({ file: path.join(dir(), f), size: fs.statSync(path.join(dir(), f)).size }));
}

/** Every `hours`, unref'd so it never holds the process open. */
export function schedule(hours = Number(process.env.RABITH_BACKUP_HOURS || 6)) {
  if (hours <= 0) return null;
  snapshot();
  const timer = setInterval(snapshot, hours * 3600e3);
  timer.unref?.();
  return timer;
}
