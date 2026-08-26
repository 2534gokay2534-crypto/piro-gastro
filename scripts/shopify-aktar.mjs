/**
 * KATALOĞU SHOPIFY BİÇİMİNE ÇEVİRİR
 *
 *   node scripts/shopify-aktar.mjs            -> rapor (yazmaz)
 *   node scripts/shopify-aktar.mjs --yaz      -> shopify/ klasörüne yazar
 *   node scripts/shopify-aktar.mjs --yaz --dil=sv
 *
 * ÜRETİLEN DOSYALAR
 *   shopify/urunler-1.csv …      Shopify ürün içe aktarma (parçalara bölünmüş)
 *   shopify/koleksiyonlar.csv    Kategori → koleksiyon eşlemesi
 *   shopify/ceviriler-XX.csv     Diğer diller (Translate & Adapt için)
 *   shopify/RAPOR.md             Neyin nereye gittiği
 *
 * NEDEN EXCEL DEĞİL
 * Projede ürün içeren Excel dosyası yok; kaynak catalog.json (Bartscher API
 * ve Unninox'tan derlenmiş 3190 ürün). Görseller, ölçüler, teknik özellikler
 * ve dört dil çevirisi orada. Excel'e çevirip geri okumak veri kaybı olurdu.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(__dirname, "..");
const bayrak = (ad) => process.argv.find((a) => a.startsWith(`--${ad}=`))?.split("=").slice(1).join("=");
const KATALOG = bayrak("katalog") ?? path.join(KOK, "src", "data", "catalog.json");
const CIKTI = bayrak("cikti") ?? path.join(KOK, "shopify");

const YAZ = process.argv.includes("--yaz");
const ANA_DIL = (process.argv.find((a) => a.startsWith("--dil="))?.split("=")[1] ?? "sv");
const DIGER_DILLER = ["en", "tr", "de"].filter((d) => d !== ANA_DIL);

/** Shopify tek dosyada 15 MB / 50.000 satır sınırı koyar. */
const PARCA_URUN = 800;

const katalog = JSON.parse(fs.readFileSync(KATALOG, "utf8"));
const { products: URUNLER, categories: KATEGORILER, brands: MARKALAR } = katalog;

const kategoriById = new Map(KATEGORILER.map((c) => [c.id, c]));
const markaById = new Map(MARKALAR.map((b) => [b.id, b]));

/**
 * PARA BİRİMİ — dikkat.
 * catalog.json'daki priceCents EUR cinsindendir (src/lib/money.ts).
 * Mağaza İsveççe ise fiyat SEK'e çevrilmelidir; ham sayıyı yazmak
 * ürünleri 11 kat ucuz gösterirdi.
 */
const DIL_TANIMI = katalog.languages.find((l) => l.code === ANA_DIL);
if (!DIL_TANIMI) throw new Error(`catalog.json içinde "${ANA_DIL}" dili yok`);
const PARA = DIL_TANIMI.currency;
const KUR = DIL_TANIMI.rate;

/** EUR cent -> mağaza para biriminde "0.00" metni. */
function fiyat(centEur) {
  return (Math.round(centEur * KUR) / 100).toFixed(2);
}

/** Kampanya varsa indirimli fiyat (src/lib/money.ts netCents ile aynı kural). */
function netCent(p) {
  if (!p.campaignOn || !p.campaignPercent) return p.priceCents;
  return Math.round(p.priceCents * (1 - p.campaignPercent / 100));
}

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

const metin = (p, alan, dil) =>
  p.i18n?.[dil]?.[alan] ?? p.i18n?.en?.[alan] ?? p.i18n?.sv?.[alan] ?? "";

const katAdi = (id, dil) => {
  const c = kategoriById.get(id);
  return c?.i18n?.[dil]?.name ?? c?.i18n?.en?.name ?? c?.slug ?? id;
};

/** CSV alanı — Shopify virgül ayraç ve çift tırnak kaçışı ister. */
const alan = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csvSatir = (dizi) => dizi.map(alan).join(",");

/** Shopify handle: küçük harf, tire, ASCII. */
const handle = (slug) =>
  String(slug)
    .toLowerCase()
    .replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i")
    .replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[çÇ]/g, "c")
    .replace(/[åÅäÄ]/g, "a")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

/** Açıklama + teknik özellikler → Shopify "Body (HTML)". */
function govdeHtml(p, dil) {
  const parcalar = [];
  const aciklama = metin(p, "desc", dil);
  if (aciklama) parcalar.push(`<p>${aciklama.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`);

  const specler = (p.specs ?? [])
    .map((s) => s.i18n?.[dil] ?? s.i18n?.en ?? Object.values(s.i18n ?? {})[0])
    .filter((s) => s?.label && s?.value);

  if (p.dims?.w || specler.length) {
    parcalar.push("<h3>Teknik bilgiler</h3><table>");
    if (p.dims?.w) {
      parcalar.push(
        `<tr><td>Ölçüler</td><td>${p.dims.w} × ${p.dims.d ?? "?"} × ${p.dims.h} ${p.dims.unit ?? "mm"}</td></tr>`,
      );
    }
    if (p.weightKg) parcalar.push(`<tr><td>Ağırlık</td><td>${p.weightKg} kg</td></tr>`);
    for (const s of specler.slice(0, 20)) {
      const l = String(s.label).replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const v = String(s.value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\s*,\s*/g, ", ");
      parcalar.push(`<tr><td>${l}</td><td>${v}</td></tr>`);
    }
    parcalar.push("</table>");
  }
  return parcalar.join("\n");
}

