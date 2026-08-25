/**
 * SÜPER ADMIN GİRİŞ KAPISI
 *
 * Şifre `ADMIN_SIFRE` ortam değişkeninde tutulur; hiçbir yere yazılmaz.
 * Giriş yapılınca imzalı bir çerez bırakılır:
 *
 *     pg_admin = <bitişZamanı>.<HMAC-SHA256(bitişZamanı, ADMIN_SIFRE)>
 *
 * Çerez şifreyi taşımaz, sadece imzayı taşır; imza ancak şifreyi bilen
 * sunucu tarafından üretilebilir. Veritabanı gerekmez — Vercel'de
 * DATABASE_URL olmadan da çalışır.
 *
 * Bu dosya YALNIZCA Web Crypto kullanır; hem Edge middleware'de hem de
 * Node tarafındaki server action'da aynen çalışsın diye node: modülleri
 * ve catalog.json gibi ağır içe aktarmalar bilinçli olarak yoktur.
 */

export const CEREZ = "pg_admin";

/** Oturum süresi — 12 saat. */
export const SURE_MS = 12 * 60 * 60 * 1000;

/** Giriş sayfasının yolu (dil öneki hariç). */
export const GIRIS_YOLU = "admin-giris";

/** Ortamda şifre tanımlı mı? */
export function sifreVar(): boolean {
  return !!(process.env.ADMIN_SIFRE ?? "").trim();
}

function onaltilik(tampon: ArrayBuffer): string {
  return Array.from(new Uint8Array(tampon))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function imzala(mesaj: string, anahtar: string): Promise<string> {
  const kodlayici = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    kodlayici.encode(anahtar),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return onaltilik(await crypto.subtle.sign("HMAC", k, kodlayici.encode(mesaj)));
}

/** Zamanlama saldırısına kapalı karşılaştırma. */
function esitMi(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/** Girilen şifre doğru mu? */
export async function sifreDogruMu(girilen: string): Promise<boolean> {
  const gercek = (process.env.ADMIN_SIFRE ?? "").trim();
  if (!gercek) return false;
  // Uzunluk farkını da gizlemek için iki tarafı da özetleyip karşılaştırırız.
  const [a, b] = await Promise.all([
    imzala("giris", girilen),
    imzala("giris", gercek),
  ]);
  return esitMi(a, b);
}

/** Yeni oturum çerezi değeri üretir. */
export async function cerezUret(simdi: number): Promise<string> {
  const sifre = (process.env.ADMIN_SIFRE ?? "").trim();
  const bitis = String(simdi + SURE_MS);
  return `${bitis}.${await imzala(`pg-admin:${bitis}`, sifre)}`;
}

/** Çerez geçerli mi? (imza doğru ve süresi dolmamış) */
export async function cerezGecerliMi(deger: string | undefined, simdi: number): Promise<boolean> {
  const sifre = (process.env.ADMIN_SIFRE ?? "").trim();
  if (!sifre || !deger) return false;

  const nokta = deger.indexOf(".");
  if (nokta < 1) return false;

  const bitisMetin = deger.slice(0, nokta);
  const imza = deger.slice(nokta + 1);

  const bitis = Number(bitisMetin);
  if (!Number.isFinite(bitis) || bitis <= simdi) return false;

  return esitMi(imza, await imzala(`pg-admin:${bitisMetin}`, sifre));
}

/** Yol yönetici paneline mi ait? (/tr/admin, /tr/admin/urunler, /api/admin/...) */
export function yoneticiYolu(yol: string): boolean {
  if (yol.startsWith("/api/admin")) return true;
  return /^\/[^/]+\/admin(\/|$)/.test(yol);
}


/**
 * Çerez şu an geçerli mi?
 * Date.now() bilerek bu modülde çağrılır; sunucu bileşeninin gövdesinde
 * çağrılsaydı react-hooks/purity kuralını ihlal ederdi.
 */
export async function cerezSuanGecerliMi(deger: string | undefined): Promise<boolean> {
  return cerezGecerliMi(deger, Date.now());
}
