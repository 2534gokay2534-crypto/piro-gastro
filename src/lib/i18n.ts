/**
 * Çok dillilik. Diller URL'de: /sv, /en, /tr
 * Yeni dil eklemek için LANGS'e kod eklemek ve UI sözlüğünü genişletmek yeterli.
 */
export const LANGS = ["sv", "en", "tr"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "sv";

export const LANG_NAME: Record<Lang, string> = {
  sv: "Svenska",
  en: "English",
  tr: "Türkçe",
};

export const LOCALE: Record<Lang, string> = {
  sv: "sv-SE",
  en: "en-GB",
  tr: "tr-TR",
};

export function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}

/** Kayıttaki nameSv/nameEn/nameTr üçlüsünden doğru dili seçer. */
export function pick(
  row: Record<string, unknown>,
  field: "name" | "desc",
  lang: Lang,
): string {
  const key = field + (lang[0].toUpperCase() + lang[1]); // nameSv / nameEn / nameTr
  const v = row[key];
  if (typeof v === "string" && v.trim()) return v;
  const en = row[field + "En"];
  return typeof en === "string" ? en : "";
}

type Dict = Record<string, Record<Lang, string>>;

export const UI: Dict = {
  brand: { sv: "Piro Gastro", en: "Piro Gastro", tr: "Piro Gastro" },
  tagline: {
    sv: "Professionell köksutrustning",
    en: "Professional Kitchen Solutions",
    tr: "Profesyonel Mutfak Çözümleri",
  },
  products: { sv: "Produkter", en: "Products", tr: "Ürünler" },
  categories: { sv: "Kategorier", en: "Categories", tr: "Kategoriler" },
  allCategories: { sv: "Alla kategorier", en: "All categories", tr: "Tüm kategoriler" },
  search: {
    sv: "Sök produkt, artikelnr eller varumärke…",
    en: "Search product, item no. or brand…",
    tr: "Ürün, stok kodu veya marka ara…",
  },
  cart: { sv: "Varukorg", en: "Cart", tr: "Sepet" },
  account: { sv: "Mitt konto", en: "My account", tr: "Hesabım" },
  inStock: { sv: "I lager", en: "In stock", tr: "Stokta" },
  lowStock: { sv: "Få kvar", en: "Low stock", tr: "Az kaldı" },
  outOfStock: { sv: "Slut i lager", en: "Out of stock", tr: "Stokta yok" },
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
  legalName: {
    sv: "Piro Gastro Center AB",
    en: "Piro Gastro Center AB",
    tr: "Piro Gastro Center AB",
  },
};

export function t(key: string, lang: Lang): string {
  return UI[key]?.[lang] ?? key;
}
