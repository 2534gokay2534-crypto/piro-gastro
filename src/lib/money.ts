import { LOCALE, type Lang } from "./i18n";

/**
 * Fiyatlar veritabanında EUR cinsinden TAMSAYI (cent) tutulur.
 * Kayan noktalı para hesabı yapılmaz — yuvarlama hatası olmasın.
 */
/** Para birimi tanımı dil kaydından gelir; yeni dil eklenince otomatik çalışır. */
import { LANG_DEFS } from "./i18n";
export const CURRENCY: Record<string, { code: string; rate: number }> =
  Object.fromEntries(LANG_DEFS.map((l) => [l.code, { code: l.currency, rate: l.rate }]));
const YEDEK = { code: "EUR", rate: 1 };
const kur = (lang: string) => CURRENCY[lang] ?? YEDEK;

const cache = new Map<string, Intl.NumberFormat>();

function fmt(lang: Lang, decimals: number) {
  const key = `${lang}:${decimals}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE[lang] ?? "en-GB", {
      style: "currency",
      currency: kur(lang).code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    cache.set(key, f);
  }
  return f;
}

/** cent → görüntülenecek para birimi metni */
export function money(cents: number, lang: Lang, decimals = 0): string {
  const eur = (cents ?? 0) / 100;
  return fmt(lang, decimals).format(eur * kur(lang).rate);
}

/** Kampanya varsa indirimli fiyat, yoksa liste fiyatı (cent). */
export function netCents(p: {
  priceCents: number;
  campaignOn?: boolean;
  campaignPercent?: number;
  campaignUntil?: Date | null;
}): number {
  if (!p.campaignOn || !p.campaignPercent) return p.priceCents;
  if (p.campaignUntil && new Date(p.campaignUntil) < new Date()) return p.priceCents;
  return Math.round(p.priceCents * (1 - p.campaignPercent / 100));
}

export function stockState(p: {
  stock: number;
  threshold: number;
  onRequest?: boolean;
}): "out" | "low" | "ok" | "request" {
  // Tedarikçi stok bildirmiyorsa "stokta yok" demek yanlış olur.
  if (p.onRequest) return "request";
  if (p.stock <= 0) return "out";
  if (p.stock <= p.threshold) return "low";
  return "ok";
}
