import { db, dbVar } from "./db";
import { productById } from "./catalog";
import { epostaSade } from "./musteri-oturum";

/**
 * SİPARİŞ MAKBUZU / FATURASI
 *
 * Tek veri kaynağı: Order + OrderItem + Customer. Görseller katalogdan
 * SKU/ürün kimliği ile bağlanır (sipariş kaleminde görsel saklanmaz —
 * katalog güncellenince makbuz da doğru görseli gösterir).
 *
 * Belge numarası sipariş numarasıyla aynıdır; ayrı bir sayaç tutulmaz,
 * böylece muhasebe ile makbuz her zaman birebir eşleşir.
 */

/** Ödeme durumu → makbuzda gösterilecek etiket. */
export const ODEME_DURUM: Record<string, { ad: Record<string, string>; ton: "ok" | "warn" | "danger" | "gri" }> = {
  paid:      { ad: { sv: "Betald", en: "Paid", tr: "Ödendi", de: "Bezahlt" }, ton: "ok" },
  pending:   { ad: { sv: "Väntar på betalning", en: "Awaiting payment", tr: "Ödeme bekleniyor", de: "Zahlung ausstehend" }, ton: "warn" },
  new:       { ad: { sv: "Faktureras", en: "To be invoiced", tr: "Faturalanacak", de: "Wird berechnet" }, ton: "warn" },
  packing:   { ad: { sv: "Betald", en: "Paid", tr: "Ödendi", de: "Bezahlt" }, ton: "ok" },
  shipped:   { ad: { sv: "Betald", en: "Paid", tr: "Ödendi", de: "Bezahlt" }, ton: "ok" },
  delivered: { ad: { sv: "Betald", en: "Paid", tr: "Ödendi", de: "Bezahlt" }, ton: "ok" },
  cancelled: { ad: { sv: "Avbruten", en: "Cancelled", tr: "İptal edildi", de: "Storniert" }, ton: "danger" },
  refunded:  { ad: { sv: "Återbetald", en: "Refunded", tr: "İade edildi", de: "Erstattet" }, ton: "gri" },
};

/** Ödeme yöntemi → okunur ad. */
export const ODEME_ADI: Record<string, string> = {
  card: "Kart / Card",
  swish: "Swish",
  klarna: "Klarna",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  invoice: "Fatura / Faktura",
  bank: "Havale / Banköverföring",
  cash: "Nakit / Kontant",
};

/**
 * Belge türü.
 *
 * "Makbuz" ödemenin ALINDIĞINI belgeler; bu yüzden yalnızca tahsilatı
 * tamamlanmış siparişlerde kullanılır. Ödeme beklenen, faturalanacak veya
 * iptal/iade edilmiş siparişlerde belge "fatura"dır (sipariş/ödeme belgesi).
 */
const ODENMIS = ["paid", "packing", "shipped", "delivered"];

export function belgeTuru(durum: string): "makbuz" | "fatura" {
  return ODENMIS.includes(durum) ? "makbuz" : "fatura";
}

const SIPARIS_SECIM = {
  id: true, number: true, status: true, payMethod: true, paidMethod: true,
  currency: true, subtotalCents: true, vatCents: true, shipCents: true,
  discountCents: true, totalCents: true, note: true,
  shipName: true, shipAddr: true, shipZip: true, shipCity: true,
  createdAt: true, paidAt: true, shippedAt: true,
  provider: true, paymentRef: true,
  customer: {
    select: {
      name: true, email: true, phone: true, company: true,
      orgNr: true, vatNr: true, address: true, zip: true, city: true, country: true,
    },
  },
  items: {
    select: {
      id: true, productId: true, sku: true, name: true, variant: true,
      qty: true, unitPriceCents: true, vatRate: true, lineTotalCents: true,
    },
  },
} as const;

/** Ham sorgu — tip çıkarımı buradan yapılır, elle tip yazılmaz. */
function hamSorgu(numara: string) {
  return db.order.findUnique({ where: { number: numara }, select: SIPARIS_SECIM });
}
type Ham = NonNullable<Awaited<ReturnType<typeof hamSorgu>>>;

export type Makbuz = ReturnType<typeof bicimle>;

/** Bir siparişin makbuz verisini getirir. */
export async function makbuzGetir(numara: string, lang = "tr") {
  if (!dbVar || !numara) return null;
  try {
    const s = await hamSorgu(numara);
    return s ? bicimle(s, lang) : null;
  } catch {
    return null;
  }
}

