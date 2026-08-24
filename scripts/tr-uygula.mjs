/**
 * Sözlüğü kataloğa uygular ve dürüst bir kapsam raporu verir.
 *
 *   node scripts/tr-uygula.mjs         -> rapor
 *   node scripts/tr-uygula.mjs --yaz   -> catalog.json'a yaz
 *
 * ÖNEMLİ: Bir dilin metni İngilizce ile birebir aynıysa bu çeviri DEĞİL,
 * kopyadır. Kopyalar boşaltılır ki arayüz "çeviri yok" diyebilsin;
 * böylece sayfada karışık dil görünmez.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { etiketCevir, degerCevir, adCevir } from "./sozluk-tr.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEDEF = path.resolve(__dirname, "../src/data/catalog.json");
const YAZ = process.argv.includes("--yaz");

const katalog = JSON.parse(fs.readFileSync(HEDEF, "utf8"));
const P = katalog.products;
const es = (a, b) => a && b && String(a).trim() === String(b).trim();

let acKopyaSilinen = 0, adKopya = 0, adCevrilen = 0;
let ozCevrilen = 0, ozCevrilemeyen = 0;
const cevrilemeyenEtiket = new Map();

for (const p of P) {
  const en = p.i18n.en ?? { name: "", desc: "" };

  // --- kopyalanmış açıklamaları boşalt (karışık dil olmasın) ---
  for (const L of Object.keys(p.i18n)) {
    if (L === "en") continue;
    if (es(p.i18n[L].desc, en.desc)) { if (YAZ) p.i18n[L].desc = ""; acKopyaSilinen++; }
    if (es(p.i18n[L].name, en.name)) {
      adKopya++;
      // ADLAR ASLA BOŞALTILMAZ — boş başlık bozuk sayfa demektir.
      // Çeviri varsa yazılır; yoksa özgün ad kalır, panel "çevrilmedi" der.
      if (L === "tr") {
        const yeni = adCevir(en.name);
        if (yeni) { if (YAZ) p.i18n.tr.name = yeni; adCevrilen++; }
      }
    }
  }

  // --- teknik özellikleri Türkçeye çevir ---
  for (const s of p.specs ?? []) {
    const e = s.i18n?.en;
    if (!e) continue;
    if (s.i18n.tr?.label) continue;          // zaten Türkçe var (Unninox)
    const l = etiketCevir(e.label);
    const v = degerCevir(e.value);
    if (l && v !== null) {
      if (YAZ) s.i18n.tr = { label: l, value: v };
      ozCevrilen++;
    } else {
      ozCevrilemeyen++;
      if (!l) cevrilemeyenEtiket.set(e.label, (cevrilemeyenEtiket.get(e.label) || 0) + 1);
    }
  }
}

if (YAZ) {
  fs.writeFileSync(HEDEF, JSON.stringify(katalog));
  console.log("catalog.json güncellendi\n");
}

console.log("TEKNİK ÖZELLİK ÇEVİRİSİ");
console.log(`  çevrildi     : ${ozCevrilen}`);
console.log(`  çevrilemedi  : ${ozCevrilemeyen}`);
console.log(`  oran         : %${Math.round((ozCevrilen / (ozCevrilen + ozCevrilemeyen)) * 100)}`);
console.log(`\nKOPYA TEMİZLİĞİ`);
console.log(`  boşaltılan kopya açıklama : ${acKopyaSilinen}`);
console.log(`  İngilizce ile aynı ad     : ${adKopya}`);
console.log(`  Türkçeye çevrilen ad      : ${adCevrilen}`);

console.log("\nDİL KAPSAMI (gerçek çeviri):");
for (const L of katalog.languages) {
  const c = L.code;
  const ad = P.filter((p) => p.i18n[c]?.name && (c === "en" || !es(p.i18n[c].name, p.i18n.en.name))).length;
  const ac = P.filter((p) => p.i18n[c]?.desc).length;
  const oz = P.filter((p) => (p.specs ?? []).some((s) => s.i18n?.[c]?.label)).length;
  console.log(`  ${c}: ad ${ad}/${P.length}  açıklama ${ac}/${P.length}  özellik ${oz}/${P.length}`);
}

if (cevrilemeyenEtiket.size) {
  const s = [...cevrilemeyenEtiket.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\nSÖZLÜKTE OLMAYAN ETİKETLER (${cevrilemeyenEtiket.size} farklı) — en sık 25:`);
  s.slice(0, 25).forEach(([l, n]) => console.log(`  ${String(n).padStart(5)}  ${l}`));
}
