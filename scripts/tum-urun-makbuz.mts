/**
 * TÜM ÜRÜNLER İÇİN MAKBUZ ZİNCİRİ TESTİ
 *   npx tsx scripts/tum-urun-makbuz.mts [örneklem]
 *
 * Kataloğun tamamı için:
 *   • varyant/özellik özeti üretilebiliyor mu
 *   • makbuz satırı eksiksiz kuruluyor mu (ad, görsel, adet, fiyat, KDV)
 *   • PDF üretilebiliyor mu (örneklem üzerinde — her ürün için PDF çok yavaş olur)
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import kat from "../src/data/catalog.json";
import { varyantOzeti, tutarlariHesapla } from "../src/lib/siparis";
import { pick } from "../src/lib/i18n";
import { netCents } from "../src/lib/money";
import { makbuzPdf } from "../src/lib/makbuz-pdf";
import type { Makbuz } from "../src/lib/makbuz";

const P = (kat as { products: Array<Record<string, unknown>> }).products;
const ORNEKLEM = Number(process.argv[2] ?? 40);

let hata = 0;
const kontrol = (k: boolean, adi: string, ek = "") => {
  if (!k) hata++;
  console.log(String(adi).padEnd(56), (k ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

type Urun = {
  id: string; sku: string; slug: string; priceCents: number;
  images?: Array<{ url: string }>; specs?: unknown; dims?: unknown; weightKg?: number;
  onRequest?: boolean; stock?: number;
};

/** Bir üründen tek kalemlik sahte makbuz kurar. */
function makbuzKur(u: Urun, dil: string, adet = 2): Makbuz {
  const birim = netCents(u as never);
  const satir = { product: u, qty: adet, unitCents: birim, lineCents: birim * adet };
  const t = tutarlariHesapla([satir as never], "SE");
  return {
    id: "test", numara: "PG-2026-9999", durum: "paid", tur: "makbuz",
    odemeYontemi: "swish", odemeReferansi: "demo_test", saglayici: "demo", paraBirimi: "EUR",
    tarih: new Date("2026-08-25T12:00:00Z"), odemeTarihi: new Date("2026-08-25T12:00:00Z"), kargoTarihi: null,
    musteri: { ad: "Test Kişi", firma: "Test AB", eposta: "t@t.se", telefon: "+46701112233", vergiNo: "556677-8899", kdvNo: "" },
    teslimat: { ad: "Test AB", adres: "Testgatan 1", postaKodu: "21100", sehir: "Malmö", ulke: "SE" },
    kalemler: [{
      id: "k1", sku: u.sku, ad: pick(u as never, "name", dil),
      varyant: varyantOzeti(u as never, dil),
      adet, birimCents: birim, kdvYuzde: t.kdvYuzde, satirCents: birim * adet,
      gorsel: u.images?.[0]?.url ?? null, slug: u.slug,
    }],
    not: null,
    araToplamCents: t.netCents, kargoCents: t.shipCents, indirimCents: 0,
    kdvCents: t.vatCents, toplamCents: t.totalCents, kdvYuzde: t.kdvYuzde,
  } as Makbuz;
}

/* ------------------------------------------------------------------ */
console.log(`=== A. TÜM ÜRÜNLER (${P.length}) — MAKBUZ SATIRI KURULABİLİYOR MU ===`);

let adYok = 0, gorselYok = 0, varyantYok = 0, hesapHatasi = 0, cokUzunVaryant = 0;
const diller = ["sv", "en", "tr", "de"];

for (let i = 0; i < P.length; i++) {
  const u = P[i] as unknown as Urun;
  const dil = diller[i % 4];

  const ad = pick(u as never, "name", dil);
  if (!ad || !ad.trim()) adYok++;

  if (!u.images?.length) gorselYok++;

  const v = varyantOzeti(u as never, dil);
  if (!v) varyantYok++;
  if (v.length > 400) cokUzunVaryant++;

  const birim = netCents(u as never);
  const t = tutarlariHesapla([{ product: u, qty: 3, unitCents: birim, lineCents: birim * 3 } as never], "SE");
  if (t.netCents !== birim * 3) hesapHatasi++;
  if (t.totalCents !== t.netCents + t.shipCents + t.vatCents) hesapHatasi++;
}

