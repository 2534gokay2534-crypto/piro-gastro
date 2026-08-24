import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma istemcisi.
 * DATABASE_URL "file:" ile başlıyorsa SQLite, değilse PostgreSQL.
 * Böylece geliştirmede kurulum gerekmez, yayında Postgres kullanılır.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = url.startsWith("file:")
    ? new PrismaBetterSqlite3({ url })
    : new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Veritabanı yapılandırılmış mı? (yoksa site JSON katalogla çalışır) */
export const dbVar = !!process.env.DATABASE_URL;
