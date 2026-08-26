/**
 * KAMPANYA FİYATI TESTİ (Shopify aktarımı)
 *   node scripts/shopify-kampanya-test.mjs
 *
 * NEDEN AYRI BİR TEST
 * Katalogda şu an indirimli ürün yok, bu yüzden shopify-dogrula.mjs kampanya
 * yolunu hiç çalıştıramıyor. Süper Admin panelinden indirim verildiğinde bu yol
 * devreye girecek — sınanmamış bırakmak, yanlış fiyatla satış demek.
 *
 * Test kataloğun bir kopyasına yapay kampanya uygular, aktarıcıyı ona
 * yöneltir ve şunları doğrular:
 *   Variant Price            = indirimli fiyat, mağaza para biriminde
 *   Variant Compare At Price = üstü çizili liste fiyatı
 *   kampanyasız üründe Compare At boş
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const katalog = JSON.parse(fs.readFileSync(path.join(KOK, "src/data/catalog.json"), "utf8"));

let hata = 0;
const k = (c, ad, ek = "") => {
  if (!c) hata++;
  console.log(String(ad).padEnd(48), (c ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

/** RFC 4180 çözümleyici. */
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

/* --- yapay kampanyalı katalog ------------------------------------- */
const YUZDELER = [10, 25, 50];
const denekler = katalog.products.slice(0, 3).map((p, i) => ({
  sku: p.sku,
  listeCentEur: p.priceCents,
  yuzde: YUZDELER[i],
}));
const kampanyasiz = katalog.products[3];

const kopya = JSON.parse(JSON.stringify(katalog));
denekler.forEach((d, i) => {
  const p = kopya.products.find((x) => x.sku === d.sku);
  p.campaignOn = true;
  p.campaignPercent = YUZDELER[i];
});

const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "pg-kampanya-"));
const kaynak = path.join(gecici, "katalog.json");
const cikti = path.join(gecici, "cikti");
fs.writeFileSync(kaynak, JSON.stringify(kopya));

execFileSync(
  process.execPath,
  [path.join(KOK, "scripts/shopify-aktar.mjs"), "--yaz", `--katalog=${kaynak}`, `--cikti=${cikti}`],
  { stdio: "pipe" },
);

/* --- üretilen dosyaları oku --------------------------------------- */
let basliklar = null;
const satirlar = [];
for (const dosya of fs.readdirSync(cikti).filter((f) => /^urunler-\d+\.csv$/.test(f))) {
  const s = csvCoz(fs.readFileSync(path.join(cikti, dosya), "utf8"));
  if (!basliklar) basliklar = s[0];
  for (const r of s.slice(1)) satirlar.push(Object.fromEntries(basliklar.map((b, i) => [b, r[i] ?? ""])));
}

const dil = katalog.languages.find((l) => l.code === "sv");
const sek = (centEur) => (Math.round(centEur * dil.rate) / 100).toFixed(2);

console.log(`ana dil ${dil.code} · para birimi ${dil.currency} · kur ${dil.rate}\n`);
console.log(
  "SKU".padEnd(9) + "liste".padEnd(11) + "ind.".padEnd(7) +
  "Price".padEnd(12) + "CompareAt".padEnd(12) + "beklenen Price".padEnd(16) + "beklenen CompareAt",
);
console.log("-".repeat(84));

for (const d of denekler) {
  const r = satirlar.find((x) => x.Title && x["Variant SKU"] === d.sku);
  const netCent = Math.round(d.listeCentEur * (1 - d.yuzde / 100));
  const bP = sek(netCent);
  const bC = sek(d.listeCentEur);
  console.log(
    d.sku.padEnd(9) +
      (d.listeCentEur / 100).toFixed(2).padEnd(11) +
      ("%" + d.yuzde).padEnd(7) +
      (r?.["Variant Price"] ?? "-").padEnd(12) +
      (r?.["Variant Compare At Price"] || "-").padEnd(12) +
      bP.padEnd(16) + bC,
  );
  k(r?.["Variant Price"] === bP, `${d.sku}: satış fiyatı indirimli`);
  k(r?.["Variant Compare At Price"] === bC, `${d.sku}: liste fiyatı üstü çizili alanda`);
}

const n = satirlar.find((x) => x.Title && x["Variant SKU"] === kampanyasiz.sku);
console.log();
k(n?.["Variant Compare At Price"] === "", "kampanyasız üründe Compare At boş",
  n?.["Variant Compare At Price"] || "(boş)");
k(n?.["Variant Price"] === sek(kampanyasiz.priceCents), "kampanyasız ürünün fiyatı liste fiyatı");

fs.rmSync(gecici, { recursive: true, force: true });

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
