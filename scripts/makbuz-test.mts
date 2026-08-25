/**
 * MAKBUZ PDF TESTİ
 *   npx tsx scripts/makbuz-test.ts
 *
 * Sunucu gerektirmez; PDF üretimini doğrudan sınar.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { makbuzGetir, siparislerimGetir, erisimDogrula, erisebilirMi } from "../src/lib/makbuz";
import { makbuzPdf } from "../src/lib/makbuz-pdf";
import { oturumOku, oturumUret } from "../src/lib/musteri-oturum";

let hata = 0;
const kontrol = (k: boolean, adi: string, ek = "") => {
  if (!k) hata++;
  console.log(String(adi).padEnd(56), (k ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

const cikti = path.join(process.cwd(), ".makbuz-test");
fs.mkdirSync(cikti, { recursive: true });

/* ------------------------------------------------------------------ */
console.log("=== A. MÜŞTERİ OTURUMU (imza) ===");
const simdi = Date.now();
const cerez = await oturumUret("Anna@Nordic-Test.SE", simdi);
kontrol((await oturumOku(cerez, simdi)) === "anna@nordic-test.se", "geçerli çerez -> e-posta döner");
kontrol((await oturumOku(cerez, simdi + 91 * 24 * 3600_000)) === null, "süresi dolmuş çerez -> reddedilir");
kontrol((await oturumOku("uydurma", simdi)) === null, "uydurma çerez -> reddedilir");
kontrol((await oturumOku(cerez.slice(0, -4) + "aaaa", simdi)) === null, "imzası bozulmuş çerez -> reddedilir");
const baskasi = cerez.replace("anna@nordic-test.se", "hirsiz@kotu.se");
kontrol((await oturumOku(baskasi, simdi)) === null, "e-postası değiştirilmiş çerez -> reddedilir");
kontrol((await oturumOku(undefined, simdi)) === null, "çerez yok -> null");

/* ------------------------------------------------------------------ */
console.log("\n=== B. MAKBUZ VERİSİ ===");
const m = await makbuzGetir("PG-2026-0052");
kontrol(!!m, "PG-2026-0052 bulundu");
if (!m) { console.log("\nHATA: " + hata); process.exit(1); }

const zorunlu: Array<[string, unknown]> = [
  ["sipariş numarası", m.numara],
  ["tarih-saat", m.tarih],
  ["müşteri adı", m.musteri.ad],
  ["telefon", m.musteri.telefon],
  ["e-posta", m.musteri.eposta],
  ["teslimat adresi", m.teslimat.adres],
  ["şehir", m.teslimat.sehir],
  ["ürün kalemleri", m.kalemler.length],
  ["ödeme yöntemi", m.odemeYontemi],
  ["ödeme durumu", m.durum],
  ["toplam", m.toplamCents],
];
for (const [ad, deger] of zorunlu) kontrol(!!deger, `alan dolu: ${ad}`, String(deger).slice(0, 34));
kontrol(m.kalemler.every((k) => k.adet > 0), "her kalemde adet var");
kontrol(m.kalemler.every((k) => typeof k.kdvYuzde === "number"), "her kalemde KDV oranı var");
kontrol(m.kalemler.some((k) => !!k.gorsel), "en az bir kalemde görsel bağlı");
kontrol(m.araToplamCents + m.kargoCents + m.kdvCents === m.toplamCents, "toplam = ara + kargo + KDV");

/* ------------------------------------------------------------------ */
console.log("\n=== C. ERİŞİM DENETİMİ ===");
kontrol(erisebilirMi(m, "anna@nordic-test.se"), "sahibi erişebilir");
kontrol(erisebilirMi(m, "ANNA@NORDIC-TEST.SE"), "büyük harf e-posta erişebilir");
kontrol(!erisebilirMi(m, "hirsiz@kotu.se"), "başkası erişemez");
kontrol(!erisebilirMi(m, null), "oturumsuz erişemez");
kontrol((await erisimDogrula("PG-2026-0052", "anna@nordic-test.se")) !== null, "no + e-posta doğru -> açılır");
kontrol((await erisimDogrula("PG-2026-0052", "yanlis@ornek.se")) === null, "no doğru, e-posta yanlış -> kapalı");
kontrol((await erisimDogrula("PG-9999-9999", "anna@nordic-test.se")) === null, "no yanlış -> kapalı");
kontrol((await erisimDogrula("", "")) === null, "boş -> kapalı");

