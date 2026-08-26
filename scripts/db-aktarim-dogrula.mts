/**
 * AKTARIM DOĞRULAMASI — Neon'daki veri yedekle birebir mi
 *   npx tsx scripts/db-aktarim-dogrula.mts
 *
 * "Aktardım" demek yetmez; her tablodaki satır sayısı ve örnek kayıtların
 * alan değerleri kaynakla karşılaştırılır, ilişkiler gezilir.
 * Bağlantı adresi hiçbir yere yazdırılmaz.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db, dbVar } from "../src/lib/db";

const KAYNAK = process.argv[2] ?? "yedek/veritabani-yedek.json";

if (!dbVar) {
  console.error("DATABASE_URL tanımlı değil ya da PostgreSQL değil.");
  process.exit(1);
}

const yedek = JSON.parse(readFileSync(KAYNAK, "utf8")) as {
  sira: string[];
  veri: Record<string, Record<string, unknown>[]>;
};

const sema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

/**
 * Birincil anahtar her modelde "id" değil: Setting'de "key",
 * Language'de "code". Anahtar adı şemadan okunur.
 */
function anahtarAlani(model: string): string {
  const buyuk = model[0].toUpperCase() + model.slice(1);
  const govde = sema.match(new RegExp("^model\\s+" + buyuk + "\\s*\\{([\\s\\S]*?)^\\}", "m"))?.[1];
  return govde?.match(/^\s*(\w+)\s+\S+\s+@id\b/m)?.[1] ?? "id";
}

let hata = 0;
const k = (c: boolean, ad: string, ek = "") => {
  if (!c) hata++;
  console.log(String(ad).padEnd(42), (c ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

console.log("=== A. TABLO SAYILARI ===");
console.log("tablo".padEnd(24) + "yedek".padStart(8) + "neon".padStart(9) + "   durum");
console.log("-".repeat(54));

let yedekToplam = 0;
let neonToplam = 0;

for (const model of yedek.sira) {
  const beklenen = (yedek.veri[model] ?? []).length;
  if (!beklenen) continue;
  const n = await (db as never as Record<string, { count: () => Promise<number> }>)[model].count();
  yedekToplam += beklenen;
  neonToplam += n;
  // Test sırasında eklenenler olabilir; eksik olmamalı.
  const ok = n >= beklenen;
  if (!ok) hata++;
  console.log(
    model.padEnd(24) + String(beklenen).padStart(8) + String(n).padStart(9) + "   " +
      (ok ? (n > beklenen ? `OK (+${n - beklenen})` : "OK") : `EKSİK (${beklenen - n})`),
  );
}

console.log("-".repeat(54));
console.log("toplam".padEnd(24) + String(yedekToplam).padStart(8) + String(neonToplam).padStart(9));
k(neonToplam >= yedekToplam, "hiçbir tabloda kayıp yok");

console.log("\n=== B. İÇERİK KARŞILAŞTIRMASI ===");

/** Yedekteki ilk N kaydı Neon'daki karşılığıyla alan alan karşılaştırır. */
async function icerikKarsilastir(model: string, alanlar: string[], adet = 5) {
  const kaynak = (yedek.veri[model] ?? []).slice(0, adet);
  if (!kaynak.length) return;
  const anahtar = anahtarAlani(model);
  let fark = 0;
  let kayip = 0;

  for (const s of kaynak) {
    let bulunan: Record<string, unknown> | null = null;
    try {
      bulunan = await (db as never as Record<
        string,
        { findUnique: (a: { where: Record<string, unknown> }) => Promise<Record<string, unknown> | null> }
      >)[model].findUnique({ where: { [anahtar]: s[anahtar] } });
    } catch (e) {
      // Prisma doğrulama hatasının tamamını basmak ekranı doldurur; özeti yeter.
      k(false, `${model}: sorgu çalışmadı`, (e as Error).message.split("\n")[0].slice(0, 80));
      return;
    }
    if (!bulunan) { kayip++; continue; }
    for (const a of alanlar) {
      const beklenen = s[a];
      const gelen = bulunan[a];
      const esit =
        gelen instanceof Date
          ? new Date(String(beklenen)).getTime() === gelen.getTime()
          : String(beklenen ?? "") === String(gelen ?? "");
      if (!esit) fark++;
    }
  }

  k(fark === 0 && kayip === 0, `${model}: alan değerleri aynı`,
    fark || kayip ? `${fark} fark, ${kayip} kayıp` : `${kaynak.length} kayıt · anahtar "${anahtar}"`);
}

await icerikKarsilastir("product", ["sku", "slug", "priceCents", "stock", "sortRank"]);
await icerikKarsilastir("order", ["number", "totalCents", "vatCents", "status", "payMethod"]);
await icerikKarsilastir("customer", ["email", "name"]);
await icerikKarsilastir("orderItem", ["qty", "unitCents", "nameSnapshot"]);
await icerikKarsilastir("setting", ["value"]);
await icerikKarsilastir("coupon", ["code", "percent"]);
await icerikKarsilastir("expense", ["description", "amountCents"]);
await icerikKarsilastir("adminUser", ["email", "name"]);
await icerikKarsilastir("supplier", ["name"]);
await icerikKarsilastir("language", ["name", "currency", "rate"]);
await icerikKarsilastir("category", ["slug", "sort"]);

console.log("\n=== C. İLİŞKİLER KOPMAMIŞ MI ===");

const ilkSiparis = await db.order.findFirst({
  where: { customerId: { not: null } },
  include: { customer: true, items: true },
});
k(!!ilkSiparis?.customer, "sipariş -> müşteri", ilkSiparis?.customer?.email ?? "-");
k((ilkSiparis?.items.length ?? 0) > 0, "sipariş -> kalem", `${ilkSiparis?.items.length ?? 0} kalem`);

const urun = await db.product.findFirst({
  where: { images: { some: {} }, specs: { some: {} } },
  include: { images: true, texts: true, specs: true, brand: true, category: true },
});
k((urun?.images.length ?? 0) > 0, "ürün -> görsel", `${urun?.images.length ?? 0} görsel`);
k((urun?.texts.length ?? 0) > 0, "ürün -> çeviri", `${urun?.texts.length ?? 0} metin`);
k((urun?.specs.length ?? 0) > 0, "ürün -> teknik özellik", `${urun?.specs.length ?? 0} özellik`);
k(!!urun?.brand, "ürün -> marka", urun?.brand?.name ?? "-");
k(!!urun?.category, "ürün -> kategori", urun?.category?.slug ?? "-");

const altKategori = await db.category.findFirst({
  where: { parentId: { not: null } },
  include: { parent: true },
});
k(!!altKategori?.parent, "kategori -> üst kategori",
  `${altKategori?.slug} -> ${altKategori?.parent?.slug}`);

const sohbet = await db.chatSession.findFirst({
  where: { messages: { some: {} } },
  include: { messages: true },
});
k((sohbet?.messages.length ?? 0) > 0, "sohbet -> mesaj", `${sohbet?.messages.length ?? 0} mesaj`);

const yonetici = await db.adminUser.findFirst({ include: { role: true } });
k(!!yonetici?.role, "yönetici -> rol", yonetici?.role?.name ?? "-");

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
