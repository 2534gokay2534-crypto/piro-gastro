/**
 * ÇOK DİLLİ VERİ GÖÇÜ
 *
 * Sabit nameSv/nameEn/nameTr sütunları yeni dile açılamıyordu.
 * Yeni yapı: her kayıtta bir i18n haritası -> { sv:{...}, en:{...}, tr:{...} }
 * Dil eklemek artık haritaya anahtar eklemekten ibaret.
 *
 * Ayrıca:
 *  - Unninox teknik özellik etiketleri onarılır (kaynakta zaten sv/en/tr var,
 *    önceki aktarımda nesne metne çevrilip "[object Object]" olmuştu)
 *  - Bartscher teknik özellikleri XML'den sv + en olarak yeniden alınır
 *
 *   node scripts/dil-gocu.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const HEDEF = path.resolve(__dirname, "../src/data/catalog.json");
const XML = process.argv[2] ?? "C:/Users/2534g/Downloads/Bartscher_XML_2026_06_08.xml";

/* ---------------- diller ---------------- */
const DILLER = [
  { code: "sv", name: "Svenska", locale: "sv-SE", currency: "SEK", rate: 11.4, enabled: true },
  { code: "en", name: "English", locale: "en-GB", currency: "EUR", rate: 1, enabled: true },
  { code: "tr", name: "Türkçe", locale: "tr-TR", currency: "TRY", rate: 47.5, enabled: true },
];

