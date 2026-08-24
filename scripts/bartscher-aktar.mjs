/**
 * Bartscher XML -> src/data/catalog.json (mevcut ürünlerin YANINA ekler)
 *
 *   node scripts/bartscher-aktar.mjs [xml-yolu]
 *
 * Mevcut Unninox ürünlerine dokunmaz; aynı SKU varsa günceller.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { siniflandir } from "./bartscher-siniflandir.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XML = process.argv[2] ?? "C:/Users/2534g/Downloads/Bartscher_XML_2026_06_08.xml";
const HEDEF = path.resolve(__dirname, "../src/data/catalog.json");

/* ---------- XML akış okuma (124 MB, belleğe sığmaz) ---------- */
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

/* ---------- gürültü ayıklama (pazarlama grupları ürün tipi değil) ---------- */
const GURULTU_KOK = /^(Series|New products)$/i;
const GURULTU_YAPRAK = /^(Accessories|Series \d+|Series [A-Z]{1,3}|Series Silversteam.*|Top Line|Basic Line|Cooking|Keeping warm|Grilling & Roasting|Deep fat frying|Furniture & Exhaust hoods|Furniture & Hoods|New products)$/i;

function temizYollar(blok) {
  const out = [];
  for (let i = 1; i <= 14; i++) {
    const c = cikar(blok, `category${i}`);
    if (!c) continue;
    let en = coz(dilli(c, "en"));
    if (!en) continue;
    en = en.replace(/INDEX_/g, "");
    const p = en.split(" - ").map((x) => x.trim());
    if (GURULTU_KOK.test(p[0])) continue;
    if (GURULTU_YAPRAK.test(p[p.length - 1])) {
      if (p.length <= 2) continue;
      p.pop();
    }
    out.push(p.join(" - "));
  }
  return out;
}

/* ---------- slug ---------- */
const TR = { ç:"c", ğ:"g", ı:"i", ö:"o", ş:"s", ü:"u", å:"a", ä:"a", é:"e", è:"e", â:"a", î:"i", û:"u" };
const slugify = (s) => String(s || "").toLowerCase()
  .replace(/[çğıöşüåäéèâîû]/g, (c) => TR[c] ?? c)
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/* ---------- mevcut katalog ---------- */
const katalog = JSON.parse(fs.readFileSync(HEDEF, "utf8"));
const kullanilanSlug = new Set(katalog.products.map((p) => p.slug));
const mevcutSku = new Map(katalog.products.map((p) => [p.sku, p]));
const gecerliKat = new Set(katalog.categories.map((c) => c.id));

function benzersizSlug(taban, yedek) {
  let s = slugify(taban) || slugify(yedek) || "urun";
  if (!kullanilanSlug.has(s)) { kullanilanSlug.add(s); return s; }
  let i = 2;
  while (kullanilanSlug.has(`${s}-${i}`)) i++;
  kullanilanSlug.add(`${s}-${i}`);
  return `${s}-${i}`;
}

/* ---------- dönüştür ---------- */
const MAX_GORSEL = 8, MAX_OZELLIK = 25, MAX_ACIKLAMA = 1800;
let eklendi = 0, guncellendi = 0, hataliKat = 0;
const yeniler = [];

for (const blok of urunBloklari(XML)) {
  const kod = cikar(blok, "code").trim();
  if (!kod) continue;

  const adAlan = cikar(blok, "name");
  const adEn = coz(dilli(adAlan, "en")) || kod;
  const adSv = coz(dilli(adAlan, "sv")) || adEn;

  const yollar = temizYollar(blok);
  const yapraklar = yollar.map((y) => y.split(" - ").pop().trim());
  const sonuc = siniflandir({ yapraklar, yollar, ad: `${adEn} ${adSv}` });
  if (!sonuc) { hataliKat++; continue; }
  if (!gecerliKat.has(sonuc.ana)) { hataliKat++; continue; }
  const alt = sonuc.alt && gecerliKat.has(sonuc.alt) ? sonuc.alt : null;

  const acAlan = cikar(blok, "descriptionText");
  const acEn = coz(dilli(acAlan, "en")).slice(0, MAX_ACIKLAMA);
  const acSv = coz(dilli(acAlan, "sv")).slice(0, MAX_ACIKLAMA) || acEn;

  const gorseller = [];
  for (let i = 1; i <= 44 && gorseller.length < MAX_GORSEL; i++) {
    const g = cikar(blok, `Image${i}`);
    if (!g) continue;
    // <ImageN> URL'yi doğrudan içerir; <attr lang> sarmalayıcısı YOK
    const url = coz(dilli(g, "de") || dilli(g, "en") || g);
    if (url && url.startsWith("http")) gorseller.push({ url });
  }

  const ozellikler = [];
  for (let i = 1; i <= 54 && ozellikler.length < MAX_OZELLIK; i++) {
    const a = cikar(blok, `Attribut${i}`);
    if (!a) continue;
    const ham = coz(dilli(a, "en") || dilli(a, "sv"));
    if (!ham || !ham.includes(";")) continue;
    const [label, ...rest] = ham.split(";");
    const value = rest.join(";").trim();
    if (label && value) ozellikler.push({ label: label.trim(), value });
  }

  const fiyat = parseFloat(cikar(blok, "listPrice")) || 0;

  const urun = {
    id: `bt-${kod}`,
    sku: kod,
    slug: mevcutSku.get(kod)?.slug ?? benzersizSlug(`${adEn}-${kod}`, kod),
    nameSv: adSv, nameEn: adEn, nameTr: adEn,
    descSv: acSv || null, descEn: acEn || null, descTr: acEn || null,
    categoryId: sonuc.ana,
    subId: alt,
    brandId: "bartscher",
    priceCents: Math.round(fiyat * 100),
    stock: 0,
    threshold: 0,
    onRequest: true,          // XML'de stok yok — "sipariş üzerine"
    leadDays: 10,
    warranty: 24,
    hidden: false,
    featured: false,
    badge: null,
    campaignOn: false,
    campaignPercent: 0,
    sold: 0,
    images: gorseller,
    specs: ozellikler,
  };

  if (mevcutSku.has(kod)) {
    Object.assign(mevcutSku.get(kod), urun);
    guncellendi++;
  } else {
    yeniler.push(urun);
    eklendi++;
  }
}

katalog.products.push(...yeniler);
if (!katalog.brands.some((b) => b.id === "bartscher")) {
  katalog.brands.push({ id: "bartscher", name: "Bartscher", country: "DE" });
}

fs.writeFileSync(HEDEF, JSON.stringify(katalog));
const mb = (fs.statSync(HEDEF).size / 1024 / 1024).toFixed(2);

console.log(`Eklendi: ${eklendi}   Güncellendi: ${guncellendi}   Kategorisiz (atlandı): ${hataliKat}`);
console.log(`Katalog toplam: ${katalog.products.length} ürün, ${katalog.brands.length} marka, ${mb} MB`);
const gorselTop = katalog.products.reduce((s, p) => s + p.images.length, 0);
console.log(`Görsel: ${gorselTop}`);
