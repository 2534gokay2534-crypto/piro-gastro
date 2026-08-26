/**
 * ÜRÜN SIRALAMA — büyük/ana ürünler önce, tamamlayıcı küçükler sonra
 *
 *   node scripts/urun-sirala.mjs              -> rapor (yazmaz)
 *   node scripts/urun-sirala.mjs --yaz        -> catalog.json'a yaz
 *   node scripts/urun-sirala.mjs --yaz --db   -> veritabanına da yaz
 *
 * NASIL KARAR VERİLİYOR
 * Ürünün "ana ekipman" mı yoksa "tamamlayıcı aksesuar" mı olduğunu üç
 * ölçülebilir işaretten çıkarıyoruz:
 *
 *   hacim (m³)   %40 — bir fırın ile bir maşa arasındaki en net fark
 *   ağırlık (kg) %30 — hacmi küçük ama ağır makineleri yakalar
 *   fiyat (€)    %30 — ölçü/ağırlık yoksa tek başına da anlamlı
 *
 * Her işaret ham değeriyle değil, katalog içindeki YÜZDELİK SIRASIYLA
 * kullanılıyor; böylece 3,5 m³'lük tek bir dev ürün ölçeği bozmuyor.
 * Eksik işaretin ağırlığı kalanlara paylaştırılıyor.
 *
 * Ayrıca adında/kategorisinde açıkça aksesuar olduğu yazan ürünler
 * (yedek parça, kapak, sepet, raf, tekstil…) aşağı çekiliyor: bunlar
 * büyük bir makineye ait olsalar bile tamamlayıcıdır.
 *
 * Sonuç 0–1000 arası bir `sortRank` sayısı olarak hem catalog.json'a hem
 * veritabanına yazılıyor; mağaza ve yönetici paneli aynı sayıyı okuduğu
 * için sıralama iki yerde birebir aynı oluyor.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KATALOG = path.resolve(__dirname, "../src/data/catalog.json");
const YAZ = process.argv.includes("--yaz");
const DB = process.argv.includes("--db");

/* ---------------- işaretler ---------------- */

const hacimM3 = (p) => {
  const d = p.dims;
  if (!d?.w || !d?.d || !d?.h) return null;
  const carpan = d.unit === "cm" ? 1e-6 : 1e-9; // mm varsayılan
  return d.w * d.d * d.h * carpan;
};

const agirlik = (p) => (typeof p.weightKg === "number" && p.weightKg > 0 ? p.weightKg : null);
const fiyat = (p) => (p.priceCents > 0 ? p.priceCents : null);

/**
 * Aksesuar/tamamlayıcı işaretleri — ürün adında geçerse aşağı çekilir.
 * Dört dilde de arıyoruz; katalogda ürün adları dile göre değişiyor.
 */
const AKSESUAR = new RegExp(
  [
    // TR
    "yedek parça", "aksesuar", "kapak", "sepet", "raf", "tepsi", "ızgara teli",
    "conta", "filtre", "tutamak", "sap", "ayak", "tekerlek", "adaptör", "kablo",
    "fırça", "temizlik", "örtü", "peçete", "eldiven", "önlük", "bıçak seti",
    // EN
    "spare part", "accessor", "\\blid\\b", "basket", "\\bshelf\\b", "\\btray\\b",
    "gasket", "filter", "handle", "\\bfoot\\b", "castor", "adapter", "\\bcable\\b",
    "brush", "cleaning", "cloth", "napkin", "glove", "apron",
    // SV
    "reservdel", "tillbehör", "\\block\\b", "korg", "hylla", "bricka", "packning",
    "handtag", "hjul", "borste", "rengöring", "duk", "servett", "handske", "förkläde",
    // DE
    "ersatzteil", "zubehör", "deckel", "\\bkorb\\b", "\\bregal\\b", "blech",
    "dichtung", "griff", "rolle", "bürste", "reinigung", "tuch", "serviette",
    "handschuh", "schürze",
  ].join("|"),
  "i",
);

/** Kategorisi gereği tamamlayıcı olan bölümler. */
const AKSESUAR_KATEGORI = new Set([
  "spare-parts", "textile", "utensils", "tableware",
]);

/* ---------------- yüzdelik sıra ---------------- */

/** Değer listesinden "bu değer listenin yüzde kaçından büyük" haritası kurar. */
function yuzdelikHarita(degerler) {
  const sirali = [...degerler].sort((a, b) => a - b);
  return (v) => {
    if (v == null) return null;
    // ikili arama: v'den küçük eleman sayısı
    let alt = 0, ust = sirali.length;
    while (alt < ust) {
      const orta = (alt + ust) >> 1;
      if (sirali[orta] < v) alt = orta + 1;
      else ust = orta;
    }
    return sirali.length > 1 ? alt / (sirali.length - 1) : 0.5;
  };
}