/** Bir e-postaya ait tüm siparişler — "Siparişlerim" listesi. */
export async function siparislerimGetir(eposta: string, limit = 100, lang = "tr") {
  if (!dbVar) return [];
  const e = epostaSade(eposta);
  if (!e) return [];
  try {
    const liste = await db.order.findMany({
      where: { customer: { email: e } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: SIPARIS_SECIM,
    });
    return liste.map((x) => bicimle(x, lang));
  } catch {
    return [];
  }
}

/** Sipariş numarası + e-posta doğru mu? (erişimi geri kazanma) */
export async function erisimDogrula(numara: string, eposta: string): Promise<string | null> {
  if (!dbVar) return null;
  const e = epostaSade(eposta);
  const n = String(numara ?? "").trim().toUpperCase();
  if (!e || !n) return null;
  try {
    const s = await db.order.findUnique({
      where: { number: n },
      select: { customer: { select: { email: true } } },
    });
    const kayitli = epostaSade(s?.customer?.email ?? "");
    return kayitli && kayitli === e ? kayitli : null;
  } catch {
    return null;
  }
}

/** Bu e-posta bu siparişi görebilir mi? */
export function erisebilirMi(m: Makbuz, eposta: string | null): boolean {
  if (!eposta) return false;
  return epostaSade(m.musteri.eposta) === epostaSade(eposta);
}

/** Ham kaydı makbuz biçimine çevirir; görselleri katalogdan bağlar. */
function bicimle(s: Ham, lang = "tr") {
  const kalemler = s.items.map((k) => {
    const urun = k.productId ? productById(k.productId) : undefined;
    return {
      id: k.id,
      sku: k.sku,
      ad: k.name,
      varyant: k.variant ?? "",
      adet: k.qty,
      birimCents: k.unitPriceCents,
      kdvYuzde: k.vatRate,
      satirCents: k.lineTotalCents,
      gorsel: urun?.images?.[0]?.url ?? null,
      slug: urun?.slug ?? null,
      // Teknik bilgiler ve ölçüler — Süper Admin belge görünümünde açılır.
      // Katalogdan okunur; varyant alanı sipariş anını, bu alan güncel
      // teknik dökümü gösterir.
      olculer: urun?.dims ?? null,
      agirlikKg: urun?.weightKg ?? null,
      teknik: (urun?.specs ?? [])
        .map((sp) => sp.i18n?.[lang] ?? sp.i18n?.en ?? Object.values(sp.i18n ?? {})[0])
        .filter((sp): sp is { label: string; value: string } => !!sp?.label && !!sp?.value)
        .slice(0, 12)
        .map((sp) => ({ etiket: sp.label, deger: String(sp.value).replace(/s*,s*/g, ", ") })),
    };
  });

  return {
    id: s.id,
    numara: s.number,
    durum: s.status,
    tur: belgeTuru(s.status),
    odemeYontemi: s.paidMethod || s.payMethod,
    odemeReferansi: s.paymentRef,
    saglayici: s.provider,
    paraBirimi: s.currency,

    tarih: s.createdAt,
    odemeTarihi: s.paidAt,
    kargoTarihi: s.shippedAt,

    musteri: {
      ad: s.customer?.name ?? s.shipName ?? "—",
      firma: s.customer?.company ?? s.shipName ?? "",
      eposta: s.customer?.email ?? "",
      telefon: s.customer?.phone ?? "",
      vergiNo: s.customer?.orgNr ?? "",
      kdvNo: s.customer?.vatNr ?? "",
    },

    teslimat: {
      ad: s.shipName ?? s.customer?.company ?? "",
      adres: s.shipAddr ?? s.customer?.address ?? "",
      postaKodu: s.shipZip ?? s.customer?.zip ?? "",
      sehir: s.shipCity ?? s.customer?.city ?? "",
      ulke: s.customer?.country ?? "SE",
    },

    kalemler,
    not: s.note,

    araToplamCents: s.subtotalCents,
    kargoCents: s.shipCents,
    indirimCents: s.discountCents,
    kdvCents: s.vatCents,
    toplamCents: s.totalCents,
    kdvYuzde: kalemler[0]?.kdvYuzde ?? 25,
  };
}

/** Belge dosya adı: "PiroGastro-makbuz-PG-2026-0047.pdf" */
export function dosyaAdi(m: { tur: string; numara: string }): string {
  return `PiroGastro-${m.tur}-${m.numara}.pdf`;
}
