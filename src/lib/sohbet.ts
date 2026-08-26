import { db, dbVar } from "@/lib/db";

/**
 * CANLI SOHBET — ortak yardımcılar.
 *
 * Tasarım kuralı: sohbet, mağazanın hiçbir yerine bağımlı değildir.
 * Veritabanı yoksa API'ler 200 döner ve "veritabanı yok" bilgisini
 * geçer; pencere "mesaj bırak" kipine düşer. Site hiçbir durumda
 * çökmez.
 */

/** Ayar anahtarları (Setting tablosu) */
export const AYAR_CEVRIMICI = "chat.online";
export const AYAR_KARSILAMA = "chat.greeting";

/** İletişim bilgisi — veritabanı yokken "mesaj bırak" bu adrese gider. */
export const ILETISIM = {
  eposta: process.env.NEXT_PUBLIC_ILETISIM_EPOSTA ?? "info@pirogastro.se",
};

/** Mesaj sınırları — kötüye kullanımı engeller. */
export const SINIR = {
  mesajUzunluk: 2000,
  adUzunluk: 80,
  epostaUzunluk: 120,
  oturumBasinaMesaj: 200,
};

export function kirp(v: unknown, uzunluk: number): string {
  return String(v ?? "").trim().slice(0, uzunluk);
}

export function epostaGecerli(v: string): boolean {
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/**
 * Danışman şu an çevrim içi mi?
 * Yönetici panelinden elle açılıp kapatılır. Kayıt yoksa çevrim dışı
 * kabul edilir — yanıtsız bekleyen ziyaretçi olmasın diye.
 */
export async function cevrimIciMi(): Promise<boolean> {
  if (!dbVar) return false;
  try {
    const k = await db.setting.findUnique({ where: { key: AYAR_CEVRIMICI } });
    return k?.value === "1";
  } catch {
    return false;
  }
}

/** Karşılama metni — yönetici panelinden değiştirilebilir. */
export async function karsilamaMetni(): Promise<string> {
  if (!dbVar) return "";
  try {
    const k = await db.setting.findUnique({ where: { key: AYAR_KARSILAMA } });
    return k?.value ?? "";
  } catch {
    return "";
  }
}

/** Sohbet için veritabanı gerçekten çalışıyor mu? (bağlantı denenir) */
export async function sohbetHazirMi(): Promise<boolean> {
  return (await veritabaniDurumu()) === "hazir";
}

/**
 * Veritabanı neden çalışmıyor?
 *
 * Yalnızca KABA bir kod döner — bağlantı adresi, kullanıcı adı, sunucu
 * veya Prisma'nın ayrıntılı hata metni HİÇBİR ZAMAN dışarı verilmez.
 * Amaç, "bağlı değil" uyarısıyla karşılaşan birinin nereye bakacağını
 * bilmesi; sessizce başarısız olmak teşhisi imkânsız kılıyordu.
 */
export type VeritabaniDurumu =
  | "hazir"
  | "adres-yok"          // DATABASE_URL tanımlı değil
  | "adres-postgres-degil" // adres var ama postgresql:// değil
  | "tablo-yok"          // bağlantı var, migration çalışmamış
  | "baglanti-yok";      // sunucuya ulaşılamıyor / kimlik reddedildi

export async function veritabaniDurumu(): Promise<VeritabaniDurumu> {
  if (!process.env.DATABASE_URL) return "adres-yok";
  if (!dbVar) return "adres-postgres-degil";
  try {
    await db.chatSession.count();
    return "hazir";
  } catch (e) {
    const kod = (e as { code?: string })?.code ?? "";
    // P2021: tablo yok, P2022: sütun yok -> migration çalışmamış
    if (kod === "P2021" || kod === "P2022") return "tablo-yok";
    const metin = e instanceof Error ? e.message : "";
    if (/relation .* does not exist|does not exist in the current database/i.test(metin)) {
      return "tablo-yok";
    }
    return "baglanti-yok";
  }
}
