/**
 * ÖDEME VE FATURA BAŞVURUSU DOĞRULAMA TESTLERİ
 *
 *   npx tsx scripts/dogrulama-test.ts
 *
 * Sunucu gerektirmez; sipariş ve başvuru doğrulamasının kendisini sınar.
 */
import { basvuruDogrula, orgNrGecerliMi, orgNrSade, type BasvuruFormu } from "../src/lib/fatura-basvuru";
import { ULKE_KODLARI, formuDogrula, tutarlariHesapla, type SepetSatiri, type SiparisFormu } from "../src/lib/siparis";
import { eurCentToOre } from "../src/lib/odeme-saglayici";

let hata = 0;
const kontrol = (kosul: boolean, adi: string, ek = "") => {
  if (!kosul) hata++;
  console.log(String(adi).padEnd(54), (kosul ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

/* ------------------------------------------------------------------ */
console.log("=== A. ORGANIZASYON NUMARASI ===");
const orgTest: Array<[string, string, boolean]> = [
  ["556677-8899", "SE", true],
  ["5566778899", "SE", true],
  ["556677 8899", "SE", true],
  ["123", "SE", false],
  ["ABCDEFGHIJ", "SE", false],
  ["55667788990", "SE", false],
  ["", "SE", false],
  ["DE123456", "DE", true],
  ["ab", "DE", false],
];
for (const [v, u, beklenen] of orgTest) {
  kontrol(orgNrGecerliMi(v, u) === beklenen, `orgNr "${v}" (${u}) -> ${beklenen ? "gecerli" : "gecersiz"}`);
}
kontrol(orgNrSade("556677-8899") === "5566778899", "orgNrSade tire temizler");
kontrol(orgNrSade("556677 8899") === "5566778899", "orgNrSade bosluk temizler");

/* ------------------------------------------------------------------ */
console.log("\n=== B. BASVURU FORMU ===");
const gecerliBasvuru: BasvuruFormu = {
  company: "Test Restaurang AB", orgNr: "556677-8899", vatNr: "SE556677889901",
  contact: "Anna Test", email: "anna@fatura-test.se", phone: "+46701234567",
  billAddr: "Storgatan 1", billZip: "21100", billCity: "Malmo", country: "SE", note: "",
};
kontrol(Object.keys(basvuruDogrula(gecerliBasvuru, ULKE_KODLARI)).length === 0, "gecerli basvuru -> hata yok");

const bozuk: Array<[string, Partial<BasvuruFormu>, keyof BasvuruFormu]> = [
  ["sirket adi bos", { company: "" }, "company"],
  ["sirket adi 1 harf", { company: "A" }, "company"],
  ["org.nr kisa", { orgNr: "123" }, "orgNr"],
  ["org.nr harfli", { orgNr: "ABCDEFGHIJ" }, "orgNr"],
  ["yetkili bos", { contact: "" }, "contact"],
  ["eposta bozuk", { email: "bu-eposta-degil" }, "email"],
  ["eposta @ yok", { email: "abc.se" }, "email"],
  ["eposta nokta yok", { email: "a@b" }, "email"],
  ["telefon kisa", { phone: "12" }, "phone"],
  ["adres bos", { billAddr: "" }, "billAddr"],
  ["posta kodu kisa", { billZip: "1" }, "billZip"],
  ["sehir bos", { billCity: "" }, "billCity"],
  ["ulke gecersiz", { country: "XX" }, "country"],
];
for (const [adi, ek, alan] of bozuk) {
  const h = basvuruDogrula({ ...gecerliBasvuru, ...ek }, ULKE_KODLARI);
  kontrol(!!h[alan], `${adi} -> ${alan} isaretlendi`);
}

/* ------------------------------------------------------------------ */
console.log("\n=== C. SIPARIS FORMU ===");
const gecerliSiparis: SiparisFormu = {
  firma: "Test Kok AB", vergiNo: "556000-1234", ad: "Test Person",
  eposta: "test@pirogastro-test.se", telefon: "+46701112233",
  adres: "Testgatan 1", postaKodu: "21100", sehir: "Malmo",
  ulke: "SE", odeme: "card", not: "",
};
kontrol(Object.keys(formuDogrula(gecerliSiparis)).length === 0, "gecerli siparis -> hata yok");
kontrol(!!formuDogrula({ ...gecerliSiparis, odeme: "kripto" }).odeme, "odeme 'kripto' -> reddedilir");
for (const y of ["swish", "card", "klarna", "invoice"]) {
  kontrol(!formuDogrula({ ...gecerliSiparis, odeme: y }).odeme, "odeme '" + y + "' kabul edilir");
}
kontrol(!!formuDogrula({ ...gecerliSiparis, odeme: "bitcoin" }).odeme, "odeme 'bitcoin' reddedilir");
kontrol(!formuDogrula({ ...gecerliSiparis, odeme: "invoice" }).odeme, "odeme 'invoice' bicimsel olarak gecerli");
kontrol(!!formuDogrula({ ...gecerliSiparis, ulke: "US" }).ulke, "teslimat 'US' -> reddedilir");
for (const u of ULKE_KODLARI) {
  kontrol(!formuDogrula({ ...gecerliSiparis, ulke: u }).ulke, `teslimat ${u} -> kabul`);
}

/* ------------------------------------------------------------------ */
console.log("\n=== D. TUTAR HESABI ===");
const satir = (fiyat: number, adet: number): SepetSatiri => ({
  product: { id: "x", sku: "X", slug: "x", priceCents: fiyat },
  qty: adet, unitCents: fiyat, lineCents: fiyat * adet,
});

const tutarTest: Array<[string, SepetSatiri[], string, number, number, number]> = [
  // ad, satirlar, ulke, beklenen net, kargo, kdv
  ["SE 100 EUR", [satir(10000, 1)], "SE", 10000, 4900, 3725],
  ["TR 100 EUR", [satir(10000, 1)], "TR", 10000, 4900, 2980],
  ["DE 100 EUR", [satir(10000, 1)], "DE", 10000, 4900, 3129],
  ["SE 2500 EUR (kargo bedava)", [satir(250000, 1)], "SE", 250000, 0, 62500],
  ["SE 2499 EUR (kargo var)", [satir(249900, 1)], "SE", 249900, 4900, 63700],
  ["SE cok satir", [satir(5000, 3), satir(2500, 2)], "SE", 20000, 4900, 6225],
  ["SE fiyat 0", [satir(0, 1)], "SE", 0, 0, 0],
];
for (const [adi, satirlar, ulke, bNet, bKargo, bKdv] of tutarTest) {
  const t = tutarlariHesapla(satirlar, ulke);
  const ok = t.netCents === bNet && t.shipCents === bKargo && t.vatCents === bKdv && t.totalCents === bNet + bKargo + bKdv;
  kontrol(ok, adi, ok ? "" : `net ${t.netCents} kargo ${t.shipCents} kdv ${t.vatCents}`);
}
kontrol(tutarlariHesapla([satir(0, 1)], "SE").fiyatSorulacak, "fiyat 0 -> 'sorulacak' isaretlenir");
kontrol(!tutarlariHesapla([satir(10000, 1)], "SE").fiyatSorulacak, "normal fiyat -> isaretlenmez");
kontrol(tutarlariHesapla([satir(0, 1), satir(10000, 1)], "SE").fiyatSorulacak, "karisik -> isaretlenir");

/* ------------------------------------------------------------------ */
console.log("\n=== E. SEK CEVRIMI (Stripe tahsilati) ===");
kontrol(eurCentToOre(10000, 11.4) === 114000, "100 EUR -> 1140 SEK");
kontrol(eurCentToOre(4900, 11.4) === 55860, "49 EUR kargo -> 558,60 SEK");
kontrol(eurCentToOre(1, 11.4) === 11, "1 cent -> 11 ore (yuvarlama)");
kontrol(eurCentToOre(0, 11.4) === 0, "0 -> 0");
kontrol(Number.isInteger(eurCentToOre(12345, 11.4)), "sonuc her zaman tamsayi");

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
