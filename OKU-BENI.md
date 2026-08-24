# Piro Gastro Center AB

## Klasörler

- `prototip/` — eski tek dosyalık sistem. **Dokunulmadı**, olduğu gibi duruyor.
  `index.html`'e çift tıklayınca eskisi gibi açılır.
- `web/` — yeni Next.js projesi. Gerçek veritabanı, sunucuda üretilen sayfalar.

## Yeni projeyi çalıştırma

```
cd web
npm run dev
```

Sonra tarayıcıda: http://localhost:3000

## Veritabanı

- Geliştirme: SQLite (`web/dev.db`) — kurulum gerektirmez.
- Yayına alırken: `prisma/schema.prisma` içinde `provider = "postgresql"` yapıp
  `DATABASE_URL`'i değiştirmek yeterli. Şema aynen çalışır.

Şemayı görmek/düzenlemek: `web/prisma/schema.prisma`
Veriyi tarayıcıda görmek: `cd web && npx prisma studio`

## Ürünleri yeniden aktarma

```
cd web
node scripts/import-catalog.mjs
```

Aynı SKU varsa günceller, yoksa ekler. Tekrar tekrar çalıştırılabilir.

## Yapıldı

- 12 tablolu veritabanı şeması (ürün, kategori, marka, müşteri, sipariş,
  sipariş satırı, fatura, kullanıcı, ayar, denetim kaydı…)
- 996 ürün + 19 ana kategori + 33 alt kategori + 2.635 görsel aktarıldı
- 3 dil URL'de: `/sv`, `/en`, `/tr`
- Ana sayfa, kategori sayfası, ürün sayfası, tüm ürünler, arama
- Onaylı renk paleti ve logo birebir taşındı
- Sayfalar sunucuda üretiliyor → Google ürünleri görebiliyor

## Sırada

- Sepet ve ödeme (Stripe / Klarna)
- Giriş ve şifreleme (şu an kullanıcı tablosu var, giriş akışı yok)
- Yönetici paneli
- Fatura PDF (prototipteki üretici taşınacak — düz JavaScript, aynen çalışır)
- SV/TR ürün adı çevirileri (katalog yalnızca İngilizce geliyor)
