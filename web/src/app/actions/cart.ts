"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CART_COOKIE, parseCart, serializeCart } from "@/lib/cart";
import { db } from "@/lib/db";

const BIR_YIL = 60 * 60 * 24 * 365;

async function yaz(lines: { productId: string; qty: number }[]) {
  const c = await cookies();
  if (!lines.length) c.delete(CART_COOKIE);
  else
    c.set(CART_COOKIE, serializeCart(lines), {
      maxAge: BIR_YIL,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
}

export async function addToCart(productId: string, qty = 1) {
  // ürün gerçekten var mı ve yayında mı — çerezden gelen id'ye güvenilmez
  const p = await db.product.findFirst({
    where: { id: productId, hidden: false },
    select: { id: true },
  });
  if (!p) return { ok: false as const, error: "not-found" };

  const c = await cookies();
  const lines = parseCart(c.get(CART_COOKIE)?.value);
  const mevcut = lines.find((l) => l.productId === productId);
  if (mevcut) mevcut.qty = Math.min(999, mevcut.qty + qty);
  else lines.push({ productId, qty: Math.max(1, qty) });

  await yaz(lines);
  revalidatePath("/", "layout");
  return { ok: true as const, count: lines.reduce((s, l) => s + l.qty, 0) };
}

export async function setQty(productId: string, qty: number) {
  const c = await cookies();
  let lines = parseCart(c.get(CART_COOKIE)?.value);
  if (qty <= 0) lines = lines.filter((l) => l.productId !== productId);
  else {
    const l = lines.find((x) => x.productId === productId);
    if (l) l.qty = Math.min(999, qty);
  }
  await yaz(lines);
  revalidatePath("/", "layout");
}

export async function removeFromCart(productId: string) {
  await setQty(productId, 0);
}

export async function clearCart() {
  await yaz([]);
  revalidatePath("/", "layout");
}

/* ---- form action sarmalayıcıları (ikinci argüman FormData gelir) ---- */

export async function setQtyForm(productId: string, formData: FormData) {
  const qty = Number(formData.get("qty")) || 0;
  await setQty(productId, qty);
}

export async function removeForm(productId: string) {
  await setQty(productId, 0);
}