/** Kategori + alt kategori + marka + sıra → etiketler (koleksiyon kuralları bunları kullanır). */
function etiketler(p, dil) {
  const t = [];
  const ana = kategoriById.get(p.categoryId);
  if (ana) t.push(`kategori:${ana.slug}`, katAdi(ana.id, dil));
  if (p.subId) {
    const alt = kategoriById.get(p.subId);
    if (alt) t.push(`alt:${alt.slug}`, katAdi(alt.id, dil));
  }
  const marka = markaById.get(p.brandId);
  if (marka) t.push(`marka:${marka.name}`);

  // Büyük/ana ürün mü, tamamlayıcı mı — mağazadaki sıralamanın aynısı
  const r = p.sortRank ?? 500;
  t.push(r >= 700 ? "ana-urun" : r >= 350 ? "orta-urun" : "tamamlayici");
  t.push(`sira:${String(r).padStart(4, "0")}`);

  if (p.onRequest) t.push("siparis-uzerine");
  if (!p.priceCents) t.push("fiyat-sorunuz");
  return t.join(", ");
}

/* ------------------------------------------------------------------ */
/* Ürün CSV'si                                                         */
/* ------------------------------------------------------------------ */

const BASLIKLAR = [
  "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags", "Published",
  "Option1 Name", "Option1 Value",
  "Variant SKU", "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Qty",
  "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Price",
  "Variant Compare At Price", "Variant Requires Shipping", "Variant Taxable",
  "Image Src", "Image Position", "Image Alt Text", "Gift Card",
  "SEO Title", "SEO Description", "Status",
  // Ölçüler metafield olarak taşınır — tema bunları gösterebilir
  "Genişlik (product.metafields.piro.genislik)",
  "Derinlik (product.metafields.piro.derinlik)",
  "Yükseklik (product.metafields.piro.yukseklik)",
  "Garanti ay (product.metafields.piro.garanti)",
  "Teslim gün (product.metafields.piro.teslim)",
];

/** Shopify'ın standart ürün kategorisi — mutfak ekipmanı. */
const SHOPIFY_KATEGORI = "Business & Industrial > Food Service";

function urunSatirlari(p, dil) {
  const h = handle(p.slug);
  const baslik = metin(p, "name", dil) || p.sku;
  const gorseller = (p.images ?? []).map((g) => g.url).filter(Boolean);
  const net = netCent(p);
  // Shopify'da Price satış fiyatı, Compare At üstü çizili liste fiyatıdır.
  const satis = fiyat(net);
  const liste = net < p.priceCents ? fiyat(p.priceCents) : "";
  const gram = p.weightKg ? Math.round(p.weightKg * 1000) : 0;
  const marka = markaById.get(p.brandId)?.name ?? "Piro Gastro";
  const tur = katAdi(p.subId ?? p.categoryId, dil);

  const satirlar = [];

  // İlk satır: ürünün tamamı + ilk görsel
  satirlar.push([
    h, baslik, govdeHtml(p, dil), marka, SHOPIFY_KATEGORI, tur, etiketler(p, dil),
    p.hidden ? "FALSE" : "TRUE",
    "Title", "Default Title",
    p.sku, gram, "shopify",
    p.onRequest ? 0 : Math.max(0, p.stock ?? 0),
    p.onRequest ? "continue" : "deny",       // sipariş üzerine → stok bitse de satılabilir
    "manual", satis, liste,
    "TRUE", "TRUE",
    gorseller[0] ?? "", gorseller[0] ? 1 : "", gorseller[0] ? baslik : "",
    "FALSE",
    baslik.slice(0, 70),
    (metin(p, "desc", dil) || baslik).slice(0, 320),
    p.hidden ? "draft" : "active",
    p.dims?.w ?? "", p.dims?.d ?? "", p.dims?.h ?? "",
    p.warranty ?? "", p.leadDays ?? "",
  ]);

  // Ek görseller: yalnızca Handle + görsel alanları dolu
  for (let i = 1; i < gorseller.length; i++) {
    const bos = new Array(BASLIKLAR.length).fill("");
    bos[0] = h;
    bos[20] = gorseller[i];
    bos[21] = i + 1;
    bos[22] = baslik;
    satirlar.push(bos);
  }

  return satirlar;
}

/* ------------------------------------------------------------------ */
/* Koleksiyonlar                                                       */
/* ------------------------------------------------------------------ */

