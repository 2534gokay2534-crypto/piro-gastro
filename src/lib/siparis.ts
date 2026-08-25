import { shippingCents, vatRate } from "./cart";

/**
 * SİPARİŞ HESABI VE DOĞRULAMA
 *
 * Sepet çerezde tutulduğu için istemciden gelen hiçbir fiyata güvenilmez;
 * tutarlar burada, katalogdan okunan fiyatlarla yeniden hesaplanır.
 * Para birimi EUR cent (tamsayı) — kayan noktalı hesap yapılmaz.
 *
 * Ödeme sağlayıcısı (kart/Swish) entegre DEĞİL. Piro Gastro kurumsal
 * satış yaptığı için akış "faturalı sipariş" olarak tamamlanır; sipariş
 * Süper Admin → Siparişler ekranına düşer. Mevcut Order/OrderItem şeması
 * aynen kullanılır, şemaya dokunulmaz.
 */

/** Teslimat ülkeleri — KDV oranı vatRate() ile buradan belirlenir. */
export const ULKELER = [
  { kod: "SE", ad: { sv: "Sverige", en: "Sweden", tr: "İsveç", de: "Schweden" } },
  { kod: "DK", ad: { sv: "Danmark", en: "Denmark", tr: "Danimarka", de: "Dänemark" } },
  { kod: "NO", ad: { sv: "Norge", en: "Norway", tr: "Norveç", de: "Norwegen" } },
  { kod: "FI", ad: { sv: "Finland", en: "Finland", tr: "Finlandiya", de: "Finnland" } },
  { kod: "DE", ad: { sv: "Tyskland", en: "Germany", tr: "Almanya", de: "Deutschland" } },
  { kod: "NL", ad: { sv: "Nederländerna", en: "Netherlands", tr: "Hollanda", de: "Niederlande" } },
  { kod: "TR", ad: { sv: "Turkiet", en: "Türkiye", tr: "Türkiye", de: "Türkei" } },
] as const;

export const ULKE_KODLARI: string[] = ULKELER.map((u) => u.kod);

/**
 * Formdan gelebilecek ödeme yöntemleri.
 *
 *   card    → Stripe Checkout. Swish, Klarna, Visa, Mastercard, AMEX,
 *             Apple Pay ve Google Pay bunun altında toplanır; hangisinin
 *             kullanıldığını Stripe seçtirir ve webhook bize bildirir.
 *   invoice → Kurumsal fatura. YALNIZCA onaylı başvurusu olan firmaya
 *             açılır; sunucuda ayrıca doğrulanır.
 *
 * Formda "swish" veya "klarna" seçtirilmez — o seçim Stripe ekranında
 * yapılır, burada kabul edilseydi yanlış kayıt oluşurdu.
 */
export const ODEME_YONTEMLERI = [
  {
    kod: "card",
    ad: { sv: "Kort, Swish eller Klarna", en: "Card, Swish or Klarna", tr: "Kart, Swish veya Klarna", de: "Karte, Swish oder Klarna" },
    aciklama: {
      sv: "Betalas säkert hos Stripe.",
      en: "Paid securely via Stripe.",
      tr: "Stripe üzerinden güvenle ödenir.",
      de: "Sichere Zahlung über Stripe.",
    },
  },
  {
    kod: "invoice",
    ad: { sv: "Faktura", en: "Invoice", tr: "Fatura", de: "Rechnung" },
    aciklama: {
      sv: "30 dagar netto — kräver godkänd ansökan.",
      en: "30 days net — requires an approved application.",
      tr: "30 gün vadeli — onaylı başvuru gerektirir.",
      de: "30 Tage netto — genehmigter Antrag erforderlich.",
    },
  },
] as const;

export const ODEME_KODLARI: string[] = ODEME_YONTEMLERI.map((o) => o.kod);

export type SepetSatiri = {
  product: { id: string; sku: string; slug: string; priceCents: number };
  qty: number;
  unitCents: number;
  lineCents: number;
};

export type Tutarlar = {
  netCents: number;
  shipCents: number;
  vatCents: number;
  totalCents: number;
  kdvYuzde: number;
  /** Fiyatı sorulacak (0 €) satır var mı? */
  fiyatSorulacak: boolean;
};

