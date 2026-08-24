import katalog from "@/data/catalog.json";

/**
 * ÇOK DİLLİLİK — dil listesi VERİDEN gelir, kodda sabit değildir.
 * Yeni dil eklemek için catalog.json içindeki languages dizisine bir
 * kayıt eklemek yeterli; rotalar, dil seçici ve yönetici paneli
 * kendiliğinden o dili tanır.
 */

export type LangDef = {
  code: string;
  name: string;
  locale: string;
  currency: string;
  rate: number;
  enabled?: boolean;
};

export const LANG_DEFS: LangDef[] = (katalog.languages as LangDef[]).filter(
  (l) => l.enabled !== false,
);

export const LANGS: string[] = LANG_DEFS.map((l) => l.code);
export type Lang = string;
export const DEFAULT_LANG: Lang = LANGS[0] ?? "sv";

export const LANG_NAME: Record<string, string> = Object.fromEntries(
  LANG_DEFS.map((l) => [l.code, l.name]),
);
export const LOCALE: Record<string, string> = Object.fromEntries(
  LANG_DEFS.map((l) => [l.code, l.locale]),
);

export function isLang(v: string): boolean {
  return LANGS.includes(v);
}

export function langDef(code: string): LangDef | undefined {
  return LANG_DEFS.find((l) => l.code === code);
}

/* ---------------------------------------------------------------
   İÇERİK SEÇİMİ — KARIŞIK DİL YASAK
   Ürün metinleri yalnızca seçilen dilde döner. Çeviri yoksa boş
   döner; arayüz "çeviri eksik" uyarısı gösterir, İngilizce metni
   Türkçe sayfaya sızdırmaz.
   --------------------------------------------------------------- */

type I18nMap = Record<string, { name?: string; desc?: string }>;
type Row = { i18n?: I18nMap };

/** Sıkı: yalnızca istenen dil. Yoksa boş dize. */
export function strict(row: Row | undefined, field: "name" | "desc", lang: Lang): string {
  const v = row?.i18n?.[lang]?.[field];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Başlıklar için: boş başlık bozuk sayfa demektir.
 * Çeviri yoksa özgün (İngilizce) ada düşer.
 */
export function title(row: Row | undefined, lang: Lang): string {
  return strict(row, "name", lang) || strict(row, "name", "en") || "";
}

/** Bu alan gerçekten çevrilmiş mi? (İngilizce ile aynıysa çevrilmemiş sayılır) */
export function isTranslated(row: Row | undefined, field: "name" | "desc", lang: Lang): boolean {
  if (lang === "en") return !!strict(row, field, "en");
  const v = strict(row, field, lang);
  if (!v) return false;
  return v !== strict(row, field, "en");
}

/** Geriye dönük uyum — eski çağrılar title() gibi davranır. */
export function pick(row: Row, field: "name" | "desc", lang: Lang): string {
  return field === "name" ? title(row, lang) : strict(row, "desc", lang);
}

/* ---------------------------------------------------------------
   ARAYÜZ SÖZLÜĞÜ
   Yeni bir dil eklenip buraya karşılığı yazılmadıysa arayüz
   metinleri İngilizceye düşer (ürün içeriği düşmez).
   --------------------------------------------------------------- */

type Dict = Record<string, Record<string, string>>;

export const UI: Dict = {
  tagline: { sv: "Professionell köksutrustning", en: "Professional Kitchen Solutions", tr: "Profesyonel Mutfak Çözümleri" },
  products: { sv: "Produkter", en: "Products", tr: "Ürünler" },
  categories: { sv: "Kategorier", en: "Categories", tr: "Kategoriler" },
  allCategories: { sv: "Alla kategorier", en: "All categories", tr: "Tüm kategoriler" },
  search: { sv: "Sök produkt, artikelnr eller varumärke…", en: "Search product, item no. or brand…", tr: "Ürün, stok kodu veya marka ara…" },
  cart: { sv: "Varukorg", en: "Cart", tr: "Sepet" },
  account: { sv: "Mitt konto", en: "My account", tr: "Hesabım" },
  inStock: { sv: "I lager", en: "In stock", tr: "Stokta" },
  lowStock: { sv: "Få kvar", en: "Low stock", tr: "Az kaldı" },
  outOfStock: { sv: "Slut i lager", en: "Out of stock", tr: "Stokta yok" },
  onRequest: { sv: "Beställningsvara", en: "On request", tr: "Sipariş üzerine" },
  from: { sv: "från", en: "from", tr: "başlangıç" },
  viewAll: { sv: "Visa alla", en: "View all", tr: "Tümünü gör" },
  itemNo: { sv: "Artikelnr", en: "Item no.", tr: "Stok kodu" },
  brandLabel: { sv: "Varumärke", en: "Brand", tr: "Marka" },
  category: { sv: "Kategori", en: "Category", tr: "Kategori" },
  warranty: { sv: "Garanti", en: "Warranty", tr: "Garanti" },
  months: { sv: "månader", en: "months", tr: "ay" },
  leadTime: { sv: "Leveranstid", en: "Lead time", tr: "Teslim süresi" },
  days: { sv: "arbetsdagar", en: "business days", tr: "iş günü" },
  addToCart: { sv: "Lägg i varukorg", en: "Add to cart", tr: "Sepete ekle" },
  specs: { sv: "Specifikation", en: "Specification", tr: "Teknik özellikler" },
  description: { sv: "Beskrivning", en: "Description", tr: "Açıklama" },
  exVat: { sv: "exkl. moms", en: "excl. VAT", tr: "KDV hariç" },
  noProducts: { sv: "Inga produkter", en: "No products", tr: "Ürün yok" },
  home: { sv: "Hem", en: "Home", tr: "Ana sayfa" },
  legalName: { sv: "Piro Gastro Center AB", en: "Piro Gastro Center AB", tr: "Piro Gastro Center AB" },

  // --- çeviri eksikliği bildirimleri ---
  noDesc: {
    sv: "Beskrivningen finns ännu inte på svenska.",
    en: "No description available for this product.",
    tr: "Bu ürünün Türkçe açıklaması henüz eklenmedi.",
  },
  noSpecs: {
    sv: "Specifikationerna finns ännu inte på svenska.",
    en: "No specifications available.",
    tr: "Bu ürünün Türkçe teknik özellikleri henüz eklenmedi.",
  },
  partialSpecs: {
    sv: "rader är ännu inte översatta och visas därför inte.",
    en: "rows are not available in this language and are hidden.",
    tr: "satır bu dile henüz çevrilmediği için gösterilmiyor.",
  },
};

export function t(key: string, lang: Lang): string {
  const d = UI[key];
  if (!d) return key;
  return d[lang] ?? d.en ?? key;
}