/* ---------------- XML yardımcıları ---------------- */
function* urunBloklari(dosya) {
  const fd = fs.openSync(dosya, "r");
  const BOYUT = 4 * 1024 * 1024;
  const buf = Buffer.alloc(BOYUT);
  let kalan = "", okunan;
  while ((okunan = fs.readSync(fd, buf, 0, BOYUT, null)) > 0) {
    kalan += buf.toString("utf8", 0, okunan);
    let i;
    while ((i = kalan.indexOf("</product>")) !== -1) {
      const bas = kalan.lastIndexOf("<product>", i);
      if (bas === -1) { kalan = kalan.slice(i + 10); continue; }
      yield kalan.slice(bas, i + 10);
      kalan = kalan.slice(i + 10);
    }
  }
  fs.closeSync(fd);
}
const cikar = (b, t) => { const m = b.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1] : ""; };
const dilli = (icerik, lang) => {
  const m = icerik.match(new RegExp(`<attr lang="${lang}">([\\s\\S]*?)</attr>`));
  return m ? m[1].trim() : "";
};
const coz = (s) => String(s || "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/* ---------------- 1) Bartscher: XML'den çok dilli ad/açıklama/özellik ---------------- */
const XML_DIL = ["sv", "en"];          // şimdilik yayındaki diller
const btVeri = new Map();

console.log("XML okunuyor…");
for (const blok of urunBloklari(XML)) {
  const kod = cikar(blok, "code").trim();
  if (!kod) continue;
  const adAlan = cikar(blok, "name");
  const acAlan = cikar(blok, "descriptionText");

  const i18n = {};
  for (const L of XML_DIL) {
    i18n[L] = {
      name: coz(dilli(adAlan, L)),
      desc: coz(dilli(acAlan, L)).slice(0, 1800),
    };
  }

  // özellikler: her dilde "etiket;değer"
  const specs = [];
  for (let i = 1; i <= 54; i++) {
    const a = cikar(blok, `Attribut${i}`);
    if (!a) continue;
    const satir = {};
    let gecerli = false;
    for (const L of XML_DIL) {
      const ham = coz(dilli(a, L));
      if (!ham || !ham.includes(";")) continue;
      const [label, ...rest] = ham.split(";");
      const value = rest.join(";").trim();
      if (label && value) { satir[L] = { label: label.trim(), value }; gecerli = true; }
    }
    if (gecerli) specs.push({ i18n: satir });
    if (specs.length >= 25) break;
  }
  btVeri.set(kod, { i18n, specs });
}
console.log("  XML'den okunan ürün:", btVeri.size);

/* ---------------- 2) Unninox: prototip katalogundan çok dilli özellikler ---------------- */
globalThis.window = globalThis.window ?? {};
require(path.resolve(__dirname, "../prototip/assets/catalog.js"));
const unKaynak = new Map();
for (const p of globalThis.window.PGC_CATALOG.products) {
  const specs = (p.specs || [])
    .filter((s) => s && s.k)
    .map((s) => {
      const k = s.k;
      const satir = {};
      if (typeof k === "object") {
        for (const L of Object.keys(k)) if (k[L]) satir[L] = { label: String(k[L]), value: String(s.v ?? "") };
      } else {
        satir.en = { label: String(k), value: String(s.v ?? "") };
      }
      return { i18n: satir };
    });
  unKaynak.set(p.sku, specs);
}
console.log("  prototipten okunan ürün:", unKaynak.size);

/* ---------------- 3) göç ---------------- */
const katalog = JSON.parse(fs.readFileSync(HEDEF, "utf8"));
katalog.languages = DILLER;

let btGuncel = 0, unGuncel = 0, onarilan = 0;

for (const p of katalog.products) {
  // --- ad / açıklama ---
  const i18n = {};
  for (const L of ["sv", "en", "tr"]) {
    const B = L[0].toUpperCase() + L[1];
    i18n[L] = {
      name: p[`name${B}`] ?? "",
      desc: p[`desc${B}`] ?? "",
    };
  }

  const bt = btVeri.get(p.sku);
  if (bt) {
    // XML gerçek çeviriyi verir; kopyalanmış alanların üzerine yazar
    for (const L of XML_DIL) {
      if (bt.i18n[L]?.name) i18n[L].name = bt.i18n[L].name;
      if (bt.i18n[L]?.desc) i18n[L].desc = bt.i18n[L].desc;
    }
    p.specs = bt.specs;
    btGuncel++;
  } else {
    const un = unKaynak.get(p.sku);
    if (un && un.length) { p.specs = un; unGuncel++; }
    else p.specs = (p.specs || []).map((s) => ({
      i18n: { en: { label: String(s.label ?? ""), value: String(s.value ?? "") } },
    }));
  }

  // "[object Object]" kalıntısı varsa temizle
  p.specs = (p.specs || []).filter((s) => {
    const bozukVar = Object.values(s.i18n || {}).some(
      (x) => String(x.label).includes("[object") || String(x.value).includes("[object"),
    );
    if (bozukVar) onarilan++;
    return !bozukVar;
  });

  p.i18n = i18n;
  delete p.nameSv; delete p.nameEn; delete p.nameTr;
  delete p.descSv; delete p.descEn; delete p.descTr;
}

/* kategoriler de aynı yapıya */
for (const c of katalog.categories) {
  c.i18n = {
    sv: { name: c.nameSv ?? "", desc: c.descSv ?? "" },
    en: { name: c.nameEn ?? "", desc: c.descEn ?? "" },
    tr: { name: c.nameTr ?? "", desc: c.descTr ?? "" },
  };
  delete c.nameSv; delete c.nameEn; delete c.nameTr;
  delete c.descSv; delete c.descEn; delete c.descTr;
}

fs.writeFileSync(HEDEF, JSON.stringify(katalog));

/* ---------------- rapor ---------------- */
const P = katalog.products;
const mb = (fs.statSync(HEDEF).size / 1024 / 1024).toFixed(2);
console.log("\nGÖÇ TAMAM");
console.log(`  Bartscher güncellenen : ${btGuncel}`);
console.log(`  Unninox özelliği onarılan: ${unGuncel}`);
console.log(`  atılan bozuk satır    : ${onarilan}`);
console.log(`  dosya                 : ${mb} MB`);
console.log("\nDİL KAPSAMI:");
for (const L of DILLER) {
  const ad = P.filter((p) => p.i18n[L.code]?.name).length;
  const ac = P.filter((p) => p.i18n[L.code]?.desc).length;
  const oz = P.filter((p) => (p.specs || []).some((s) => s.i18n?.[L.code])).length;
  console.log(`  ${L.code}: ad ${ad}/${P.length}  açıklama ${ac}  özellik ${oz}`);
}
