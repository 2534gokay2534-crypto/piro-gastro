/**
 * UÇTAN UCA SİPARİŞ ZİNCİRİ TESTİ
 *   npx tsx scripts/uctan-uca-siparis.mts [adet]
 *
 * Her ürün tipinden gerçek sipariş oluşturur ve zincirin tamamını doğrular:
 *   sipariş → makbuz verisi → PDF → Siparişlerim → muhasebe cirosu
 *
 * Oluşturduğu test siparişlerini sonunda TEMİZLER; veritabanında iz bırakmaz.
 */
import "dotenv/config";
import kat from "../src/data/catalog.json";
import { db } from "../src/lib/db";
import { pick } from "../src/lib/i18n";
import { netCents } from "../src/lib/money";
import { tutarlariHesapla, varyantOzeti, siparisNo } from "../src/lib/siparis";
import { makbuzGetir, siparislerimGetir, erisebilirMi } from "../src/lib/makbuz";
import { makbuzPdf } from "../src/lib/makbuz-pdf";

const P = (kat as { products: Array<Record<string, unknown>> }).products;
const ADET = Number(process.argv[2] ?? 24);

let hata = 0;
const kontrol = (k: boolean, adi: string, ek = "") => {
  if (!k) hata++;
  console.log(String(adi).padEnd(58), (k ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

type U = { id: string; sku: string; slug: string; priceCents: number; onRequest?: boolean; stock?: number; images?: unknown[] };

/* Her tipten örnek topla */
const tipler: Record<string, U[]> = {
  "stokta":          P.filter((p) => !p.onRequest && (p.stock as number) > 5 && (p.priceCents as number) > 0) as never,
  "sipariş üzerine": P.filter((p) => p.onRequest) as never,
  "stok yok":        P.filter((p) => !p.onRequest && (p.stock as number) <= 0 && (p.priceCents as number) > 0) as never,
  "fiyat sorulacak": P.filter((p) => !p.priceCents) as never,
  "en pahalı":       [...P].sort((a, b) => (b.priceCents as number) - (a.priceCents as number)) as never,
  "en ucuz":         [...P].filter((p) => (p.priceCents as number) > 0).sort((a, b) => (a.priceCents as number) - (b.priceCents as number)) as never,
};

const secilen: Array<{ tip: string; u: U }> = [];
const basina = Math.max(1, Math.floor(ADET / Object.keys(tipler).length));
for (const [tip, liste] of Object.entries(tipler)) {
  const adim = Math.max(1, Math.floor(liste.length / basina));
  let n = 0;
  for (let i = 0; i < liste.length && n < basina; i += adim) {
    if (liste[i]) { secilen.push({ tip, u: liste[i] }); n++; }
  }
}

const DILLER = ["sv", "en", "tr", "de"];
const YONTEMLER = ["swish", "card", "klarna"];
const ULKELER = ["SE", "TR", "DE", "NO"];
const EPOSTA = "uctan-uca@pirogastro-test.se";

console.log(`=== ${secilen.length} ÜRÜN İÇİN SİPARİŞ OLUŞTURULUYOR ===\n`);

const olusan: string[] = [];
const musteriler: string[] = [];
let sira = 900000;

for (let i = 0; i < secilen.length; i++) {
  const { tip, u } = secilen[i];
  const dil = DILLER[i % 4];
  const yontem = YONTEMLER[i % 3];
  const ulke = ULKELER[i % 4];
  const adet = (i % 4) + 1;

  const birim = netCents(u as never);
  const satir = { product: u, qty: adet, unitCents: birim, lineCents: birim * adet };
  const t = tutarlariHesapla([satir as never], ulke);
  const numara = siparisNo(2026, sira++);
  const simdi = new Date();

  try {
    const musteri = await db.customer.create({
      data: {
        name: "Uçtan Uca Test", email: EPOSTA, phone: "+46700000000",
        company: "Test Zincir AB", orgNr: "556000-0000",
        address: "Testgatan 1", zip: "21100", city: "Malmö", country: ulke, type: "business",
      },
    });
    musteriler.push(musteri.id);

    await db.order.create({
      data: {
        number: numara, customerId: musteri.id,
        status: "paid", payMethod: yontem, paidMethod: yontem, paidAt: simdi,
        provider: "demo", paymentRef: `demo_test_${numara}`,
        currency: "EUR",
        subtotalCents: t.netCents, vatCents: t.vatCents, shipCents: t.shipCents,
        totalCents: t.totalCents, costCents: 0,
        shipName: "Test Zincir AB", shipAddr: "Testgatan 1", shipZip: "21100", shipCity: "Malmö",
        items: {
          create: [{
            productId: u.id, sku: u.sku, name: pick(u as never, "name", dil),
            variant: varyantOzeti(u as never, dil) || null,
            qty: adet, unitPriceCents: birim, unitCostCents: 0,
            vatRate: t.kdvYuzde, lineTotalCents: birim * adet,
          }],
        },
      },
    });
    olusan.push(numara);
  } catch (e) {
    hata++;
    console.log(`  HATA ${u.sku} (${tip}): ${String(e).slice(0, 80)}`);
  }
}

kontrol(olusan.length === secilen.length, `${secilen.length} sipariş oluşturuldu`, `${olusan.length} başarılı`);

/* ------------------------------------------------------------------ */
console.log("\n=== HER SİPARİŞ İÇİN ZİNCİR ===");

let makbuzHata = 0, pdfHata = 0, alanHata = 0;
const pdfSure: number[] = [];

for (let i = 0; i < olusan.length; i++) {
  const numara = olusan[i];
  const dil = DILLER[i % 4];

  const m = await makbuzGetir(numara);
  if (!m) { makbuzHata++; console.log(`  HATA ${numara}: makbuz alınamadı`); continue; }

  // Zorunlu alanlar eksiksiz mi
  const eksik: string[] = [];
  if (!m.numara) eksik.push("no");
  if (!m.tarih) eksik.push("tarih");
  if (!m.musteri.ad) eksik.push("müşteri");
  if (!m.musteri.telefon) eksik.push("telefon");
  if (!m.musteri.eposta) eksik.push("e-posta");
  if (!m.teslimat.adres) eksik.push("adres");
  if (!m.kalemler.length) eksik.push("kalem");
  if (!m.odemeYontemi) eksik.push("ödeme yöntemi");
  if (!m.durum) eksik.push("ödeme durumu");
  for (const k of m.kalemler) {
    if (!k.ad) eksik.push("ürün adı");
    if (!k.gorsel) eksik.push("görsel");
    if (!k.adet) eksik.push("adet");
    if (typeof k.kdvYuzde !== "number") eksik.push("KDV");
  }
  if (m.araToplamCents + m.kargoCents + m.kdvCents !== m.toplamCents) eksik.push("toplam");
  if (eksik.length) { alanHata++; console.log(`  HATA ${numara}: eksik ${[...new Set(eksik)].join(", ")}`); }

  // Erişim denetimi
  if (!erisebilirMi(m, EPOSTA)) { alanHata++; console.log(`  HATA ${numara}: sahibi erişemiyor`); }
  if (erisebilirMi(m, "baskasi@kotu.se")) { alanHata++; console.log(`  HATA ${numara}: başkası erişebiliyor`); }

  // PDF
  const t0 = Date.now();
  try {
    const pdf = await makbuzPdf(m, dil);
    pdfSure.push(Date.now() - t0);
    if (!(pdf.byteLength > 1000 && String.fromCharCode(...pdf.slice(0, 5)) === "%PDF-")) {
      pdfHata++; console.log(`  HATA ${numara}: geçersiz PDF`);
    }
  } catch (e) {
    pdfHata++; console.log(`  HATA ${numara}: PDF üretilemedi — ${String(e).slice(0, 70)}`);
  }
}

kontrol(makbuzHata === 0, "her siparişin makbuz verisi alındı", `hatalı: ${makbuzHata}`);
kontrol(alanHata === 0, "her makbuzda zorunlu alanlar eksiksiz", `hatalı: ${alanHata}`);
kontrol(pdfHata === 0, "her makbuz için PDF üretildi", `hatalı: ${pdfHata}`);
pdfSure.sort((a, b) => a - b);
console.log(String("PDF süresi: ortanca / en yavaş").padEnd(58),
  `${pdfSure[Math.floor(pdfSure.length / 2)] ?? 0} ms / ${pdfSure[pdfSure.length - 1] ?? 0} ms`);

/* ------------------------------------------------------------------ */
console.log("\n=== SİPARİŞLERİM VE MUHASEBE ===");

const liste = await siparislerimGetir(EPOSTA, 200);
kontrol(liste.length === olusan.length, "hepsi Siparişlerim'de görünüyor", `${liste.length} / ${olusan.length}`);
kontrol(liste.every((x) => x.musteri.eposta === EPOSTA), "listede yalnızca kendi siparişleri var");
kontrol((await siparislerimGetir("baskasi@kotu.se")).length === 0, "başkası bu siparişleri göremiyor");

const CIRO = ["paid", "packing", "shipped", "delivered"];
const ciroda = await db.order.count({ where: { number: { in: olusan }, status: { in: CIRO } } });
kontrol(ciroda === olusan.length, "hepsi muhasebe cirosuna girdi", `${ciroda} / ${olusan.length}`);

const toplam = await db.order.aggregate({ _sum: { totalCents: true, vatCents: true }, where: { number: { in: olusan } } });
console.log(String("test siparişlerinin toplamı").padEnd(58),
  `${((toplam._sum.totalCents ?? 0) / 100).toFixed(2)} EUR · KDV ${((toplam._sum.vatCents ?? 0) / 100).toFixed(2)}`);

const yontemDagilimi = await db.order.groupBy({ by: ["paidMethod"], where: { number: { in: olusan } }, _count: true });
console.log(String("ödeme yöntemi dağılımı").padEnd(58),
  yontemDagilimi.map((y) => `${y.paidMethod}: ${y._count}`).join(" · "));

/* ------------------------------------------------------------------ */
console.log("\n=== TEMİZLİK ===");
const silinen = await db.order.deleteMany({ where: { number: { in: olusan } } });
const silinenM = await db.customer.deleteMany({ where: { id: { in: musteriler } } });
kontrol(silinen.count === olusan.length, "test siparişleri silindi", `${silinen.count} sipariş, ${silinenM.count} müşteri`);
kontrol((await siparislerimGetir(EPOSTA)).length === 0, "veritabanında iz kalmadı");

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
