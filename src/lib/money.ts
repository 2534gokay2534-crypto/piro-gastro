import { LOCALE, type Lang } from "./i18n";

/**
 * Fiyatlar veritabanında EUR cinsinden TAMSAYI (cent) tutulur.
 * Kayan noktalı para hesabı yapılmaz — yuvarlama hatası olmasın.
 */
export const CURRENCY: Record<Lang, { code: string; rate: number }> = {
  sv: { code: "SEK", rate: 11.4 },
  en: { code: "EUR", rate: 1 },
  tr: { code: "TRY", rate: 47.5 },
};

const cache = new Map<string, Intl.NumberFormat>();

function fmt(lang: Lang, decimals: number) {
  const key = `${lang}:${decimals}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE[lang], {
      style: "currency",
      currency: CURRENCY[lang].code,
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
  return fmt(lang, decimals).format(eur * CURRENCY[lang].rate);
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

export function stockState(p: { stock: number; threshold: number }): "out" | "low" | "ok" {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.threshold) return "low";
  return "ok";
}
