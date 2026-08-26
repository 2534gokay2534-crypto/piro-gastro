/**
 * MUHASEBE DENETİMİ
 *   npx tsx scripts/muhasebe-denetim.mts
 *
 * Muhasebe ekranlarındaki rakamların doğruluğunu bağımsız hesapla karşılaştırır.
 * "Sayfa açılıyor" yetmez; gösterilen tutarların gerçekten doğru olması gerekir.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { CEREZ, cerezUret } from "../src/lib/admin-kapi";
import { CIRO_DURUMLARI } from "../src/lib/admin-ui";
import { DONEMLER, donemBaslangici, donemlereBol, genelToplam } from "../src/lib/rapor";

const K = process.env.KOK ?? "http://localhost:3000";
const cerez = `${CEREZ}=${await cerezUret(Date.now())}`;

let hata = 0;
const k = (c: boolean, a: string, e = "") => {
  if (!c) hata++;
  console.log(String(a).padEnd(52), (c ? "OK" : "HATA") + (e ? "  " + e : ""));
};

const eur = (c: number) => (c / 100).toFixed(2) + " €";

/** Sayfa metnini alır (etiketler ve RSC yorumları temizlenmiş). */
async function sayfaMetni(yol: string) {
  const r = await fetch(K + yol, { headers: { cookie: cerez } });
  const h = await r.text();
  return {
    k: r.status,
    t: h.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
  };
}

/* ------------------------------------------------------------------ */
console.log("=== A. BAĞIMSIZ HESAP (doğrudan veritabanından) ===");

const odenmis = await db.order.findMany({
  where: { status: { in: CIRO_DURUMLARI } },
  select: { totalCents: true, subtotalCents: true, vatCents: true, shipCents: true, costCents: true },
});
const ciro = odenmis.reduce((t, o) => t + o.totalCents, 0);
const net = odenmis.reduce((t, o) => t + o.subtotalCents, 0);
const kdv = odenmis.reduce((t, o) => t + o.vatCents, 0);
const kargo = odenmis.reduce((t, o) => t + o.shipCents, 0);
const maliyet = odenmis.reduce((t, o) => t + o.costCents, 0);
const kar = net + kargo - maliyet;

const acikFatura = await db.order.aggregate({
  _sum: { totalCents: true }, _count: true,
  where: { status: "new", payMethod: "invoice" },
});

console.log("  tahsil edilmiş sipariş :", odenmis.length);
console.log("  ciro (KDV dahil)       :", eur(ciro));
console.log("  net satış              :", eur(net));
console.log("  kargo geliri           :", eur(kargo));
console.log("  KDV                    :", eur(kdv));
console.log("  kâr (KDV hariç)        :", eur(kar));
console.log("  açık fatura            :", eur(acikFatura._sum.totalCents ?? 0), `(${acikFatura._count} adet)`);

k(net + kargo + kdv === ciro, "ciro = net + kargo + KDV", `${eur(net + kargo + kdv)} = ${eur(ciro)}`);

/* ------------------------------------------------------------------ */
console.log("\n=== B. MUHASEBE EKRANI AYNI RAKAMI GÖSTERİYOR MU ===");

// Sayfa iki biçim kullanıyor: özet kartlarında ondalıksız, tabloda ondalıklı.
const bicim = (c: number) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c / 100);
const bicimSade = (c: number) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(c / 100);

// Muhasebe ekranı DÖNEM bazlıdır (varsayılan: bu ay). Aynı pencereyi hesaplayalım —
// tüm zamanların toplamıyla karşılaştırmak yanlış olurdu.
const simdi = new Date();
const ayBas = new Date(simdi.getFullYear(), simdi.getMonth(), 1);
const ayIcinde = await db.order.findMany({
  where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: ayBas } },
  select: { subtotalCents: true, vatCents: true, totalCents: true },
});
// Sayfadaki tanım: satış geliri (KDV hariç) = ciro − KDV, yani kargo geliri dahil.
const ayNet = ayIcinde.reduce((t, o) => t + o.totalCents - o.vatCents, 0);
const ayKdv = ayIcinde.reduce((t, o) => t + o.vatCents, 0);

