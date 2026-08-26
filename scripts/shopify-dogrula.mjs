/**
 * SHOPIFY CSV DOĞRULAMASI
 *   node scripts/shopify-dogrula.mjs
 *
 * Üretilen dosyaları Shopify'ın içe aktarma kurallarına göre denetler.
 * "Dosya oluştu" yetmez; Shopify'ın kabul edeceğinden emin olmak gerekir.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIZIN = path.join(KOK, "shopify");
const katalog = JSON.parse(fs.readFileSync(path.join(KOK, "src/data/catalog.json"), "utf8"));

let hata = 0;
const k = (c, ad, ek = "") => {
  if (!c) hata++;
  console.log(String(ad).padEnd(52), (c ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

/** RFC 4180 CSV çözümleyici — Shopify'ın kullandığı biçim. */
function csvCoz(metin) {
  const satirlar = [];
  let alanlar = [], alan = "", tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"') { if (metin[i + 1] === '"') { alan += '"'; i++; } else tirnak = false; }
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ",") { alanlar.push(alan); alan = ""; }
    else if (c === "\n") { alanlar.push(alan); satirlar.push(alanlar); alanlar = []; alan = ""; }
    else if (c !== "\r") alan += c;
  }
  if (alan || alanlar.length) { alanlar.push(alan); satirlar.push(alanlar); }
  return satirlar;
}

/** Aktarıcıdaki handle üretimiyle birebir aynı olmalı. */
const handle = (slug) =>
  String(slug).toLowerCase()
    .replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i")
    .replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[çÇ]/g, "c")
    .replace(/[åÅäÄ]/g, "a")
    .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 100);

console.log("=== A. DOSYA BİÇİMİ ===");
const parcalar = fs.readdirSync(DIZIN).filter((f) => /^urunler-\d+\.csv$/.test(f)).sort();
k(parcalar.length > 0, "ürün dosyası bulundu", parcalar.join(", "));

const ZORUNLU = ["Handle", "Title", "Variant SKU", "Variant Price", "Image Src", "Status", "Published"];
let basliklar = null;
const tumSatirlar = [];
const dosyaKayitlari = new Map();

for (const dosya of parcalar) {
  const yol = path.join(DIZIN, dosya);
  const boyutMb = fs.statSync(yol).size / 1048576;
  const s = csvCoz(fs.readFileSync(yol, "utf8"));
  const bas = s[0];
  if (!basliklar) basliklar = bas;

  k(boyutMb < 15, `${dosya} 15 MB sınırının altında`, boyutMb.toFixed(1) + " MB");
  k(s.length - 1 < 50000, `${dosya} 50.000 satır sınırının altında`, `${s.length - 1} satır`);
  k(bas.join("|") === basliklar.join("|"), `${dosya} başlıkları tutarlı`);
  const bozuk = s.slice(1).filter((r) => r.length !== bas.length).length;
  k(bozuk === 0, `${dosya} sütun sayıları eşit`, bozuk ? `${bozuk} bozuk satır` : "");

  const kayitlar = s.slice(1).map((r) => Object.fromEntries(bas.map((b, i) => [b, r[i] ?? ""])));
  dosyaKayitlari.set(dosya, kayitlar);
  for (const r of kayitlar) tumSatirlar.push(r);
}

for (const z of ZORUNLU) k(basliklar.includes(z), `zorunlu sütun: ${z}`);

console.log("\n=== B. ÜRÜN BÜTÜNLÜĞÜ ===");
const anaSatirlar = tumSatirlar.filter((r) => r.Title);
const gorselSatirlari = tumSatirlar.filter((r) => !r.Title && r["Image Src"]);

k(anaSatirlar.length === katalog.products.length,
  "ürün sayısı katalogla aynı", `${anaSatirlar.length} / ${katalog.products.length}`);
k(anaSatirlar.length + gorselSatirlari.length === tumSatirlar.length,
  "başıboş satır yok", `${tumSatirlar.length} satır`);

const gorselToplam = katalog.products.reduce((t, p) => t + (p.images ?? []).length, 0);
k(tumSatirlar.filter((r) => r["Image Src"]).length === gorselToplam,
  "görsel sayısı katalogla aynı", `${tumSatirlar.filter((r) => r["Image Src"]).length} / ${gorselToplam}`);

const handleSayaci = new Map();
for (const r of anaSatirlar) handleSayaci.set(r.Handle, (handleSayaci.get(r.Handle) ?? 0) + 1);
const cift = [...handleSayaci].filter(([, n]) => n > 1);
k(cift.length === 0, "handle benzersiz", cift.length ? cift.slice(0, 3).map((x) => x[0]).join(", ") : "");

