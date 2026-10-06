import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations need a direct connection. On Vercel the Neon integration provides both a pooled
// DATABASE_URL (used by the app at runtime) and DATABASE_URL_UNPOOLED; locally there is only one.
// Left undefined when unset so `prisma generate` (npm postinstall) still works on a fresh clone.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: url ? { url } : undefined,
});
