/**
 * prototip/assets/catalog.js içindeki katalogu veritabanına aktarır.
 * Tekrar çalıştırılabilir: aynı SKU varsa günceller, yoksa ekler.
 *
 *   node scripts/import-catalog.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const CATALOG = path.resolve(__dirname, "../../prototip/assets/catalog.js");

// catalog.js tarayıcı için yazılmış: window'a atıyor
globalThis.window = globalThis.window ?? {};
require(CATALOG);
const cat = globalThis.window.PGC_CATALOG;
if (!cat) throw new Error("catalog.js okunamadı: " + CATALOG);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL tanımlı değil (.env)");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Türkçe/İsveççe harfleri de doğru çeviren slug üretici */
const TR = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", å: "a", ä: "a", é: "e", è: "e", â: "a", î: "i", û: "u" };
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[çğıöşüåäéèâîû]/g, (c) => TR[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** benzersiz slug — tablo başına ayrı havuz, çakışırsa sonuna sayı ekler */
const usedCat = new Set();
const usedProd = new Set();
function uniqueSlug(pool, base, fallback) {
  let s = slugify(base) || slugify(fallback) || "kayit";
  if (!pool.has(s)) { pool.add(s); return s; }
  let i = 2;
  while (pool.has(`${s}-${i}`)) i++;
  pool.add(`${s}-${i}`);
  return `${s}-${i}`;
}

const euroToCents = (v) => Math.round((Number(v) || 0) * 100);
const L3 = (arr, i) => (Array.isArray(arr) ? arr[i] ?? arr[1] ?? arr[0] ?? "" : "");

async function main() {
  console.log("Katalog:", cat.products.length, "ürün,", cat.cats.length, "ana kategori,", cat.subs.length, "alt kategori");

  // ---- MARKA ----
  const brands = new Map();
  if (cat.brand) brands.set(cat.brand.id, cat.brand);
  for (const p of cat.products) {
    if (p.brand && !brands.has(p.brand)) brands.set(p.brand, { id: p.brand, name: p.brand });
  }
  for (const b of brands.values()) {
    await prisma.brand.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
        slug: slugify(b.name || b.id),
        name: b.name || b.id,
        country: b.country ?? null,
        about: Array.isArray(b.desc) ? b.desc[1] : null,
      },
      update: { name: b.name || b.id },
    });
  }
  console.log("Marka:", brands.size);

  // ---- ANA KATEGORİLER (sıra korunur) ----
  // mevcut slug'ları rezerve et ki tekrar çalıştırınca çakışmasın
  for (const c of await prisma.category.findMany({ select: { slug: true } })) usedCat.add(c.slug);

  let sort = 0;
  for (const c of cat.cats) {
    const mevcutC = await prisma.category.findUnique({ where: { id: c.id } });
    const cSlug = mevcutC ? mevcutC.slug : uniqueSlug(usedCat, L3(c.name, 1) || c.id, c.id);
    await prisma.category.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        slug: cSlug,
        nameSv: L3(c.name, 0), nameEn: L3(c.name, 1), nameTr: L3(c.name, 2),
        descSv: L3(c.desc, 0) || null, descEn: L3(c.desc, 1) || null, descTr: L3(c.desc, 2) || null,
        icon: c.icon ?? null,
        sort: sort++,
      },
      update: {
        nameSv: L3(c.name, 0), nameEn: L3(c.name, 1), nameTr: L3(c.name, 2),
        icon: c.icon ?? null,
      },
    });
  }

  // ---- ALT KATEGORİLER ----
  let ssort = 0;
  for (const s of cat.subs) {
    const mevcutS = await prisma.category.findUnique({ where: { id: s.id } });
    let sSlug;
    if (mevcutS) sSlug = mevcutS.slug;
    else {
      const yalin = slugify(L3(s.name, 1) || s.id);
      // ana kategoriyle çakışıyorsa üst kategori adını öne al (örn. grills → grills-grills)
      sSlug = usedCat.has(yalin)
        ? uniqueSlug(usedCat, `${s.parent}-${L3(s.name, 1) || s.id}`, s.id)
        : uniqueSlug(usedCat, yalin, s.id);
    }
    await prisma.category.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        slug: sSlug,
        nameSv: L3(s.name, 0), nameEn: L3(s.name, 1), nameTr: L3(s.name, 2),
        parentId: s.parent,
        sort: ssort++,
      },
      update: {
        nameSv: L3(s.name, 0), nameEn: L3(s.name, 1), nameTr: L3(s.name, 2),
        parentId: s.parent,
      },
    });
  }
  console.log("Kategori:", cat.cats.length, "+", cat.subs.length, "alt");

  // ---- ÜRÜNLER ----
  // mevcut slug'ları rezerve et ki tekrar çalıştırınca çakışmasın
  for (const p of await prisma.product.findMany({ select: { slug: true } })) usedProd.add(p.slug);

  let eklendi = 0, guncellendi = 0;
  for (const p of cat.products) {
    const nameEn = (p.name && (p.name.en || p.name.sv || p.name.tr)) || p.sku;
    const descEn = (p.desc && (p.desc.en || p.desc.sv || p.desc.tr)) || null;

    const mevcut = await prisma.product.findUnique({ where: { sku: p.sku } });
    const slug = mevcut ? mevcut.slug : uniqueSlug(usedProd, `${nameEn}-${p.sku}`, p.sku);

    const veri = {
      sku: p.sku,
      slug,
      // Katalog yalnızca İngilizce geliyor; SV/TR çevirisi ayrı bir iş.
      nameSv: (p.name && p.name.sv) || nameEn,
      nameEn,
      nameTr: (p.name && p.name.tr) || nameEn,
      descSv: (p.desc && p.desc.sv) || descEn,
      descEn,
      descTr: (p.desc && p.desc.tr) || descEn,
      categoryId: p.cat,
      subId: p.sub || null,
      brandId: p.brand || null,
      priceCents: euroToCents(p.price),
      costCents: euroToCents(p.cost),
      stock: Number(p.stock) || 0,
      threshold: Number(p.threshold) || 4,
      leadDays: Number(p.lead) || 5,
      warranty: Number(p.warranty) || 24,
      hidden: !!p.hidden,
      featured: !!p.featured,
      badge: p.badge ?? null,
      campaignOn: !!(p.campaign && p.campaign.on),
      campaignPercent: (p.campaign && Number(p.campaign.percent)) || 0,
      tech: p.tech ?? null,
      sold: Number(p.sold) || 0,
      rating: Number(p.rating) || 4.5,
    };

    const kayit = await prisma.product.upsert({
      where: { sku: p.sku },
      create: veri,
      update: veri,
    });
    mevcut ? guncellendi++ : eklendi++;

    // görseller — her seferinde yeniden yaz
    await prisma.productImage.deleteMany({ where: { productId: kayit.id } });
    const gorseller = (p.images || []).filter(Boolean);
    if (gorseller.length) {
      await prisma.productImage.createMany({
        data: gorseller.map((url, i) => ({ productId: kayit.id, url, alt: nameEn, sort: i })),
      });
    }

    // teknik özellikler
    await prisma.productSpec.deleteMany({ where: { productId: kayit.id } });
    const specs = (p.specs || []).filter((s) => s && (s.k || s.label));
    if (specs.length) {
      await prisma.productSpec.createMany({
        data: specs.map((s, i) => ({
          productId: kayit.id,
          label: String(s.k ?? s.label),
          value: String(s.v ?? s.value ?? ""),
          sort: i,
        })),
      });
    }

    if ((eklendi + guncellendi) % 200 === 0) console.log("  …", eklendi + guncellendi, "/", cat.products.length);
  }

  console.log("Ürün: +" + eklendi + " yeni, " + guncellendi + " güncellendi");

  const say = {
    kategori: await prisma.category.count(),
    urun: await prisma.product.count(),
    gorsel: await prisma.productImage.count(),
    marka: await prisma.brand.count(),
  };
  console.log("VERİTABANI:", JSON.stringify(say));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
