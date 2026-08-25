/**
 * SÜPER ADMIN MENÜSÜ — tek kaynak.
 *
 * Sol menü, üst başlık ve yetki listesi hep buradan okur; bir bölüm
 * eklemek için tek yer değişir.
 */

export type MenuOge = {
  yol: string; // /admin altındaki yol
  ad: string;
  rozet?: "siparis" | "sohbet" | "stok" | "fatura"; // canlı sayaç anahtarı
  yetki: string; // Roller ekranındaki yetki anahtarı
};

export type MenuGrup = { grup: string; ogeler: MenuOge[] };

export const MENU: MenuGrup[] = [
  {
    grup: "Genel",
    ogeler: [{ yol: "", ad: "Dashboard", yetki: "dashboard" }],
  },
  {
    grup: "Satış",
    ogeler: [
      { yol: "/siparisler", ad: "Siparişler", rozet: "siparis", yetki: "siparis" },
      { yol: "/musteriler", ad: "Müşteriler", yetki: "musteri" },
      { yol: "/makbuzlar", ad: "Sipariş Makbuzları ve Belgeler", yetki: "makbuz" },
      { yol: "/kampanyalar", ad: "Kampanyalar ve Kuponlar", yetki: "kampanya" },
      { yol: "/fatura-basvurulari", ad: "Kurumsal Fatura Başvuruları", rozet: "fatura", yetki: "fatura" },
    ],
  },
  {
    grup: "Katalog",
    ogeler: [
      { yol: "/urunler", ad: "Ürünler", yetki: "urun" },
      { yol: "/kategoriler", ad: "Kategoriler", yetki: "kategori" },
      { yol: "/stok", ad: "Stok Yönetimi", rozet: "stok", yetki: "stok" },
      { yol: "/tedarikciler", ad: "Tedarikçiler", yetki: "tedarikci" },
    ],
  },
  {
    grup: "Finans",
    ogeler: [
      { yol: "/muhasebe", ad: "Muhasebe", yetki: "muhasebe" },
      { yol: "/gelir-gider", ad: "Gelir-Gider", yetki: "muhasebe" },
      { yol: "/raporlar", ad: "Satış Raporları", yetki: "rapor" },
      { yol: "/muhasebe-raporlari", ad: "Muhasebe Raporları", yetki: "muhasebe" },
    ],
  },
  {
    grup: "İletişim",
    ogeler: [
      { yol: "/sohbet", ad: "Canlı Sohbet", rozet: "sohbet", yetki: "sohbet" },
      { yol: "/ceviriler", ad: "Diller ve Çeviriler", yetki: "ceviri" },
    ],
  },
  {
    grup: "Sistem",
    ogeler: [
      { yol: "/kullanicilar", ad: "Kullanıcılar", yetki: "kullanici" },
      { yol: "/roller", ad: "Roller ve Yetkiler", yetki: "rol" },
      { yol: "/ayarlar", ad: "Ayarlar", yetki: "ayar" },
      { yol: "/loglar", ad: "Sistem Logları", yetki: "log" },
      { yol: "/yedekleme", ad: "Yedekleme", yetki: "yedek" },
    ],
  },
];

/** Roller ekranında gösterilecek yetki listesi. */
export const YETKILER: Array<{ anahtar: string; ad: string }> = [
  { anahtar: "dashboard", ad: "Dashboard görüntüleme" },
  { anahtar: "siparis", ad: "Siparişler" },
  { anahtar: "musteri", ad: "Müşteriler" },
  { anahtar: "makbuz", ad: "Sipariş makbuzları ve belgeler" },
  { anahtar: "kampanya", ad: "Kampanya ve kuponlar" },
  { anahtar: "fatura", ad: "Kurumsal fatura başvuruları" },
  { anahtar: "urun", ad: "Ürün yönetimi" },
  { anahtar: "kategori", ad: "Kategori yönetimi" },
  { anahtar: "stok", ad: "Stok yönetimi" },
  { anahtar: "tedarikci", ad: "Tedarikçiler" },
  { anahtar: "muhasebe", ad: "Muhasebe ve gelir-gider" },
  { anahtar: "rapor", ad: "Satış raporları" },
  { anahtar: "sohbet", ad: "Canlı sohbet" },
  { anahtar: "ceviri", ad: "Diller ve çeviriler" },
  { anahtar: "kullanici", ad: "Kullanıcılar" },
  { anahtar: "rol", ad: "Roller ve yetkiler" },
  { anahtar: "ayar", ad: "Ayarlar" },
  { anahtar: "log", ad: "Sistem logları" },
  { anahtar: "yedek", ad: "Yedekleme" },
];

/** Yol → bölüm adı (üst başlıkta kullanılır). */
export function bolumAdi(altYol: string): string {
  for (const g of MENU) {
    for (const o of g.ogeler) {
      if (o.yol === altYol) return o.ad;
    }
  }
  return "Süper Admin";
}
