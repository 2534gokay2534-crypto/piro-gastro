/**
 * VERİTABANI SAYIMI — hangi tabloda kaç kayıt var
 *   npx tsx scripts/db-sayim.mts
 *
 * DATABASE_URL neyi gösteriyorsa onu sayar. Bağlantı adresini EKRANA
 * YAZMAZ; yalnızca türünü (SQLite / PostgreSQL) söyler.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db, dbVar } from "../src/lib/db";

const url = process.env.DATABASE_URL ?? "";
const tur = url.startsWith("file:") ? "SQLite" : url.startsWith("postgres") ? "PostgreSQL" : "tanımsız";

console.log("veritabanı türü :", tur);
console.log("dbVar           :", dbVar);

if (!dbVar) {
  console.log("\nDATABASE_URL tanımlı değil.");
  process.exit(1);
}

/**
 * Şemadaki tüm modeller — schema.prisma'dan okunur.
 * (db bir Proxy olduğu için Object.keys ile listelenemez.)
 */
const sema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const modeller = [...sema.matchAll(/^model\s+(\w+)\s*\{/gm)]
  .map((m) => m[1][0].toLowerCase() + m[1].slice(1));

console.log(`\n${modeller.length} model:\n`);
let toplam = 0;
let hataliTablo = 0;

for (const m of modeller.sort()) {
  try {
    const n = await (db as never as Record<string, { count: () => Promise<number> }>)[m].count();
    toplam += n;
    if (n > 0) console.log("  " + m.padEnd(24), String(n).padStart(6));
  } catch (e) {
    hataliTablo++;
    const mesaj = e instanceof Error ? e.message.split("\n")[0] : String(e);
    console.log("  " + m.padEnd(24), "  HATA  " + mesaj.slice(0, 90));
  }
}

console.log("\ntoplam kayıt    :", toplam);
console.log("okunamayan tablo:", hataliTablo);
process.exit(hataliTablo > 0 ? 1 : 0);
