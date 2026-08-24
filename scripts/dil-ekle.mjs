/**
 * YENİ DİL EKLE
 *
 *   node scripts/dil-ekle.mjs de "Deutsch" de-DE EUR 1
 *
 * Dili languages listesine ekler. Bartscher XML'i verilirse (ikinci
 * aşama) o dildeki ürün adı, açıklama ve teknik özellikleri de aktarır:
 *
 *   node scripts/dil-ekle.mjs de "Deutsch" de-DE EUR 1 --xml "C:/.../Bartscher.xml"
 *
 * XML'de bulunan diller: de, en, fr, es, nl, pl, ru, uk, el, sv, it
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEDEF = path.resolve(__dirname, "../src/data/catalog.json");

const [kod, ad, locale, currency, rate] = process.argv.slice(2);
if (!kod || !ad) {
  console.error('Kullanım: node scripts/dil-ekle.mjs <kod> "<ad>" [locale] [currency] [rate] [--xml yol]');
  process.exit(1);
}
const xmlIdx = process.argv.indexOf("--xml");
const XML = xmlIdx > -1 ? process.argv[xmlIdx + 1] : null;

const katalog = JSON.parse(fs.readFileSync(HEDEF, "utf8"));
katalog.languages = katalog.languages ?? [];

if (!katalog.languages.some((l) => l.code === kod)) {
  katalog.languages.push({
    code: kod,
    name: ad,
    locale: locale || `${kod}-${kod.toUpperCase()}`,
    currency: currency || "EUR",
    rate: Number(rate) || 1,
    enabled: true,
  });
  console.log(`Dil eklendi: ${kod} (${ad})`);
} else {
  console.log(`Dil zaten var: ${kod}`);
}

// her üründe boş bir dil kutusu aç (arayüz "eksik" diyebilsin)
let acilan = 0;
for (const p of katalog.products) {
  if (!p.i18n[kod]) { p.i18n[kod] = { name: "", desc: "" }; acilan++; }
}
for (const c of katalog.categories) {
  if (!c.i18n[kod]) c.i18n[kod] = { name: "", desc: "" };
}

/* --- XML verildiyse gerçek çeviriyi aktar --- */
let ad2 = 0, ac2 = 0, oz2 = 0;
if (XML) {
  const cikar = (b, t) => { const m = b.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1] : ""; };
  const dilli = (i, L) => { const m = i.match(new RegExp(`<attr lang="${L}">([\\s\\S]*?)</attr>`)); return m ? m[1].trim() : ""; };
  const coz = (s) => String(s || "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  function* bloklar(dosya) {
    const fd = fs.openSync(dosya, "r");
    const buf = Buffer.alloc(4 * 1024 * 1024);
    let kalan = "", n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      kalan += buf.toString("utf8", 0, n);
      let i;
      while ((i = kalan.indexOf("</product>")) !== -1) {
        const b = kalan.lastIndexOf("<product>", i);
        if (b === -1) { kalan = kalan.slice(i + 10); continue; }
        yield kalan.slice(b, i + 10);
        kalan = kalan.slice(i + 10);
      }
    }
    fs.closeSync(fd);
  }

  const bySku = new Map(katalog.products.map((p) => [p.sku, p]));
  for (const blok of bloklar(XML)) {
    const sku = cikar(blok, "code").trim();
    const p = bySku.get(sku);
    if (!p) continue;

    const n = coz(dilli(cikar(blok, "name"), kod));
    const d = coz(dilli(cikar(blok, "descriptionText"), kod)).slice(0, 1800);
    if (n) { p.i18n[kod].name = n; ad2++; }
    if (d) { p.i18n[kod].desc = d; ac2++; }

    let sIdx = 0;
    for (let i = 1; i <= 54 && sIdx < (p.specs ?? []).length; i++) {
      const a = cikar(blok, `Attribut${i}`);
      if (!a) continue;
      const ham = coz(dilli(a, kod));
      if (!ham || !ham.includes(";")) { sIdx++; continue; }
      const [label, ...rest] = ham.split(";");
      const value = rest.join(";").trim();
      if (label && value && p.specs[sIdx]) {
        p.specs[sIdx].i18n[kod] = { label: label.trim(), value };
        oz2++;
      }
      sIdx++;
    }
  }
}

fs.writeFileSync(HEDEF, JSON.stringify(katalog));
console.log(`Ürünlere açılan dil kutusu: ${acilan}`);
if (XML) console.log(`XML'den aktarılan -> ad: ${ad2}  açıklama: ${ac2}  özellik satırı: ${oz2}`);
console.log(`Diller: ${katalog.languages.map((l) => l.code).join(", ")}`);
