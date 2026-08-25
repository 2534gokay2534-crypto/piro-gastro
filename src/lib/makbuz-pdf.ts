import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ODEME_ADI, ODEME_DURUM, type Makbuz } from "./makbuz";

/**
 * MAKBUZ / FATURA PDF'İ
 *
 * pdf-lib ile sunucuda üretilir; harici servis veya tarayıcı gerekmez,
 * Vercel'in sunucusuz ortamında çalışır.
 *
 * Yazı tipi gömülür (Inter): pdf-lib'in yerleşik yazı tipleri WinAnsi'dir
 * ve Türkçe ş/ğ/ı/İ ile İsveççe å/ä/ö karakterlerini basamaz.
 */

const RENK = {
  lacivert: rgb(0.055, 0.098, 0.184),
  altin: rgb(0.78, 0.62, 0.29),
  metin: rgb(0.13, 0.16, 0.2),
  soluk: rgb(0.45, 0.5, 0.55),
  cizgi: rgb(0.85, 0.87, 0.89),
  zemin: rgb(0.96, 0.97, 0.98),
  ok: rgb(0.11, 0.53, 0.33),
  uyari: rgb(0.72, 0.45, 0.05),
};

const A4 = { g: 595.28, y: 841.89 };
const KENAR = 46;

let yaziCache: { normal: Uint8Array; kalin: Uint8Array } | null = null;

async function yaziOku() {
  if (yaziCache) return yaziCache;
  const kok = path.join(process.cwd(), "src", "assets", "fonts");
  const [normal, kalin] = await Promise.all([
    fs.readFile(path.join(kok, "Inter-Regular.ttf")),
    fs.readFile(path.join(kok, "Inter-Bold.ttf")),
  ]);
  yaziCache = { normal: new Uint8Array(normal), kalin: new Uint8Array(kalin) };
  return yaziCache;
}

const para = (cents: number) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100) + " EUR";

const tarihSaat = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(d);

/** Metni verilen genişliğe sığacak şekilde keser. */
function kirp(metin: string, yazi: PDFFont, punto: number, genislik: number): string {
  let m = metin;
  if (yazi.widthOfTextAtSize(m, punto) <= genislik) return m;
  while (m.length > 1 && yazi.widthOfTextAtSize(m + "…", punto) > genislik) m = m.slice(0, -1);
  return m + "…";
}

/** Ürün görselini indirir; başarısız olursa null döner (PDF yine üretilir). */
async function gorselIndir(url: string): Promise<{ veri: Uint8Array; tip: "png" | "jpg" } | null> {
  try {
    const c = new AbortController();
    const zaman = setTimeout(() => c.abort(), 4000);
    const r = await fetch(url, { signal: c.signal });
    clearTimeout(zaman);
    if (!r.ok) return null;
    const tur = r.headers.get("content-type") ?? "";
    const veri = new Uint8Array(await r.arrayBuffer());
    if (veri.byteLength > 3_000_000) return null; // çok büyük görseli atla
    if (tur.includes("png")) return { veri, tip: "png" };
    if (tur.includes("jpeg") || tur.includes("jpg")) return { veri, tip: "jpg" };
    return null;
  } catch {
    return null;
  }
}

