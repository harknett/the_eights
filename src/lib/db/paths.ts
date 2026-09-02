import fs from "node:fs";
import path from "node:path";

/**
 * Where the data lives.
 *
 * Free of the server-only guard so the maintenance CLI can find the same
 * database the app uses. It resolves paths and touches nothing else.
 */
export function dataDir(): string {
  const configured = process.env.DATA_DIR?.trim();
  return configured && configured !== ""
    ? path.resolve(configured)
    : path.join(process.cwd(), "data");
}

export function dbFile(): string {
  return path.join(dataDir(), "eights.db");
}

export function ensureDataDir(): string {
  fs.mkdirSync(dataDir(), { recursive: true });
  return dbFile();
}
