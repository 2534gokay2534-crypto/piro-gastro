/**
 * YEDEĞİ VERİTABANINA YÜKLE
 *   npx tsx scripts/db-yedek-yukle.mts [kaynak-dosya]
 *
 * SQLite'tan alınan yedeği Neon (PostgreSQL) üzerine yazar.
 *
 * GÜVENLİK VE VERİ KORUMA
 * • Bağlantı adresi hiçbir yere yazılmaz; yalnızca sunucu türü bildirilir.
 * • Var olan satırların ÜZERİNE YAZMAZ (skipDuplicates). Betik iki kez
 *   çalıştırılırsa veri bozulmaz, yalnızca eksikler tamamlanır.
 * • Yabancı anahtar sırası yedekteki sıraya göre korunur; kendine bağlı
 *   tablolarda (Category.parentId) üst kayıtlar önce yazılır.
 *
 * Sorun çıkarsa hiçbir şey silinmez — yedek dosyası el değmeden durur.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db, dbVar } from "../src/lib/db";
import { kendineBagliAlan } from "../src/lib/db-modeller";

const KAYNAK = process.argv[2] ?? "yedek/veritabani-yedek.json";
const KUME = 1000; // Neon'a tek seferde gönderilecek satır sayısı

if (!dbVar) {
  console.error("DATABASE_URL tanımlı değil ya da PostgreSQL değil.");
  process.exit(1);
}

const yedek = JSON.parse(readFileSync(KAYNAK, "utf8")) as {
  surum: number;
  kaynakTuru: string;
  alindi: string;
  sira: string[];
  veri: Record<string, Record<string, unknown>[]>;
};

const sema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

console.log("kaynak dosya :", KAYNAK);
console.log("alındığı yer :", yedek.kaynakTuru, "·", yedek.alindi);
console.log("hedef        : PostgreSQL\n");

let yazilan = 0;
let atlanan = 0;
let hata = 0;

for (const model of yedek.sira) {
  let satirlar = yedek.veri[model] ?? [];
  if (!satirlar.length) continue;

  // Kendine bağlı tablo: üst kayıt alt kayıttan önce yazılmalı.
  const buyukModel = model[0].toUpperCase() + model.slice(1);
  const kendiAlan = kendineBagliAlan(sema, buyukModel);
  if (kendiAlan) {
    const sirali: Record<string, unknown>[] = [];
    const kalan = [...satirlar];
    const yazilanIdler = new Set<unknown>();
    let guvenlik = 0;
    while (kalan.length && guvenlik++ < 100) {
      for (let i = kalan.length - 1; i >= 0; i--) {
        const ust = kalan[i][kendiAlan];
        if (ust == null || yazilanIdler.has(ust)) {
          yazilanIdler.add(kalan[i].id);
          sirali.push(kalan[i]);
          kalan.splice(i, 1);
        }
      }
    }
    // Çözülemeyen kalırsa yine de yaz — sessizce düşürme.
    satirlar = [...sirali, ...kalan];
  }

  const istemci = (db as never as Record<
    string,
    { createMany: (a: { data: unknown[]; skipDuplicates: boolean }) => Promise<{ count: number }> }
  >)[model];

  let modelYazilan = 0;
  for (let i = 0; i < satirlar.length; i += KUME) {
    const kume = satirlar.slice(i, i + KUME);
    try {
      const r = await istemci.createMany({ data: kume, skipDuplicates: true });
      modelYazilan += r.count;
    } catch (e) {
      hata++;
      const m = e instanceof Error ? e.message.split("\n").filter(Boolean).pop() ?? "" : String(e);
      console.log("  " + model.padEnd(22), "HATA  " + m.slice(0, 110));
      break;
    }
  }
  yazilan += modelYazilan;
  atlanan += satirlar.length - modelYazilan;
  console.log(
    "  " + model.padEnd(22),
    String(modelYazilan).padStart(7) + " yazıldı" +
      (satirlar.length - modelYazilan ? `  (${satirlar.length - modelYazilan} zaten vardı)` : ""),
  );
}

console.log("\ntoplam yazılan :", yazilan);
console.log("zaten var olan :", atlanan);
console.log("hatalı tablo   :", hata);
process.exit(hata > 0 ? 1 : 0);