/* ------------------------------------------------------------------ */
console.log("\n=== D. SİPARİŞLERİM LİSTESİ ===");
const liste = await siparislerimGetir("anna@nordic-test.se");
kontrol(liste.length > 0, "sahibinin siparişleri listelendi", `${liste.length} sipariş`);
kontrol(liste.every((x) => x.musteri.eposta.toLowerCase() === "anna@nordic-test.se"), "listede yalnızca kendi siparişleri var");
kontrol((await siparislerimGetir("hirsiz@kotu.se")).length === 0, "başkasının e-postası -> boş liste");
kontrol((await siparislerimGetir("")).length === 0, "boş e-posta -> boş liste");

/* ------------------------------------------------------------------ */
console.log("\n=== E. PDF ÜRETİMİ (4 dil) ===");
for (const dil of ["sv", "en", "tr", "de"]) {
  const t0 = Date.now();
  let pdf: Uint8Array | null = null;
  try {
    pdf = await makbuzPdf(m, dil);
  } catch (e) {
    console.log("   üretim hatası:", String(e).slice(0, 120));
  }
  const sure = Date.now() - t0;
  const gecerli = !!pdf && pdf.byteLength > 1000 &&
    String.fromCharCode(...pdf.slice(0, 5)) === "%PDF-";
  kontrol(gecerli, `${dil}: PDF üretildi`, pdf ? `${Math.round(pdf.byteLength / 1024)} KB · ${sure} ms` : "");
  if (pdf) fs.writeFileSync(path.join(cikti, `makbuz-${dil}.pdf`), pdf);
}

/* ------------------------------------------------------------------ */
console.log("\n=== F. UÇ DURUMLAR ===");
kontrol((await makbuzGetir("PG-9999-9999")) === null, "olmayan sipariş -> null");
kontrol((await makbuzGetir("")) === null, "boş numara -> null");

// çok kalemli sipariş (sayfa taşması)
const cok = { ...m, kalemler: Array.from({ length: 30 }, (_, i) => ({ ...m.kalemler[0], id: `x${i}` })) };
const cokPdf = await makbuzPdf(cok, "tr");
kontrol(cokPdf.byteLength > 1000, "30 kalemli sipariş -> çok sayfalı PDF", `${Math.round(cokPdf.byteLength / 1024)} KB`);
fs.writeFileSync(path.join(cikti, "makbuz-cok-kalem.pdf"), cokPdf);

// görselsiz sipariş
const gorselsiz = { ...m, kalemler: m.kalemler.map((k) => ({ ...k, gorsel: null })) };
kontrol((await makbuzPdf(gorselsiz, "sv")).byteLength > 1000, "görselsiz sipariş -> PDF yine üretilir");

// bozuk görsel adresi
const bozuk = { ...m, kalemler: m.kalemler.map((k) => ({ ...k, gorsel: "https://olmayan.ornek.test/yok.png" })) };
kontrol((await makbuzPdf(bozuk, "en")).byteLength > 1000, "erişilemeyen görsel -> PDF yine üretilir");

// Türkçe ve İsveççe karakterler
const ozel = {
  ...m,
  musteri: { ...m.musteri, ad: "Şükrü Çağdaş Öztürk", firma: "Åkessons Kök & Käll AB" },
  kalemler: m.kalemler.map((k) => ({ ...k, ad: "Fritöz ÇİFT haznëli — Ölçü 40×60" })),
  not: "Teslimat şubat ayında, öğleden sonra. Ärendet gäller köksutrustning.",
};
const ozelPdf = await makbuzPdf(ozel, "tr");
kontrol(ozelPdf.byteLength > 1000, "Türkçe/İsveççe karakterler -> PDF üretildi");
fs.writeFileSync(path.join(cikti, "makbuz-ozel-karakter.pdf"), ozelPdf);

console.log(`\nÜretilen dosyalar: ${cikti}`);
console.log(`================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
