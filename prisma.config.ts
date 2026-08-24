import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Geliştirmede SQLite, yayında PostgreSQL.
 * DATABASE_URL "file:" ile başlıyorsa SQLite kabul edilir.
 */
const url = process.env.DATABASE_URL ?? "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});
