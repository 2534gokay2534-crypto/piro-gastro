/**
 * VERİTABANI YEDEĞİ AL
 *   npx tsx scripts/db-yedek-al.mts [hedef-dosya]
 *
 * DATABASE_URL neyi gösteriyorsa onun tamamını JSON'a yazar.
 * SQLite'tan PostgreSQL'e taşımadan ÖNCE çalıştırılır.
 *
 * Bağlantı adresi dosyaya da ekrana da YAZILMAZ; yalnızca türü belirtilir.
 * Üretilen dosya veri içerir — .gitignore'da tutulur, depoya girmez.
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { db, dbVar } from "../src/lib/db";
import { modelSirasi } from "../src/lib/db-modeller";

const HEDEF = process.argv[2] ?? "yedek/veritabani-yedek.json";

if (!dbVar) {
  console.error("DATABASE_URL tanımlı değil.");
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? "";
const tur = url.startsWith("file:") ? "SQLite" : "PostgreSQL";
console.log("kaynak :", tur);

const sema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const sirali = modelSirasi(sema);

const veri: Record<string, unknown[]> = {};
let toplam = 0;

for (const m of sirali) {
  const istemci = (db as never as Record<string, { findMany: (a?: unknown) => Promise<unknown[]> }>)[m];
  const satirlar = await istemci.findMany();
  veri[m] = satirlar;
  toplam += satirlar.length;
  if (satirlar.length) console.log("  " + m.padEnd(22), String(satirlar.length).padStart(7));
}

const cikti = {
  surum: 1,
  kaynakTuru: tur, // adres DEĞİL, yalnızca tür
  alindi: new Date().toISOString(),
  sira: sirali,
  veri,
};

writeFileSync(HEDEF, JSON.stringify(cikti), "utf8");

const { statSync } = await import("node:fs");
console.log("\ntoplam kayıt :", toplam);
console.log("yazıldı      :", HEDEF, `(${(statSync(HEDEF).size / 1048576).toFixed(1)} MB)`);
process.exit(0);
