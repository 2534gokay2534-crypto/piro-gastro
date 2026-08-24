# Vercel'e yayınlama

## 1. Vercel proje ayarı (404'ün sebebi buydu)

Vercel varsayılan olarak deponun kökünde Next.js arar. Bizim proje `web/`
klasöründe olduğu için hiçbir şey bulamadı ve 404 verdi.

Vercel panelinde:

  Settings → General → Root Directory → **web** yaz → Save

## 2. Veritabanı

SQLite Vercel'de çalışmaz (sunucusuz ortamda disk salt-okunur ve geçici).
PostgreSQL gerekiyor. Ücretsiz seçenek: **Neon**.

1. https://neon.tech → hesap aç → yeni proje
2. "Connection string" kopyala (postgresql://... ile başlar)

## 3. Bağlantı adresini iki yere ekle

**a) Vercel'e** — Settings → Environment Variables:

    Name:  DATABASE_URL
    Value: (Neon'dan kopyaladığın adres)
    Environment: Production, Preview, Development (üçünü de işaretle)

**b) Bilgisayarında** — `web/.env` dosyası oluştur, içine:

    DATABASE_URL="postgresql://..."

## 4. Tabloları ve ürünleri yükle

`web/.env` hazır olunca, bir kez:

    cd web
    npx prisma migrate dev --name init
    npm run db:import

Bu, 996 ürünü ve 52 kategoriyi veritabanına yazar.

## 5. Yeniden deploy

Vercel → Deployments → en üstteki → "Redeploy"

---

## Neden .env GitHub'a gitmiyor?

İçinde veritabanı şifresi var. `.gitignore` onu dışarıda tutuyor.
Vercel'e şifreyi Environment Variables ekranından siz veriyorsunuz.
