"use server";

import { revalidatePath } from "next/cache";
import { db, dbVar } from "@/lib/db";
import { AYAR_CEVRIMICI, AYAR_KARSILAMA, SINIR, kirp } from "@/lib/sohbet";

/**
 * Süper Admin sohbet işlemleri.
 *
 * Hepsi `void` döner — Next.js form action imzası bunu ister.
 * Veritabanı yoksa sessizce çıkarlar; sayfa çökmez.
 */

/** Danışman yanıtı. */
export async function sohbetYanitla(formData: FormData) {
  if (!dbVar) return;
  const oturumId = kirp(formData.get("oturumId"), 40);
  const metin = kirp(formData.get("metin"), SINIR.mesajUzunluk);
  if (!oturumId || !metin) return;

  await db.chatMessage.create({
    data: { sessionId: oturumId, sender: "agent", body: metin },
  });
  await db.chatSession.update({
    where: { id: oturumId },
    data: { updatedAt: new Date(), agentSeenAt: new Date(), status: "open" },
  });
  await db.auditLog.create({
    data: { actor: "super-admin", action: "sohbet.yanit", detail: oturumId },
  });

  revalidatePath("/", "layout");
}

/** Görüşmeyi kapat / yeniden aç. */
export async function sohbetDurum(formData: FormData) {
  if (!dbVar) return;
  const oturumId = kirp(formData.get("oturumId"), 40);
  const durum = kirp(formData.get("durum"), 10) === "closed" ? "closed" : "open";
  if (!oturumId) return;

  await db.chatSession.update({
    where: { id: oturumId },
    data: { status: durum, updatedAt: new Date() },
  });
  revalidatePath("/", "layout");
}

/** Görüşmeyi tamamen sil (mesajlar da gider). */
export async function sohbetSil(formData: FormData) {
  if (!dbVar) return;
  const oturumId = kirp(formData.get("oturumId"), 40);
  if (!oturumId) return;

  await db.chatSession.delete({ where: { id: oturumId } });
  await db.auditLog.create({
    data: { actor: "super-admin", action: "sohbet.sil", detail: oturumId },
  });
  revalidatePath("/", "layout");
}

/** Okundu işaretle. */
export async function sohbetOkundu(formData: FormData) {
  if (!dbVar) return;
  const oturumId = kirp(formData.get("oturumId"), 40);
  if (!oturumId) return;
  await db.chatSession.update({
    where: { id: oturumId },
    data: { agentSeenAt: new Date() },
  });
  revalidatePath("/", "layout");
}

/** Çevrim içi / çevrim dışı anahtarı. */
export async function cevrimIciDegistir(formData: FormData) {
  if (!dbVar) return;
  const deger = kirp(formData.get("deger"), 2) === "1" ? "1" : "0";

  await db.setting.upsert({
    where: { key: AYAR_CEVRIMICI },
    create: { key: AYAR_CEVRIMICI, value: deger },
    update: { value: deger },
  });
  await db.auditLog.create({
    data: { actor: "super-admin", action: "sohbet.durum", detail: deger === "1" ? "çevrim içi" : "çevrim dışı" },
  });
  revalidatePath("/", "layout");
}

/** Karşılama metni. */
export async function karsilamaKaydet(formData: FormData) {
  if (!dbVar) return;
  const metin = kirp(formData.get("karsilama"), 400);

  await db.setting.upsert({
    where: { key: AYAR_KARSILAMA },
    create: { key: AYAR_KARSILAMA, value: metin },
    update: { value: metin },
  });
  revalidatePath("/", "layout");
}