kontrol(adYok === 0, "her üründe makbuz adı üretiliyor", `eksik: ${adYok}`);
kontrol(gorselYok === 0, "her üründe görsel bağlı", `görselsiz: ${gorselYok}`);
kontrol(hesapHatasi === 0, "her üründe tutar hesabı tutarlı", `hatalı: ${hesapHatasi}`);
kontrol(cokUzunVaryant === 0, "varyant özeti sınır içinde (≤400)", `taşan: ${cokUzunVaryant}`);
console.log(String("varyant özeti üretilen ürün").padEnd(56), `${P.length - varyantYok} / ${P.length}`);

/* ------------------------------------------------------------------ */
console.log(`\n=== B. PDF ÜRETİMİ — ${ORNEKLEM} ÜRÜNLÜK KATMANLI ÖRNEKLEM ===`);

// Her ürün tipinden ve fiyat aralığından örnek al
const gruplar: Record<string, Urun[]> = {
  "stokta": P.filter((p) => !p.onRequest && (p.stock as number) > 5 && (p.priceCents as number) > 0) as never,
  "sipariş üzerine": P.filter((p) => p.onRequest) as never,
  "stok yok": P.filter((p) => !p.onRequest && (p.stock as number) <= 0 && (p.priceCents as number) > 0) as never,
  "fiyat sorulacak": P.filter((p) => !p.priceCents) as never,
  "görsel çok": [...P].sort((a, b) => ((b.images as unknown[])?.length ?? 0) - ((a.images as unknown[])?.length ?? 0)) as never,
  "pahalı": [...P].sort((a, b) => (b.priceCents as number) - (a.priceCents as number)) as never,
  "ucuz": [...P].filter((p) => (p.priceCents as number) > 0).sort((a, b) => (a.priceCents as number) - (b.priceCents as number)) as never,
};

const cikti = path.join(process.cwd(), ".makbuz-test");
fs.mkdirSync(cikti, { recursive: true });

const grupAdlari = Object.keys(gruplar);
const basina = Math.max(1, Math.floor(ORNEKLEM / grupAdlari.length));
let pdfHata = 0, uretilen = 0;
const sureler: number[] = [];

for (const g of grupAdlari) {
  const liste = gruplar[g];
  const adim = Math.max(1, Math.floor(liste.length / basina));
  let alindi = 0;
  for (let i = 0; i < liste.length && alindi < basina; i += adim) {
    const u = liste[i];
    if (!u) continue;
    const dil = diller[uretilen % 4];
    const t0 = Date.now();
    try {
      const pdf = await makbuzPdf(makbuzKur(u, dil), dil);
      const sure = Date.now() - t0;
      sureler.push(sure);

      const gecerli = pdf.byteLength > 1000 && String.fromCharCode(...pdf.slice(0, 5)) === "%PDF-";
      if (!gecerli) { pdfHata++; console.log(`   HATA ${u.sku} (${g}) geçersiz PDF`); }
      if (uretilen === 0) fs.writeFileSync(path.join(cikti, "ornek-varyantli.pdf"), pdf);
    } catch (e) {
      pdfHata++;
      console.log(`   HATA ${u.sku} (${g}): ${String(e).slice(0, 90)}`);
    }
    uretilen++;
    alindi++;
  }
}

kontrol(pdfHata === 0, `${uretilen} üründe PDF üretildi`, `hatalı: ${pdfHata}`);
sureler.sort((a, b) => a - b);
console.log(String("süre: ortanca / en yavaş").padEnd(56),
  `${sureler[Math.floor(sureler.length / 2)] ?? 0} ms / ${sureler[sureler.length - 1] ?? 0} ms`);

/* ------------------------------------------------------------------ */
console.log("\n=== C. VARYANT ÖRNEKLERİ ===");
for (const sku of ["100047", "100374", "100524", "7010UB-C"]) {
  const u = P.find((x) => x.sku === sku) as unknown as Urun | undefined;
  if (!u) continue;
  const v = varyantOzeti(u as never, "tr");
  console.log(`  ${sku.padEnd(12)} ${v.slice(0, 96) || "(özellik yok)"}`);
}

console.log(`\n================ TOPLAM HATA: ${hata + pdfHata} ================`);
process.exit(hata + pdfHata > 0 ? 1 : 0);