export async function makbuzPdf(m: Makbuz, dil: string): Promise<Uint8Array> {
  const belge = await PDFDocument.create();
  belge.registerFontkit(fontkit);

  const { normal, kalin } = await yaziOku();
  const F = await belge.embedFont(normal, { subset: true });
  const FB = await belge.embedFont(kalin, { subset: true });

  belge.setTitle(`${m.tur === "fatura" ? "Faktura" : "Kvitto"} ${m.numara}`);
  belge.setAuthor("Piro Gastro Center AB");
  belge.setCreator("Piro Gastro Center AB");
  belge.setSubject(`${m.numara} · ${m.musteri.firma || m.musteri.ad}`);

  // Görselleri önden paralel indir (yalnızca ilk 12 kalem)
  const gorseller = await Promise.all(
    m.kalemler.slice(0, 12).map((k) => (k.gorsel ? gorselIndir(k.gorsel) : Promise.resolve(null))),
  );

  let sayfa = belge.addPage([A4.g, A4.y]);
  let y = A4.y - KENAR;

  const yaz = (
    metin: string,
    x: number,
    yy: number,
    punto = 9.5,
    yaziTipi: PDFFont = F,
    renk = RENK.metin,
  ) => sayfa.drawText(metin, { x, y: yy, size: punto, font: yaziTipi, color: renk });

  const sagaYaz = (metin: string, sagX: number, yy: number, punto = 9.5, yaziTipi: PDFFont = F, renk = RENK.metin) =>
    yaz(metin, sagX - yaziTipi.widthOfTextAtSize(metin, punto), yy, punto, yaziTipi, renk);

  const cizgi = (yy: number, renk = RENK.cizgi) =>
    sayfa.drawLine({ start: { x: KENAR, y: yy }, end: { x: A4.g - KENAR, y: yy }, thickness: 0.8, color: renk });

  /* ---------------- başlık ---------------- */
  sayfa.drawRectangle({ x: 0, y: A4.y - 92, width: A4.g, height: 92, color: RENK.lacivert });
  yaz("PIRO GASTRO", KENAR, A4.y - 46, 20, FB, rgb(1, 1, 1));
  yaz("PROFESSIONAL KITCHEN SOLUTIONS", KENAR, A4.y - 62, 7, F, RENK.altin);
  yaz("Piro Gastro Center AB · Industrigatan 24 · 211 32 Malmö · Sverige", KENAR, A4.y - 78, 7.5, F, rgb(0.75, 0.78, 0.82));

  const basligi = m.tur === "fatura" ? "FAKTURA" : "KVITTO";
  sagaYaz(basligi, A4.g - KENAR, A4.y - 46, 20, FB, rgb(1, 1, 1));
  sagaYaz(m.numara, A4.g - KENAR, A4.y - 64, 11, FB, RENK.altin);
  sagaYaz(tarihSaat(m.tarih), A4.g - KENAR, A4.y - 78, 7.5, F, rgb(0.75, 0.78, 0.82));

  y = A4.y - 116;

  /* ---------------- ödeme durumu ---------------- */
  const d = ODEME_DURUM[m.durum] ?? ODEME_DURUM.new;
  const durumMetni = d.ad[dil] ?? d.ad.en;
  const durumRenk = d.ton === "ok" ? RENK.ok : d.ton === "warn" ? RENK.uyari : RENK.soluk;
  const durumGen = FB.widthOfTextAtSize(durumMetni, 9) + 18;
  sayfa.drawRectangle({
    x: KENAR, y: y - 14, width: durumGen, height: 20,
    color: rgb(0.95, 0.97, 0.96), borderColor: durumRenk, borderWidth: 0.8,
  });
  yaz(durumMetni, KENAR + 9, y - 8, 9, FB, durumRenk);

  const yontemAdi = ODEME_ADI[m.odemeYontemi] ?? m.odemeYontemi;
  sagaYaz(yontemAdi, A4.g - KENAR, y - 8, 9, FB, RENK.metin);
  if (m.odemeTarihi) sagaYaz(tarihSaat(m.odemeTarihi), A4.g - KENAR, y - 20, 7.5, F, RENK.soluk);

  y -= 42;

  /* ---------------- müşteri / teslimat ---------------- */
  const sutun = (A4.g - KENAR * 2 - 20) / 2;
  const kutuY = y;
  const satirlarSol = [
    m.musteri.firma || m.musteri.ad,
    m.musteri.ad !== m.musteri.firma ? m.musteri.ad : "",
    m.musteri.eposta,
    m.musteri.telefon,
    m.musteri.vergiNo ? `Org.nr ${m.musteri.vergiNo}` : "",
    m.musteri.kdvNo ? `VAT ${m.musteri.kdvNo}` : "",
  ].filter(Boolean);
  const satirlarSag = [
    m.teslimat.ad,
    m.teslimat.adres,
    `${m.teslimat.postaKodu} ${m.teslimat.sehir}`.trim(),
    m.teslimat.ulke,
  ].filter(Boolean);

  const kutuYuk = Math.max(satirlarSol.length, satirlarSag.length) * 12 + 30;
  sayfa.drawRectangle({ x: KENAR, y: kutuY - kutuYuk, width: sutun, height: kutuYuk, color: RENK.zemin });
  sayfa.drawRectangle({ x: KENAR + sutun + 20, y: kutuY - kutuYuk, width: sutun, height: kutuYuk, color: RENK.zemin });

  yaz(dil === "sv" ? "KUND" : dil === "tr" ? "MÜŞTERİ" : dil === "de" ? "KUNDE" : "CUSTOMER", KENAR + 10, kutuY - 16, 7.5, FB, RENK.soluk);
  yaz(dil === "sv" ? "LEVERANSADRESS" : dil === "tr" ? "TESLİMAT ADRESİ" : dil === "de" ? "LIEFERADRESSE" : "DELIVERY ADDRESS", KENAR + sutun + 30, kutuY - 16, 7.5, FB, RENK.soluk);

  satirlarSol.forEach((t, i) => yaz(kirp(t, F, 9, sutun - 20), KENAR + 10, kutuY - 30 - i * 12, 9, i === 0 ? FB : F));
  satirlarSag.forEach((t, i) => yaz(kirp(t, F, 9, sutun - 20), KENAR + sutun + 30, kutuY - 30 - i * 12, 9, i === 0 ? FB : F));

  y = kutuY - kutuYuk - 26;

  /* ---------------- kalem başlıkları ---------------- */
  const X = { gorsel: KENAR, ad: KENAR + 42, adet: 372, birim: 440, kdv: 476, tutar: A4.g - KENAR };

  const basliklar = {
    urun: dil === "sv" ? "Produkt" : dil === "tr" ? "Ürün" : dil === "de" ? "Produkt" : "Product",
    adet: dil === "sv" ? "Antal" : dil === "tr" ? "Adet" : dil === "de" ? "Menge" : "Qty",
    birim: dil === "sv" ? "À-pris" : dil === "tr" ? "Birim" : dil === "de" ? "Einzel" : "Unit",
    kdv: dil === "sv" ? "Moms" : dil === "tr" ? "KDV" : dil === "de" ? "MwSt." : "VAT",
    tutar: dil === "sv" ? "Belopp" : dil === "tr" ? "Tutar" : dil === "de" ? "Betrag" : "Amount",
  };

  const kalemBasligi = () => {
    yaz(basliklar.urun, X.ad, y, 7.5, FB, RENK.soluk);
    sagaYaz(basliklar.adet, X.adet + 26, y, 7.5, FB, RENK.soluk);
    sagaYaz(basliklar.birim, X.birim + 26, y, 7.5, FB, RENK.soluk);
    sagaYaz(basliklar.kdv, X.kdv + 26, y, 7.5, FB, RENK.soluk);
    sagaYaz(basliklar.tutar, X.tutar, y, 7.5, FB, RENK.soluk);
    y -= 8;
    cizgi(y);
    y -= 6;
  };
  kalemBasligi();

  /* ---------------- kalemler ---------------- */
  for (let i = 0; i < m.kalemler.length; i++) {
    const k = m.kalemler[i];

    if (y < 150) {
      sayfa = belge.addPage([A4.g, A4.y]);
      y = A4.y - KENAR;
      yaz(`${basligi} ${m.numara}`, KENAR, y, 8, F, RENK.soluk);
      y -= 20;
      kalemBasligi();
    }

    const satirYuk = 38;
    const ustY = y;

    // görsel
    const g = gorseller[i];
    if (g) {
      try {
        const gomulu = g.tip === "png" ? await belge.embedPng(g.veri) : await belge.embedJpg(g.veri);
        const olcek = Math.min(32 / gomulu.width, 32 / gomulu.height);
        sayfa.drawImage(gomulu, {
          x: X.gorsel + (34 - gomulu.width * olcek) / 2,
          y: ustY - 30 + (32 - gomulu.height * olcek) / 2,
          width: gomulu.width * olcek,
          height: gomulu.height * olcek,
        });
      } catch {
        /* görsel gömülemezse kutu boş kalır, satır yine basılır */
      }
    }
    sayfa.drawRectangle({
      x: X.gorsel, y: ustY - 30, width: 34, height: 32,
      borderColor: RENK.cizgi, borderWidth: 0.6,
    });

    yaz(kirp(k.ad, F, 9, X.adet - X.ad - 14), X.ad, ustY - 8, 9, FB);
    yaz(k.sku, X.ad, ustY - 20, 7.5, F, RENK.soluk);

    sagaYaz(String(k.adet), X.adet + 26, ustY - 8, 9);
    sagaYaz(k.birimCents > 0 ? para(k.birimCents) : "—", X.birim + 26, ustY - 8, 9);
    sagaYaz(`${k.kdvYuzde}%`, X.kdv + 26, ustY - 8, 9, F, RENK.soluk);
    sagaYaz(k.satirCents > 0 ? para(k.satirCents) : "—", X.tutar, ustY - 8, 9, FB);

    y -= satirYuk;
    cizgi(y + 6, rgb(0.93, 0.94, 0.95));
  }

  /* ---------------- toplamlar ---------------- */
  if (y < 140) {
    sayfa = belge.addPage([A4.g, A4.y]);
    y = A4.y - KENAR;
  }

  y -= 6;
  const etiketler = {
    ara: dil === "sv" ? "Delsumma" : dil === "tr" ? "Ara toplam" : dil === "de" ? "Zwischensumme" : "Subtotal",
    kargo: dil === "sv" ? "Frakt" : dil === "tr" ? "Kargo" : dil === "de" ? "Versand" : "Shipping",
    indirim: dil === "sv" ? "Rabatt" : dil === "tr" ? "İndirim" : dil === "de" ? "Rabatt" : "Discount",
    kdv: `${dil === "sv" ? "Moms" : dil === "tr" ? "KDV" : dil === "de" ? "MwSt." : "VAT"} ${m.kdvYuzde}%`,
    toplam: dil === "sv" ? "Att betala" : dil === "tr" ? "Genel toplam" : dil === "de" ? "Gesamtbetrag" : "Total",
  };

  const toplamSatir = (etiket: string, deger: string, kalinMi = false) => {
    sagaYaz(etiket, X.birim + 26, y, kalinMi ? 11 : 9, kalinMi ? FB : F, kalinMi ? RENK.metin : RENK.soluk);
    sagaYaz(deger, X.tutar, y, kalinMi ? 11 : 9, kalinMi ? FB : F);
    y -= kalinMi ? 20 : 14;
  };

  toplamSatir(etiketler.ara, para(m.araToplamCents));
  toplamSatir(etiketler.kargo, m.kargoCents > 0 ? para(m.kargoCents) : (dil === "sv" ? "Fri frakt" : dil === "tr" ? "Ücretsiz" : dil === "de" ? "Kostenlos" : "Free"));
  if (m.indirimCents > 0) toplamSatir(etiketler.indirim, "−" + para(m.indirimCents));
  toplamSatir(etiketler.kdv, para(m.kdvCents));

  y -= 2;
  sayfa.drawLine({ start: { x: X.birim - 60, y }, end: { x: A4.g - KENAR, y }, thickness: 1, color: RENK.lacivert });
  y -= 18;
  toplamSatir(etiketler.toplam, para(m.toplamCents), true);

  /* ---------------- not ---------------- */
  if (m.not) {
    y -= 6;
    yaz(dil === "sv" ? "MEDDELANDE" : dil === "tr" ? "NOT" : dil === "de" ? "NACHRICHT" : "NOTE", KENAR, y, 7.5, FB, RENK.soluk);
    y -= 12;
    yaz(kirp(m.not, F, 8.5, A4.g - KENAR * 2), KENAR, y, 8.5, F, RENK.metin);
  }

  /* ---------------- alt bilgi (her sayfaya) ---------------- */
  const sayfalar = belge.getPages();
  sayfalar.forEach((s: PDFPage, i: number) => {
    s.drawLine({ start: { x: KENAR, y: 58 }, end: { x: A4.g - KENAR, y: 58 }, thickness: 0.8, color: RENK.cizgi });
    s.drawText("Piro Gastro Center AB · Org.nr 559214-8830 · VAT SE559214883001 · info@pirogastro.se", {
      x: KENAR, y: 44, size: 7, font: F, color: RENK.soluk,
    });
    if (m.odemeReferansi) {
      s.drawText(`Ref: ${m.odemeReferansi}`, { x: KENAR, y: 34, size: 6.5, font: F, color: RENK.soluk });
    }
    const sayfaNo = `${i + 1} / ${sayfalar.length}`;
    s.drawText(sayfaNo, {
      x: A4.g - KENAR - F.widthOfTextAtSize(sayfaNo, 7),
      y: 44, size: 7, font: F, color: RENK.soluk,
    });
  });

  return belge.save();
}
