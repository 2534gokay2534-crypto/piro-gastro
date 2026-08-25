/**
 * ÖDEME MODU — Los Panchos'taki PAY_MODE deseninin aynısı
 *
 *   demo  → Sağlayıcı çağrılmaz. Ödeme onaylanmış SAYILIR; sipariş, makbuz,
 *           muhasebe ve Süper Admin zinciri baştan sona çalışır. Anahtar
 *           beklerken akışı ve ekranları eksiksiz denemek içindir.
 *   live  → Gerçek sağlayıcı (Stripe Checkout: Swish, Klarna, kart,
 *           Apple Pay, Google Pay) devreye girer.
 *
 * GÜVENLİK: demo modu kendiliğinden açılmaz. Yayında yalnızca ODEME_MODU
 * açıkça "demo" yazıldığında çalışır ve müşteriye her ekranda "gerçek
 * tahsilat yapılmadı" uyarısı gösterilir. Yanlışlıkla gerçek para
 * alınmamış gibi davranmak da, alınmış gibi davranmak da engellenir.
 */

import type Stripe from "stripe";
import { stripeVar } from "./odeme-saglayici";

export type OdemeModu = "demo" | "live" | "kapali";

/** Yapılandırılmış mod. */
export function odemeModu(): OdemeModu {
  const istenen = (process.env.ODEME_MODU ?? "").trim().toLowerCase();

  if (istenen === "demo") return "demo";
  if (stripeVar) return "live";

  // Anahtar yok ve demo istenmemiş: ödeme kapalı (sessizce demo'ya düşmez).
  if (istenen === "live") return "kapali";
  return process.env.NODE_ENV !== "production" ? "demo" : "kapali";
}

export const demoMu = () => odemeModu() === "demo";
export const canliMi = () => odemeModu() === "live";
export const odemeAcik = () => odemeModu() !== "kapali";

/**
 * Müşterinin seçebileceği ödeme yöntemleri.
 * Swish ayrı bir seçenek olarak sunulur — İsveç'te en yaygın yöntem
 * olduğu için "kart" başlığı altında saklanmaz.
 */
export const YONTEMLER = [
  {
    kod: "swish",
    ad: { sv: "Swish", en: "Swish", tr: "Swish", de: "Swish" },
    aciklama: {
      sv: "Betala direkt med Swish-appen.",
      en: "Pay instantly with the Swish app.",
      tr: "Swish uygulamasıyla anında ödeyin.",
      de: "Sofort mit der Swish-App bezahlen.",
    },
    rozetler: ["Swish"],
  },
  {
    kod: "card",
    ad: { sv: "Kort", en: "Card", tr: "Kart", de: "Karte" },
    aciklama: {
      sv: "Visa, Mastercard, American Express, Apple Pay och Google Pay.",
      en: "Visa, Mastercard, American Express, Apple Pay and Google Pay.",
      tr: "Visa, Mastercard, American Express, Apple Pay ve Google Pay.",
      de: "Visa, Mastercard, American Express, Apple Pay und Google Pay.",
    },
    rozetler: ["Visa", "Mastercard", "AMEX", "Apple Pay", "Google Pay"],
  },
  {
    kod: "klarna",
    ad: { sv: "Klarna", en: "Klarna", tr: "Klarna", de: "Klarna" },
    aciklama: {
      sv: "Betala senare eller dela upp betalningen.",
      en: "Pay later or split the payment.",
      tr: "Sonra ödeyin veya taksitlendirin.",
      de: "Später zahlen oder in Raten aufteilen.",
    },
    rozetler: ["Klarna"],
  },
] as const;

export const YONTEM_KODLARI: string[] = YONTEMLER.map((y) => y.kod);

/** Seçilen yöntem → Stripe Checkout'ta açılacak yöntem listesi. */
export function stripeYontemi(kod: string): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  if (kod === "swish") return ["swish"];
  if (kod === "klarna") return ["klarna"];
  return ["card"]; // Apple Pay / Google Pay kart içinde kendiliğinden gelir
}
