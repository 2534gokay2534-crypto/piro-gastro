# Shopify (Tinker) Taşıma Raporu — Piro Gastro Center AB

Hazırlanma tarihi: 26 Ağustos 2026
Kaynak: mevcut GitHub deposu (sıfırdan mağaza kurulmadı)

---

## 1. Önce iki tespit

### Excel dosyalarında ürün yok

İstekte "mevcut Excel dosyalarındaki ürünler" geçiyordu. Projede hiç Excel
dosyası yok; bilgisayardaki Excel dosyaları (`Gökay bey.xlsx`, `gky.xlsx`,
`Gökay Calt.xlsx` ve diğerleri) açılıp içleri okundu. Sütunları şunlar:

```
Grupp · Artikel · Obestämd Singular · Bestämd Singular ·
Obestämd Plural · Bestämd Plural · Meaning Type · Engelska
```

Bunlar **İsveççe dilbilgisi çalışma tabloları**, ürün listesi değil.

Gerçek ürün kaynağı `src/data/catalog.json`: **3190 ürün**, 11.534 görsel,
dört dilde ad ve açıklama, teknik özellikler, ölçü, ağırlık, fiyat, stok ve
geçen hafta hesapladığımız büyük-ürün-önce sıralaması. Dönüştürme bu dosyadan
yapıldı — Excel'den yapılsaydı görseller, çeviriler ve teknik özellikler
kaybolurdu.

### Shopify mağazası olmadan doğrulanamayan kısımlar var

Shopify hesabı, API anahtarı ve Tinker tema lisansı elimde yok. Bu yüzden:

* Tema kurulumu, CSV içe aktarma ve "Shopify üzerinde çalışıyor" doğrulaması
  **yapılmadı** — mağaza açıldığında yapılacak.
* Bunun yerine taşınabilir her şey hazırlandı ve **mağazasız test edilebilecek
  biçimde** sınandı (aşağıda ölçüm sonuçları var).

"Her şey çalışmadan tamamlanmış sayma" dediğiniz için: **bu iş tamamlanmadı.**
Bölüm 6'da ne kaldığı tek tek yazılı.

---

## 2. Shopify'a taşınan: ürünler

`node scripts/shopify-aktar.mjs --yaz` komutu üretiyor.

| Dosya | İçerik |
|---|---|
| `urunler-1..4.csv` | 3190 ürün + 11.534 görsel satırı, Shopify içe aktarma biçimi |
| `koleksiyonlar.csv` | 19 ana + 33 alt kategori = 52 koleksiyon |
| `ceviriler-en.csv` | 2157 çeviri (Translate & Adapt) |
| `ceviriler-tr.csv` | 2623 çeviri |
| `ceviriler-de.csv` | 2144 çeviri |

**Ana dil İsveççe, para birimi SEK.** Katalogda fiyatlar EUR cent olarak
tutuluyor (`src/lib/money.ts`), mağaza ise SEK ile satıyor; aktarıcı fiyatları
kataloğun kendi kuruyla (11,4) çeviriyor. Çevrilmeseydi her ürün 11 kat ucuz
görünürdü. Örnek: 155,00 € → **1 767,00 kr**.

Ürün adı diğer dilde İsveççeyle aynıysa çeviri satırı yazılmaz — Shopify o
durumda ana dile döner, gereksiz satır sorun çıkarır.

### Ne nereye gitti

