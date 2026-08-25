import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLang, t } from "@/lib/i18n";
import { ILETISIM } from "@/lib/sohbet";
import { om } from "@/lib/odeme-metin";

export const revalidate = 3600;

/**
 * HESABIM
 *
 * Başlıktaki hesap ikonu bu sayfaya bağlıydı ama sayfa hiç oluşturulmamıştı
 * (404 veriyordu). Piro Gastro B2B çalıştığı için self-servis üyelik yok;
 * bu sayfa müşteriye hesabın nasıl açıldığını ve nereden takip edeceğini
 * anlatır. Mevcut sepet/teklif akışına dokunmaz.
 */

const M: Record<string, Record<string, string>> = {
  baslik: { sv: "Mitt konto", en: "My account", tr: "Hesabım", de: "Mein Konto" },
  ozet: {
    sv: "Piro Gastro säljer till företag. Kontot öppnas av oss — ingen självregistrering behövs.",
    en: "Piro Gastro sells to businesses. We open your account for you — no self-registration needed.",
    tr: "Piro Gastro kurumsal satış yapar. Hesabınızı biz açarız — kendiniz üye olmanıza gerek yok.",
    de: "Piro Gastro verkauft an Unternehmen. Wir eröffnen Ihr Konto — keine Selbstregistrierung nötig.",
  },
  acKutu: { sv: "Öppna företagskonto", en: "Open a business account", tr: "Kurumsal hesap açın", de: "Firmenkonto eröffnen" },
  acMetin: {
    sv: "Skicka företagsnamn, organisationsnummer och kontaktperson så återkommer vi med priser och betalningsvillkor.",
    en: "Send us your company name, registration number and contact person; we will reply with pricing and payment terms.",
    tr: "Firma adınızı, vergi numaranızı ve iletişim kişisini gönderin; fiyat ve ödeme koşullarıyla dönüş yapalım.",
    de: "Senden Sie Firmenname, Handelsregisternummer und Ansprechpartner; wir melden uns mit Preisen und Zahlungsbedingungen.",
  },
  epostaYaz: { sv: "Skicka e-post", en: "Send e-mail", tr: "E-posta gönder", de: "E-Mail senden" },
  sohbetKutu: { sv: "Fråga direkt", en: "Ask us directly", tr: "Doğrudan sorun", de: "Direkt fragen" },
  sohbetMetin: {
    sv: "Använd chattknappen nere till höger. Är vi offline lämnar du ett meddelande och vi svarar via e-post.",
    en: "Use the chat button at the bottom right. If we are offline, leave a message and we will reply by e-mail.",
    tr: "Sağ alttaki sohbet butonunu kullanın. Çevrim dışıysak mesaj bırakın, e-posta ile dönelim.",
    de: "Nutzen Sie den Chat-Button unten rechts. Sind wir offline, hinterlassen Sie eine Nachricht — wir antworten per E-Mail.",
  },
  siparisKutu: { sv: "Din order", en: "Your order", tr: "Siparişiniz", de: "Ihre Bestellung" },
  siparisMetin: {
    sv: "Varukorgen sparas i din webbläsare. Efter beställning får du orderbekräftelse och leveransbesked via e-post.",
    en: "Your cart is saved in this browser. After ordering you receive confirmation and delivery updates by e-mail.",
    tr: "Sepetiniz bu tarayıcıda saklanır. Sipariş sonrası onay ve teslimat bilgisi e-posta ile gelir.",
    de: "Ihr Warenkorb wird in diesem Browser gespeichert. Nach der Bestellung erhalten Sie Bestätigung und Lieferinfos per E-Mail.",
  },
  iletisim: { sv: "Kontakt", en: "Contact", tr: "İletişim", de: "Kontakt" },
  anasayfa: { sv: "Hem", en: "Home", tr: "Ana sayfa", de: "Startseite" },
};

const m = (k: string, l: string) => M[k]?.[l] ?? M[k]?.en ?? k;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = isLang(lang) ? lang : "sv";
  return { title: `${m("baslik", l)} | Piro Gastro`, description: m("ozet", l) };
}

const Kutu = ({ baslik, children }: { baslik: string; children: React.ReactNode }) => (
  <div className="rounded-[12px] border border-steel-200 bg-white p-5">
    <h2 className="text-[15px] font-extrabold text-navy-900">{baslik}</h2>
    <div className="mt-2 text-[13.4px] leading-relaxed text-steel-700">{children}</div>
  </div>
);

export default async function Hesabim({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const l = lang;

  return (
    <div className="mx-auto max-w-[900px] px-5 py-10">
      <nav className="text-[12.4px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">{m("anasayfa", l)}</Link>
        <span className="px-1.5">/</span>
        <span className="text-steel-700">{m("baslik", l)}</span>
      </nav>

      <h1 className="mt-3 text-[26px] font-extrabold text-navy-900">{m("baslik", l)}</h1>
      <p className="mt-2 max-w-[620px] text-[14px] leading-relaxed text-steel-700">{m("ozet", l)}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Kutu baslik={m("acKutu", l)}>
          <p>{m("acMetin", l)}</p>
          <a
            href={`mailto:${ILETISIM.eposta}`}
            className="mt-3 inline-flex rounded-[9px] bg-navy-900 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-navy-800"
          >
            {m("epostaYaz", l)}
          </a>
        </Kutu>

        <Kutu baslik={m("sohbetKutu", l)}>
          <p>{m("sohbetMetin", l)}</p>
        </Kutu>

        <Kutu baslik={m("siparisKutu", l)}>
          <p>{m("siparisMetin", l)}</p>
          <Link
            href={`/${l}/siparislerim`}
            className="mt-3 mr-2 inline-flex rounded-[9px] bg-navy-900 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-navy-800"
          >
            {om("siparislerim", l)}
          </Link>
          <Link
            href={`/${l}/sepet`}
            className="mt-3 inline-flex rounded-[9px] border border-steel-300 px-4 py-2 text-[13px] font-bold text-navy-900 transition hover:border-gold hover:text-gold"
          >
            {t("cart", l)}
          </Link>
        </Kutu>

        <Kutu baslik={m("iletisim", l)}>
          <p>
            <a href={`mailto:${ILETISIM.eposta}`} className="font-semibold text-navy-700 hover:text-gold">
              {ILETISIM.eposta}
            </a>
            <br />
            {t("legalName", l)}
            <br />
            Industrigatan 24 · 211 32 Malmö · Sverige
            <br />
            <span className="text-steel-500">Org.nr 559214-8830 · VAT SE559214883001</span>
          </p>
        </Kutu>
      </div>
    </div>
  );
}
