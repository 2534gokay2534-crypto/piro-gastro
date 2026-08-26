/**
 * HATA METİNLERİNDEN GİZLİ DEĞERLERİ TEMİZLER
 *
 * Yönetici ekranları sorun teşhisi için hata metnini gösteriyor. Prisma ve
 * pg sürücüsü hata mesajlarına bağlantı dizesini (kullanıcı adı ve PAROLA
 * dahil) koyabiliyor. Ekrana basılan metin panelde durur, ekran görüntüsü
 * alınır, destek talebine yapıştırılır — parola oradan sızar.
 *
 * Bu yüzden ekrana giden her hata metni önce buradan geçer.
 */

/** postgresql://kullanici:parola@sunucu/veritabani -> postgresql://***@sunucu/veritabani */
const BAGLANTI = /\b([a-z+]+):\/\/[^\s:@/]+(?::[^\s@/]*)?@/gi;

/** Adres içinde parola parametresi olarak geçenler */
const PARAMETRE = /\b(password|pgpassword|sslpassword|token|secret|api[_-]?key)\s*[=:]\s*[^\s&"';]+/gi;

/** Neon ve benzeri sağlayıcıların anahtar biçimleri */
const ANAHTAR = /\b(npg_[A-Za-z0-9]{8,}|sk_(?:test|live)_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,})\b/g;

/**
 * Metni ekranda gösterilebilir hale getirir.
 * Bilinen gizli biçimleri maskeler ve uzunluğu sınırlar.
 */
export function gizliTemizle(metin: unknown, azami = 300): string {
  let s = typeof metin === "string" ? metin : String(metin ?? "");
  s = s.replace(BAGLANTI, "$1://***@");
  s = s.replace(PARAMETRE, (t) => t.split(/[=:]/)[0] + "=***");
  s = s.replace(ANAHTAR, "***");

  // Ortam değişkeninde gerçekten duran değer metne başka bir biçimde
  // girmiş olabilir; birebir eşleşmeyi de temizle.
  for (const ad of ["DATABASE_URL", "DIRECT_DATABASE_URL", "ADMIN_SIFRE", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]) {
    const deger = process.env[ad];
    if (deger && deger.length > 6) s = s.split(deger).join("***");
  }

  return s.slice(0, azami);
}
