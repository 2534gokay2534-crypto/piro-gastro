import Stripe from "stripe";

/**
 * ÖDEME SAĞLAYICI — STRIPE
 *
 * Neden Stripe: Swish, Klarna, Apple Pay, Google Pay, Visa, Mastercard ve
 * AMEX'in tamamı TEK entegrasyonla karşılanır. Swish'i doğrudan bankadan
 * almak ayrı TLS istemci sertifikası, Klarna ayrı sözleşme, kartlar ayrı
 * acquirer gerektirirdi.
 *
 * Barındırılan Stripe Checkout kullanılır:
 *   - Kart bilgisi hiçbir zaman bizim sunucumuza uğramaz (PCI-DSS SAQ-A).
 *   - Apple Pay / Google Pay ek alan adı doğrulaması olmadan çalışır.
 *   - Mobil düzeni Stripe tarafından sağlanır ve sürekli güncellenir.
 *   - 3-D Secure (SCA) zorunluluğu Stripe tarafında yönetilir.
 *
 * Anahtar tanımlı değilse sistem ödeme almaz; "varmış gibi" davranmaz.
 */

const gizli = (process.env.STRIPE_SECRET_KEY ?? "").trim();

/** Stripe yapılandırılmış mı? */
export const stripeVar: boolean = gizli.startsWith("sk_");

/** Canlı anahtar mı, test anahtarı mı? (yönetici ekranında gösterilir) */
export const stripeCanli: boolean = gizli.startsWith("sk_live_");

let istemci: Stripe | null = null;

/** Stripe istemcisi — ilk kullanımda oluşturulur. */
export function stripe(): Stripe {
  if (!stripeVar) throw new Error("STRIPE_SECRET_KEY tanımlı değil");
  if (!istemci) istemci = new Stripe(gizli, { apiVersion: "2026-07-29.dahlia" });
  return istemci;
}

export const WEBHOOK_GIZLI = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();

/**
 * ÖDEME PARA BİRİMİ — SEK.
 *
 * Swish yalnızca SEK kabul eder; Klarna'nın İsveç akışı da SEK ister.
 * Şirket İsveç'te olduğu için tahsilat SEK üzerinden yapılır. Katalog
 * fiyatları EUR cent tutulduğundan dil kaydındaki kur ile çevrilir.
 */
export const ODEME_PARA = "sek";

/** EUR cent → SEK öre. Kur catalog.json'daki dil kaydından gelir. */
export function eurCentToOre(eurCents: number, kur: number): number {
  return Math.round(eurCents * kur);
}

/**
 * Sunulacak ödeme yöntemleri.
 *
 * Stripe panelinde etkinleştirilmemiş bir yöntem oturum açarken hata verir;
 * bu yüzden liste ortam değişkeninden daraltılabilir:
 *   STRIPE_YONTEMLER="card,swish"
 * Tanımlı değilse hepsi denenir.
 *
 * Apple Pay ve Google Pay ayrı yöntem değildir — Stripe bunları uygun
 * cihazlarda "card" içinde kendiliğinden gösterir.
 */
export function yontemler(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  const ozel = (process.env.STRIPE_YONTEMLER ?? "").trim();
  if (ozel) {
    return ozel
      .split(",")
      .map((y) => y.trim())
      .filter(Boolean) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
  }
  return ["card", "klarna", "swish"];
}

/** Müşteriye gösterilecek yöntem rozetleri (bilgi amaçlı). */
export const ROZETLER = [
  { kod: "swish", ad: "Swish" },
  { kod: "klarna", ad: "Klarna" },
  { kod: "card", ad: "Visa · Mastercard · AMEX" },
  { kod: "wallet", ad: "Apple Pay · Google Pay" },
] as const;

/** Stripe ödeme yöntemi kimliğini Order.paidMethod için sadeleştirir. */
export function yontemAdi(tip: string | null | undefined, cuzdan?: string | null): string {
  if (cuzdan === "apple_pay") return "apple_pay";
  if (cuzdan === "google_pay") return "google_pay";
  return tip ?? "card";
}