/** Sepet toplamlarını ülkeye göre hesaplar. Tek doğruluk kaynağı budur. */
export function tutarlariHesapla(satirlar: SepetSatiri[], ulke: string): Tutarlar {
  const netCents = satirlar.reduce((s, l) => s + l.lineCents, 0);
  const shipCents = shippingCents(netCents);
  const oran = vatRate(ulke);
  const vatCents = Math.round((netCents + shipCents) * oran);

  return {
    netCents,
    shipCents,
    vatCents,
    totalCents: netCents + shipCents + vatCents,
    kdvYuzde: Math.round(oran * 100),
    fiyatSorulacak: satirlar.some((l) => l.unitCents <= 0),
  };
}

/** "PG-2026-0001" — yıl içindeki sıra numarasından üretir. */
export function siparisNo(yil: number, sira: number): string {
  return `PG-${yil}-${String(sira).padStart(4, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Form doğrulama                                                      */
/* ------------------------------------------------------------------ */

export type SiparisFormu = {
  firma: string;
  vergiNo: string;
  ad: string;
  eposta: string;
  telefon: string;
  adres: string;
  postaKodu: string;
  sehir: string;
  ulke: string;
  odeme: string;
  not: string;
};

/** Alan adı → hata anahtarı. Boşsa form geçerlidir. */
export type Hatalar = Partial<Record<keyof SiparisFormu, string>>;

const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SINIR: Record<keyof SiparisFormu, number> = {
  firma: 120, vergiNo: 40, ad: 80, eposta: 120, telefon: 40,
  adres: 200, postaKodu: 20, sehir: 80, ulke: 2, odeme: 20, not: 1000,
};

/** FormData'yı kırpılmış, sınırlanmış bir nesneye çevirir. */
export function formuOku(veri: FormData): SiparisFormu {
  const al = (k: keyof SiparisFormu) =>
    String(veri.get(k) ?? "").trim().slice(0, SINIR[k]);

  return {
    firma: al("firma"),
    vergiNo: al("vergiNo"),
    ad: al("ad"),
    eposta: al("eposta"),
    telefon: al("telefon"),
    adres: al("adres"),
    postaKodu: al("postaKodu"),
    sehir: al("sehir"),
    ulke: al("ulke").toUpperCase(),
    odeme: al("odeme"),
    not: al("not"),
  };
}

export function formuDogrula(f: SiparisFormu): Hatalar {
  const h: Hatalar = {};
  if (f.firma.length < 2) h.firma = "zorunlu";
  if (f.ad.length < 2) h.ad = "zorunlu";
  if (!EPOSTA.test(f.eposta)) h.eposta = "eposta";
  if (f.telefon.length < 5) h.telefon = "zorunlu";
  if (f.adres.length < 4) h.adres = "zorunlu";
  if (f.postaKodu.length < 3) h.postaKodu = "zorunlu";
  if (f.sehir.length < 2) h.sehir = "zorunlu";
  if (!ULKE_KODLARI.includes(f.ulke)) h.ulke = "secim";
  if (!ODEME_KODLARI.includes(f.odeme)) h.odeme = "secim";
  return h;
}

/**
 * Onay sayfası çerezi.
 * Sipariş verildikten sonra sepet boşaltıldığı için özet burada saklanır;
 * yalnızca ürün kimliği + adet tutulur, fiyatlar onay sayfasında katalogdan
 * yeniden okunur. 1 saat sonra kendiliğinden düşer.
 */
export const SON_SIPARIS_COOKIE = "pg_son_siparis";

export type SonSiparis = {
  no: string;
  ulke: string;
  odeme: string;
  firma: string;
  eposta: string;
  satir: string;
};

export function sonSiparisOku(ham: string | undefined): SonSiparis | null {
  if (!ham) return null;
  try {
    const o = JSON.parse(ham) as Partial<SonSiparis>;
    if (!o || typeof o.no !== "string" || typeof o.satir !== "string") return null;
    return {
      no: o.no,
      ulke: String(o.ulke ?? "SE"),
      odeme: String(o.odeme ?? "invoice"),
      firma: String(o.firma ?? ""),
      eposta: String(o.eposta ?? ""),
      satir: o.satir,
    };
  } catch {
    return null; // bozuk çerez — onay sayfası yine de açılır
  }
}
