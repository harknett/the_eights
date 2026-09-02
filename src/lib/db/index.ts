import "server-only";

import { Store } from "./store";
import { dbFile, ensureDataDir } from "./paths";

export { dataDir, dbFile } from "./paths";

// Next re-evaluates modules on hot reload; keep one connection per process.
const globalForStore = globalThis as unknown as { __store?: Store; __storeClass?: unknown };

export function getStore(): Store {
  // The cached instance is only good while it came from the class held now. A
  // hot reload produces a new class object, and an instance built from the old
  // one keeps the old prototype - a method added in the edit just saved would
  // read as "not a function" until a restart.
  if (globalForStore.__store && globalForStore.__storeClass === Store) {
    return globalForStore.__store;
  }
  globalForStore.__store?.close();
  ensureDataDir();
  globalForStore.__store = new Store(dbFile());
  globalForStore.__storeClass = Store;
  return globalForStore.__store;
}
