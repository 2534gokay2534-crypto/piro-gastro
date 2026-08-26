/**
 * BETİKLER İÇİN ORTAK PRISMA İSTEMCİSİ
 *
 * Her betiğin kendi adaptörünü kurması, veritabanı değiştiğinde altı ayrı
 * dosyanın güncellenmesi gerektiği anlamına geliyordu — SQLite'tan
 * PostgreSQL'e geçişte hepsi birden bozuldu. Tek yerden kurulur.
 *
 * Bağlantı adresi HİÇBİR ZAMAN yazdırılmaz.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";

const url = process.env.DATABASE_URL ?? "";
const postgresMi = /^(postgres|postgresql|prisma\+postgres):/.test(url);

/** Adres var mı ve şemayla uyumlu mu? */
export const dbVar = postgresMi;

/**
 * İstemciyi kurar. Adres yoksa ya da PostgreSQL değilse anlaşılır bir
 * hatayla durur — Prisma'nın "adapter is not compatible" mesajı yerine.
 */
export function dbKur() {
  if (!url) {
    throw new Error(
      "DATABASE_URL tanımlı değil. .env dosyasına Neon bağlantı dizesini ekleyin.",
    );
  }
  if (!postgresMi) {
    throw new Error(
      'DATABASE_URL bir PostgreSQL adresi değil. Şema PostgreSQL için üretiliyor; ' +
        'adres "postgresql://" ile başlamalı. (SQLite artık desteklenmiyor.)',
    );
  }
  // Yerel (native) modül olduğu için ancak gerekince yüklenir.
  return import("@prisma/adapter-pg").then(
    ({ PrismaPg }) => new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }),
  );
}

/** Betikler için kısa yol: hazır istemci. */
export const db = await dbKur();
