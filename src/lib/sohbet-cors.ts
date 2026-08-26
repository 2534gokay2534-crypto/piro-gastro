/**
 * SOHBET API'SİNİN DIŞ SİTELERDEN ÇAĞRILMASI
 *
 * Mağaza Shopify'a taşındığında ürün/sipariş/ödeme Shopify'da olur, ama
 * canlı destek burada kalır: Shopify vitrinine gömülen pencere bu sunucudaki
 * /api/chat/* uçlarını çağırır. Tarayıcı bunu ancak CORS başlıkları varsa
 * yapar.
 *
 * GÜVENLİK
 * Bu uçlar veritabanına kayıt açar. Bu yüzden "*" ASLA kullanılmaz; yalnızca
 * SOHBET_KAYNAKLARI ortam değişkeninde açıkça yazılmış adresler kabul edilir.
 * Değişken boşsa dışarıdan erişim tamamen kapalıdır (kendi sitemiz aynı köken
 * olduğu için CORS'a ihtiyaç duymaz, etkilenmez).
 *
 *   SOHBET_KAYNAKLARI="https://pirogastro.myshopify.com,https://pirogastro.se"
 */

/** Ortam değişkenindeki adres listesi (normalleştirilmiş kökenler). */
function izinliKokenler(): string[] {
  return (process.env.SOHBET_KAYNAKLARI ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * İstek izinli bir dış siteden mi geliyor?
 * Köken başlığı yoksa istek aynı sitedendir; ek başlığa gerek yoktur.
 */
export function korsBasliklari(req: Request): Record<string, string> {
  const koken = req.headers.get("origin");
  if (!koken) return {};

  const temiz = koken.replace(/\/+$/, "");
  if (!izinliKokenler().includes(temiz)) return {};

  return {
    "access-control-allow-origin": temiz,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    // Farklı kökenlere farklı yanıt döndüğümüz için ara belleğe uyarı
    vary: "Origin",
  };
}

/** Hazır yanıta CORS başlıklarını ekler. */
export function korsEkle(yanit: Response, req: Request): Response {
  const b = korsBasliklari(req);
  for (const [ad, deger] of Object.entries(b)) yanit.headers.set(ad, deger);
  return yanit;
}

/** Tarayıcının POST öncesi gönderdiği ön kontrol isteği. */
export function onKontrol(req: Request): Response {
  const b = korsBasliklari(req);
  // İzinsiz kökene 403: sessizce 204 dönmek yanıltıcı olurdu.
  return new Response(null, { status: Object.keys(b).length ? 204 : 403, headers: b });
}