/* ---------------- ana iş ---------------- */

const katalog = JSON.parse(fs.readFileSync(KATALOG, "utf8"));
const urunler = katalog.products;

const hacimler = urunler.map(hacimM3).filter((v) => v != null);
const agirliklar = urunler.map(agirlik).filter((v) => v != null);
const fiyatlar = urunler.map(fiyat).filter((v) => v != null);

const hY = yuzdelikHarita(hacimler);
const aY = yuzdelikHarita(agirliklar);
const fY = yuzdelikHarita(fiyatlar);

const AGIRLIKLAR = { hacim: 0.4, agirlik: 0.3, fiyat: 0.3 };

function adlar(p) {
  return Object.values(p.i18n ?? {})
    .map((x) => x?.name ?? "")
    .join(" · ");
}

function skorla(p) {
  const isaretler = [
    [hY(hacimM3(p)), AGIRLIKLAR.hacim],
    [aY(agirlik(p)), AGIRLIKLAR.agirlik],
    [fY(fiyat(p)), AGIRLIKLAR.fiyat],
  ].filter(([v]) => v != null);

  // Hiçbir işaret yoksa "bilmiyoruz" demektir; en küçük saymak yanlış olur.
  // Nötr orta değer veriyoruz ki bu ürünler listenin ortasında kalsın.
  if (isaretler.length === 0) return 500;

  // Eksik işaretin ağırlığını kalanlara paylaştır
  const toplamAgirlik = isaretler.reduce((t, [, w]) => t + w, 0);
  let skor = isaretler.reduce((t, [v, w]) => t + v * w, 0) / toplamAgirlik;

  // Aksesuar cezası — büyük bir makineye ait olsa da tamamlayıcıdır
  const aksesuarMi = AKSESUAR.test(adlar(p)) || AKSESUAR_KATEGORI.has(p.categoryId);
  if (aksesuarMi) skor *= 0.35;

  return Math.round(skor * 1000);
}

let degisen = 0;
for (const p of urunler) {
  const yeni = skorla(p);
  if (p.sortRank !== yeni) degisen++;
  if (YAZ) p.sortRank = yeni;
}

/* ---------------- rapor ---------------- */

const kategoriAdi = (id) => {
  const c = katalog.categories.find((x) => x.id === id);
  return c?.i18n?.tr?.name ?? c?.i18n?.en?.name ?? id;
};

console.log("Ürün               :", urunler.length);
console.log("Sıra puanı değişen :", degisen);
console.log("Ölçüsü olan        :", hacimler.length);
console.log("Ağırlığı olan      :", agirliklar.length);

const ornekKategoriler = ["cooking", "refrigeration", "preparation", "spare-parts"];
for (const kid of ornekKategoriler) {
  const alt = katalog.categories.filter((c) => c.parentId === kid).map((c) => c.id);
  const ids = new Set([kid, ...alt]);
  const liste = urunler
    .filter((p) => !p.hidden && (ids.has(p.categoryId) || ids.has(p.subId)))
    .map((p) => ({ p, s: skorla(p) }))
    .sort((a, b) => b.s - a.s || b.p.priceCents - a.p.priceCents);

  if (liste.length === 0) continue;
  console.log(`\n${kategoriAdi(kid)} (${liste.length} ürün)`);
  console.log("  --- en üstteki 5 ---");
  for (const { p, s } of liste.slice(0, 5)) {
    const h = hacimM3(p);
    console.log(
      "   ", String(s).padStart(4),
      (p.i18n?.tr?.name ?? p.i18n?.en?.name ?? p.sku).slice(0, 40).padEnd(42),
      "m³", (h ?? 0).toFixed(3).padStart(6),
      "kg", String(p.weightKg ?? "—").padStart(6),
      "€", String(Math.round(p.priceCents / 100)).padStart(6),
    );
  }
  console.log("  --- en alttaki 3 ---");
  for (const { p, s } of liste.slice(-3)) {
    const h = hacimM3(p);
    console.log(
      "   ", String(s).padStart(4),
      (p.i18n?.tr?.name ?? p.i18n?.en?.name ?? p.sku).slice(0, 40).padEnd(42),
      "m³", (h ?? 0).toFixed(3).padStart(6),
      "kg", String(p.weightKg ?? "—").padStart(6),
      "€", String(Math.round(p.priceCents / 100)).padStart(6),
    );
  }
}

if (YAZ) {
  fs.writeFileSync(KATALOG, JSON.stringify(katalog));
  console.log("\ncatalog.json güncellendi");
}

if (YAZ && DB) {
  const { db } = await import("./_db.mjs");

  let n = 0;
  for (const p of urunler) {
    await db.product.update({ where: { id: p.id }, data: { sortRank: p.sortRank } }).catch(() => null);
    n++;
  }
  console.log("veritabanında güncellenen ürün :", n);
  await db.$disconnect();
}
