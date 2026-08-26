/**
 * SIRALAMA TESTİ
 *   npx tsx scripts/siralama-test.mts
 *
 * İki şeyi kanıtlar:
 *   1) Her kategoride büyük/ana ürünler küçük tamamlayıcılardan ÖNCE geliyor.
 *   2) Mağazanın sırası ile yönetici panelinin sırası BİREBİR aynı.
 *
 * Mağaza catalog.json'dan, yönetici paneli veritabanından okuyor; ikisi de
 * aynı `sortRank` alanını kullandığı için sonuç aynı olmalı.
 */
import "dotenv/config";
import kat from "../src/data/catalog.json";
import { db } from "../src/lib/db";
import { productsInCategory, sortForListing, mainCategories, categoryById } from "../src/lib/catalog";

let hata = 0;
const kontrol = (k: boolean, adi: string, ek = "") => {
  if (!k) hata++;
  console.log(String(adi).padEnd(56), (k ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

const K = kat as {
  products: Array<Record<string, unknown>>;
  categories: Array<{ id: string; parentId: string | null; i18n?: Record<string, { name?: string }> }>;
};

const katAdi = (id: string) =>
  K.categories.find((c) => c.id === id)?.i18n?.tr?.name ??
  K.categories.find((c) => c.id === id)?.i18n?.en?.name ?? id;

/* ------------------------------------------------------------------ */
console.log("=== A. SIRA PUANI HER ÜRÜNDE VAR MI ===");
const puansiz = K.products.filter((p) => typeof p.sortRank !== "number");
kontrol(puansiz.length === 0, "her üründe sortRank var", `eksik: ${puansiz.length}`);

const puanlar = K.products.map((p) => p.sortRank as number);
kontrol(puanlar.every((v) => v >= 0 && v <= 1000), "puanlar 0–1000 aralığında");
console.log(String("puan dağılımı: en düşük / ortanca / en yüksek").padEnd(56),
  `${Math.min(...puanlar)} / ${[...puanlar].sort((a, b) => a - b)[Math.floor(puanlar.length / 2)]} / ${Math.max(...puanlar)}`);

/* ------------------------------------------------------------------ */
console.log("\n=== B. HER KATEGORİDE BÜYÜKLER ÖNDE Mİ ===");

const anaKategoriler = mainCategories();
let bozukKategori = 0;

for (const c of anaKategoriler) {
  const liste = sortForListing(productsInCategory(c.id));
  if (liste.length < 4) continue;

  // Sıra azalan olmalı (öne çıkarılanlar hariç — hiç yok)
  let azalanMi = true;
  for (let i = 1; i < liste.length; i++) {
    const onceki = liste[i - 1].sortRank ?? 500;
    const simdiki = liste[i].sortRank ?? 500;
    if (simdiki > onceki) { azalanMi = false; break; }
  }
  if (!azalanMi) { bozukKategori++; console.log(`   HATA ${katAdi(c.id)}: sıra azalmıyor`); }

  // İlk %20 ile son %20'nin ortalama puanı — üstteki belirgin biçimde büyük olmalı
  const dilim = Math.max(2, Math.floor(liste.length * 0.2));
  const ust = liste.slice(0, dilim).reduce((t, p) => t + (p.sortRank ?? 500), 0) / dilim;
  const altD = liste.slice(-dilim).reduce((t, p) => t + (p.sortRank ?? 500), 0) / dilim;
  if (ust <= altD) { bozukKategori++; console.log(`   HATA ${katAdi(c.id)}: üst ${ust.toFixed(0)} <= alt ${altD.toFixed(0)}`); }
}

kontrol(bozukKategori === 0, `${anaKategoriler.length} kategoride büyükler önde`, `bozuk: ${bozukKategori}`);

/* ------------------------------------------------------------------ */
console.log("\n=== C. MAĞAZA İLE YÖNETİCİ PANELİ AYNI SIRADA MI ===");

let farkliKategori = 0;
let karsilastirilan = 0;

for (const c of anaKategoriler) {
  const altlar = K.categories.filter((x) => x.parentId === c.id).map((x) => x.id);
  const ids = [c.id, ...altlar];

  // Mağaza sırası (catalog.json + sortForListing)
  const magaza = sortForListing(productsInCategory(c.id)).slice(0, 25).map((p) => p.id);
  if (magaza.length < 3) continue;

  // Yönetici paneli sırası (veritabanı + aynı ölçüt)
  const panel = await db.product.findMany({
    where: { hidden: false, OR: [{ categoryId: { in: ids } }, { subId: { in: ids } }] },
    orderBy: [
      { featured: "desc" },
      { sortRank: "desc" },
      { priceCents: "desc" },
      { sold: "desc" },
      { sku: "asc" },
    ],
    take: 25,
    select: { id: true },
  });

  karsilastirilan++;
  const a = magaza.join(",");
  const b = panel.map((p) => p.id).join(",");
  if (a !== b) {
    farkliKategori++;
    console.log(`   FARK ${katAdi(c.id)}`);
    console.log(`     mağaza: ${magaza.slice(0, 4).join(", ")}`);
    console.log(`     panel : ${panel.slice(0, 4).map((p) => p.id).join(", ")}`);
  }
}

kontrol(farkliKategori === 0, `${karsilastirilan} kategoride sıra birebir aynı`, `farklı: ${farkliKategori}`);

/* ------------------------------------------------------------------ */
console.log("\n=== D. ÖRNEK: PİŞİRME KATEGORİSİ ===");
const pisirme = sortForListing(productsInCategory("cooking"));
const ad = (p: { i18n?: Record<string, { name?: string }>; sku: string }) =>
  p.i18n?.tr?.name ?? p.i18n?.en?.name ?? p.sku;

console.log("  ilk 5 (büyük/ana):");
for (const p of pisirme.slice(0, 5)) {
  console.log(`   ${String(p.sortRank ?? 500).padStart(4)}  ${ad(p).slice(0, 46)}`);
}
console.log("  son 3 (tamamlayıcı):");
for (const p of pisirme.slice(-3)) {
  console.log(`   ${String(p.sortRank ?? 500).padStart(4)}  ${ad(p).slice(0, 46)}`);
}

/* ------------------------------------------------------------------ */
console.log("\n=== E. VERİTABANI İLE KATALOG PUANLARI UYUŞUYOR MU ===");
const ornek = K.products.slice(0, 400).map((p) => p.id as string);
const dbPuan = await db.product.findMany({
  where: { id: { in: ornek } },
  select: { id: true, sortRank: true },
});
const katPuan = new Map(K.products.map((p) => [p.id as string, p.sortRank as number]));
const uyusmaz = dbPuan.filter((p) => katPuan.get(p.id) !== p.sortRank);
kontrol(uyusmaz.length === 0, `${dbPuan.length} üründe katalog = veritabanı`, `uyuşmaz: ${uyusmaz.length}`);

await db.$disconnect();
console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
