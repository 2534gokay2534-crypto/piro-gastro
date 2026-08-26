/**
 * catalog.json -> veritabanı
 *
 *   node scripts/db-aktar.mjs
 *
 * Tekrar çalıştırılabilir. ELLE DÜZELTİLMİŞ çevirilerin (origin=manual
 * veya locked=true) üzerine YAZMAZ.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db as prisma } from "./_db.mjs";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KAYNAK = path.resolve(__dirname, "../src/data/catalog.json");


const katalog = JSON.parse(fs.readFileSync(KAYNAK, "utf8"));
const es = (a, b) => a && b && String(a).trim() === String(b).trim();

/** Bu metin gerçekten çeviri mi, yoksa İngilizce kopyası mı? */
function kaynakMi(kod) { return kod === "en"; }

async function main() {
  console.time("aktarım");

  // ---- diller ----
  for (const [i, L] of (katalog.languages ?? []).entries()) {
    await prisma.language.upsert({
      where: { code: L.code },
      create: {
        code: L.code, name: L.name, locale: L.locale,
        currency: L.currency ?? "EUR", rate: L.rate ?? 1,
        enabled: L.enabled !== false, sort: i, sourceCode: "en",
      },
      update: { name: L.name, locale: L.locale, currency: L.currency ?? "EUR", rate: L.rate ?? 1, sort: i },
    });
  }
  console.log("dil:", katalog.languages.length);

  // ---- markalar ----
  for (const b of katalog.brands ?? []) {
    await prisma.brand.upsert({
      where: { id: b.id },
      create: { id: b.id, slug: b.id, name: b.name, country: b.country ?? null },
      update: { name: b.name, country: b.country ?? null },
    });
  }

  // ---- kategoriler (önce ana, sonra alt: yabancı anahtar) ----
  const sirali = [...katalog.categories].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));
  for (const c of sirali) {
    await prisma.category.upsert({
      where: { id: c.id },
      create: { id: c.id, slug: c.slug, icon: c.icon ?? null, sort: c.sort ?? 0, parentId: c.parentId ?? null },
      update: { slug: c.slug, icon: c.icon ?? null, sort: c.sort ?? 0, parentId: c.parentId ?? null },
    });
    for (const [kod, v] of Object.entries(c.i18n ?? {})) {
      if (!v?.name) continue;
      await prisma.categoryText.upsert({
        where: { categoryId_langCode: { categoryId: c.id, langCode: kod } },
        create: { categoryId: c.id, langCode: kod, name: v.name, desc: v.desc || null, origin: kaynakMi(kod) ? "source" : "manual" },
        update: { name: v.name, desc: v.desc || null },
      });
    }
  }
  console.log("kategori:", katalog.categories.length);

  // ---- ürünler ----
  let n = 0, metin = 0, ozellik = 0, korunan = 0;
  for (const p of katalog.products) {
    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id, sku: p.sku, slug: p.slug,
        categoryId: p.categoryId, subId: p.subId ?? null, brandId: p.brandId ?? null,
        priceCents: p.priceCents ?? 0, stock: p.stock ?? 0, threshold: p.threshold ?? 0,
        onRequest: !!p.onRequest, leadDays: p.leadDays ?? 5, warranty: p.warranty ?? 24,
        hidden: !!p.hidden, featured: !!p.featured, badge: p.badge ?? null,
        campaignOn: !!p.campaignOn, campaignPercent: p.campaignPercent ?? 0, sold: p.sold ?? 0,
        dimW: p.dims?.w ?? null, dimD: p.dims?.d ?? null, dimH: p.dims?.h ?? null,
        weightKg: p.weightKg ?? null,
      },
      update: {
        slug: p.slug, categoryId: p.categoryId, subId: p.subId ?? null, brandId: p.brandId ?? null,
        priceCents: p.priceCents ?? 0, stock: p.stock ?? 0, onRequest: !!p.onRequest,
        dimW: p.dims?.w ?? null, dimD: p.dims?.d ?? null, dimH: p.dims?.h ?? null,
        weightKg: p.weightKg ?? null,
      },
    });

    // metinler — elle düzeltilmişse dokunma
    const enAd = p.i18n?.en?.name ?? "";
    for (const [kod, v] of Object.entries(p.i18n ?? {})) {
      if (!v?.name && !v?.desc) continue;
      const mevcut = await prisma.productText.findUnique({
        where: { productId_langCode: { productId: p.id, langCode: kod } },
        select: { locked: true, origin: true },
      });
      if (mevcut?.locked || mevcut?.origin === "manual") { korunan++; continue; }

      // İngilizce kopyasıysa "çeviri" sayma
      const gercek = kaynakMi(kod) || !es(v.name, enAd) || !!v.desc;
      await prisma.productText.upsert({
        where: { productId_langCode: { productId: p.id, langCode: kod } },
        create: {
          productId: p.id, langCode: kod, name: v.name || enAd, desc: v.desc || null,
          origin: kaynakMi(kod) ? "source" : gercek ? "source" : "machine",
        },
        update: { name: v.name || enAd, desc: v.desc || null },
      });
      metin++;
    }

    // görseller
    await prisma.productImage.deleteMany({ where: { productId: p.id } });
    if ((p.images ?? []).length) {
      await prisma.productImage.createMany({
        data: p.images.map((im, i) => ({ productId: p.id, url: im.url, sort: i })),
      });
    }

    // teknik özellikler
    await prisma.spec.deleteMany({ where: { productId: p.id } });
    for (const [i, s] of (p.specs ?? []).entries()) {
      const diller = Object.entries(s.i18n ?? {}).filter(([, x]) => x?.label);
      if (!diller.length) continue;
      const spec = await prisma.spec.create({ data: { productId: p.id, sort: i } });
      await prisma.specText.createMany({
        data: diller.map(([kod, x]) => ({
          specId: spec.id, langCode: kod, label: x.label, value: x.value ?? "",
          origin: kaynakMi(kod) ? "source" : "source",
        })),
      });
      ozellik += diller.length;
    }

    if (++n % 250 === 0) console.log("  …", n, "/", katalog.products.length);
  }

  console.timeEnd("aktarım");
  console.log(`ürün ${n}  metin ${metin}  özellik metni ${ozellik}  korunan (elle düzeltilmiş) ${korunan}`);

  const say = {
    dil: await prisma.language.count(),
    kategori: await prisma.category.count(),
    urun: await prisma.product.count(),
    urunMetni: await prisma.productText.count(),
    ozellik: await prisma.spec.count(),
    ozellikMetni: await prisma.specText.count(),
    gorsel: await prisma.productImage.count(),
  };
  console.log("VERİTABANI:", JSON.stringify(say));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