| Bizdeki alan | Shopify karşılığı |
|---|---|
| `slug` | Handle (ASCII'ye çevrildi: ş→s, ä→a, …) |
| `i18n.sv.name` | Title |
| `i18n.sv.desc` + teknik özellikler | Body (HTML), tablo olarak |
| `sku` | Variant SKU |
| `priceCents` (EUR cent) | Variant Price — **SEK'e çevrilir** (EUR × 11,4) |
| `campaignOn` / `campaignPercent` | Variant Price = indirimli, Compare At = liste |
| `stock` | Variant Inventory Qty |
| `onRequest` | Inventory policy = `continue` + `siparis-uzerine` etiketi |
| `weightKg` | Variant Grams |
| `dims.w/d/h` | `piro.genislik` / `derinlik` / `yukseklik` metafield |
| `warranty`, `leadDays` | `piro.garanti`, `piro.teslim` metafield |
| `brandId` | Vendor |
| `categoryId` / `subId` | `kategori:…` / `alt:…` etiketi → koleksiyon kuralı |
| `sortRank` | `sira:0000` etiketi + CSV satır sırası |
| `hidden` | Published = FALSE, Status = draft |
| `images[]` | Image Src + Image Position (sıra korundu) |

### Kategori yapısı ve sıralama korundu

Koleksiyonlar etiket kuralıyla kuruluyor (`kategori:cooking` gibi), böylece
sonradan eklenen ürün doğru koleksiyona kendiliğinden düşüyor. Sıralama iki
yerde birden taşındı: hem `sira:` etiketinde hem CSV satır sırasında. Büyük ve
ana ürünler önce, tamamlayıcı küçük ürünler sonra — müşteri panelindeki ve Piro
Admin'deki sırayla birebir aynı.

### Doğrulama

`node scripts/shopify-dogrula.mjs` — **0 hata**:

```
ürün sayısı katalogla aynı              OK  3190 / 3190
görsel sayısı katalogla aynı            OK  11534 / 11534
handle benzersiz                        OK
SKU benzersiz                           OK  3190 / 3190
hiçbir ürün iki dosyaya bölünmemiş      OK
görsel sıra numaraları ardışık (1..n)   OK
her ürün doğru kategori etiketinde      OK
sıralama (sortRank) etikete taşındı     OK
CSV satır sırası: büyük ürünler önce    OK
her kategori için koleksiyon var        OK  52 / 52
fiyatlar SEK'e çevrilmiş (EUR × 11.4)   OK
kampanya ve üstü çizili liste fiyatı    OK
dosya boyutu / satır sınırı             OK  en büyüğü 1.5 MB
```

Kampanya yolu ayrıca `node scripts/shopify-kampanya-test.mjs` ile sınanıyor —
katalogda şu an indirimli ürün olmadığı için yapay kampanyayla (0 hata):

```
100047  155,00 €  -%10  ->  Price 1590,30 kr   CompareAt 1767,00 kr
100048   92,00 €  -%25  ->  Price  786,60 kr   CompareAt 1048,80 kr
100054  103,00 €  -%50  ->  Price  587,10 kr   CompareAt 1174,20 kr
kampanyasız üründe CompareAt boş
```

Not: `textiles` (Textilier) koleksiyonu boş — katalogda da bu kategoride ürün
yok. Kategori yapısını koruyalım diye yine de üretildi.

---

## 3. Shopify'ın devraldığı işler

Bunlar bizim kodumuzdan **çıkacak**, Shopify'ın altyapısına geçecek:

| İş | Şu an | Shopify'da |
|---|---|---|
| Sepet ve ödeme sayfası | kendi `/odeme` akışımız | Shopify Checkout |
| Swish, Klarna, kart, Apple/Google Pay | Stripe Checkout | Shopify Payments |
| Kargo ve teslim seçenekleri | sabit kural | Shopify Shipping |
| Sipariş kaydı | kendi `Order` tablomuz | Shopify Orders |
| Ürün ve stok | `catalog.json` | Shopify Products |
| KDV | kendi hesabımız | Shopify Tax (İsveç %25) |

Bu bir kayıp değil, kazanç: Shopify'ın ödeme ve kargo altyapısı bizimkinden
güçlü ve İsveç'te hazır kurallı.

---

## 4. Bizde kalanlar — ve neden

Shopify'da karşılığı olmayan ya da karşılığı zayıf olan işler kendi
sunucumuzda kalıyor. "Mevcut yönetim mantığını kaybetme" isteği bu şekilde
karşılanıyor:

| Özellik | Neden Shopify'a taşınmıyor |
|---|---|
| **Canlı destek** (24 bölümlü panel, açık/beklemede/kapalı, ses) | Shopify Inbox'ta sesli uyarı ve Süper Admin ayrımı yok |
| **Süper Admin paneli** | Shopify admin'de rol/yetki mantığımızın karşılığı yok |
| **Kurumsal fatura başvurusu + Süper Admin onayı** | Shopify'da B2B onay akışı Plus paketinde |
| **Makbuz/fatura PDF** (teknik bilgi ve ölçülerle) | Shopify makbuzunda metafield ve teknik tablo yok |
| **Muhasebe raporları** (gün/hafta/ay/yıl, kâr) | Shopify Analytics maliyet-kâr ayrımını bizim gibi yapmıyor |

---

## 5. Canlı destek: taşındı ve **çalıştığı kanıtlandı**

En kritik parça buydu, çünkü React bileşenimiz Shopify vitrininde çalışamaz.

**Çözüm:** sohbet penceresi kütüphanesiz saf JavaScript olarak yeniden yazıldı
(`public/sohbet-gomulu.js`). Shopify vitrini bu dosyayı tek satırla yüklüyor ve
bizim sunucumuzdaki `/api/chat/*` uçlarını çağırıyor. Veriler yine aynı
veritabanına yazılıyor — **Süper Admin paneli, okunmamış rozeti ve sesli uyarı
hiç değişmedi.**

Güvenlik: `/api/chat/*` uçları veritabanına kayıt açtığı için `*` ile herkese
açılmadı. Yalnızca `SOHBET_KAYNAKLARI` değişkeninde **yazılı** adresler kabul
ediliyor; değişken boşsa dış erişim tamamen kapalı.

### Nasıl sınandı

Shopify mağazası olmadan da kanıtlanabilsin diye 4000 portunda **ayrı bir köken**
kuruldu (`scripts/shopify-vitrin-denemesi.mjs`). Tarayıcı için bu, gerçek bir
Shopify alan adından farksızdır.

```
CORS — izinli köken (vitrin)         OPTIONS 204 + başlıklar   OK
CORS — izinsiz köken                 OPTIONS 403, başlık yok   OK
CORS — kendi sitemiz (aynı köken)    etkilenmedi               OK

Vitrinden mesaj gönderildi           veritabanına düştü        OK
  isim / e-posta / dil / tarih       saklandı                  OK
Süper Admin akışında göründü                                   OK
Okunmamış sayacı arttı (ses tetiklenir)                        OK
Danışman yanıtı vitrine döndü (sayfa yenilemeden)              OK

Mobil  375×812   tam ekran, yatay taşma yok, 16px yazı         OK
Tablet 768×1024  360×520 kayan pencere, taşma yok              OK
Masaüstü         360×520 kayan pencere                         OK
Konsol hatası    yok                                           OK
```

---

## 6. Yapılmayanlar — mağaza gerekiyor

| Adım | Neden bekliyor |
|---|---|
| Shopify mağazası açmak | Hesap ve ödeme sizin adınıza olmalı |
| Tinker temasını satın alıp kurmak | Tema lisansı mağazaya bağlı |
| CSV'leri içe aktarmak | Mağaza gerekiyor |
| Koleksiyonları kurmak | Mağaza gerekiyor |
| Marka CSS'ini Tinker'a bağlamak | Tinker'ın sınıf adları görülmeden kesinleşmez |
| Ödeme ve kargo ayarları | Shopify Payments başvurusu gerekiyor |
| "Shopify üzerinde çalışıyor" doğrulaması | Mağaza gerekiyor |

**Ayrıca bekleyen, Shopify'dan bağımsız engel:** Vercel'de `DATABASE_URL` ve
`ADMIN_SIFRE` tanımlı değil. Bu yüzden canlı sitede sohbet, siparişler,
makbuzlar ve Süper Admin **şu an veri tutamıyor**. Shopify'a geçilse bile bu
sorun sürer, çünkü sohbet ve yönetim bizde kalıyor.

---

## 7. Kurulum sırası (mağaza açıldığında)

1. Shopify mağazası aç, Tinker temasını kur.
2. `shopify/tema/assets/piro-tasarim.css` → temanın `assets/` klasörüne.
   `theme.liquid` içinde `</head>` öncesine, temanın kendi stillerinden **sonra**:
   `{{ 'piro-tasarim.css' | asset_url | stylesheet_tag }}`
3. `shopify/tema/snippets/piro-canli-destek.liquid` → temanın `snippets/` klasörüne.
   `theme.liquid` içinde `</body>` öncesine: `{% render 'piro-canli-destek' %}`
4. `shopify/tema/config/settings_schema-ek.json` içeriğini temanın
   `settings_schema.json` dizisine **ekle** (üzerine yazma).
5. Tema ayarlarında "Piro sunucu adresi" → `https://piro-gastro.vercel.app`
6. Sunucuda `SOHBET_KAYNAKLARI` → mağaza alan adları (virgülle).
7. Products → Import → `urunler-1.csv` … `urunler-4.csv` (sırayla).
8. Koleksiyonları `koleksiyonlar.csv` içindeki kurallara göre oluştur.
9. Translate & Adapt uygulamasıyla `ceviriler-*.csv` dosyalarını yükle.
10. Shopify Payments: Swish, Klarna, kart, Apple/Google Pay.

---

## 8. Mevcut sistemde bozulan bir şey var mı — hayır

Taşıma hazırlığı sırasında çalışan hiçbir şeye dokunulmadı. Kanıt:

```
Canlı sohbet          0 hata
Genel regresyon       0 hata
Sıralama              0 hata
Süper Admin denetimi  0 hata   (24 sayfa, bağlantılar, 11 CSV dışa aktarma)
Muhasebe denetimi     0 hata
```

Eklenen dosyalar mevcut akışların dışında; değiştirilenler yalnızca
`/api/chat/*` uçlarına CORS sarmalayıcısı (aynı köken davranışı aynen aynı) ve
`eslint.config.mjs`'e üretilen Prisma kodunun denetim dışı bırakılması.
