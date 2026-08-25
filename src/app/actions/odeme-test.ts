"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, dbVar } from "@/lib/db";
import { CART_COOKIE } from "@/lib/cart";
import { MUSTERI_CEREZ, oturumSuan } from "@/lib/musteri-oturum";
import { demoMu } from "@/lib/odeme-modu";

/**
 * TEST ÖDEME EKRANININ EYLEMLERİ
 *
 * Gerçek sağlayıcı ekranının (Stripe Checkout) yaptığı işin aynısını
 * yapar — ama hiçbir yere para gitmez:
 *   onayla  → sipariş "paid", ödeme yöntemi kaydedilir, sepet boşalır
 *   reddet  → sipariş "cancelled", müşteri sepetine döner
 *   vazgeç  → sipariş "cancelled", sepet KORUNUR
 *
 * Yalnızca test modunda çalışır. Canlı modda çağrılsa bile hiçbir şey
 * yapmaz — gerçek ödeme buradan taklit edilemez.
 */

async function siparisiBul(numara: string) {
  const kutu = await cookies();
  const eposta = await oturumSuan(kutu.get(MUSTERI_CEREZ)?.value);
  if (!eposta) return null;

  const s = await db.order.findUnique({
    where: { number: numara },
    select: {
      id: true, number: true, status: true, provider: true,
      customer: { select: { email: true } },
    },
  });
  if (!s || s.provider !== "test") return null;
  if ((s.customer?.email ?? "").toLowerCase() !== eposta.toLowerCase()) return null;
  return s;
}

export async function testOdemeOnayla(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const numara = String(veri.get("no") ?? "").trim().toUpperCase();
  const yontem = String(veri.get("yontem") ?? "swish");

  if (!demoMu() || !dbVar) redirect(`/${dil}/odeme?hata=sistem&sebep=saglayici`);

  const s = await siparisiBul(numara);
  if (!s) redirect(`/${dil}/sepet`);
  if (s.status === "paid") redirect(`/${dil}/odeme/tamam?no=${numara}&test=1`);

  const simdi = new Date();
  await db.order.update({
    where: { id: s.id },
    data: {
      status: "paid",
      paidAt: simdi,
      paidMethod: yontem,
      paymentRef: `test_${simdi.getTime()}`,
    },
  });

  await db.auditLog
    .create({ data: { actor: "test-odeme", action: "siparis.odendi-test", detail: `${numara} · ${yontem}` } })
    .catch(() => null);

  // Ödeme tamamlandı — sepet artık boşaltılabilir.
  const kutu = await cookies();
  kutu.delete(CART_COOKIE);
  revalidatePath("/", "layout");

  redirect(`/${dil}/odeme/tamam?no=${numara}&test=1`);
}

export async function testOdemeReddet(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const numara = String(veri.get("no") ?? "").trim().toUpperCase();

  if (!demoMu() || !dbVar) redirect(`/${dil}/odeme?hata=sistem&sebep=saglayici`);

  const s = await siparisiBul(numara);
  if (s && s.status === "pending") {
    await db.order.update({ where: { id: s.id }, data: { status: "cancelled" } });
    await db.auditLog
      .create({ data: { actor: "test-odeme", action: "siparis.odeme-reddedildi", detail: numara } })
      .catch(() => null);
  }

  // Sepet korunur — müşteri tekrar deneyebilsin.
  redirect(`/${dil}/odeme?hata=reddedildi`);
}

export async function testOdemeVazgec(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const numara = String(veri.get("no") ?? "").trim().toUpperCase();

  if (!demoMu() || !dbVar) redirect(`/${dil}/sepet`);

  const s = await siparisiBul(numara);
  if (s && s.status === "pending") {
    await db.order.update({ where: { id: s.id }, data: { status: "cancelled" } });
  }

  redirect(`/${dil}/odeme?iptal=1`);
}