function koleksiyonCsv(dil) {
  const basliklar = ["Handle", "Title", "Body (HTML)", "Kural", "Sıralama", "Üst kategori", "Ürün sayısı"];
  const satirlar = [basliklar.join(",")];

  const say = (id) =>
    URUNLER.filter((p) => p.categoryId === id || p.subId === id).length;

  for (const c of KATEGORILER.filter((x) => !x.parentId)) {
    const altlar = KATEGORILER.filter((x) => x.parentId === c.id);
    const toplam = say(c.id) + altlar.reduce((t, a) => t + say(a.id), 0);
    satirlar.push(
      csvSatir([
        c.slug, katAdi(c.id, dil), c.i18n?.[dil]?.desc ?? "",
        `Etiket eşittir: kategori:${c.slug}`,
        "Manuel (sıra etiketine göre: büyükten küçüğe)",
        "", toplam,
      ]),
    );
    for (const a of altlar) {
      satirlar.push(
        csvSatir([
          a.slug, katAdi(a.id, dil), a.i18n?.[dil]?.desc ?? "",
          `Etiket eşittir: alt:${a.slug}`,
          "Manuel (sıra etiketine göre: büyükten küçüğe)",
          katAdi(c.id, dil), say(a.id),
        ]),
      );
    }
  }
  return satirlar.join("\n");
}

/* ------------------------------------------------------------------ */
/* Çeviriler                                                           */
/* ------------------------------------------------------------------ */

function ceviriCsv(dil) {
  const basliklar = ["Type", "Identification", "Field", "Locale", "Market", "Status", "Default content", "Translated content"];
  const satirlar = [basliklar.join(",")];
  for (const p of URUNLER) {
    const h = handle(p.slug);
    const ad = metin(p, "name", dil);
    const anaAd = metin(p, "name", ANA_DIL);
    if (ad && ad !== anaAd) {
      satirlar.push(csvSatir(["Product", h, "title", dil, "", "", anaAd, ad]));
    }
    const desc = metin(p, "desc", dil);
    const anaDesc = metin(p, "desc", ANA_DIL);
    if (desc && desc !== anaDesc) {
      satirlar.push(csvSatir(["Product", h, "body_html", dil, "", "", anaDesc, desc]));
    }
  }
  return satirlar.join("\n");
}

/* ------------------------------------------------------------------ */
/* Çalıştır                                                            */
/* ------------------------------------------------------------------ */

const sirali = [...URUNLER].sort(
  (a, b) =>
    (b.sortRank ?? 500) - (a.sortRank ?? 500) ||
    b.priceCents - a.priceCents ||
    (a.sku < b.sku ? -1 : 1),
);

let toplamSatir = 0;
let gorselSayisi = 0;
const parcalar = [];

for (let i = 0; i < sirali.length; i += PARCA_URUN) {
  const dilim = sirali.slice(i, i + PARCA_URUN);
  const satirlar = [BASLIKLAR.map(alan).join(",")];
  for (const p of dilim) {
    const s = urunSatirlari(p, ANA_DIL);
    gorselSayisi += (p.images ?? []).length;
    for (const x of s) satirlar.push(csvSatir(x));
  }
  toplamSatir += satirlar.length - 1;
  parcalar.push({ ad: `urunler-${parcalar.length + 1}.csv`, icerik: satirlar.join("\n"), urun: dilim.length });
}

console.log("KAYNAK");
console.log("  ürün                :", URUNLER.length);
console.log("  görsel              :", gorselSayisi);
console.log("  ana kategori        :", KATEGORILER.filter((c) => !c.parentId).length);
console.log("  alt kategori        :", KATEGORILER.filter((c) => c.parentId).length);
console.log("  marka               :", MARKALAR.length);
console.log("\nÜRETİLEN");
console.log("  ana dil             :", ANA_DIL);
console.log("  para birimi         :", PARA, KUR === 1 ? "(EUR ile aynı)" : `(EUR × ${KUR})`);
console.log("  CSV satırı          :", toplamSatir, "(ürün + ek görsel satırları)");
console.log("  dosya               :", parcalar.length, "parça ×", PARCA_URUN, "ürün");
for (const p of parcalar) {
  console.log(`     ${p.ad.padEnd(16)} ${String(p.urun).padStart(5)} ürün  ${(p.icerik.length / 1048576).toFixed(1)} MB`);
}
console.log("  çeviri dosyası      :", DIGER_DILLER.join(", "));

if (!YAZ) {
  console.log("\n(deneme modu — yazmak için --yaz ekleyin)");
  process.exit(0);
}

fs.mkdirSync(CIKTI, { recursive: true });
for (const p of parcalar) fs.writeFileSync(path.join(CIKTI, p.ad), p.icerik, "utf8");
fs.writeFileSync(path.join(CIKTI, "koleksiyonlar.csv"), koleksiyonCsv(ANA_DIL), "utf8");
for (const d of DIGER_DILLER) {
  fs.writeFileSync(path.join(CIKTI, `ceviriler-${d}.csv`), ceviriCsv(d), "utf8");
}

console.log("\nyazıldı →", CIKTI);
