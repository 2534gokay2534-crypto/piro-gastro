"use server";

import { revalidatePath } from "next/cache";
import { db, dbVar } from "@/lib/db";

/**
 * Süper Admin çeviri işlemleri.
 *
 * Elle kaydedilen her metin origin="manual" + locked=true olur;
 * otomatik çeviri bir daha üzerine YAZMAZ.
 */

export async function urunMetniKaydet(formData: FormData) {
  if (!dbVar) return;
  const productId = String(formData.get("productId") ?? "");
  const langCode = String(formData.get("langCode") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const desc = String(formData.get("desc") ?? "").trim();
  if (!productId || !langCode) return;

  await db.productText.upsert({
    where: { productId_langCode: { productId, langCode } },
    create: { productId, langCode, name, desc: desc || null, origin: "manual", locked: true },
    update: { name, desc: desc || null, origin: "manual", locked: true },
  });

  await db.auditLog.create({
    data: { actor: "super-admin", action: "ceviri.urun", detail: `${productId} / ${langCode}` },
  });

  revalidatePath("/", "layout");
}

export async function ozellikMetniKaydet(formData: FormData) {
  if (!dbVar) return;
  const specId = String(formData.get("specId") ?? "");
  const langCode = String(formData.get("langCode") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!specId || !langCode || !label) return;

  await db.specText.upsert({
    where: { specId_langCode: { specId, langCode } },
    create: { specId, langCode, label, value, origin: "manual", locked: true },
    update: { label, value, origin: "manual", locked: true },
  });

  revalidatePath("/", "layout");
}

/** Kilidi kaldır — otomatik çeviri bu kaydı tekrar güncelleyebilsin. */
export async function kilidiAc(formData: FormData) {
  if (!dbVar) return;
  const productId = String(formData.get("productId") ?? "");
  const langCode = String(formData.get("langCode") ?? "");
  if (!productId || !langCode) return;
  await db.productText.updateMany({
    where: { productId, langCode },
    data: { locked: false, origin: "machine" },
  });
  revalidatePath("/", "layout");
}

/* ---------------- DİL YÖNETİMİ ---------------- */

export async function dilEkle(formData: FormData) {
  if (!dbVar) return;
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim() || `${code}-${code.toUpperCase()}`;
  const currency = String(formData.get("currency") ?? "EUR").trim().toUpperCase();
  const rate = Number(formData.get("rate")) || 1;
  const sourceCode = String(formData.get("sourceCode") ?? "en").trim();

  if (!/^[a-z]{2,5}$/.test(code) || !name) return;

  const varMi = await db.language.findUnique({ where: { code } });
  if (varMi) return;

  const sonSira = await db.language.count();
  await db.language.create({
    data: { code, name, locale, currency, rate, sourceCode, sort: sonSira, enabled: true },
  });

  // Kategori adları hemen kaynak dilden kopyalanır ki menü boş kalmasın;
  // origin=machine olduğu için otomatik çeviri bunları güncelleyebilir.
  const kaynakKat = await db.categoryText.findMany({ where: { langCode: sourceCode } });
  if (kaynakKat.length) {
    await db.categoryText.createMany({
      data: kaynakKat.map((c) => ({
        categoryId: c.categoryId, langCode: code, name: c.name, desc: c.desc, origin: "machine",
      })),
    });
  }

  await db.auditLog.create({
    data: { actor: "super-admin", action: "dil.ekle", detail: `${code} (${name})` },
  });

  revalidatePath("/", "layout");
}

export async function dilDurumu(formData: FormData) {
  if (!dbVar) return;
  const code = String(formData.get("code") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "1";
  if (!code) return;
  await db.language.update({ where: { code }, data: { enabled } });
  revalidatePath("/", "layout");
}
