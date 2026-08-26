/**
 * ceviri/tr-NN.json dosyalarını kataloğa (ve varsa veritabanına) işler.
 *
 *   node scripts/ceviri-uygula.mjs          -> rapor
 *   node scripts/ceviri-uygula.mjs --yaz    -> catalog.json'a yaz
 *   node scripts/ceviri-uygula.mjs --yaz --db  -> veritabanına da yaz
 *
 * Aynı İngilizce metne sahip TÜM ürünlere uygulanır (benzersizleştirme
 * sayesinde 2284 çeviri 2842 ürünü karşılar).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KATALOG = path.resolve(__dirname, "../src/data/catalog.json");
const KLASOR = path.resolve(__dirname, "../ceviri");
const YAZ = process.argv.includes("--yaz");
const DB = process.argv.includes("--db");
const DIL = process.argv.find((a) => /^--dil=/.test(a))?.split("=")[1] ?? "tr";

const harita = JSON.parse(fs.readFileSync(path.join(KLASOR, "harita.json"), "utf8"));

// tüm tr-NN.json dosyalarını birleştir
const ceviriler = {};
let parcaSayisi = 0;
for (const f of fs.readdirSync(KLASOR).sort()) {
  if (!new RegExp(`^${DIL}-\\d+\\.json$`).test(f)) continue;
  const o = JSON.parse(fs.readFileSync(path.join(KLASOR, f), "utf8"));
  Object.assign(ceviriler, o);
  parcaSayisi++;
}

// numara -> İngilizce metin  =>  İngilizce metin -> çeviri
const enToTr = new Map();
let eksik = 0;
for (const [no, en] of Object.entries(harita)) {
  const tr = ceviriler[no];
  if (tr && String(tr).trim()) enToTr.set(en, String(tr).trim());
  else eksik++;
}

console.log(`Parça dosyası      : ${parcaSayisi}`);
console.log(`Haritadaki metin   : ${Object.keys(harita).length}`);
console.log(`Çevrilmiş          : ${enToTr.size}`);
console.log(`Henüz çevrilmemiş  : ${eksik}`);

const katalog = JSON.parse(fs.readFileSync(KATALOG, "utf8"));
let uygulanan = 0, atlanan = 0;
for (const p of katalog.products) {
  const en = p.i18n?.en?.desc?.trim();
  if (!en) continue;
  if (p.i18n?.[DIL]?.desc?.trim()) { atlanan++; continue; }  // zaten var
  const tr = enToTr.get(en);
  if (!tr) continue;
  if (YAZ) {
    p.i18n[DIL] = p.i18n[DIL] ?? { name: "", desc: "" };
    p.i18n[DIL].desc = tr;
  }
  uygulanan++;
}

if (YAZ) {
  fs.writeFileSync(KATALOG, JSON.stringify(katalog));
  console.log(`\ncatalog.json güncellendi`);
}
console.log(`Açıklaması yazılan ürün : ${uygulanan}`);
console.log(`Zaten çevirisi olan     : ${atlanan}`);

const toplam = katalog.products.filter((p) => p.i18n?.[DIL]?.desc).length;
console.log(`${DIL} açıklaması olan toplam : ${toplam} / ${katalog.products.length}`);

/* ---- veritabanına da yaz ---- */
if (YAZ && DB) {
  const { db } = await import("./_db.mjs");

  let dbYazilan = 0;
  for (const p of katalog.products) {
    const tr = p.i18n?.[DIL]?.desc;
    if (!tr) continue;
    const mevcut = await db.productText.findUnique({
      where: { productId_langCode: { productId: p.id, langCode: DIL } },
      select: { locked: true, origin: true },
    });
    if (mevcut?.locked || mevcut?.origin === "manual") continue;   // elle düzeltilmişe dokunma
    await db.productText.upsert({
      where: { productId_langCode: { productId: p.id, langCode: DIL } },
      create: { productId: p.id, langCode: DIL, name: p.i18n[DIL]?.name ?? "", desc: tr, origin: "machine", translatedAt: new Date() },
      update: { desc: tr, origin: "machine", translatedAt: new Date() },
    });
    dbYazilan++;
  }
  console.log(`veritabanına yazılan : ${dbYazilan}`);
  await db.$disconnect();
}
