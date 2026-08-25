/**
 * DÖNEMSEL MUHASEBE RAPORLARI
 *
 * Ciro yalnızca tahsilatı tamamlanmış siparişlerden sayılır (CIRO_DURUMLARI);
 * faturalanacak siparişler ayrı "açık fatura" olarak raporlanır. Bu, gelirin
 * tahsil edildiğinde kaydedilmesi ilkesine uyar.
 *
 * Tüm gruplama Europe/Stockholm saatine göre yapılır — şirket İsveç'te.
 */

export type DonemTuru = "gun" | "hafta" | "ay" | "yil";

export const DONEMLER: Array<{ kod: DonemTuru; ad: string; adet: number }> = [
  { kod: "gun", ad: "Günlük", adet: 30 },
  { kod: "hafta", ad: "Haftalık", adet: 16 },
  { kod: "ay", ad: "Aylık", adet: 18 },
  { kod: "yil", ad: "Yıllık", adet: 6 },
];

const TZ = "Europe/Stockholm";

/** Tarihi Stockholm saatine göre parçalar. */
function parcala(d: Date) {
  const b = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const al = (t: string) => Number(b.find((p) => p.type === t)?.value ?? 0);
  return { yil: al("year"), ay: al("month"), gun: al("day") };
}

/** ISO hafta numarası (İsveç'te kullanılan standart). */
function isoHafta(yil: number, ay: number, gun: number): { yil: number; hafta: number } {
  const t = new Date(Date.UTC(yil, ay - 1, gun));
  const gunNo = t.getUTCDay() || 7; // Pazartesi 1 … Pazar 7
  t.setUTCDate(t.getUTCDate() + 4 - gunNo); // o haftanın perşembesi
  const yilBasi = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const hafta = Math.ceil(((t.getTime() - yilBasi.getTime()) / 86400000 + 1) / 7);
  return { yil: t.getUTCFullYear(), hafta };
}

/** Bir tarihi dönem anahtarına çevirir: "2026-08-25" | "2026-W35" | "2026-08" | "2026" */
export function donemAnahtari(d: Date, tur: DonemTuru): string {
  const { yil, ay, gun } = parcala(d);
  if (tur === "gun") return `${yil}-${String(ay).padStart(2, "0")}-${String(gun).padStart(2, "0")}`;
  if (tur === "ay") return `${yil}-${String(ay).padStart(2, "0")}`;
  if (tur === "yil") return String(yil);
  const h = isoHafta(yil, ay, gun);
  return `${h.yil}-W${String(h.hafta).padStart(2, "0")}`;
}

/** Dönem anahtarını okunur başlığa çevirir. */
export function donemBasligi(anahtar: string, tur: DonemTuru): string {
  if (tur === "gun") {
    const [y, a, g] = anahtar.split("-").map(Number);
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ })
      .format(new Date(Date.UTC(y, a - 1, g)));
  }
  if (tur === "ay") {
    const [y, a] = anahtar.split("-").map(Number);
    return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: TZ })
      .format(new Date(Date.UTC(y, a - 1, 1)));
  }
  if (tur === "yil") return anahtar;
  const [y, h] = anahtar.split("-W");
  return `${y} · ${Number(h)}. hafta`;
}

/** Raporun kapsayacağı en eski tarih. */
export function donemBaslangici(tur: DonemTuru, adet: number): Date {
  const s = new Date();
  const g = new Date(s);
  if (tur === "gun") g.setDate(s.getDate() - adet);
  else if (tur === "hafta") g.setDate(s.getDate() - adet * 7);
  else if (tur === "ay") g.setMonth(s.getMonth() - adet);
  else g.setFullYear(s.getFullYear() - adet);
  g.setHours(0, 0, 0, 0);
  return g;
}

export type DonemSatiri = {
  anahtar: string;
  baslik: string;
  siparis: number;
  ciroCents: number;
  netCents: number;
  kdvCents: number;
  kargoCents: number;
  maliyetCents: number;
  karCents: number;
  urunAdedi: number;
  ortalamaCents: number;
};

type HamSiparis = {
  createdAt: Date;
  totalCents: number;
  subtotalCents: number;
  vatCents: number;
  shipCents: number;
  costCents: number;
  _kalem?: number;
};

/** Siparişleri döneme göre toplar; en yeni dönem başta döner. */
export function donemlereBol(siparisler: HamSiparis[], tur: DonemTuru): DonemSatiri[] {
  const kova = new Map<string, DonemSatiri>();

  for (const o of siparisler) {
    const anahtar = donemAnahtari(o.createdAt, tur);
    let s = kova.get(anahtar);
    if (!s) {
      s = {
        anahtar, baslik: donemBasligi(anahtar, tur),
        siparis: 0, ciroCents: 0, netCents: 0, kdvCents: 0,
        kargoCents: 0, maliyetCents: 0, karCents: 0,
        urunAdedi: 0, ortalamaCents: 0,
      };
      kova.set(anahtar, s);
    }
    s.siparis += 1;
    s.ciroCents += o.totalCents;
    s.netCents += o.subtotalCents;
    s.kdvCents += o.vatCents;
    s.kargoCents += o.shipCents;
    s.maliyetCents += o.costCents;
    s.urunAdedi += o._kalem ?? 0;
  }

  for (const s of kova.values()) {
    // Kâr = KDV hariç gelir − maliyet. KDV devlete aittir, kâr sayılmaz.
    s.karCents = s.netCents + s.kargoCents - s.maliyetCents;
    s.ortalamaCents = s.siparis ? Math.round(s.ciroCents / s.siparis) : 0;
  }

  return [...kova.values()].sort((a, b) => (a.anahtar < b.anahtar ? 1 : -1));
}

/** Tüm dönemlerin toplamı. */
export function genelToplam(satirlar: DonemSatiri[]): DonemSatiri {
  const t: DonemSatiri = {
    anahtar: "toplam", baslik: "Toplam",
    siparis: 0, ciroCents: 0, netCents: 0, kdvCents: 0,
    kargoCents: 0, maliyetCents: 0, karCents: 0, urunAdedi: 0, ortalamaCents: 0,
  };
  for (const s of satirlar) {
    t.siparis += s.siparis;
    t.ciroCents += s.ciroCents;
    t.netCents += s.netCents;
    t.kdvCents += s.kdvCents;
    t.kargoCents += s.kargoCents;
    t.maliyetCents += s.maliyetCents;
    t.urunAdedi += s.urunAdedi;
  }
  t.karCents = t.netCents + t.kargoCents - t.maliyetCents;
  t.ortalamaCents = t.siparis ? Math.round(t.ciroCents / t.siparis) : 0;
  return t;
}
