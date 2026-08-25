/**
 * Yönetim panelinin biçimlendirme yardımcıları.
 *
 * Para: veritabanında EUR cinsinden TAMSAYI (cent) tutulur.
 * Muhasebe ekranlarında dönüştürme YAPILMAZ — kur farkı yüzünden
 * rakamlar oynamasın diye her yerde temel para birimi gösterilir.
 */

const EURO = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const EURO0 = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** cent → "€ 1.234,50" */
export function para(cents: number | null | undefined, ondalik = true): string {
  const v = (cents ?? 0) / 100;
  return (ondalik ? EURO : EURO0).format(v);
}

export function sayi(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("tr-TR");
}

export function yuzde(pay: number, payda: number): string {
  if (!payda) return "—";
  return ((pay / payda) * 100).toFixed(1).replace(".", ",") + "%";
}

export function tarih(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return "—";
  return x.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function tarihSaat(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return "—";
  return x.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function nezaman(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  const dk = Math.floor((Date.now() - x.getTime()) / 60000);
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  const g = Math.floor(sa / 24);
  if (g < 30) return `${g} gün önce`;
  return tarih(x);
}

/* ---------------- sipariş durumları ---------------- */

export const SIPARIS_DURUM: Record<string, { ad: string; ton: "ok" | "warn" | "danger" | "gri" | "navy" | "gold" }> = {
  new: { ad: "Yeni", ton: "gold" },
  paid: { ad: "Ödendi", ton: "ok" },
  packing: { ad: "Hazırlanıyor", ton: "warn" },
  shipped: { ad: "Kargoda", ton: "navy" },
  delivered: { ad: "Teslim edildi", ton: "ok" },
  cancelled: { ad: "İptal", ton: "gri" },
  refunded: { ad: "İade", ton: "danger" },
};

export const ODEME: Record<string, string> = {
  card: "Kart",
  invoice: "Fatura",
  swish: "Swish",
  bank: "Havale",
  cash: "Nakit",
};

/** Ciroya sayılan durumlar — iptal ve iade hariç. */
export const CIRO_DURUMLARI = ["paid", "packing", "shipped", "delivered"];

/* ---------------- CSV ---------------- */

function hucre(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * Excel'in Türkçe yerelde doğru açması için ayraç ";" ve başta BOM.
 */
export function csvYap(basliklar: string[], satirlar: unknown[][]): string {
  const g = [basliklar, ...satirlar].map((r) => r.map(hucre).join(";")).join("\r\n");
  return "﻿" + g;
}

/** Sayısal alanları Türkçe ondalık ayracıyla yazar (Excel için). */
export function csvPara(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2).replace(".", ",");
}

/* ---------------- çok dilli ad seçimi ---------------- */

/**
 * Katalog metinleri dil başına ayrı satırda tutulur. Sorgu iki dili
 * birden çekince sıra garanti değildir; bu yüzden istenen dil AÇIKÇA
 * seçilir, yoksa İngilizceye düşülür.
 */
export function dilAdi(
  texts: Array<{ name: string; langCode?: string }> | undefined,
  lang: string,
  yedek = "—",
): string {
  if (!texts?.length) return yedek;
  return (
    texts.find((t) => t.langCode === lang)?.name ??
    texts.find((t) => t.langCode === "en")?.name ??
    texts[0]?.name ??
    yedek
  );
}
