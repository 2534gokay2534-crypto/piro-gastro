/**
 * PIRO GASTRO — GÖMÜLEBİLİR CANLI DESTEK PENCERESİ
 *
 * NEDEN VAR
 * Mağaza Shopify'a taşındığında vitrin Liquid ile çalışır; React bileşenimiz
 * orada çalışamaz. Bu dosya aynı sohbeti çerçevesiz, kütüphanesiz saf JS ile
 * yeniden kurar ve bu sunucudaki /api/chat/* uçlarını çağırır.
 *
 * SONUÇ: Süper Admin sohbet paneli, okunmamış rozeti ve sesli uyarı AYNEN
 * çalışmaya devam eder — çünkü veriler yine aynı veritabanına yazılır.
 * Shopify tarafında hiçbir şey değişmez, tek satır script yeter.
 *
 * KULLANIM (Shopify theme.liquid, </body> öncesi)
 *   <script src="https://SUNUCU/sohbet-gomulu.js" data-dil="sv" defer></script>
 *
 * Sunucu adresi script etiketinin kendi src'sinden okunur; ayrı ayar yoktur.
 * Sunucuda SOHBET_KAYNAKLARI değişkenine Shopify alan adı yazılmalıdır.
 */
(function () {
  "use strict";

  if (window.__pgSohbetKuruldu) return; // iki kez eklenirse ikinci kez kurma
  window.__pgSohbetKuruldu = true;

  /* --- ayarlar: kendi script etiketimizden okunur ------------------- */
  var betik = document.currentScript;
  if (!betik) {
    var hepsi = document.querySelectorAll('script[src*="sohbet-gomulu"]');
    betik = hepsi[hepsi.length - 1];
  }
  var KOK = betik ? new URL(betik.src).origin : "";
  var DIL = (betik && betik.getAttribute("data-dil")) || document.documentElement.lang || "sv";
  var dil = DIL.slice(0, 2).toLowerCase();

  var ANAHTAR_OTURUM = "pg_sohbet_oturum";
  var ANAHTAR_ZIYARETCI = "pg_sohbet_ziyaretci";

  /* --- metinler: React sürümüyle birebir aynı ---------------------- */
  var S = {
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
    epostaZorunlu: {
      sv: "E-post (så vi kan svara)", en: "E-mail (so we can reply)",
      tr: "E-posta (yanıt verebilmemiz için)", de: "E-Mail (damit wir antworten können)",
    },
    eposta: { sv: "E-post", en: "E-mail", tr: "E-posta", de: "E-Mail" },
    mesaj: { sv: "Meddelande", en: "Message", tr: "Mesajınız", de: "Nachricht" },
    istegeBagli: { sv: "valfritt", en: "optional", tr: "isteğe bağlı", de: "optional" },
    basla: { sv: "Starta chatten", en: "Start chat", tr: "Sohbeti başlat", de: "Chat starten" },
    birak: { sv: "Skicka meddelande", en: "Send message", tr: "Mesajı gönder", de: "Nachricht senden" },
    gonder: { sv: "Skicka", en: "Send", tr: "Gönder", de: "Senden" },
    gonderiliyor: { sv: "Skickar…", en: "Sending…", tr: "Gönderiliyor…", de: "Senden…" },
    yaz: { sv: "Skriv ett meddelande…", en: "Write a message…", tr: "Mesaj yazın…", de: "Nachricht schreiben…" },
    destek: { sv: "Support", en: "Support", tr: "Destek", de: "Support" },
    siz: { sv: "Du", en: "You", tr: "Siz", de: "Sie" },
    hata: {
      sv: "Kunde inte skicka. Försök igen.", en: "Could not send. Please try again.",
      tr: "Gönderilemedi. Lütfen tekrar deneyin.", de: "Konnte nicht gesendet werden. Bitte erneut versuchen.",
    },
    epostaHata: {
      sv: "Kontrollera e-postadressen.", en: "Please check the e-mail address.",
      tr: "E-posta adresini kontrol edin.", de: "Bitte E-Mail-Adresse prüfen.",
    },
    gorusmeKapandi: {
      sv: "Samtalet är avslutat. Skriv igen för att öppna det på nytt.",
      en: "This conversation was closed. Write again to reopen it.",
      tr: "Bu görüşme kapatıldı. Yeniden yazarsanız açılır.",
      de: "Das Gespräch wurde beendet. Schreiben Sie erneut, um es zu öffnen.",
    },
    epostaAcikla: {
      sv: "Chatten är inte aktiverad ännu. Ditt meddelande öppnas i ditt e-postprogram.",
      en: "Chat is not activated yet. Your message will open in your e-mail app.",
      tr: "Sohbet henüz etkin değil. Mesajınız e-posta uygulamanızda açılır.",
      de: "Der Chat ist noch nicht aktiviert. Ihre Nachricht öffnet sich in Ihrem E-Mail-Programm.",
    },
  };
  function M(k) {
    var d = S[k];
    return d ? d[dil] || d.en : k;
  }

  /* --- durum -------------------------------------------------------- */
  var d = {
    acik: false,
    hazir: null,
    cevrimIci: false,
    sirketEposta: "",
    karsilama: "",
    oturumId: null,
    mesajlar: [],
    kapali: false,
    gonderiliyor: false,
    hata: "",
    okunmamis: 0,
  };

  function sakla(a, v) { try { localStorage.setItem(a, v); } catch { /* özel kip: localStorage kapalı */ } }
  function oku(a) { try { return localStorage.getItem(a); } catch { return null; } }
  function kimlik() {
    try { return crypto.randomUUID(); }
    catch { return "z" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  }
  function saat(iso) {
    try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  }
  function kacis(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function epostaGecerli(v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function istek(yol, secenek) {
    return fetch(KOK + yol, secenek).then(function (r) { return r.json(); });
  }

  /* --- görünüm ------------------------------------------------------ */
  var stil = document.createElement("style");
  stil.textContent = [
    ".pg-s,.pg-s *{box-sizing:border-box;font-family:inherit}",
    ".pg-s-btn{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:56px;height:56px;",
    "border:0;border-radius:9999px;background:#0a1b2e;color:#fff;cursor:pointer;",
    "box-shadow:0 10px 30px rgba(5,13,24,.35);display:flex;align-items:center;justify-content:center;",
    "margin-bottom:env(safe-area-inset-bottom,0px);transition:background .15s}",
    ".pg-s-btn:hover{background:#0e2438}",
    ".pg-s-btn:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(200,162,74,.5)}",
    ".pg-s-rozet{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;",
    "border-radius:9999px;background:#bb3b2b;color:#fff;font-size:11px;font-weight:700;",
    "display:flex;align-items:center;justify-content:center}",
    ".pg-s-pencere{position:fixed;right:16px;bottom:16px;z-index:2147483001;width:360px;max-width:calc(100vw - 32px);",
    "height:520px;max-height:calc(100vh - 32px);background:#fff;border-radius:16px;overflow:hidden;",
    "display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(5,13,24,.4);color:#39424d;font-size:14px}",
    "@media (max-width:480px){.pg-s-pencere{right:0;bottom:0;width:100vw;max-width:100vw;height:100dvh;",
    "max-height:100dvh;border-radius:0}}",
    ".pg-s-bas{background:#0a1b2e;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}",
    ".pg-s-bas h3{margin:0;font-size:15px;font-weight:600}",
    ".pg-s-durum{font-size:12px;opacity:.85;display:flex;align-items:center;gap:6px;margin-top:2px}",
    ".pg-s-nokta{width:8px;height:8px;border-radius:9999px;background:#8794a3}",
    ".pg-s-nokta.on{background:#1a7f5a}",
    ".pg-s-x{margin-left:auto;background:transparent;border:0;color:#fff;cursor:pointer;padding:6px;border-radius:8px}",
    ".pg-s-x:hover{background:rgba(255,255,255,.12)}",
    ".pg-s-liste{flex:1;overflow-y:auto;padding:16px;background:#f7f9fb;display:flex;flex-direction:column;gap:10px}",
    ".pg-s-m{max-width:82%;padding:9px 12px;border-radius:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word}",
    ".pg-s-m.ziyaretci{align-self:flex-end;background:#0a1b2e;color:#fff;border-bottom-right-radius:4px}",
    ".pg-s-m.agent{align-self:flex-start;background:#fff;border:1px solid #dfe5ec;border-bottom-left-radius:4px}",
    ".pg-s-zaman{font-size:11px;opacity:.6;margin-top:3px;display:block}",
    ".pg-s-not{text-align:center;font-size:12px;color:#5a6674;padding:8px}",
    ".pg-s-alt{padding:12px;border-top:1px solid #dfe5ec;background:#fff;display:flex;flex-direction:column;gap:8px}",
    ".pg-s-alt input,.pg-s-alt textarea{width:100%;border:1px solid #c7d0da;border-radius:10px;padding:10px 12px;",
    "font-size:16px;color:#39424d;background:#fff}", // 16px: iOS'ta odaklanınca yakınlaştırmayı önler
    ".pg-s-alt textarea{resize:none;min-height:70px}",
    ".pg-s-alt input:focus,.pg-s-alt textarea:focus{outline:none;border-color:#2f6396;box-shadow:0 0 0 3px rgba(47,99,150,.15)}",
    ".pg-s-satir{display:flex;gap:8px;align-items:flex-end}",
    ".pg-s-satir textarea{min-height:44px;height:44px}",
    ".pg-s-gonder{border:0;border-radius:10px;background:#0a1b2e;color:#fff;padding:11px 16px;font-size:14px;",
    "font-weight:600;cursor:pointer;white-space:nowrap}",
    ".pg-s-gonder:disabled{opacity:.55;cursor:default}",
    ".pg-s-hata{color:#bb3b2b;font-size:12px}",
    ".pg-s-ipucu{font-size:12px;color:#5a6674;line-height:1.45}",
  ].join("");
  document.head.appendChild(stil);

  var kok = document.createElement("div");
  kok.className = "pg-s";
  kok.setAttribute("data-pg-sohbet", "1");

  var dugme = document.createElement("button");
  dugme.type = "button";
  dugme.className = "pg-s-btn";
  dugme.setAttribute("aria-label", M("ac"));

  var pencere = document.createElement("div");
  pencere.className = "pg-s-pencere";
  pencere.setAttribute("role", "dialog");
  pencere.setAttribute("aria-label", M("baslik"));
  pencere.style.display = "none";

  kok.appendChild(dugme);
  kok.appendChild(pencere);
  (document.body || document.documentElement).appendChild(kok);

  var SIMGE_SOHBET =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.7L3 21l1.9-5.1A8.2 8.2 0 0 1 4 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 8.4Z"' +
    ' stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var SIMGE_KAPAT =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function dugmeCiz() {
    dugme.innerHTML =
      (d.acik ? SIMGE_KAPAT : SIMGE_SOHBET) +
      (!d.acik && d.okunmamis ? '<span class="pg-s-rozet">' + d.okunmamis + "</span>" : "");
  }

  function ciz() {
    dugmeCiz();
    pencere.style.display = d.acik ? "flex" : "none";
    if (!d.acik) return;

    var gorusmeVar = !!d.oturumId;
    var h = "";

    h +=
      '<div class="pg-s-bas"><div><h3>' + kacis(M("baslik")) + "</h3>" +
      '<div class="pg-s-durum"><span class="pg-s-nokta' + (d.hazir && d.cevrimIci ? " on" : "") + '"></span>' +
      kacis(d.hazir && d.cevrimIci ? M("cevrimIci") : M("cevrimDisi")) +
      '</div></div><button type="button" class="pg-s-x" data-is="kapat" aria-label="' +
      kacis(M("kapat")) + '">' + SIMGE_KAPAT + "</button></div>";

    if (gorusmeVar) {
      h += '<div class="pg-s-liste" id="pg-s-liste">';
      for (var i = 0; i < d.mesajlar.length; i++) {
        var m = d.mesajlar[i];
        var benim = m.kim === "visitor";
        h +=
          '<div class="pg-s-m ' + (benim ? "ziyaretci" : "agent") + '">' +
          kacis(m.metin) +
          '<span class="pg-s-zaman">' + kacis(benim ? M("siz") : M("destek")) + " · " + saat(m.zaman) + "</span></div>";
      }
      if (d.kapali) h += '<div class="pg-s-not">' + kacis(M("gorusmeKapandi")) + "</div>";
      h += "</div>";

      h +=
        '<form class="pg-s-alt" data-is="gonder"><div class="pg-s-satir">' +
        '<textarea name="metin" rows="1" placeholder="' + kacis(M("yaz")) + '" maxlength="2000"></textarea>' +
        '<button class="pg-s-gonder" type="submit"' + (d.gonderiliyor ? " disabled" : "") + ">" +
        kacis(d.gonderiliyor ? M("gonderiliyor") : M("gonder")) + "</button></div>" +
        (d.hata ? '<div class="pg-s-hata">' + kacis(d.hata) + "</div>" : "") +
        "</form>";
    } else {
      var vtYok = d.hazir === false;
      h += '<div class="pg-s-liste"><div class="pg-s-ipucu">';
      h += kacis(vtYok ? M("epostaAcikla") : d.cevrimIci ? M("giris") : M("girisKapali"));
      if (d.karsilama) h += "<br><br>" + kacis(d.karsilama);
      h += "</div></div>";

      h +=
        '<form class="pg-s-alt" data-is="basla">' +
        '<input name="ad" placeholder="' + kacis(M("ad")) + " (" + kacis(M("istegeBagli")) + ')" maxlength="80">' +
        '<input name="eposta" type="email" placeholder="' +
        kacis(!vtYok && d.cevrimIci ? M("eposta") + " (" + M("istegeBagli") + ")" : M("epostaZorunlu")) +
        '" maxlength="120">' +
        '<textarea name="metin" placeholder="' + kacis(M("mesaj")) + '" maxlength="2000"></textarea>' +
        (d.hata ? '<div class="pg-s-hata">' + kacis(d.hata) + "</div>" : "") +
        '<button class="pg-s-gonder" type="submit"' + (d.gonderiliyor ? " disabled" : "") + ">" +
        kacis(d.gonderiliyor ? M("gonderiliyor") : d.cevrimIci && !vtYok ? M("basla") : M("birak")) +
        "</button></form>";
    }

    pencere.innerHTML = h;
    var liste = pencere.querySelector("#pg-s-liste");
    if (liste) liste.scrollTop = liste.scrollHeight;
  }

  /* --- olaylar ------------------------------------------------------ */
  dugme.addEventListener("click", function () {
    d.acik = !d.acik;
    if (d.acik) d.okunmamis = 0;
    ciz();
    var ilk = pencere.querySelector("textarea");
    if (d.acik && ilk && window.innerWidth > 480) ilk.focus();
  });

  pencere.addEventListener("click", function (e) {
    var t = e.target.closest("[data-is=kapat]");
    if (t) { d.acik = false; ciz(); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && d.acik) { d.acik = false; ciz(); }
  });

  pencere.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.getAttribute("data-is") === "basla") basla(f);
    else gonder(f);
  });

  // Masaüstünde Enter gönderir, Shift+Enter satır atlar
  pencere.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.shiftKey || window.innerWidth <= 480) return;
    var f = e.target.form;
    if (!f || f.getAttribute("data-is") !== "gonder") return;
    e.preventDefault();
    gonder(f);
  });

  function basla(f) {
    var ad = f.ad.value.trim(), eposta = f.eposta.value.trim(), metin = f.metin.value.trim();
    if (!metin || d.gonderiliyor) return;

    // Veritabanı yok → mesaj e-posta uygulamasında açılır (React sürümüyle aynı)
    if (d.hazir === false) {
      window.location.href =
        "mailto:" + d.sirketEposta +
        "?subject=" + encodeURIComponent("Web — " + (ad || M("baslik"))) +
        "&body=" + encodeURIComponent(metin + "\n\n---\n" + ad + "\n" + eposta + "\n" + location.href);
      return;
    }
    if (!d.cevrimIci && (!eposta || !epostaGecerli(eposta))) {
      d.hata = M("epostaHata"); ciz(); return;
    }

    d.gonderiliyor = true; d.hata = ""; ciz();
    if (!oku(ANAHTAR_ZIYARETCI)) sakla(ANAHTAR_ZIYARETCI, kimlik());

    istek("/api/chat/baslat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ad: ad, eposta: eposta, metin: metin,
        ziyaretci: oku(ANAHTAR_ZIYARETCI) || "",
        dil: dil, sayfa: location.pathname,
      }),
    })
      .then(function (r) {
        if (r.ok && r.oturumId) {
          d.oturumId = r.oturumId;
          d.mesajlar = r.mesajlar || [];
          d.cevrimIci = !!r.cevrimIci;
          sakla(ANAHTAR_OTURUM, r.oturumId);
          yoklamayiKur();
        } else if (r.hazir === false) {
          d.hazir = false;
        } else {
          d.hata = r.hata === "eposta" ? M("epostaHata") : M("hata");
        }
      })
      .catch(function () { d.hata = M("hata"); })
      .then(function () { d.gonderiliyor = false; ciz(); });
  }

  function gonder(f) {
    var metin = f.metin.value.trim();
    if (!metin || !d.oturumId || d.gonderiliyor) return;
    f.metin.value = "";
    d.gonderiliyor = true; d.hata = ""; ciz();

    istek("/api/chat/gonder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ oturumId: d.oturumId, metin: metin }),
    })
      .then(function (r) {
        if (r.ok && r.mesaj) {
          var v = d.mesajlar.some(function (m) { return m.id === r.mesaj.id; });
          if (!v) d.mesajlar.push(r.mesaj);
          d.kapali = false;
        } else {
          d.hata = M("hata");
        }
      })
      .catch(function () { d.hata = M("hata"); })
      .then(function () { d.gonderiliyor = false; ciz(); });
  }

  /* --- yoklama: yeni yanıt geldi mi? -------------------------------- */
  var zamanlayici = null;

  function yokla() {
    if (!d.oturumId || d.hazir === false) return;
    var son = d.mesajlar.length ? d.mesajlar[d.mesajlar.length - 1].zaman : "";
    istek("/api/chat/mesajlar?o=" + encodeURIComponent(d.oturumId) + (son ? "&sonra=" + encodeURIComponent(son) : ""))
      .then(function (r) {
        if (!r.ok) { if (r.hazir === false) d.hazir = false; return; }
        d.cevrimIci = !!r.cevrimIci;
        d.kapali = !!r.kapali;
        if (r.mesajlar && r.mesajlar.length) {
          var varOlan = {};
          d.mesajlar.forEach(function (m) { varOlan[m.id] = 1; });
          var yeni = r.mesajlar.filter(function (m) { return !varOlan[m.id]; });
          if (yeni.length) {
            d.mesajlar = d.mesajlar.concat(yeni);
            if (!d.acik) {
              var danisman = yeni.filter(function (m) { return m.kim === "agent"; }).length;
              d.okunmamis += danisman;
            }
          }
        }
        ciz();
      })
      .catch(function () { /* ağ hatası — sonraki turda yeniden denenir */ })
      .then(yoklamayiKur);
  }

  function yoklamayiKur() {
    if (zamanlayici) clearTimeout(zamanlayici);
    if (!d.oturumId || d.hazir === false) return;
    zamanlayici = setTimeout(yokla, d.acik ? 4000 : 25000);
  }

  // Arka plan sekmesinde tarayıcı zamanlayıcıyı yavaşlatır; öne gelince hemen tazele
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && d.oturumId) yokla();
  });

  /* --- ilk yükleme -------------------------------------------------- */
  ciz();
  istek("/api/chat/durum")
    .then(function (r) {
      d.hazir = !!r.hazir;
      d.cevrimIci = !!r.cevrimIci;
      d.sirketEposta = r.eposta || "";
      d.karsilama = r.karsilama || "";
      var kayitli = oku(ANAHTAR_OTURUM);
      if (kayitli && d.hazir) { d.oturumId = kayitli; yokla(); }
      ciz();
    })
    .catch(function () { d.hazir = false; ciz(); });
})();
