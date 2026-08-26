import fs from "node:fs/promises";
import path from "node:path";
import { hamUrunler, katalogYenile, katalogdanCikar, productById } from "./catalog";

/**
 * YÖNETİCİ DEĞİŞİKLİKLERİNİ MAĞAZAYA ANINDA YANSITMA
 *
 * Mağaza katalogu `src/data/catalog.json` dosyasından okur; bu dosya
 * derleme paketine girer, böylece site veritabanısız da açılır.
 *
 * Yönetici bir ürünü değiştirdiğinde iki iş yapılır:
 *   1) Bellekteki ürün nesnesi yerinde güncellenir. Mağazanın okuduğu
 *      nesneler ile katalogdaki nesneler AYNI referans olduğu için
 *      değişiklik çalışan sunucuda ANINDA görünür — yeniden derleme yok.
 *   2) catalog.json diske yazılır ki değişiklik sunucu yeniden başlayınca
 *      da kalıcı olsun.
 *
 * Diske yazma başarısız olursa (Vercel'de dosya sistemi salt okunur)
 * işlem yine de sürer; bellekteki güncelleme geçerlidir ve kalıcılık
 * veritabanında zaten vardır.
 */

const KATALOG = path.join(process.cwd(), "src", "data", "catalog.json");

/** Yöneticiden değiştirilebilen alanlar. */
export type UrunDegisiklik = Partial<{
  priceCents: number;
  stock: number;
  threshold: number;
  hidden: boolean;
  featured: boolean;
  onRequest: boolean;
  campaignOn: boolean;
  campaignPercent: number;
  categoryId: string;
  subId: string | null;
  brandId: string | null;
  leadDays: number;
  warranty: number;
  images: Array<{ url: string }>;
}>;

let yazmaBekliyor = false;
let yazmaZamani: ReturnType<typeof setTimeout> | null = null;

/**
 * catalog.json'ı diske yazar.
 * Art arda gelen değişikliklerde 11 MB'lık dosyayı her seferinde yazmamak
 * için kısa bir gecikmeyle birleştirilir.
 */
function diskeYaz(): void {
  yazmaBekliyor = true;
  if (yazmaZamani) return;

  yazmaZamani = setTimeout(async () => {
    yazmaZamani = null;
    if (!yazmaBekliyor) return;
    yazmaBekliyor = false;
    try {
      const ham = await fs.readFile(KATALOG, "utf8");
      const k = JSON.parse(ham) as { products: Array<{ id: string }> };
      const guncel = new Map(hamUrunler().map((p) => [p.id, p]));
      k.products = k.products
        .map((p) => guncel.get(p.id) ?? p)
        .filter((p) => guncel.has(p.id));
      // Bellekte olup dosyada olmayanları (yeni ürünler) ekle
      const dosyada = new Set(k.products.map((p) => p.id));
      for (const p of hamUrunler()) if (!dosyada.has(p.id)) k.products.push(p);

      await fs.writeFile(KATALOG, JSON.stringify(k));
    } catch {
      /* salt okunur dosya sistemi — bellekteki güncelleme yine geçerli */
    }
  }, 1500);
}

/** Bir ürünü bellekte günceller ve diske yazılmak üzere işaretler. */
export function urunuYansit(id: string, degisiklik: UrunDegisiklik): boolean {
  const p = productById(id) as unknown as Record<string, unknown> | undefined;
  if (!p) return false;

  for (const [k, v] of Object.entries(degisiklik)) {
    if (v !== undefined) p[k] = v;
  }

  katalogYenile(); // "gizli" listesi yeniden hesaplansın
  diskeYaz();
  return true;
}

/** Birden çok ürünü aynı anda günceller (toplu işlemler için). */
export function urunleriYansit(
  degisiklikler: Array<{ id: string; degisiklik: UrunDegisiklik }>,
): number {
  let n = 0;
  for (const d of degisiklikler) {
    const p = productById(d.id) as unknown as Record<string, unknown> | undefined;
    if (!p) continue;
    for (const [k, v] of Object.entries(d.degisiklik)) if (v !== undefined) p[k] = v;
    n++;
  }
  if (n) {
    katalogYenile();
    diskeYaz();
  }
  return n;
}

/** Ürünü katalogdan siler. */
export function urunuKaldir(id: string): void {
  katalogdanCikar(id);
  diskeYaz();
}