// Shopify dosyaları tek tek işler: bir ürünün görselleri kendi dosyasında olmalı
let yetimGorsel = 0;
for (const [, kayitlar] of dosyaKayitlari) {
  const analar = new Set(kayitlar.filter((r) => r.Title).map((r) => r.Handle));
  for (const r of kayitlar) if (!r.Title && !analar.has(r.Handle)) yetimGorsel++;
}
k(yetimGorsel === 0, "hiçbir ürün iki dosyaya bölünmemiş", yetimGorsel ? `${yetimGorsel} yetim görsel` : "");

console.log("\n=== C. ALAN GEÇERLİLİĞİ ===");
const kotuHandle = anaSatirlar.filter((r) => !/^[a-z0-9][a-z0-9-]*$/.test(r.Handle));
k(kotuHandle.length === 0, "handle biçimi geçerli (a-z0-9-)", kotuHandle.slice(0, 2).map((r) => r.Handle).join(", "));

const kotuFiyat = anaSatirlar.filter((r) => !/^\d+\.\d{2}$/.test(r["Variant Price"]));
k(kotuFiyat.length === 0, "fiyat biçimi geçerli (0.00)",
  kotuFiyat.slice(0, 2).map((r) => r.Handle + "=" + r["Variant Price"]).join(", "));

// PARA BİRİMİ — kataloğun priceCents değeri EUR cinsindendir (src/lib/money.ts).
// Mağaza SEK ile satıyorsa çevrilmiş olmalı; çevrilmezse ürünler 11 kat ucuz görünür.
const dilTanimi = katalog.languages.find((l) => l.code === "sv");
const kur = dilTanimi.rate;
let fiyatHatasi = 0, indirimHatasi = 0, indirimli = 0;
for (const r of anaSatirlar) {
  const p = new Map(katalog.products.map((x) => [handle(x.slug), x])).get(r.Handle);
  if (!p) continue;
  const net = p.campaignOn && p.campaignPercent
    ? Math.round(p.priceCents * (1 - p.campaignPercent / 100))
    : p.priceCents;
  const beklenen = (Math.round(net * kur) / 100).toFixed(2);
  if (r["Variant Price"] !== beklenen) fiyatHatasi++;
  if (net < p.priceCents) {
    indirimli++;
    if (r["Variant Compare At Price"] !== (Math.round(p.priceCents * kur) / 100).toFixed(2)) indirimHatasi++;
  } else if (r["Variant Compare At Price"]) {
    indirimHatasi++; // indirim yokken üstü çizili fiyat yazılmamalı
  }
}
k(fiyatHatasi === 0, `fiyatlar ${dilTanimi.currency}'e çevrilmiş (EUR × ${kur})`,
  fiyatHatasi ? `${fiyatHatasi} ürün yanlış` : "");
k(indirimHatasi === 0, "kampanya fiyatı ve üstü çizili liste fiyatı doğru",
  `${indirimli} indirimli ürün`);

k(anaSatirlar.every((r) => r.Title.trim()), "her üründe başlık var");
k(anaSatirlar.every((r) => r["Variant SKU"].trim()), "her üründe SKU var");
const skuKume = new Set(anaSatirlar.map((r) => r["Variant SKU"]));
k(skuKume.size === anaSatirlar.length, "SKU benzersiz", `${skuKume.size} / ${anaSatirlar.length}`);

const kotuDurum = anaSatirlar.filter((r) => !["active", "draft", "archived"].includes(r.Status));
k(kotuDurum.length === 0, "Status geçerli", kotuDurum.slice(0, 2).map((r) => r.Status).join(", "));

