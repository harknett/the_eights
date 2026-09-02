/**
 * Reset an account's password from the command line.
 *
 * The escape hatch for the one case the app cannot help with: whoever set the
 * household up has forgotten their own password and there is nobody to reset
 * it for them.
 *
 *   npm run set-password -- you@example.com
 *
 * Authorisation is access to the machine and the data directory, which adds no
 * exposure: anyone who can run this can already open the database and read
 * everything in it. It reuses the app's own hashing rather than reimplementing
 * the format.
 */

import { existsSync } from "node:fs";

import { generateTemporaryPassword, hashPassword } from "../src/lib/auth/password.ts";
import { dbFile } from "../src/lib/db/paths.ts";
import { Store } from "../src/lib/db/store.ts";

function fail(message: string): never {
  process.stderr.write(`\n  ${message}\n\n`);
  process.exit(1);
}

const email = process.argv[2]?.trim().toLowerCase();

if (!email || email === "--help" || email === "-h") {
  process.stdout.write(
    [
      "",
      "  Reset an account's password.",
      "",
      "    npm run set-password -- <email>",
      "",
      "  Sets a new temporary password, prints it once, signs that account out",
      "  everywhere, and asks them to choose their own at next sign-in.",
      "",
      `  Reads DATA_DIR, defaulting to ${dbFile()}`,
      "",
    ].join("\n"),
  );
  process.exit(email ? 0 : 1);
}

const file = dbFile();
if (!existsSync(file)) {
  fail(`No database at ${file}\n  Set DATA_DIR if it lives elsewhere.`);
}

const store = new Store(file);

try {
  const user = store.findUserByEmail(email);
  if (!user) {
    const known = store.listUsers().map((u) => `    ${u.email}  (${u.role})`);
    fail(
      known.length > 0
        ? `No account for ${email}. This household has:\n${known.join("\n")}`
        : `No account for ${email}, and there are no accounts at all.`,
    );
  }

  const temporary = generateTemporaryPassword();
  store.setPassword(user.id, await hashPassword(temporary), true);
  store.deleteUserSessions(user.id);

  process.stdout.write(
    [
      "",
      `  Password reset for ${user.name} <${user.email}>`,
      "",
      `      ${temporary}`,
      "",
      "  Shown once. Sign in with it and you will be asked to choose your own.",
      "  Any device that account was signed in on has been signed out.",
      "",
    ].join("\n"),
  );
} finally {
  store.close();
}
