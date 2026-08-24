import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma istemcisi — TEMBEL YÜKLEME.
 *
 * better-sqlite3 yerel (native) bir ikilidir ve sunucusuz ortamda
 * yüklenemez. Modül tepesinde import edilirse sayfa daha açılmadan
 * çöker. Bu yüzden adaptör ancak gerçekten gerekince yüklenir.
 *
 * DATABASE_URL yoksa veritabanı YOK sayılır; mağaza sayfaları zaten
 * yayınlanmış katalog dosyasından okuduğu için etkilenmez.
 */

const url = process.env.DATABASE_URL ?? "";
const sqliteMi = url.startsWith("file:");

/** Veritabanı kullanılabilir mi? Yönetici sayfaları buna bakar. */
export const dbVar: boolean = !!url;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function olustur(): PrismaClient {
  if (!url) throw new Error("DATABASE_URL tanımlı değil");
  if (sqliteMi) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

/** İstemciyi ilk kullanımda kurar. Kurulamazsa hata fırlatır. */
export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = olustur();
  return globalForPrisma.prisma;
}

/**
 * Geriye dönük uyum: db.language.findMany() gibi çağrılar çalışsın.
 * Erişim anında istemci kurulur — modül yüklenirken DEĞİL.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const c = getDb() as unknown as Record<string | symbol, unknown>;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});
