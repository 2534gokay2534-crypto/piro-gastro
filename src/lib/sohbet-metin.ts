/**
 * Sohbet penceresinin arayüz metinleri.
 *
 * Ayrı dosyada tutulur; mevcut i18n sözlüğüne dokunulmadı.
 * Dil karşılığı yoksa İngilizceye düşer — ürün metinlerinde
 * olduğu gibi karışık dil oluşmaz.
 */

type Dict = Record<string, Record<string, string>>;

export const SOHBET: Dict = {
  baslik: { sv: "Kundsupport", en: "Live support", tr: "Canlı destek", de: "Live-Support" },
  ac: { sv: "Öppna chatten", en: "Open chat", tr: "Sohbeti aç", de: "Chat öffnen" },
  kapat: { sv: "Stäng", en: "Close", tr: "Kapat", de: "Schließen" },
  cevrimIci: { sv: "Online nu", en: "Online now", tr: "Şu an çevrim içi", de: "Jetzt online" },
  cevrimDisi: { sv: "Offline", en: "Offline", tr: "Çevrim dışı", de: "Offline" },

  giris: {
    sv: "Skriv din fråga så svarar vi så snart vi kan.",
    en: "Write your question and we will reply as soon as we can.",
    tr: "Sorunuzu yazın, en kısa sürede yanıtlayalım.",
    de: "Schreiben Sie Ihre Frage, wir antworten so schnell wie möglich.",
  },
  girisKapali: {
    sv: "Vi är offline just nu. Lämna ett meddelande så återkommer vi via e-post.",
    en: "We are offline right now. Leave a message and we will reply by e-mail.",
    tr: "Şu anda çevrim dışıyız. Mesaj bırakın, e-posta ile dönelim.",
    de: "Wir sind gerade offline. Hinterlassen Sie eine Nachricht, wir melden uns per E-Mail.",
  },

  ad: { sv: "Ditt namn", en: "Your name", tr: "Adınız", de: "Ihr Name" },
  eposta: { sv: "E-post", en: "E-mail", tr: "E-posta", de: "E-Mail" },
  epostaZorunlu: {
    sv: "E-post (så vi kan svara)",
    en: "E-mail (so we can reply)",
    tr: "E-posta (yanıt verebilmemiz için)",
    de: "E-Mail (damit wir antworten können)",
  },
  mesaj: { sv: "Meddelande", en: "Message", tr: "Mesajınız", de: "Nachricht" },
  istegeBagli: { sv: "valfritt", en: "optional", tr: "isteğe bağlı", de: "optional" },

  basla: { sv: "Starta chatten", en: "Start chat", tr: "Sohbeti başlat", de: "Chat starten" },
  birak: { sv: "Skicka meddelande", en: "Send message", tr: "Mesajı gönder", de: "Nachricht senden" },
  gonder: { sv: "Skicka", en: "Send", tr: "Gönder", de: "Senden" },
  gonderiliyor: { sv: "Skickar…", en: "Sending…", tr: "Gönderiliyor…", de: "Senden…" },
  yaz: { sv: "Skriv ett meddelande…", en: "Write a message…", tr: "Mesaj yazın…", de: "Nachricht schreiben…" },

  alindi: {
    sv: "Tack! Ditt meddelande är mottaget. Vi svarar via e-post.",
    en: "Thank you! Your message was received. We will reply by e-mail.",
    tr: "Teşekkürler! Mesajınız alındı. E-posta ile döneceğiz.",
    de: "Danke! Ihre Nachricht ist eingegangen. Wir antworten per E-Mail.",
  },
  destek: { sv: "Support", en: "Support", tr: "Destek", de: "Support" },
  siz: { sv: "Du", en: "You", tr: "Siz", de: "Sie" },

  hata: {
    sv: "Kunde inte skicka. Försök igen.",
    en: "Could not send. Please try again.",
    tr: "Gönderilemedi. Lütfen tekrar deneyin.",
    de: "Konnte nicht gesendet werden. Bitte erneut versuchen.",
  },
  epostaHata: {
    sv: "Kontrollera e-postadressen.",
    en: "Please check the e-mail address.",
    tr: "E-posta adresini kontrol edin.",
    de: "Bitte E-Mail-Adresse prüfen.",
  },
  gorusmeKapandi: {
    sv: "Samtalet är avslutat. Skriv igen för att öppna det på nytt.",
    en: "This conversation was closed. Write again to reopen it.",
    tr: "Bu görüşme kapatıldı. Yeniden yazarsanız açılır.",
    de: "Das Gespräch wurde beendet. Schreiben Sie erneut, um es zu öffnen.",
  },

  // Veritabanı bağlı değilken gösterilir — mesaj e-posta ile gider.
  epostaIleYaz: {
    sv: "Skriv till oss via e-post",
    en: "Write to us by e-mail",
    tr: "Bize e-posta ile yazın",
    de: "Schreiben Sie uns per E-Mail",
  },
  epostaAcikla: {
    sv: "Chatten är inte aktiverad ännu. Ditt meddelande öppnas i ditt e-postprogram.",
    en: "Chat is not activated yet. Your message will open in your e-mail app.",
    tr: "Sohbet henüz etkin değil. Mesajınız e-posta uygulamanızda açılır.",
    de: "Der Chat ist noch nicht aktiviert. Ihre Nachricht öffnet sich in Ihrem E-Mail-Programm.",
  },
  yeniMesaj: { sv: "nytt svar", en: "new reply", tr: "yeni yanıt", de: "neue Antwort" },
};

export function st(key: string, lang: string): string {
  const d = SOHBET[key];
  if (!d) return key;
  return d[lang] ?? d.en ?? key;
}
