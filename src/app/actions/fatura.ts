"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, dbVar } from "@/lib/db";
import { ULKE_KODLARI } from "@/lib/siparis";
import { basvuruDogrula, basvuruOku, orgNrSade } from "@/lib/fatura-basvuru";

/**
 * KURUMSAL FATURA BAŞVURUSU — mağaza tarafı
 *
 * Başvuru "pending" olarak kaydedilir. Fatura ile ödeme, Süper Admin
 * onaylayana kadar açılmaz; onay olmadan hiçbir yerde seçilebilir olmaz.
 */
export async function faturaBasvur(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const form = basvuruOku(veri);

  const hatalar = basvuruDogrula(form, ULKE_KODLARI);
  if (Object.keys(hatalar).length > 0) {
    const p = new URLSearchParams();
    p.set("hata", Object.keys(hatalar).join(","));
    for (const [k, v] of Object.entries(form)) if (v) p.set(k, v);
    redirect(`/${dil}/fatura-basvuru?${p.toString()}`);
  }

  if (!dbVar) redirect(`/${dil}/fatura-basvuru?hata=sistem`);

  try {
    // Aynı org.nr için bekleyen/onaylı başvuru varsa yenisi açılmaz.
    const mevcut = await db.invoiceApplication.findFirst({
      where: { orgNr: form.orgNr, status: { in: ["pending", "approved"] } },
      select: { id: true, status: true },
    });
    if (mevcut) redirect(`/${dil}/fatura-basvuru?zaten=1&durum=${mevcut.status}`);

    await db.invoiceApplication.create({
      data: {
        company: form.company,
        orgNr: form.orgNr,
        vatNr: form.vatNr || null,
        contact: form.contact,
        email: form.email.toLowerCase(),
        phone: form.phone,
        billAddr: form.billAddr,
        billZip: form.billZip,
        billCity: form.billCity,
        country: form.country,
        note: form.note || null,
        status: "pending",
      },
    });

    await db.auditLog
      .create({
        data: {
          actor: "magaza",
          action: "fatura.basvuru",
          detail: `${form.company} · ${form.orgNr} · ${form.email}`,
        },
      })
      .catch(() => null);
  } catch (e) {
    // redirect() içeride NEXT_REDIRECT fırlatır — yutulmamalı
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
    redirect(`/${dil}/fatura-basvuru?hata=sistem`);
  }

  revalidatePath(`/${dil}/admin/fatura-basvurulari`);
  redirect(`/${dil}/fatura-basvuru?alindi=1`);
}

/* ------------------------------------------------------------------ */
/* Süper Admin tarafı                                                  */
/* ------------------------------------------------------------------ */

async function gunlukle(action: string, detail: string) {
  await db.auditLog.create({ data: { actor: "super-admin", action, detail } }).catch(() => null);
}

/** Başvuruyu onaylar — o firmaya fatura ile ödeme açılır. */
export async function basvuruOnayla(veri: FormData): Promise<void> {
  const id = String(veri.get("id") ?? "");
  const dil = String(veri.get("dil") ?? "sv");
  const limit = Math.max(0, Math.round(Number(String(veri.get("limit") ?? "0").replace(",", ".")) * 100) || 0);
  const gerekce = String(veri.get("gerekce") ?? "").trim().slice(0, 500);
  if (!id || !dbVar) redirect(`/${dil}/admin/fatura-basvurulari`);

  const k = await db.invoiceApplication.update({
    where: { id },
    data: {
      status: "approved",
      decidedBy: "super-admin",
      decidedAt: new Date(),
      decision: gerekce || null,
      creditLimitCents: limit,
    },
    select: { company: true, orgNr: true },
  });
  await gunlukle("fatura.onay", `${k.company} · ${k.orgNr}`);

  revalidatePath(`/${dil}/admin/fatura-basvurulari`);
  redirect(`/${dil}/admin/fatura-basvurulari?islem=onay`);
}

/** Başvuruyu reddeder — fatura seçeneği açılmaz. */
export async function basvuruReddet(veri: FormData): Promise<void> {
  const id = String(veri.get("id") ?? "");
  const dil = String(veri.get("dil") ?? "sv");
  const gerekce = String(veri.get("gerekce") ?? "").trim().slice(0, 500);
  if (!id || !dbVar) redirect(`/${dil}/admin/fatura-basvurulari`);

  const k = await db.invoiceApplication.update({
    where: { id },
    data: {
      status: "rejected",
      decidedBy: "super-admin",
      decidedAt: new Date(),
      decision: gerekce || null,
    },
    select: { company: true, orgNr: true },
  });
  await gunlukle("fatura.red", `${k.company} · ${k.orgNr}`);

  revalidatePath(`/${dil}/admin/fatura-basvurulari`);
  redirect(`/${dil}/admin/fatura-basvurulari?islem=red`);
}

/** Onayı geri alır — firma tekrar fatura ile ödeyemez. */
export async function basvuruGeriAl(veri: FormData): Promise<void> {
  const id = String(veri.get("id") ?? "");
  const dil = String(veri.get("dil") ?? "sv");
  if (!id || !dbVar) redirect(`/${dil}/admin/fatura-basvurulari`);

  const k = await db.invoiceApplication.update({
    where: { id },
    data: { status: "pending", decidedBy: null, decidedAt: null, decision: null },
    select: { company: true, orgNr: true },
  });
  await gunlukle("fatura.geri-al", `${k.company} · ${k.orgNr}`);

  revalidatePath(`/${dil}/admin/fatura-basvurulari`);
  redirect(`/${dil}/admin/fatura-basvurulari?islem=geri`);
}

/** Başvuruyu siler. */
export async function basvuruSil(veri: FormData): Promise<void> {
  const id = String(veri.get("id") ?? "");
  const dil = String(veri.get("dil") ?? "sv");
  if (!id || !dbVar) redirect(`/${dil}/admin/fatura-basvurulari`);

  const k = await db.invoiceApplication.delete({ where: { id }, select: { company: true, orgNr: true } });
  await gunlukle("fatura.sil", `${k.company} · ${k.orgNr}`);

  revalidatePath(`/${dil}/admin/fatura-basvurulari`);
  redirect(`/${dil}/admin/fatura-basvurulari?islem=sil`);
}

/** orgNr'yi dışa açık sadeleştirici (admin arama için). */
export async function orgNrNormalize(v: string): Promise<string> {
  return orgNrSade(v);
}
