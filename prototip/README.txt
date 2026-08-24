PIRO GASTRO CENTER AB — B2B e-ticaret + yönetim sistemi
========================================================
Tek dosyalık, tam çalışan sistem (index.html). Harici kütüphane yok.

BAŞLARKEN
---------
index.html dosyasına çift tıklayın. Fotoğrafları görmek için dosyaları
assets/ klasörüne koyun (isim listesi: assets/README.txt) ya da admin
panelinden yükleyin.

MARKA
-----
Görünen ad : PIRO GASTRO  (müşterinin gördüğü her yerde)
Slogan     : Professional Kitchen Solutions
Logo       : P monogramı — lacivert gövde + fırçalanmış çelik kâse,
             içinde bakır alev, sağ altta dişli çark. Yazı tipi,
             renkler ve yerleşim referans logodan alınmıştır.
Resmî ad   : Piro Gastro Center AB — YALNIZCA yasal alanlarda:
             • fatura            • sipariş onayı
             • teklif formu      • footer şirket bilgisi
             • Yasal bilgiler / gizlilik sayfası

DİLLER
------
Sağ üstteki SV / EN / TR düğmesi tüm içeriği, para birimini ve KDV'yi
değiştirir:  SV → SEK %25 · EN → EUR %21 · TR → TRY %20

DEMO GİRİŞLERİ (#/login)
------------------------
Süper yönetici  super@pirogastro.se     super123
Yönetici        admin@pirogastro.se     admin123
Muhasebe        ekonomi@pirogastro.se   vat2026
Müşteri         johan@trattorianord.se  demo1234

TAMAMEN DİNAMİK — HİÇBİR GÖRSEL VEYA METİN KODA GÖMÜLÜ DEĞİL
------------------------------------------------------------
Admin > "Ana sayfa ve içerik":
  • Hero: fotoğraf, üst etiket, başlık (altın kısım dahil), metin,
    buton yazısı ve bağlantısı — üç dilde ayrı
  • Bölüm sırası: ↑ ↓ ile taşıyın, anahtar ile gizleyin/gösterin
  • Bannerlar: fotoğraf + başlık + metin + bağlantı
  • Üst bar (4 güven maddesi) ve servis şeridi (4 madde)
  • Hakkımızda ve İletişim blokları
  • Menü: madde ekle/sil/sırala, üst menüde görünsün/görünmesin
Görsel değiştirme: her görsel alanına "Görsel yükle" ile dosya seçin,
kütüphaneden seçin, ya da assets/ yolunu yazın. "Düzenleme modu"nu
açarsanız sitenin kendi üzerinde de görsel alanlarına tıklayabilirsiniz.

KATALOG (sınırsız)
------------------
Kategori ve marka: ekle / sil / sırala / gizle, her biri kendi görseliyle.
Ürün: sınırsız ekleyin; her ürün için
  • birden fazla fotoğraf (galeri, istediğiniz kadar)
  • video (YouTube / Vimeo / MP4)
  • PDF katalog ve kılavuz (istediğiniz kadar satır)
  • sınırsız teknik özellik satırı
  • stok, kritik stok seviyesi, alış fiyatı, satış fiyatı
  • kampanya (indirim %, bitiş tarihi, etiket)
Tüm ürün metinleri üç dilde girilir.

ROLLER
------
Süper yönetici : her şey + kullanıcı/rol yönetimi, yetki matrisi,
                 işlem kaydı, sistem ayarları
Yönetici       : siparişler, teklifler, müşteriler, katalog, stok,
                 içerik/medya/menü, faturalar, gelir raporları
Muhasebe       : SADECE faturalar, KDV raporu/beyanı, gelir raporları,
                 CSV dışa aktarım. Ürün, stok, içerik ve ayarlara
                 erişemez (denenirse 403).
Müşteri        : sipariş geçmişi, fatura görüntüleme/yazdırma/indirme,
                 tek tıkla tekrar sipariş

SİPARİŞ → FATURA
----------------
Her siparişte fatura otomatik oluşur, müşteriye gider ve muhasebe
panelinde anında görünür. Sipariş "Kargoda"/"Teslim edildi" olduğunda
fatura otomatik "ödendi" işaretlenir.

ÖDEME / KARGO
-------------
Visa · Mastercard · Apple Pay · Google Pay · PayPal · Klarna · Swish · Stripe
DHL · UPS · PostNord · DB Schenker   (2.500 € üzeri kargo ücretsiz)

VERİ
----
Demo verisi (28 ürün, ~780 sipariş, 14 aylık geçmiş, 58 müşteri) ilk
açılışta üretilir; tarayıcının localStorage'ında saklanır.
Sıfırlama: Süper yönetici > Ayarlar > Demo verisini sıfırla.

CANLIYA ALIRKEN
---------------
• Görselleri assets/ klasöründen servis edin (admin yüklemeleri
  tarayıcıda saklandığı için sadece o cihazda görünür).
• "STORE" bölümündeki DB katmanını bir REST API'ye bağlayın; tüm
  okuma/yazma tek nesneden geçer.
• Ödeme sağlayıcılarının gerçek SDK'larını ödeme adımına ekleyin.
• Şifreler demo amaçlıdır; üretimde sunucu tarafı kimlik doğrulama ve
  parola hash'leme kullanın.

================================================================
SÜPER ADMIN PANELİ  (yeni — mevcut sistemin üzerine eklendi)
================================================================
Adres  : index.html#/owner
Giriş  : owner@pirogastro.se / piro2026
         (Ayarlar sayfasından değiştirin)

Bu panel tamamen ayrıdır. Diğer roller (yönetici, muhasebeci,
müşteri) bu adrese girerse giriş ekranı görür, panele giremez.

ÖZET EKRANI — büyük kutular
  Bugünkü sipariş · Bugünkü ciro · Bekleyen ödemeler
  Yeni siparişler · Stok uyarıları     (kutulara tıklanabilir)

SAYFALAR
  Özet · Siparişler · Ödemeler · Faturalar · İadeler
  Müşteriler · Ürünler · Stok · Muhasebe · Kullanıcılar · Ayarlar

YENİ ÜRÜN EKLE (büyük altın buton)
  Birden fazla fotoğraf (sürükle-bırak veya seç), ürün adı,
  açıklama, fiyat, indirimli fiyat, stok, kategori, marka,
  kritik stok seviyesi, gizli/yayında, öne çıkar.
  İlk fotoğraf otomatik kapak olur.

YENİ KATEGORİ OLUŞTUR
  Kategori kaydedildiğinde site menüsüne OTOMATİK eklenir.

HER ÜRÜNÜN YANINDA
  Düzenle · Gizle/Göster · Öne çıkar/Kaldır · Sil

KULLANICI OLUŞTURMA — iki yol
  1) Doğrudan hesap aç: e-posta ve şifre üretilir, siz iletirsiniz
  2) Davet linki oluştur: linki gönderirsiniz, kişi tıklar,
     kendi şifresini belirler, hesabı otomatik oluşur
  Her iki yolda da rol (Yönetici / Muhasebeci / Personel) ve
  görebileceği sayfalar tek tek işaretlenir. Kişi sadece
  yetki verdiğiniz sayfaları görür; diğerlerine erişemez.
  Davet linki tek kullanımlıktır.

