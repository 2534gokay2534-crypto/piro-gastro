/**
 * Sınıflandırma provası — hiçbir şey yazmaz, sadece rapor verir.
 * Amaç: tek bir ürün bile kategorisiz kalmasın.
 *
 *   node scripts/bartscher-dene.mjs
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import { siniflandir } from "./bartscher-siniflandir.mjs";

const require = createRequire(import.meta.url);
const sax = null; // bağımlılık yok, elle akış ayrıştırma

const XML = process.argv[2] ?? "C:/Users/2534g/Downloads/Bartscher_XML_2026_06_08.xml";

/** <product> ... </product> bloklarını akış hâlinde döndür (124 MB için gerekli) */
function* urunBloklari(dosya) {
  const fd = fs.openSync(dosya, "r");
  const BOYUT = 4 * 1024 * 1024;
  const buf = Buffer.alloc(BOYUT);
  let kalan = "";
  let okunan;
  while ((okunan = fs.readSync(fd, buf, 0, BOYUT, null)) > 0) {
    kalan += buf.toString("utf8", 0, okunan);
    let i;
    while ((i = kalan.indexOf("</product>")) !== -1) {
      const bas = kalan.lastIndexOf("<product>", i);
      if (bas === -1) { kalan = kalan.slice(i + 10); continue; }
      yield kalan.slice(bas, i + 10);
      kalan = kalan.slice(i + 10);
    }
    if (kalan.length > 8 * 1024 * 1024) kalan = kalan.slice(-1024 * 1024);
  }
  fs.closeSync(fd);
}

const cikar = (blok, etiket) => {
  const m = blok.match(new RegExp(`<${etiket}>([\\s\\S]*?)</${etiket}>`));
  return m ? m[1] : "";
};
const dilli = (icerik, lang) => {
  const m = icerik.match(new RegExp(`<attr lang="${lang}">([\\s\\S]*?)</attr>`));
  return m ? m[1].trim() : "";
};

/* Bartscher'in pazarlama grupları ürün tipi DEĞİL — eşlemeye sokulmaz.
   "Series - Grilling & Roasting" yüzünden 400+ ürün yanlışlıkla ızgaraya
   düşüyordu. Bu kökler ve INDEX_ önekleri ayıklanır. */
const GURULTU_KOK = /^(Series|New products)$/i;
const GURULTU_YAPRAK = /^(Accessories|Series \d+|Series [A-Z]{1,3}|Series Silversteam.*|Top Line|Basic Line|Cooking|Keeping warm|Grilling & Roasting|Deep fat frying|Furniture & Exhaust hoods|Furniture & Hoods|New products)$/i;

function temizYollar(blok) {
  const out = [];
  for (let i = 1; i <= 14; i++) {
    const c = cikar(blok, `category${i}`);
    if (!c) continue;
    let en = dilli(c, "en");
    if (!en) continue;
    en = en.replace(/INDEX_/g, "");
    const p = en.split(" - ").map((x) => x.trim());
    if (GURULTU_KOK.test(p[0])) continue;
    if (GURULTU_YAPRAK.test(p[p.length - 1])) {
      // yaprak işe yaramaz; yol tek parçaysa tamamen at
      if (p.length <= 2) continue;
      p.pop();
    }
    out.push(p.join(" - "));
  }
  return out;
}

const sayac = {};
const ornekler = {};
const altSayac = {};
let toplam = 0, eslesen = 0;
const eslesmeyen = [];

for (const blok of urunBloklari(XML)) {
  toplam++;
  const kod = cikar(blok, "code");
  const adEn = dilli(cikar(blok, "name"), "en");
  const adSv = dilli(cikar(blok, "name"), "sv");

  const yollar = temizYollar(blok);

  const yapraklar = yollar.map((y) => y.split(" - ").pop().trim());
  const sonuc = siniflandir({ yapraklar, yollar, ad: `${adEn} ${adSv}` });
  if (sonuc) {
    eslesen++;
    sayac[sonuc.ana] = (sayac[sonuc.ana] || 0) + 1;
    (ornekler[sonuc.ana] = ornekler[sonuc.ana] || []).push(`${adEn}${sonuc.alt ? "   [" + sonuc.alt + "]" : ""}`);
    if (sonuc.alt) altSayac[sonuc.alt] = (altSayac[sonuc.alt] || 0) + 1;
  } else {
    eslesmeyen.push({ kod, adEn, yollar: yollar.slice(0, 3) });
  }
}

if (process.argv.includes("--ornek")) {
  console.log("KATEGORI BASINA ORNEK URUNLER (dogruluk denetimi)");
  for (const [k, list] of Object.entries(ornekler)) {
    console.log(`### ${k}  (${sayac[k]} ürün)`);
    list.slice(0, 6).forEach((x) => console.log(`     ${x}`));
    console.log();
  }
  process.exit(0);
}
console.log(`TOPLAM: ${toplam}   EŞLEŞEN: ${eslesen}   EŞLEŞMEYEN: ${eslesmeyen.length}`);
console.log();
console.log("ANA KATEGORİ DAĞILIMI:");
Object.entries(sayac).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`));
console.log();
console.log("ALT KATEGORİ DAĞILIMI:");
Object.entries(altSayac).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`));

if (eslesmeyen.length) {
  console.log();
  console.log(`EŞLEŞMEYEN ${eslesmeyen.length} ÜRÜN (ilk 60):`);
  eslesmeyen.slice(0, 60).forEach((u) =>
    console.log(`  ${u.kod}  ${u.adEn}\n        ${u.yollar.join(" || ")}`));
  fs.writeFileSync("eslesmeyen.json", JSON.stringify(eslesmeyen, null, 1));
  console.log(`\n(tamamı eslesmeyen.json dosyasında)`);
}
