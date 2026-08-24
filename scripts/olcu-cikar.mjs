/**
 * Açıklama/ad metninden ölçü çıkarır (Unninox ürünleri için).
 * Bartscher'de ölçü XML'den yapısal geliyor; bu betik yalnızca
 * dims alanı boş olan ürünlere dokunur.
 *
 *   node scripts/olcu-cikar.mjs          -> rapor
 *   node scripts/olcu-cikar.mjs --yaz    -> catalog.json'a yaz
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEDEF = path.resolve(__dirname, "../src/data/catalog.json");
const YAZ = process.argv.includes("--yaz");

/**
 * Yakalanan biçimler:
 *   "Dimensions: 400 × 825 × H920 mm"
 *   "900x700xH850mm"
 *   "120 × 74 × H139.5 cm"
 *   "W 500 x D 600 x H 850 mm"
 *
 * Birim ZORUNLU. Birimsiz üçlüler (örn. "1955x115xH122") belirsiz olduğu
 * için bilerek atlanır — yanlış ölçü göstermektense hiç göstermemek yeğdir.
 */
const SAYI = "(\\d{2,5}(?:[.,]\\d{1,2})?)";
const AYRAC = "\\s*[x×*]\\s*";
// Dikkat: kaynak metinde "H920 mmTotal Power" gibi bitişik yazımlar var,
// bu yüzden birimden sonra kelime sınırı ARANMAZ.
const BIRIM = "\\s*(mm|cm)";

const KALIPLAR = [
  new RegExp(`\\bW\\s*[:.]?\\s*${SAYI}${AYRAC}D\\s*[:.]?\\s*${SAYI}${AYRAC}H\\s*[:.]?\\s*${SAYI}${BIRIM}`, "i"),
  new RegExp(`dimensions?\\s*[:=]?\\s*${SAYI}${AYRAC}${SAYI}${AYRAC}H?\\s*${SAYI}${BIRIM}`, "i"),
  new RegExp(`(?:^|[\\s(\\u2013-])${SAYI}${AYRAC}${SAYI}${AYRAC}H?\\s*${SAYI}${BIRIM}`, "i"),
];

const say = (t) => parseFloat(String(t).replace(",", "."));

export function olcuBul(metin) {
  const t = String(metin || "");
  for (const kalip of KALIPLAR) {
    const m = t.match(kalip);
    if (!m) continue;
    const carpan = String(m[4]).toLowerCase() === "cm" ? 10 : 1;
    const w = Math.round(say(m[1]) * carpan);
    const d = Math.round(say(m[2]) * carpan);
    const h = Math.round(say(m[3]) * carpan);
    // makul aralık: 2 cm – 6 m (hepsi mm cinsinden)
    if ([w, d, h].every((v) => Number.isFinite(v) && v >= 3 && v <= 4000)) {
      return { w, d, h, unit: "mm" };
    }
  }
  return null;
}

/* --- ana akış (import edildiğinde çalışmaz) --- */
if (process.argv[1] && process.argv[1].endsWith("olcu-cikar.mjs")) {
  const katalog = JSON.parse(fs.readFileSync(HEDEF, "utf8"));
  let bulundu = 0, zaten = 0, yok = 0;
  const orneklerYok = [];

  for (const p of katalog.products) {
    if (p.dims) { zaten++; continue; }
    const kaynak = [p.nameEn, p.nameSv, p.descEn, p.descSv, p.descTr,
      ...(p.specs || []).map((s) => `${s.label} ${s.value}`)]
      .filter(Boolean).join(" \n ");
    const o = olcuBul(kaynak);
    if (o) { if (YAZ) p.dims = o; bulundu++; }
    else { yok++; if (orneklerYok.length < 10) orneklerYok.push(`${p.sku}  ${p.nameEn}`); }
  }

  if (YAZ) {
    fs.writeFileSync(HEDEF, JSON.stringify(katalog));
    console.log("catalog.json güncellendi");
  }
  const toplam = katalog.products.length;
  const olculu = zaten + bulundu;
  console.log(`Ürün: ${toplam}`);
  console.log(`  XML'den ölçülü      : ${zaten}`);
  console.log(`  metinden çıkarıldı  : ${bulundu}`);
  console.log(`  ölçüsü yok          : ${yok}`);
  console.log(`  KAPSAM              : ${olculu}/${toplam}  (%${Math.round((olculu / toplam) * 100)})`);
  if (orneklerYok.length) {
    console.log("\nölçüsü bulunamayanlardan örnekler:");
    orneklerYok.forEach((x) => console.log("  " + x));
  }
}
