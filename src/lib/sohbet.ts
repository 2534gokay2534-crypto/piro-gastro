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
  if (!dbVar) return false;
  try {
    await db.chatSession.count();
    return true;
  } catch {
    return false;
  }
}
