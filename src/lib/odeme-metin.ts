/**
 * ÖDEME EKRANI METİNLERİ
 *
 * i18n.ts'e dokunulmaz — mevcut çeviriler bozulmasın diye ödeme akışının
 * metinleri (sohbette olduğu gibi) ayrı tutulur. Dil yoksa İngilizce'ye düşer.
 */

const M: Record<string, Record<string, string>> = {
  /* --- başlık --- */
  baslik: { sv: "Kassa", en: "Checkout", tr: "Ödeme", de: "Kasse" },
  altBaslik: {
    sv: "Fyll i företagsuppgifter så bekräftar vi ordern via e-post.",
    en: "Enter your company details and we will confirm the order by e-mail.",
    tr: "Firma bilgilerinizi girin, siparişi e-posta ile onaylayalım.",
    de: "Geben Sie Ihre Firmendaten ein; wir bestätigen die Bestellung per E-Mail.",
  },
  sepet: { sv: "Varukorg", en: "Cart", tr: "Sepet", de: "Warenkorb" },
  anasayfa: { sv: "Hem", en: "Home", tr: "Ana sayfa", de: "Startseite" },

  /* --- bölümler --- */
  firmaBolum: { sv: "Företag", en: "Company", tr: "Firma", de: "Firma" },
  teslimatBolum: { sv: "Leveransadress", en: "Delivery address", tr: "Teslimat adresi", de: "Lieferadresse" },
  odemeBolum: { sv: "Betalsätt", en: "Payment method", tr: "Ödeme yöntemi", de: "Zahlungsart" },
  ozetBolum: { sv: "Sammanfattning", en: "Summary", tr: "Özet", de: "Zusammenfassung" },

  /* --- alanlar --- */
  firma: { sv: "Företagsnamn", en: "Company name", tr: "Firma adı", de: "Firmenname" },
  vergiNo: { sv: "Organisationsnummer", en: "Company reg. no.", tr: "Vergi numarası", de: "Handelsregisternr." },
  ad: { sv: "Kontaktperson", en: "Contact person", tr: "İletişim kişisi", de: "Ansprechpartner" },
  eposta: { sv: "E-post", en: "E-mail", tr: "E-posta", de: "E-Mail" },
  telefon: { sv: "Telefon", en: "Phone", tr: "Telefon", de: "Telefon" },
  adres: { sv: "Gatuadress", en: "Street address", tr: "Adres", de: "Straße und Hausnr." },
  postaKodu: { sv: "Postnummer", en: "Postal code", tr: "Posta kodu", de: "PLZ" },
  sehir: { sv: "Ort", en: "City", tr: "Şehir", de: "Ort" },
  ulke: { sv: "Land", en: "Country", tr: "Ülke", de: "Land" },
  not: { sv: "Meddelande (valfritt)", en: "Note (optional)", tr: "Not (isteğe bağlı)", de: "Nachricht (optional)" },
  istegeBagli: { sv: "valfritt", en: "optional", tr: "isteğe bağlı", de: "optional" },

  /* --- özet --- */
  urun: { sv: "Produkt", en: "Product", tr: "Ürün", de: "Produkt" },
  adet: { sv: "Antal", en: "Qty", tr: "Adet", de: "Menge" },
  araToplam: { sv: "Delsumma", en: "Subtotal", tr: "Ara toplam", de: "Zwischensumme" },
  kargo: { sv: "Frakt", en: "Shipping", tr: "Kargo", de: "Versand" },
  ucretsizKargo: { sv: "Fri frakt", en: "Free shipping", tr: "Ücretsiz kargo", de: "Kostenloser Versand" },
  indirim: { sv: "Rabatt", en: "Discount", tr: "İndirim", de: "Rabatt" },
  kdv: { sv: "Moms", en: "VAT", tr: "KDV", de: "MwSt." },
  genelToplam: { sv: "Att betala", en: "Total", tr: "Genel toplam", de: "Gesamtbetrag" },
  kdvDahil: { sv: "inkl. moms", en: "incl. VAT", tr: "KDV dahil", de: "inkl. MwSt." },

  /* --- eylem --- */
  gonder: { sv: "Skicka order", en: "Place order", tr: "Siparişi tamamla", de: "Bestellung absenden" },
  gonderiliyor: { sv: "Skickar…", en: "Sending…", tr: "Gönderiliyor…", de: "Wird gesendet…" },
  sepeteDon: { sv: "Tillbaka till varukorgen", en: "Back to cart", tr: "Sepete dön", de: "Zurück zum Warenkorb" },
  kosul: {
    sv: "Genom att skicka ordern bekräftar du uppgifterna ovan. Ingen betalning dras nu.",
    en: "By placing the order you confirm the details above. No payment is taken now.",
    tr: "Siparişi gönderdiğinizde yukarıdaki bilgileri onaylamış olursunuz. Şu anda tahsilat yapılmaz.",
    de: "Mit dem Absenden bestätigen Sie die obigen Angaben. Es wird jetzt keine Zahlung eingezogen.",
  },

  /* --- uyarılar --- */
  bosSepet: { sv: "Din varukorg är tom", en: "Your cart is empty", tr: "Sepetiniz boş", de: "Ihr Warenkorb ist leer" },
  alisverise: { sv: "Fortsätt handla", en: "Continue shopping", tr: "Alışverişe devam et", de: "Weiter einkaufen" },
  zorunlu: { sv: "Fyll i fältet", en: "This field is required", tr: "Bu alan zorunlu", de: "Pflichtfeld" },
  epostaHata: { sv: "Ogiltig e-postadress", en: "Invalid e-mail address", tr: "Geçersiz e-posta adresi", de: "Ungültige E-Mail-Adresse" },
  secimHata: { sv: "Välj ett alternativ", en: "Choose an option", tr: "Bir seçenek seçin", de: "Bitte auswählen" },
  formHata: {
    sv: "Kontrollera de markerade fälten.",
    en: "Please check the highlighted fields.",
    tr: "İşaretli alanları kontrol edin.",
    de: "Bitte prüfen Sie die markierten Felder.",
  },
  fiyatSorulacak: {
    sv: "En eller flera artiklar prissätts på förfrågan. Vi bekräftar priset innan leverans.",
    en: "One or more items are priced on request. We confirm the price before delivery.",
    tr: "Bir veya daha fazla ürünün fiyatı sorulmak üzeredir. Fiyatı teslimattan önce onaylarız.",
    de: "Ein oder mehrere Artikel werden auf Anfrage bepreist. Wir bestätigen den Preis vor der Lieferung.",
  },

  /* --- onay sayfası --- */
  tesekkur: { sv: "Tack för din order!", en: "Thank you for your order!", tr: "Siparişiniz alındı!", de: "Vielen Dank für Ihre Bestellung!" },
  siparisNo: { sv: "Ordernummer", en: "Order number", tr: "Sipariş numarası", de: "Bestellnummer" },
  onayMetin: {
    sv: "Vi har tagit emot din order och återkommer med orderbekräftelse via e-post.",
    en: "We have received your order and will follow up with a confirmation by e-mail.",
    tr: "Siparişinizi aldık; onay e-postasıyla size döneceğiz.",
    de: "Wir haben Ihre Bestellung erhalten und melden uns per E-Mail mit der Bestätigung.",
  },
  kaydedilemedi: {
    sv: "Ordern kunde inte sparas i systemet just nu. Skicka sammanfattningen nedan till oss så tar vi hand om den direkt.",
    en: "The order could not be saved to our system right now. Send us the summary below and we will handle it directly.",
    tr: "Sipariş şu anda sisteme kaydedilemedi. Aşağıdaki özeti bize gönderin, hemen ilgilenelim.",
    de: "Die Bestellung konnte gerade nicht gespeichert werden. Senden Sie uns die Zusammenfassung unten, wir kümmern uns direkt darum.",
  },
  epostaGonder: { sv: "Skicka via e-post", en: "Send by e-mail", tr: "E-posta ile gönder", de: "Per E-Mail senden" },
  yazdir: { sv: "Skriv ut", en: "Print", tr: "Yazdır", de: "Drucken" },
  devamEt: { sv: "Fortsätt handla", en: "Continue shopping", tr: "Alışverişe devam et", de: "Weiter einkaufen" },
  /* --- ödeme sağlayıcı --- */
  guvenliOdeme: { sv: "Säker betalning", en: "Secure payment", tr: "Güvenli ödeme", de: "Sichere Zahlung" },
  saglayiciMetin: {
    sv: "Du betalar hos Stripe. Kortuppgifter når aldrig våra servrar.",
    en: "You pay via Stripe. Card details never reach our servers.",
    tr: "Ödemeyi Stripe üzerinden yaparsınız. Kart bilgileri sunucularımıza hiç ulaşmaz.",
    de: "Sie zahlen über Stripe. Kartendaten erreichen unsere Server nie.",
  },
  demoUyari: {
    sv: "DEMOLÄGE — ingen riktig betalning dras. Ordern skapas för test.",
    en: "DEMO MODE — no real payment is taken. The order is created for testing.",
    tr: "DEMO MODU — gerçek tahsilat yapılmaz. Sipariş test amaçlı oluşturulur.",
    de: "DEMO-MODUS — es wird keine echte Zahlung eingezogen. Testbestellung.",
  },
  odemeKapali: {
    sv: "Kortbetalning är tillfälligt stängd. Kontakta oss så hjälper vi dig med ordern.",
    en: "Card payment is temporarily unavailable. Contact us and we will help you with the order.",
    tr: "Kartlı ödeme geçici olarak kapalı. Bize ulaşın, siparişinizde yardımcı olalım.",
    de: "Kartenzahlung ist vorübergehend nicht verfügbar. Kontaktieren Sie uns, wir helfen bei der Bestellung.",
  },
  odemeyeGec: { sv: "Gå till betalning", en: "Go to payment", tr: "Ödemeye geç", de: "Zur Zahlung" },
  sekBilgi: {
    sv: "Betalningen dras i SEK.",
    en: "Payment is charged in SEK.",
    tr: "Tahsilat SEK üzerinden yapılır.",
    de: "Die Zahlung erfolgt in SEK.",
  },

  /* --- kurumsal fatura --- */
  faturaBaslik: { sv: "Faktura för företag", en: "Invoice for businesses", tr: "Kurumsal fatura", de: "Rechnung für Firmen" },
  faturaKapali: {
    sv: "Fakturabetalning öppnas efter godkänd ansökan.",
    en: "Invoice payment is enabled after an approved application.",
    tr: "Fatura ile ödeme, başvurunuz onaylandıktan sonra açılır.",
    de: "Rechnungskauf wird nach genehmigtem Antrag freigeschaltet.",
  },
  faturaBasvur: { sv: "Ansök om fakturabetalning", en: "Apply for invoice payment", tr: "Fatura ile ödeme başvurusu", de: "Rechnungskauf beantragen" },
  faturaAcik: {
    sv: "Fakturabetalning är godkänd för ditt företag.",
    en: "Invoice payment is approved for your company.",
    tr: "Firmanız için fatura ile ödeme onaylı.",
    de: "Rechnungskauf ist für Ihr Unternehmen freigegeben.",
  },
  faturaYetkiYok: {
    sv: "Fakturabetalning är inte godkänd för de uppgifter du angav.",
    en: "Invoice payment is not approved for the details you entered.",
    tr: "Girdiğiniz bilgiler için fatura ile ödeme onaylı değil.",
    de: "Rechnungskauf ist für die angegebenen Daten nicht freigegeben.",
  },
  faturaKontrol: { sv: "Kontrollera", en: "Check", tr: "Kontrol et", de: "Prüfen" },

  /* --- başvuru formu --- */
  bvBaslik: { sv: "Ansökan om fakturabetalning", en: "Invoice payment application", tr: "Fatura ile ödeme başvurusu", de: "Antrag auf Rechnungskauf" },
  bvOzet: {
    sv: "Fyll i företagsuppgifterna. Vi gör en kreditkontroll och återkommer via e-post.",
    en: "Fill in your company details. We run a credit check and reply by e-mail.",
    tr: "Firma bilgilerinizi girin. Kredi kontrolü yapıp e-posta ile döneceğiz.",
    de: "Bitte Firmendaten ausfüllen. Wir prüfen die Bonität und melden uns per E-Mail.",
  },
  bvSirket: { sv: "Företagsnamn", en: "Company name", tr: "Şirket adı", de: "Firmenname" },
  bvOrgNr: { sv: "Organisationsnummer", en: "Company reg. no.", tr: "Organizasyon numarası", de: "Handelsregisternummer" },
  bvVatNr: { sv: "Momsregistreringsnummer", en: "VAT number", tr: "KDV numarası", de: "USt-IdNr." },
  bvYetkili: { sv: "Behörig person", en: "Authorised person", tr: "Yetkili kişi", de: "Bevollmächtigte Person" },
  bvFaturaAdres: { sv: "Fakturaadress", en: "Billing address", tr: "Fatura adresi", de: "Rechnungsadresse" },
  bvGonder: { sv: "Skicka ansökan", en: "Submit application", tr: "Başvuruyu gönder", de: "Antrag senden" },
  bvOrgNrHata: {
    sv: "Ange 10 siffror, t.ex. 556677-8899",
    en: "Enter 10 digits, e.g. 556677-8899",
    tr: "10 hane girin, örn. 556677-8899",
    de: "10 Ziffern eingeben, z. B. 556677-8899",
  },
  bvAlindi: { sv: "Ansökan mottagen", en: "Application received", tr: "Başvurunuz alındı", de: "Antrag erhalten" },
  bvAlindiMetin: {
    sv: "Vi granskar ansökan och svarar via e-post. Under tiden kan du betala med kort, Swish eller Klarna.",
    en: "We are reviewing your application and will reply by e-mail. Meanwhile you can pay by card, Swish or Klarna.",
    tr: "Başvurunuzu inceleyip e-posta ile döneceğiz. Bu arada kart, Swish veya Klarna ile ödeyebilirsiniz.",
    de: "Wir prüfen Ihren Antrag und antworten per E-Mail. In der Zwischenzeit können Sie per Karte, Swish oder Klarna zahlen.",
  },
  bvZatenVar: {
    sv: "Det finns redan en ansökan för det här organisationsnumret.",
    en: "An application already exists for this company registration number.",
    tr: "Bu organizasyon numarası için zaten bir başvuru var.",
    de: "Für diese Registernummer liegt bereits ein Antrag vor.",
  },

  /* --- hata durumları --- */
  odemeIptal: {
    sv: "Betalningen avbröts. Varukorgen är kvar.",
    en: "Payment was cancelled. Your cart is intact.",
    tr: "Ödeme iptal edildi. Sepetiniz duruyor.",
    de: "Die Zahlung wurde abgebrochen. Ihr Warenkorb bleibt erhalten.",
  },
  sistemHata: {
    sv: "Betalningen kunde inte startas just nu. Försök igen eller kontakta oss.",
    en: "Payment could not be started right now. Please try again or contact us.",
    tr: "Ödeme şu anda başlatılamadı. Tekrar deneyin veya bize ulaşın.",
    de: "Die Zahlung konnte gerade nicht gestartet werden. Bitte erneut versuchen oder uns kontaktieren.",
  },
  odemeBekliyor: {
    sv: "Vi väntar på betalningsbekräftelse. Du får ett mejl så snart den är klar.",
    en: "We are waiting for payment confirmation. You will get an e-mail as soon as it clears.",
    tr: "Ödeme onayını bekliyoruz. Onaylanır onaylanmaz e-posta göndereceğiz.",
    de: "Wir warten auf die Zahlungsbestätigung. Sie erhalten eine E-Mail, sobald sie vorliegt.",
  },
  odendi: { sv: "Betald", en: "Paid", tr: "Ödendi", de: "Bezahlt" },
  faturaSiparis: {
    sv: "Fakturan skickas med orderbekräftelsen.",
    en: "The invoice will be sent with the order confirmation.",
    tr: "Fatura, sipariş onayıyla birlikte gönderilecek.",
    de: "Die Rechnung wird mit der Auftragsbestätigung versendet.",
  },
  /* --- siparişlerim / makbuz --- */
  siparislerim: { sv: "Mina ordrar", en: "My orders", tr: "Siparişlerim", de: "Meine Bestellungen" },
  siparislerimOzet: {
    sv: "Alla dina ordrar och kvitton, sparade i din webbläsare.",
    en: "All your orders and receipts, saved in your browser.",
    tr: "Tüm siparişleriniz ve makbuzlarınız, tarayıcınızda saklı.",
    de: "Alle Ihre Bestellungen und Belege, in Ihrem Browser gespeichert.",
  },
  siparisYok: { sv: "Inga ordrar ännu", en: "No orders yet", tr: "Henüz siparişiniz yok", de: "Noch keine Bestellungen" },
  makbuz: { sv: "Kvitto", en: "Receipt", tr: "Makbuz", de: "Beleg" },
  fatura: { sv: "Faktura", en: "Invoice", tr: "Fatura", de: "Rechnung" },
  makbuzGoruntule: { sv: "Visa kvitto", en: "View receipt", tr: "Makbuzu görüntüle", de: "Beleg ansehen" },
  pdfIndir: { sv: "Ladda ner PDF", en: "Download PDF", tr: "PDF indir", de: "PDF herunterladen" },
  pdfAc: { sv: "Öppna PDF", en: "Open PDF", tr: "PDF'i aç", de: "PDF öffnen" },
  yazdirBelge: { sv: "Skriv ut", en: "Print", tr: "Yazdır", de: "Drucken" },
  belgeNot: { sv: "Meddelande", en: "Note", tr: "Not", de: "Nachricht" },
  belgeler: { sv: "Dokument", en: "Documents", tr: "Belgeler", de: "Dokumente" },
  odemeDurumu: { sv: "Betalstatus", en: "Payment status", tr: "Ödeme durumu", de: "Zahlungsstatus" },
  odemeYontemi: { sv: "Betalsätt", en: "Payment method", tr: "Ödeme yöntemi", de: "Zahlungsart" },
  tarihSaat: { sv: "Datum och tid", en: "Date and time", tr: "Tarih ve saat", de: "Datum und Uhrzeit" },
  musteri: { sv: "Kund", en: "Customer", tr: "Müşteri", de: "Kunde" },
  teslimatAdresi: { sv: "Leveransadress", en: "Delivery address", tr: "Teslimat adresi", de: "Lieferadresse" },
  urunler: { sv: "Produkter", en: "Products", tr: "Ürünler", de: "Produkte" },
  birimFiyat: { sv: "À-pris", en: "Unit price", tr: "Birim fiyat", de: "Einzelpreis" },
  tutar: { sv: "Belopp", en: "Amount", tr: "Tutar", de: "Betrag" },

  /* --- erişimi geri kazanma --- */
  erisimBaslik: { sv: "Hitta din order", en: "Find your order", tr: "Siparişinizi bulun", de: "Bestellung finden" },
  erisimOzet: {
    sv: "Ange ordernummer och e-post så visar vi alla dina ordrar och kvitton.",
    en: "Enter your order number and e-mail to see all your orders and receipts.",
    tr: "Sipariş numaranızı ve e-postanızı girin; tüm siparişlerinizi ve makbuzlarınızı gösterelim.",
    de: "Bestellnummer und E-Mail eingeben, um alle Bestellungen und Belege zu sehen.",
  },
  erisimNo: { sv: "Ordernummer", en: "Order number", tr: "Sipariş numarası", de: "Bestellnummer" },
  erisimAc: { sv: "Visa mina ordrar", en: "Show my orders", tr: "Siparişlerimi göster", de: "Meine Bestellungen zeigen" },
  erisimHata: {
    sv: "Ordernummer och e-post stämmer inte överens.",
    en: "Order number and e-mail do not match.",
    tr: "Sipariş numarası ile e-posta eşleşmiyor.",
    de: "Bestellnummer und E-Mail stimmen nicht überein.",
  },
  cikisYap: { sv: "Logga ut", en: "Sign out", tr: "Çıkış yap", de: "Abmelden" },
  belgeYetkisiz: {
    sv: "Du har inte behörighet till det här dokumentet.",
    en: "You are not authorised to view this document.",
    tr: "Bu belgeyi görüntüleme yetkiniz yok.",
    de: "Sie sind nicht berechtigt, dieses Dokument anzusehen.",
  },
};

export function om(anahtar: string, dil: string): string {
  return M[anahtar]?.[dil] ?? M[anahtar]?.en ?? anahtar;
}

/** ULKELER/ODEME_YONTEMLERI gibi dil sözlüğü taşıyan kayıtlar için. */
export function ad(sozluk: Record<string, string>, dil: string): string {
  return sozluk[dil] ?? sozluk.en ?? "";
}