const mu = await sayfaMetni("/tr/admin/muhasebe");
k(mu.k === 200, "Muhasebe sayfası açılıyor", `HTTP ${mu.k}`);
console.log(`  bu ay: ${ayIcinde.length} sipariş · net ${eur(ayNet)} · KDV ${eur(ayKdv)}`);
k(mu.t.includes(bicim(ayNet)), "bu ayın satış geliri (KDV hariç) doğru", bicim(ayNet));
k(
  mu.t.includes(bicimSade(ayKdv)) || mu.t.includes(bicim(ayKdv)),
  "bu ayın KDV'si ekranda doğru",
  bicimSade(ayKdv),
);

// Yıl aralığı da doğru hesaplanıyor mu
const yilBas = new Date(simdi.getFullYear(), 0, 1);
const yilIcinde = await db.order.findMany({
  where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: yilBas } },
  select: { totalCents: true, vatCents: true },
});
const yilNet = yilIcinde.reduce((t, o) => t + o.totalCents - o.vatCents, 0);
const muYil = await sayfaMetni("/tr/admin/muhasebe?a=yil");
k(muYil.t.includes(bicim(yilNet)), "bu yılın satış geliri (KDV hariç) doğru", bicim(yilNet));

/* ------------------------------------------------------------------ */
console.log("\n=== C. MUHASEBE RAPORLARI (4 dönem) ===");
for (const d of DONEMLER) {
  const r = await sayfaMetni(`/tr/admin/muhasebe-raporlari?d=${d.kod}`);
  const acildi = r.k === 200 && r.t.includes("Muhasebe Raporları");
  const toplamSatiri = r.t.includes("Toplam");
  k(acildi && toplamSatiri, `${d.ad} raporu`, `HTTP ${r.k}`);
}

// Aylık raporun toplamı bağımsız hesapla uyuşuyor mu
const aylik = DONEMLER.find((d) => d.kod === "ay")!;
const donemSiparisleri = await db.order.findMany({
  where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: donemBaslangici("ay", aylik.adet) } },
  select: {
    createdAt: true, totalCents: true, subtotalCents: true,
    vatCents: true, shipCents: true, costCents: true,
    _count: { select: { items: true } },
  },
});
const satirlar = donemlereBol(donemSiparisleri.map((o) => ({ ...o, _kalem: o._count.items })), "ay");
const t = genelToplam(satirlar);
const rapor = await sayfaMetni("/tr/admin/muhasebe-raporlari?d=ay");
k(rapor.t.includes(bicim(t.ciroCents)), "aylık rapor cirosu doğru", bicim(t.ciroCents));
k(t.netCents + t.kargoCents + t.kdvCents === t.ciroCents, "rapor toplamı tutarlı");
console.log(`  ${satirlar.length} ay · ${t.siparis} sipariş · ciro ${eur(t.ciroCents)} · kâr ${eur(t.karCents)}`);

/* ------------------------------------------------------------------ */
console.log("\n=== D. GELİR-GİDER VE SATIŞ RAPORLARI ===");
for (const [ad, yol] of [
  ["Gelir-Gider", "/tr/admin/gelir-gider"],
  ["Satış Raporları", "/tr/admin/raporlar"],
  ["Satış Raporları (7 gün)", "/tr/admin/raporlar?a=hafta"],
  ["Satış Raporları (90 gün)", "/tr/admin/raporlar?a=gun90"],
] as const) {
  const r = await sayfaMetni(yol);
  k(r.k === 200 && !/Bir hata|Unhandled/i.test(r.t), ad, `HTTP ${r.k}`);
}

/* ------------------------------------------------------------------ */
console.log("\n=== E. MAKBUZLARLA TUTARLILIK ===");
const makbuzSayfa = await sayfaMetni("/tr/admin/makbuzlar");
// Bu kart ondalıksız basar
k(makbuzSayfa.t.includes(bicimSade(ciro)), "makbuz ekranındaki ciro muhasebeyle aynı", bicimSade(ciro));
k(makbuzSayfa.t.includes(bicimSade(kdv)), "makbuz ekranındaki KDV muhasebeyle aynı", bicimSade(kdv));

const odenmisAdet = await db.order.count({ where: { status: { in: CIRO_DURUMLARI } } });
k(odenmisAdet === odenmis.length, "ödenmiş sipariş sayısı tutarlı", String(odenmisAdet));

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