NOT: Mevcut süper yönetici paneli (#/super) ve diğer paneller
aynen durmaktadır; hiçbiri değiştirilmemiştir.

================================================================
ZORUNLU TEKNİK ALANLAR  (yeni)
================================================================
Her ürün için admin panelinde doldurulması ZORUNLU 14 alan:
  Üretici/Marka · Model · CE belgesi (Var/Yok) · Güç (kW)
  Voltaj (V) · Faz (1/3) · Frekans (Hz) · Akım (A)
  Enerji tüketimi · Ölçüler (GxDxY) · Ağırlık · Kapasite
  Malzeme · Garanti süresi
Ayrıca 3 PDF: Kullanım kılavuzu · Teknik veri sayfası · Uygunluk beyanı
  - "PDF yükle" ile dosya seçin (en fazla ~2 MB), veya
  - assets/docs/ klasörüne koyup yolunu yazın (büyük dosyalar için)

Alanlar eksikse kayıt yapılmaz; hangi alanların eksik olduğu bildirilir.
Formlar hem Yönetici panelinde (Ürünler > Düzenle) hem Süper Admin
panelinde (Ürünler > Yeni ürün ekle / Düzenle) bulunur.

MÜŞTERİ TARAFI
  Doldurulan alanlar ürün sayfasındaki "Teknik veriler" sekmesinde
  otomatik ve düzenli bir tablo olarak gösterilir (üç dilde).
  PDF'ler "Dokümanlar" sekmesinde indirilebilir olarak listelenir.
  Boş bırakılan alan tabloda hiç görünmez.
  Müşteri hiçbir yönetim butonu görmez, hiçbir şey yükleyemez.

Mevcut 28 ürünün teknik alanları ilk açılışta otomatik dolduruldu
(marka, model, güç, voltaj, faz, ölçü, ağırlık, malzeme, garanti).

================================================================
TOPLU ÜRÜN İÇE AKTARMA  (yeni)
================================================================
CSV'nizden 996 ürün otomatik aktarıldı (assets/catalog.js).
Site ilk açıldığında kendiliğinden yüklenir, tekrar aktarılmaz.

OTOMATİK KATEGORİLENDİRME
  Ürün adındaki "Kategori | Ürün adı" biçimi okunur ve
  8 ana kategori + 34 alt kategoriye ayrılır:
    Tezgâh ve Dolaplar (222) · Pişirme (208) · Raf Sistemleri (174)
    Havalandırma (164) · Soğutma (104) · Evye ve Yıkama (77)
    Aksesuarlar (30) · Hazırlık (17)
  Marka: Unninox (tüm ürünler) — Markalar sayfasında listelenir.

TEKNİK ALANLAR
  Açıklama metninden otomatik çıkarılır:
    ölçüler 486 · malzeme 357 · voltaj/faz/frekans 208
    kapasite 190 · güç 172 · ağırlık 140  (996 üründen)
  Excel'de olmayan alanlar (CE, akım, enerji, garanti) BOŞ bırakılır
  ve panelden tek tek doldurulabilir. Boş alan müşteri tablosunda
  hiç görünmez.

YENİ CSV YÜKLEMEK İÇİN
  Yönetici paneli  > Ürünler > "CSV içe aktar"
  Süper Admin      > Ürünler > "CSV ile toplu yükle"
  Beklenen sütunlar: SKU, Name, Price, Stock, Description,
  Short Description, Image URL, All Image URLs
  Aynı ürün kodu zaten varsa atlanır; mevcut ürünler bozulmaz.
  Yükleme öncesi kaç ürün/kategori geleceği önizlemede gösterilir.

SAYFALAMA
  Ürün listesi sayfa başına 48 ürün gösterir (1024 ürün = 22 sayfa).
  Kategori sayfalarında alt kategori rozetleri çıkar.

NOT: Görseller tedarikçi sitesinden (unninoxeurope.com) çekilir;
internet bağlantısı gerekir. Kendi sunucunuza taşımak isterseniz
görselleri indirip assets/ içine koyun ve yolları güncelleyin.

================================================================
ARAYÜZ 2.0  (GGM Gastro kullanım mantığı, Piro Gastro kimliği)
================================================================
BAŞLIK
  • İnce üst şerit: kargo mesajı, teknik destek, güvenli ödeme, dil
  • Lacivert ana başlık: Piro Gastro logosu + adı, geniş arama,
    Hesabım, Sepet (canlı tutar)
  • Altında çok sütunlu KATEGORİ BARI: Ana Menü + 8 ana kategori +
    Markalar + İletişim. Üzerine gelince alt kategoriler sayılarıyla
    açılır (mega panel).

AKILLI ARAMA
  Ürün adı · marka · ürün kodu · model · kategori adıyla arar.
  Yazarken öneri kutusu açılır (görsel, marka, kod, fiyat).
  Soldaki listeden tek kategoriye daraltılabilir.
  "Tüm sonuçları gör (N)" ile tam listeye geçilir.

KATEGORİ AKIŞI  (GGM mantığı)
  Ana kategori  -> alt kategori KARTLARI (görsel + ad + ürün adedi +
                   "başlangıç ₺X") + "Tüm ürünleri gör" butonu
  Alt kategori  -> ürün listesi + filtre + sıralama + sayfalama
  Her sayfada "‹ Geri" butonu ve tam breadcrumb.

YENİ DİL EKLEME
  Süper Admin > Diller > "Yeni dil ekle"
  Dil kodu, ad, temel dil, yerel biçim, para birimi, kur, KDV girilir.
  Eklenince tüm içerik editörlerinde (ürün, kategori, ana sayfa)
  o dil için sekme açılır; arayüz etiketleri temel dilden kopyalanır.
  Varsayılan 3 dil (SV/EN/TR) silinemez.

================================================================
KATEGORİ YAPISI  (19 ana başlık)
================================================================
Soğutma · Pişirme · Fırınlar · Izgaralar · Pizza Ekipmanları
Pastane ve Fırıncılık · Hamur ve Un · Hazırlık · Et İşleme
Bulaşık ve Temizlik · Havalandırma · Paslanmaz Mobilya
Sıcak Tutma · Kafe, Dondurma ve Waffle · Tabak ve Çatal
Tekstil · Mutfak Gereçleri · Masa ve Sandalye · Yedek Parça

Hepsi üç dilde, ikonlu ve açıklamalı. Ürünü olmayan başlıklar da
menüde durur; içine girilince "henüz ürün yok" mesajı gösterilir.

AKIŞ (GGM mantığı)
  Ana kategori -> alt kategori KARTLARI (görsel + adet + "başlangıç ₺X")
  Alt kategori -> ürün listesi + filtre + sıralama + sayfalama
  Her sayfada "‹ Geri" ve tam breadcrumb.
Alt kategori görseli: kendi görseli yoksa ilk ürünün fotoğrafı kullanılır.

================================================================
ÖLÇEKLENEBİLİRLİK  (on binlerce ürün)
================================================================
Hazır katalog assets/catalog.js dosyasında durur ve tarayıcı
deposuna YAZILMAZ. Açılışta bellekte birleşir.
Depoda yalnızca şunlar tutulur:
  • panelden eklenen yeni ürünler
  • değiştirilen katalog ürünleri (sadece değişenler, patch olarak)
  • silinenlerin listesi
Sonuç: 1.024 üründe depo kullanımı 2.191 KB -> 985 KB.
Yeni CSV yüklerken de aynı kurallar uygulanır; ürünler otomatik
olarak doğru ana/alt kategoriye düşer.

Panel tabloları 100 satırla sınırlıdır (arama ve kategori filtresi
ile daralt). Mağaza listesi sayfa başına 48 ürün gösterir.

NOT: Bu yapı tarayıcı tarafında ~10.000 ürüne kadar rahat çalışır.
Daha büyüğü için ürünlerin sunucudan sayfalı çekilmesi gerekir;
DB katmanı bu geçişe uygun tek noktada toplanmıştır.

SEO
  Sayfa başlığı ve meta açıklaması ürüne/kategoriye göre değişir.
  Not: adresler # ile çalışır. Arama motorlarında tam indekslenme
  için sunucu tarafı yönlendirme (temiz URL) gerekir.

================================================================
MÜŞTERİ ARAYÜZÜ 3.0  (referans düzen, Piro Gastro kimliği)
================================================================
ÜST ŞERİT (altın)  kargo mesajı ortada · sağda dil ve para birimi
BAŞLIK (lacivert)  menü butonu · Piro Gastro logosu · hesap · sepet(tutar)
ARAMA              başlığın altında TAM GENİŞLİK arama çubuğu
KATEGORİ IZGARASI  19 hücre, ikonlu, çerçeveli (6 sütun masaüstü,
                   3 tablet, 2 mobil). Üzerine gelince alt kategoriler
                   sayılarıyla açılır.

ANA SAYFA AKIŞI
  1. Hero — tam genişlik fotoğraf + başlık + 2 buton
  2. Hizmet şeridi (4 madde)
  3. "Her işletme için" — 6 sektör kartı
     Restoran · Otel · Kafe ve Bar · Pastane · Catering · Kasap
  4. Çok satanlar (ürün ızgarası)
  5. Kampanya bannerları
  6. Tüm kategoriler
  7. Hakkımızda bloğu
  8. "Sorularınız mı var?" — danışmanlık bandı + telefon
  9. Markalar
 10. Ödeme & kargo · Bülten

Tüm bölümler admin panelinden düzenlenebilir, sıralanabilir ve
gizlenebilir (İçerik > Ana sayfa ve içerik).

----------------------------------------------------------
MEGA MENÜ  (güncellendi)
----------------------------------------------------------
Kategori ızgarasında bir ana kategorinin üzerine gelince tam
genişlikte mega menü açılır. Alt kategoriler metin listesi yerine
KART olarak görünür:
  ürün görseli + alt kategori adı + ürün adedi + başlangıç fiyatı
Her kart doğrudan o alt kategoriye gider.
Görsel: alt kategorinin kendi görseli, yoksa içindeki ilk ürünün
fotoğrafı otomatik kullanılır (admin panelinden değiştirilebilir).
Mobilde mega menü kapalıdır; aynı kartlar kategori sayfasında çıkar.
