/**
 * KURUMSAL FATURA BAŞVURUSU
 *
 * Fatura ile ödeme kimseye kendiliğinden açık değildir. Firma başvurur,
 * başvuru Süper Admin → Kurumsal Fatura Başvuruları ekranında bekler,
 * yalnızca onaylandıktan sonra o firma ödemede "Fatura" seçeneğini görür.
 *
 * Eşleştirme organizasyon numarası VE e-posta ile yapılır; ikisinden biri
 * tutmuyorsa seçenek açılmaz.
 */

export const BASVURU_DURUM: Record<string, { ad: string; ton: "warn" | "ok" | "danger" | "gri" }> = {
  pending: { ad: "Bekliyor", ton: "warn" },
  approved: { ad: "Onaylı", ton: "ok" },
  rejected: { ad: "Reddedildi", ton: "danger" },
};

export type BasvuruFormu = {
  company: string;
  orgNr: string;
  vatNr: string;
  contact: string;
  email: string;
  phone: string;
  billAddr: string;
  billZip: string;
  billCity: string;
  country: string;
  note: string;
};

export type BasvuruHatalari = Partial<Record<keyof BasvuruFormu, string>>;

const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SINIR: Record<keyof BasvuruFormu, number> = {
  company: 120, orgNr: 40, vatNr: 40, contact: 80, email: 120, phone: 40,
  billAddr: 200, billZip: 20, billCity: 80, country: 2, note: 1000,
};

/** Org.nr'yi karşılaştırma için sadeleştirir: "556677-8899" -> "5566778899" */
export function orgNrSade(v: string): string {
  return String(v ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

/**
 * İsveç organizasyon numarası biçimi: 10 hane (NNNNNN-NNNN).
 * Yabancı firmalar için biçim serbest bırakılır, yalnızca uzunluk aranır.
 */
export function orgNrGecerliMi(v: string, ulke: string): boolean {
  const s = orgNrSade(v);
  if (ulke === "SE") return /^\d{10}$/.test(s);
  return s.length >= 4;
}

export function basvuruOku(veri: FormData): BasvuruFormu {
  const al = (k: keyof BasvuruFormu) => String(veri.get(k) ?? "").trim().slice(0, SINIR[k]);
  return {
    company: al("company"),
    orgNr: al("orgNr"),
    vatNr: al("vatNr"),
    contact: al("contact"),
    email: al("email"),
    phone: al("phone"),
    billAddr: al("billAddr"),
    billZip: al("billZip"),
    billCity: al("billCity"),
    country: al("country").toUpperCase() || "SE",
    note: al("note"),
  };
}

export function basvuruDogrula(f: BasvuruFormu, ulkeKodlari: string[]): BasvuruHatalari {
  const h: BasvuruHatalari = {};
  if (f.company.length < 2) h.company = "zorunlu";
  if (!orgNrGecerliMi(f.orgNr, f.country)) h.orgNr = f.country === "SE" ? "orgNr" : "zorunlu";
  if (f.contact.length < 2) h.contact = "zorunlu";
  if (!EPOSTA.test(f.email)) h.email = "eposta";
  if (f.phone.length < 5) h.phone = "zorunlu";
  if (f.billAddr.length < 4) h.billAddr = "zorunlu";
  if (f.billZip.length < 3) h.billZip = "zorunlu";
  if (f.billCity.length < 2) h.billCity = "zorunlu";
  if (!ulkeKodlari.includes(f.country)) h.country = "secim";
  return h;
}
