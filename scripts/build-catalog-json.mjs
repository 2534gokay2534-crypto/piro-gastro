/**
 * prototip/assets/catalog.js + onaylı kategori adlarını tek bir JSON'a
 * dönüştürür: src/data/catalog.json
 * Bu dosya derleme anında okunur; site için veritabanı gerekmez.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ANA, ALT } from "./kategori-adlari.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

globalThis.window = globalThis.window ?? {};
require(path.resolve(__dirname, "../prototip/assets/catalog.js"));
const src = globalThis.window.PGC_CATALOG;

const TR = { ç:"c", ğ:"g", ı:"i", ö:"o", ş:"s", ü:"u", å:"a", ä:"a", é:"e", è:"e", â:"a", î:"i", û:"u" };
const slugify = (s) =>
  String(s || "").toLowerCase()
    .replace(/[çğıöşüåäéèâîû]/g, (c) => TR[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const usedCat = new Set(), usedProd = new Set();
function uniq(pool, base, fb) {
  let s = slugify(base) || slugify(fb) || "kayit";
  if (!pool.has(s)) { pool.add(s); return s; }
  let i = 2; while (pool.has(`${s}-${i}`)) i++;
  pool.add(`${s}-${i}`); return `${s}-${i}`;
}

// --- kategoriler: onaylı ad, sıra, ikon ---
const cats = [];
ANA.forEach(([id, icon, sv, en, tr, dsv, den, dtr], i) => {
  cats.push({ id, slug: uniq(usedCat, en, id), parentId: null, icon, sort: i,
    nameSv: sv, nameEn: en, nameTr: tr, descSv: dsv, descEn: den, descTr: dtr });
});
const anaIds = new Set(ANA.map((a) => a[0]));
ALT.forEach(([id, sv, en, tr], i) => {
  const parent = (src.subs.find((s) => s.id === id) || {}).parent ?? null;
  const yalin = slugify(en);
  const slug = usedCat.has(yalin) ? uniq(usedCat, `${parent}-${en}`, id) : uniq(usedCat, yalin, id);
  cats.push({ id, slug, parentId: parent, icon: null, sort: i,
    nameSv: sv, nameEn: en, nameTr: tr, descSv: null, descEn: null, descTr: null });
});

// --- ürünler ---
const products = src.products.map((p) => {
  const nameEn = (p.name && (p.name.en || p.name.sv || p.name.tr)) || p.sku;
  const descEn = (p.desc && (p.desc.en || p.desc.sv || p.desc.tr)) || null;
  return {
    id: p.id,
    sku: p.sku,
    slug: uniq(usedProd, `${nameEn}-${p.sku}`, p.sku),
    nameSv: (p.name && p.name.sv) || nameEn,
    nameEn,
    nameTr: (p.name && p.name.tr) || nameEn,
    descSv: (p.desc && p.desc.sv) || descEn,
    descEn,
    descTr: (p.desc && p.desc.tr) || descEn,
    categoryId: p.cat,
    subId: p.sub || null,
    brandId: p.brand || null,
    priceCents: Math.round((Number(p.price) || 0) * 100),
    stock: Number(p.stock) || 0,
    threshold: Number(p.threshold) || 4,
    leadDays: Number(p.lead) || 5,
    warranty: Number(p.warranty) || 24,
    hidden: !!p.hidden,
    featured: !!p.featured,
    badge: p.badge ?? null,
    campaignOn: !!(p.campaign && p.campaign.on),
    campaignPercent: (p.campaign && Number(p.campaign.percent)) || 0,
    sold: Number(p.sold) || 0,
    images: (p.images || []).filter(Boolean).map((url) => ({ url })),
    specs: (p.specs || [])
      .filter((s) => s && (s.k || s.label))
      .map((s) => ({ label: String(s.k ?? s.label), value: String(s.v ?? s.value ?? "") })),
  };
});

const brands = [];
if (src.brand) brands.push({ id: src.brand.id, name: src.brand.name, country: src.brand.country ?? null });
for (const p of src.products) {
  if (p.brand && !brands.some((b) => b.id === p.brand)) brands.push({ id: p.brand, name: p.brand, country: null });
}

const out = { categories: cats, products, brands };
const hedef = path.resolve(__dirname, "../src/data/catalog.json");
fs.mkdirSync(path.dirname(hedef), { recursive: true });
fs.writeFileSync(hedef, JSON.stringify(out));
const kb = Math.round(fs.statSync(hedef).size / 1024);
console.log(`Yazıldı: src/data/catalog.json (${kb} KB)`);
console.log(`  kategori: ${cats.length}  ürün: ${products.length}  marka: ${brands.length}`);
console.log(`  görsel: ${products.reduce((s, p) => s + p.images.length, 0)}`);
