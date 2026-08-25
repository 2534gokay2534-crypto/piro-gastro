/**
 * MÜŞTERİ OTURUMU — "Siparişlerim" erişimi
 *
 * Mağaza tarafında parolalı üyelik YOK ve eklenmedi; mevcut kullanıcı
 * yapısına dokunulmadı. Bunun yerine kurumsal alışverişte yaygın olan
 * yöntem kullanılır:
 *
 *   • Sipariş tamamlanınca müşterinin e-postası imzalı bir çerezle
 *     tarayıcıya yazılır → "Siparişlerim" kendiliğinden çalışır.
 *   • Çerez yoksa (başka cihaz, temizlenmiş tarayıcı) müşteri
 *     SİPARİŞ NUMARASI + E-POSTA girerek erişimi geri kazanır.
 *
 * Çerez e-postayı açık taşır ama HMAC ile imzalanır; imza sunucudaki
 * gizli anahtarla üretilir, elle uydurulamaz. Böylece kimse başkasının
 * makbuzunu göremez.
 *
 * İmza anahtarı ADMIN_SIFRE'den türetilir (ayrı bir sır yönetmemek için);
 * tanımlı değilse dağıtım kimliği kullanılır. Yalnızca Web Crypto kullanılır.
 */

export const MUSTERI_CEREZ = "pg_musteri";

/** Oturum süresi — 90 gün. Makbuzlara sonradan erişilebilsin diye uzun. */
export const MUSTERI_SURE_MS = 90 * 24 * 60 * 60 * 1000;

function anahtar(): string {
  return (
    (process.env.ADMIN_SIFRE ?? "").trim() ||
    (process.env.VERCEL_DEPLOYMENT_ID ?? "").trim() ||
    "piro-gastro-yerel-gelistirme"
  );
}

function onaltilik(t: ArrayBuffer): string {
  return Array.from(new Uint8Array(t)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function imzala(mesaj: string): Promise<string> {
  const k = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    k.encode(anahtar()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return onaltilik(await crypto.subtle.sign("HMAC", key, k.encode(mesaj)));
}

function esitMi(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let f = 0;
  for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return f === 0;
}

/** E-postayı karşılaştırma için normalleştirir. */
export function epostaSade(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

/** Çerez değeri üretir: "<bitiş>.<eposta>.<imza>" */
export async function oturumUret(eposta: string, simdi: number): Promise<string> {
  const e = epostaSade(eposta);
  const bitis = String(simdi + MUSTERI_SURE_MS);
  const govde = `${bitis}.${e}`;
  return `${govde}.${await imzala(`pg-musteri:${govde}`)}`;
}

/** Çerezi doğrular; geçerliyse e-postayı, değilse null döner. */
export async function oturumOku(deger: string | undefined, simdi: number): Promise<string | null> {
  if (!deger) return null;

  const ilk = deger.indexOf(".");
  const son = deger.lastIndexOf(".");
  if (ilk < 1 || son <= ilk) return null;

  const bitisMetin = deger.slice(0, ilk);
  const eposta = deger.slice(ilk + 1, son);
  const imza = deger.slice(son + 1);

  const bitis = Number(bitisMetin);
  if (!Number.isFinite(bitis) || bitis <= simdi) return null;
  if (!eposta.includes("@")) return null;

  const beklenen = await imzala(`pg-musteri:${bitisMetin}.${eposta}`);
  return esitMi(imza, beklenen) ? eposta : null;
}

/**
 * Şu anki oturumun e-postası.
 * Date.now() bilerek burada çağrılır; sunucu bileşeninin gövdesinde
 * çağrılsaydı react-hooks/purity kuralını ihlal ederdi.
 */
export async function oturumSuan(deger: string | undefined): Promise<string | null> {
  return oturumOku(deger, Date.now());
}