const kotuUrl = tumSatirlar.filter((r) => r["Image Src"] && !/^https?:\/\//.test(r["Image Src"]));
k(kotuUrl.length === 0, "görsel adresleri mutlak (https)", kotuUrl.slice(0, 2).map((r) => r["Image Src"]).join(", "));

const gorselSirasi = new Map();
for (const r of tumSatirlar) {
  if (!r["Image Src"]) continue;
  const d = gorselSirasi.get(r.Handle) ?? [];
  d.push(Number(r["Image Position"]));
  gorselSirasi.set(r.Handle, d);
}
let sirasiz = 0;
for (const [, d] of gorselSirasi) if (d.some((n, i) => n !== i + 1)) sirasiz++;
k(sirasiz === 0, "görsel sıra numaraları ardışık (1..n)", sirasiz ? `${sirasiz} ürün` : "");

console.log("\n=== D. KATEGORİ VE SIRALAMA KORUNDU MU ===");
const katById = new Map(katalog.categories.map((c) => [c.id, c]));
const handleToUrun = new Map(katalog.products.map((p) => [handle(p.slug), p]));

let etiketHata = 0, sirasizEtiket = 0, eslesmeyen = 0;
for (const r of anaSatirlar) {
  const p = handleToUrun.get(r.Handle);
  if (!p) { eslesmeyen++; continue; }
  const ana = katById.get(p.categoryId);
  if (ana && !r.Tags.includes(`kategori:${ana.slug}`)) etiketHata++;
  if (p.subId) {
    const alt = katById.get(p.subId);
    if (alt && !r.Tags.includes(`alt:${alt.slug}`)) etiketHata++;
  }
  if (!r.Tags.includes(`sira:${String(p.sortRank ?? 500).padStart(4, "0")}`)) sirasizEtiket++;
}
k(eslesmeyen === 0, "her CSV satırı bir katalog ürününe denk geliyor", eslesmeyen ? String(eslesmeyen) : "");
k(etiketHata === 0, "her ürün doğru kategori etiketinde", etiketHata ? String(etiketHata) : "");
k(sirasizEtiket === 0, "sıralama (sortRank) etikete taşındı", sirasizEtiket ? String(sirasizEtiket) : "");

let sirasizSatir = 0;
for (let i = 1; i < anaSatirlar.length; i++) {
  const a = handleToUrun.get(anaSatirlar[i - 1].Handle), b = handleToUrun.get(anaSatirlar[i].Handle);
  if (a && b && (a.sortRank ?? 500) < (b.sortRank ?? 500)) sirasizSatir++;
}
k(sirasizSatir === 0, "CSV satır sırası: büyük ürünler önce", sirasizSatir ? String(sirasizSatir) : "");

// Gizli ürünler mağazada yayında olmamalı
const gizli = katalog.products.filter((p) => p.hidden).map((p) => handle(p.slug));
const yanlisYayin = anaSatirlar.filter((r) => gizli.includes(r.Handle) && r.Published === "TRUE");
k(yanlisYayin.length === 0, "gizli ürünler yayında değil", `${gizli.length} gizli ürün`);

console.log("\n=== E. KOLEKSİYONLAR ===");
const kol = csvCoz(fs.readFileSync(path.join(DIZIN, "koleksiyonlar.csv"), "utf8"));
k(kol.length - 1 === katalog.categories.length,
  "her kategori için koleksiyon var", `${kol.length - 1} / ${katalog.categories.length}`);
const kolToplam = kol.slice(1).reduce((t, r) => t + Number(r[6] || 0), 0);
k(kolToplam >= katalog.products.length, "koleksiyonlar tüm ürünleri kapsıyor", `${kolToplam} atama`);
// Boş koleksiyon hata değil: katalogda da ürünsüz olan kategoriler var.
// Kategori yapısı korunacağı için bunları yine de üretiyoruz — ama görünür olsun.
const bosKol = kol.slice(1).filter((r) => Number(r[6] || 0) === 0);
const katalogdaBos = katalog.categories
  .filter((c) => !katalog.products.some((p) => p.categoryId === c.id || p.subId === c.id))
  .map((c) => c.slug);
k(bosKol.length === katalogdaBos.length,
  "boş koleksiyonlar katalogla birebir", bosKol.length ? `${bosKol.map((r) => r[0]).join(", ")} (katalogda da boş)` : "");

console.log("\n=== F. ÇEVİRİLER ===");
// Shopify çevirisi yalnızca ana dilden FARKLI içerik için satır ister; aynı olanlarda
// mağaza ana dile düşer. Bu yüzden "kapsam yüzdesi" değil, "olması gereken her satır
// var mı ve fazlası yok mu" ölçülür.
for (const dil of ["en", "tr", "de"]) {
  const c = csvCoz(fs.readFileSync(path.join(DIZIN, `ceviriler-${dil}.csv`), "utf8"));
  const satirlar = c.slice(1);
  const varOlan = new Set(satirlar.filter((r) => r[2] === "title").map((r) => r[1]));

  const olmasiGereken = new Set();
  let ayniIcerik = 0, eksikIcerik = 0;
  for (const p of katalog.products) {
    const ad = p.i18n?.[dil]?.name, anaAd = p.i18n?.sv?.name ?? p.i18n?.en?.name;
    if (!ad) { eksikIcerik++; continue; }
    if (ad === anaAd) { ayniIcerik++; continue; }
    olmasiGereken.add(handle(p.slug));
  }
  const eksik = [...olmasiGereken].filter((h) => !varOlan.has(h));
  const fazla = [...varOlan].filter((h) => !olmasiGereken.has(h));
  k(eksik.length === 0 && fazla.length === 0,
    `${dil} çeviri satırları eksiksiz`,
    `${varOlan.size} çeviri · ${ayniIcerik} ürün adı ana dille aynı · ${eksikIcerik} üründe ${dil} adı yok`);

  const bos = satirlar.filter((r) => !r[7]?.trim()).length;
  k(bos === 0, `${dil} boş çeviri yok`, bos ? String(bos) : "");
  k(satirlar.every((r) => r[0] === "Product"), `${dil} kayıt tipi geçerli`);
}

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
