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
};

export function om(anahtar: string, dil: string): string {
  return M[anahtar]?.[dil] ?? M[anahtar]?.en ?? anahtar;
}

/** ULKELER/ODEME_YONTEMLERI gibi dil sözlüğü taşıyan kayıtlar için. */
export function ad(sozluk: Record<string, string>, dil: string): string {
  return sozluk[dil] ?? sozluk.en ?? "";
}
