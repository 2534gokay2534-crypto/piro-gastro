/**
 * VERİTABANI -> src/data/catalog.json
 *
 *   node scripts/db-yayinla.mjs
 *
 * Yönetici panelindeki düzenlemeler ve otomatik çeviriler veritabanında
 * durur. Bu betik onları siteye yayınlar. Vercel'e push edilince canlıya
 * çıkar.
 *
 * Not: Mağaza sayfaları JSON'dan okur — bu, sitenin veritabanı olmadan da
 * ayakta kalmasını sağlar. DATABASE_URL Vercel'e eklendiğinde sayfalar
 * doğrudan veritabanından okuyacak biçimde açılabilir.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./_db.mjs";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEDEF = path.resolve(__dirname, "../src/data/catalog.json");


async function main() {
  console.time("yayın");

  const diller = await db.language.findMany({ orderBy: { sort: "asc" } });
  const markalar = await db.brand.findMany();
  const kategoriler = await db.category.findMany({ include: { texts: true }, orderBy: { sort: "asc" } });

  const katalog = {
    languages: diller.map((d) => ({
      code: d.code, name: d.name, locale: d.locale,
      currency: d.currency, rate: d.rate, enabled: d.enabled,
    })),
    brands: markalar.map((b) => ({ id: b.id, name: b.name, country: b.country })),
    categories: kategoriler.map((c) => ({
      id: c.id, slug: c.slug, parentId: c.parentId, icon: c.icon, sort: c.sort,
      i18n: Object.fromEntries(c.texts.map((t) => [t.langCode, { name: t.name, desc: t.desc ?? "" }])),
    })),
    products: [],
  };

  // ürünler — bellek taşmasın diye parça parça
  const toplam = await db.product.count();
  const ADIM = 400;
  for (let atla = 0; atla < toplam; atla += ADIM) {
    const parca = await db.product.findMany({
      skip: atla, take: ADIM,
      include: {
        texts: true,
        images: { orderBy: { sort: "asc" } },
        specs: { orderBy: { sort: "asc" }, include: { texts: true } },
      },
    });
    for (const p of parca) {
      katalog.products.push({
        id: p.id, sku: p.sku, slug: p.slug,
        categoryId: p.categoryId, subId: p.subId, brandId: p.brandId,
        priceCents: p.priceCents, stock: p.stock, threshold: p.threshold,
        onRequest: p.onRequest, leadDays: p.leadDays, warranty: p.warranty,
        hidden: p.hidden, featured: p.featured, badge: p.badge,
        campaignOn: p.campaignOn, campaignPercent: p.campaignPercent, sold: p.sold,
        dims: p.dimW && p.dimD && p.dimH ? { w: p.dimW, d: p.dimD, h: p.dimH, unit: "mm" } : null,
        weightKg: p.weightKg,
        images: p.images.map((im) => ({ url: im.url })),
        i18n: Object.fromEntries(p.texts.map((t) => [t.langCode, { name: t.name, desc: t.desc ?? "" }])),
        specs: p.specs.map((s) => ({
          i18n: Object.fromEntries(s.texts.map((t) => [t.langCode, { label: t.label, value: t.value }])),
        })),
      });
    }
    process.stdout.write(`\r  ${Math.min(atla + ADIM, toplam)} / ${toplam}`);
  }

  fs.writeFileSync(HEDEF, JSON.stringify(katalog));
  console.log("");
  console.timeEnd("yayın");
  const mb = (fs.statSync(HEDEF).size / 1024 / 1024).toFixed(2);
  console.log(`catalog.json yazıldı — ${katalog.products.length} ürün, ${diller.length} dil, ${mb} MB`);

  // dürüst kapsam
  console.log("\nDİL KAPSAMI:");
  for (const d of diller) {
    const ad = await db.productText.count({ where: { langCode: d.code, name: { not: "" } } });
    const ac = await db.productText.count({ where: { langCode: d.code, desc: { not: null } } });
    const oz = await db.specText.count({ where: { langCode: d.code } });
    const elle = await db.productText.count({ where: { langCode: d.code, origin: "manual" } });
    console.log(`  ${d.code}: ad ${ad}  açıklama ${ac}  özellik ${oz}  (elle düzeltilmiş ${elle})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
