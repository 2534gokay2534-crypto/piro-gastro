import data from "@/data/catalog.json";

/**
 * Katalog verisi — derleme paketinin içinde gelir, çalışma anında
 * veritabanı gerekmez. Böylece site herhangi bir sunucuda (Vercel dahil)
 * ek kurulum olmadan açılır.
 *
 * Sipariş, fatura ve yönetici paneli geldiğinde yazma tarafı için
 * PostgreSQL eklenecek; katalog okuması burada kalabilir.
 */

export type Category = {
  id: string;
  slug: string;
  parentId: string | null;
  icon: string | null;
  sort: number;
  i18n: Record<string, { name?: string; desc?: string }>;
};

export type ProductImage = { url: string };
export type ProductSpec = { i18n: Record<string, { label: string; value: string }> };

export type Product = {
  id: string;
  sku: string;
  slug: string;
  i18n: Record<string, { name?: string; desc?: string }>;
  categoryId: string;
  subId: string | null;
  brandId: string | null;
  priceCents: number;
  stock: number;
  threshold: number;
  /** Tedarikçide stok bilgisi yok — 'sipariş üzerine' */
  onRequest?: boolean;
  leadDays: number;
  warranty: number;
  hidden: boolean;
  featured: boolean;
  /** Listeleme sırası: büyük/ana ürün 1000'e, tamamlayıcı küçük 0'a yakın. */
  sortRank?: number;
  badge: string | null;
  campaignOn: boolean;
  campaignPercent: number;
  campaignUntil?: Date | null;
  sold: number;
  images: ProductImage[];
  specs: ProductSpec[];
  /** Gerçek ölçüler (mm) — kaynak: tedarikçi verisi */
  dims?: { w: number; d: number; h: number; unit?: string } | null;
  weightKg?: number | null;
};

export type Brand = { id: string; name: string; country: string | null };

const CATS = data.categories as Category[];
const PRODUCTS = data.products as Product[];
const BRANDS = data.brands as Brand[];

/* --- indeksler: tek sefer kurulur, her istekte yeniden hesaplanmaz --- */
const catById = new Map(CATS.map((c) => [c.id, c]));
const catBySlug = new Map(CATS.map((c) => [c.slug, c]));
const prodBySlug = new Map(PRODUCTS.map((p) => [p.slug, p]));
const prodById = new Map(PRODUCTS.map((p) => [p.id, p]));
const brandById = new Map(BRANDS.map((b) => [b.id, b]));

const childrenOf = new Map<string, Category[]>();
for (const c of CATS) {
  if (!c.parentId) continue;
  const arr = childrenOf.get(c.parentId) ?? [];
  arr.push(c);
  childrenOf.set(c.parentId, arr);
}
for (const arr of childrenOf.values()) arr.sort((a, b) => a.sort - b.sort);

let visible = PRODUCTS.filter((p) => !p.hidden);

/**
 * Yönetici panelinden ürün değiştiğinde çağrılır.
 *
 * Katalog nesneleri ile mağazanın okuduğu nesneler AYNI referanslardır;
 * bir ürünün alanını değiştirmek mağazaya anında yansır. Yalnızca
 * "gizli" listesi önceden hesaplandığı için burada yenilenir.
 */
export function katalogYenile(): void {
  visible = PRODUCTS.filter((p) => !p.hidden);
}

/** Katalogdaki ham ürün dizisi — yönetici tarafı için (yazma dahil). */
export function hamUrunler(): Product[] {
  return PRODUCTS;
}

/** Ürünü kimliğe göre indekse ekler (yeni ürün eklendiğinde). */
export function katalogaEkle(p: Product): void {
  PRODUCTS.push(p);
  prodById.set(p.id, p);
  prodBySlug.set(p.slug, p);
  katalogYenile();
}

/** Ürünü katalogdan çıkarır (silindiğinde). */
export function katalogdanCikar(id: string): void {
  const n = PRODUCTS.findIndex((p) => p.id === id);
  if (n < 0) return;
  const [p] = PRODUCTS.splice(n, 1);
  prodById.delete(p.id);
  prodBySlug.delete(p.slug);
  katalogYenile();
}

/* --- sorgular --- */

export function mainCategories(): Category[] {
  return CATS.filter((c) => !c.parentId).sort((a, b) => a.sort - b.sort);
}

export function categoryBySlug(slug: string): Category | undefined {
  return catBySlug.get(slug);
}

export function categoryById(id: string): Category | undefined {
  return catById.get(id);
}

export function childCategories(id: string): Category[] {
  return childrenOf.get(id) ?? [];
}

export function productBySlug(slug: string): Product | undefined {
  return prodBySlug.get(slug);
}

export function productById(id: string): Product | undefined {
  return prodById.get(id);
}

export function brand(id: string | null): Brand | undefined {
  return id ? brandById.get(id) : undefined;
}

/** Bir kategorinin (ve alt kategorilerinin) ürünleri. */
export function productsInCategory(catId: string): Product[] {
  const ids = new Set([catId, ...childCategories(catId).map((k) => k.id)]);
  return visible.filter((p) => ids.has(p.categoryId) || (p.subId && ids.has(p.subId)));
}

export function countInCategory(catId: string): number {
  return productsInCategory(catId).length;
}

/** Ad ve stok koduna göre arama. */
export function searchProducts(q: string): Product[] {
  const s = q.trim().toLowerCase();
  if (!s) return visible;
  return visible.filter(
    (p) =>
      p.sku.toLowerCase().includes(s) ||
      Object.values(p.i18n ?? {}).some((x) => (x.name ?? "").toLowerCase().includes(s)),
  );
}

/** Öne çıkanlar önce, sonra çok satan. */
/**
 * Listeleme sırası: önce öne çıkarılanlar, sonra BÜYÜK/ANA ürünler,
 * en sonda tamamlayıcı küçük ürünler.
 *
 * `sortRank` scripts/urun-sirala.mjs tarafından hacim, ağırlık ve fiyattan
 * hesaplanır. Yönetici paneli de aynı alanı okur; sıra iki yerde birebir aynıdır.
 */
export function sortForListing(list: Product[]): Product[] {
  return [...list].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      (b.sortRank ?? 500) - (a.sortRank ?? 500) ||
      b.priceCents - a.priceCents ||
      b.sold - a.sold ||
      // Son eşitlik bozucu: stok kodu. Kod noktası sırası kullanılır ki
      // veritabanının BINARY sıralamasıyla birebir aynı sonucu versin —
      // aksi halde eşit puanlı ürünler iki tarafta farklı sırada çıkardı.
      (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0),
  );
}

export function allVisibleProducts(): Product[] {
  return visible;
}

/** Bir kategoriyi temsil eden görsel: en pahalı, görseli olan ürün. */
export function categoryCover(catId: string): string | undefined {
  const list = productsInCategory(catId).filter((p) => p.images[0]);
  if (!list.length) return undefined;
  return list.reduce((best, p) => (p.priceCents > best.priceCents ? p : best)).images[0].url;
}
