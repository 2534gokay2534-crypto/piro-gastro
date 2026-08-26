import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma istemcisi — TEMBEL YÜKLEME.
 *
 * Adaptör modül tepesinde import edilmez; ancak gerçekten gerekince
 * yüklenir. Böylece veritabanı olmayan bir ortamda sayfa çökmez.
 *
 * VERİTABANI: PostgreSQL (Neon). Prisma şema başına tek sağlayıcı
 * destekler; şema PostgreSQL'e göre üretildiği için DATABASE_URL de
 * PostgreSQL olmalıdır. "file:" ile başlayan SQLite adresi verilirse
 * istemci hiç kurulmaz — Prisma'nın anlaşılması güç "adapter is not
 * compatible" hatası yerine ne yapılacağını söyleyen bir mesaj verilir.
 * (Bu uyumsuzluk, canlıda "Veritabanı bağlı değil" uyarısının sebebiydi.)
 *
 * DATABASE_URL yoksa veritabanı YOK sayılır; mağaza sayfaları
 * yayınlanmış katalog dosyasından okuduğu için etkilenmez.
 */

const url = process.env.DATABASE_URL ?? "";
const postgresMi = /^(postgres|postgresql|prisma\+postgres):/.test(url);

/** Adres var ama PostgreSQL değil — kurulum ekranı bunu ayrıca uyarır. */
export const yanlisSaglayici: boolean = !!url && !postgresMi;

/** Veritabanı kullanılabilir mi? Yönetici sayfaları buna bakar. */
export const dbVar: boolean = postgresMi;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function olustur(): PrismaClient {
  if (!url) throw new Error("DATABASE_URL tanımlı değil.");
  if (!postgresMi) {
    throw new Error(
      "DATABASE_URL bir PostgreSQL adresi değil. Şema PostgreSQL için üretiliyor; " +
        'adres "postgresql://…" ile başlamalı (Neon bağlantı dizesi).',
    );
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
