// Wipes the local database and uploads, then creates two mock members to log in with.
// All names and keys below are invented. Refuses any database that is not on localhost.
//
//   npm run db:mock -- --yes
import "dotenv/config";
import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import pg from "pg";

const MOCK_MEMBERS = [
  { name: "Ana Teste", password: "senha123", pixKey: "ana.teste@example.com" },
  { name: "Bruno Teste", password: "senha123", pixKey: "3f6c1b2e-8a4d-4f7e-9b1a-0c5d2e7f8a9b" },
];

if (!process.argv.includes("--yes")) {
  console.error("Deletes every member, purchase, contribution and receipt. Re-run with --yes.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run with NODE_ENV=production.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
// The production database lives on Neon; this script must never reach it.
if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  console.error(`Refusing to wipe a non-local database (${new URL(url).hostname}).`);
  process.exit(1);
}

// Same format as src/lib/auth.ts hashPassword: scrypt$<salt b64>$<hash b64>, 64-byte key.
const scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

const hashes = await Promise.all(MOCK_MEMBERS.map((m) => hashPassword(m.password)));
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query('TRUNCATE "Contribution", "Purchase", "Session", "Member"');
  for (const [i, m] of MOCK_MEMBERS.entries()) {
    await client.query('INSERT INTO "Member" (id, name, "passwordHash", "pixKey") VALUES ($1, $2, $3, $4)', [
      randomUUID(), m.name, hashes[i], m.pixKey,
    ]);
  }
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}

const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");
const files = await readdir(uploadsDir).catch(() => []);
await Promise.all(files.map((f) => rm(path.join(uploadsDir, f), { force: true })));

console.log(`Database ${new URL(url).host} reset; removed ${files.length} receipt(s) from ${uploadsDir}.`);
for (const m of MOCK_MEMBERS) console.log(`  ${m.name}  /  ${m.password}  (Pix: ${m.pixKey})`);
