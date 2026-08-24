import { cookies } from "next/headers";
import { productById } from "./catalog";
import { netCents } from "./money";

/**
 * Sepet çerezde tutulur (sunucu okuyabilsin diye).
 * Biçim: "urunId:adet,urunId:adet" — çerez sınırına takılmayacak kadar küçük.
 */
export const CART_COOKIE = "pg_cart";
const MAX_QTY = 999;

export type CartLine = { productId: string; qty: number };

export function parseCart(raw: string | undefined): CartLine[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => {
      const [productId, q] = p.split(":");
      const qty = Math.min(MAX_QTY, Math.max(1, Number(q) || 0));
      return productId && qty ? { productId, qty } : null;
    })
    .filter((x): x is CartLine => x !== null);
}

export function serializeCart(lines: CartLine[]): string {
  return lines.map((l) => `${l.productId}:${l.qty}`).join(",");
}

export async function readCart(): Promise<CartLine[]> {
  const c = await cookies();
  return parseCart(c.get(CART_COOKIE)?.value);
}

/** Sepeti ürün bilgileriyle birlikte, fiyatı VERİTABANINDAN okuyarak döner. */
export async function cartDetail(lang: string) {
  const lines = await readCart();
  if (!lines.length) return { lines: [], netCents: 0, count: 0 };

  const detay = lines
    .map((l) => {
      const p = productById(l.productId);
      if (!p || p.hidden) return null;
      const unit = netCents(p);
      return { product: p, qty: l.qty, unitCents: unit, lineCents: unit * l.qty };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    lines: detay,
    netCents: detay.reduce((s, l) => s + l.lineCents, 0),
    count: detay.reduce((s, l) => s + l.qty, 0),
    lang,
  };
}

/** Kargo: 2.500 € üzeri ücretsiz (prototipteki kuralın aynısı). */
export const FREE_SHIPPING_CENTS = 250_000;
export const SHIPPING_CENTS = 4_900;

export function shippingCents(net: number): number {
  return net >= FREE_SHIPPING_CENTS || net === 0 ? 0 : SHIPPING_CENTS;
}

/** KDV oranı ülkeye göre — prototiple aynı. */
export function vatRate(country: string): number {
  if (country === "TR") return 0.2;
  if (country === "SE") return 0.25;
  return 0.21;
}
