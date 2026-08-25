"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, dbVar } from "@/lib/db";

/**
 * ÜRÜN YÖNETİMİ — Süper Admin.
 *
 * Not: mağaza tarafı yayınlanmış catalog.json dosyasından okur.
 * Buradaki değişiklikler veritabanına yazılır; siteye yansıması için
 * Yedekleme ekranındaki "Siteye yayınla" çalıştırılır.
 */

const s = (v: FormDataEntryValue | null, n = 200) => String(v ?? "").trim().slice(0, n);
const i = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : 0;
};
const kurusa = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

async function log(action: string, detail: string) {
  try {
    await db.auditLog.create({ data: { actor: "super-admin", action, detail } });
  } catch {
    /* log yazılamazsa asıl işlem yine de sürsün */
  }
}

/** Stok değişimini hareket defterine yazar. */
async function stokHareketi(
  productId: string,
  sku: string,
  once: number,
  sonra: number,
  reason: string,
  note?: string,
) {
  if (once === sonra) return;
  await db.stockMovement.create({
    data: { productId, sku, delta: sonra - once, before: once, after: sonra, reason, note: note ?? null },
  });
}

/* ---------------------------------------------------------------
   TEK ÜRÜN
   --------------------------------------------------------------- */

export async function urunKaydet(formData: FormData) {
  if (!dbVar) return;

  const id = s(formData.get("id"), 60);
  const lang = s(formData.get("lang"), 8) || "tr";
  const ad = s(formData.get("ad"), 300);
  const aciklama = s(formData.get("aciklama"), 4000);
  const sku = s(formData.get("sku"), 60);
  const categoryId = s(formData.get("categoryId"), 60);
  const subId = s(formData.get("subId"), 60);
  const brandId = s(formData.get("brandId"), 60);
  const supplierId = s(formData.get("supplierId"), 60);

  const priceCents = kurusa(formData.get("fiyat"));
  const costCents = kurusa(formData.get("maliyet"));
  const stok = i(formData.get("stok"));
  const esik = i(formData.get("esik"));
  const leadDays = i(formData.get("teslim"));
  const warranty = i(formData.get("garanti"));

  const yayinda = formData.get("yayinda") === "1";
  const oneCikan = formData.get("oneCikan") === "1";
  const talepUzerine = formData.get("talepUzerine") === "1";
  const kampanyaAcik = formData.get("kampanyaAcik") === "1";
  const kampanyaYuzde = Math.min(90, Math.max(0, i(formData.get("kampanyaYuzde"))));

  if (!id || !sku || !categoryId) return;

  const mevcut = await db.product.findUnique({
    where: { id },
    select: { stock: true, sku: true },
  });
  if (!mevcut) return;

  await db.product.update({
    where: { id },
    data: {
      sku,
      categoryId,
      subId: subId || null,
      brandId: brandId || null,
      supplierId: supplierId || null,
      priceCents,
      costCents,
      stock: stok,
      threshold: esik,
      leadDays,
      warranty,
      hidden: !yayinda,
      featured: oneCikan,
      onRequest: talepUzerine,
      campaignOn: kampanyaAcik,
      campaignPercent: kampanyaAcik ? kampanyaYuzde : 0,
    },
  });

  if (ad) {
    await db.productText.upsert({
      where: { productId_langCode: { productId: id, langCode: lang } },
      create: { productId: id, langCode: lang, name: ad, desc: aciklama || null, origin: "manual", locked: true },
      update: { name: ad, desc: aciklama || null, origin: "manual", locked: true },
    });
  }

  await stokHareketi(id, sku, mevcut.stock, stok, "correction", "ürün düzenleme");
  await log("urun.duzenle", `${sku} · ${ad || id}`);
  revalidatePath("/", "layout");
}

export async function urunEkle(formData: FormData) {
  if (!dbVar) return;

  const lang = s(formData.get("lang"), 8) || "tr";
  const ad = s(formData.get("ad"), 300);
  const sku = s(formData.get("sku"), 60);
  const categoryId = s(formData.get("categoryId"), 60);
  if (!ad || !sku || !categoryId) return;

  const varMi = await db.product.findUnique({ where: { sku }, select: { id: true } });
  if (varMi) return; // aynı stok kodu iki kez olmaz

  const id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const slugTemel =
    ad
      .toLocaleLowerCase("tr")
      .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
      .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "urun";
  const slug = `${slugTemel}-${id.slice(-5)}`;

  const stok = i(formData.get("stok"));

  await db.product.create({
    data: {
      id,
      sku,
      slug,
      categoryId,
      subId: s(formData.get("subId"), 60) || null,
      brandId: s(formData.get("brandId"), 60) || null,
      priceCents: kurusa(formData.get("fiyat")),
      costCents: kurusa(formData.get("maliyet")),
      stock: stok,
      hidden: formData.get("yayinda") !== "1",
      texts: { create: { langCode: lang, name: ad, origin: "manual", locked: true } },
    },
  });

  await stokHareketi(id, sku, 0, stok, "import", "yeni ürün");
  await log("urun.ekle", `${sku} · ${ad}`);
  revalidatePath("/", "layout");
}

export async function urunSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const geri = s(formData.get("geri"), 300);
  if (!id) return;

  const p = await db.product.findUnique({ where: { id }, select: { sku: true } });
  await db.product.delete({ where: { id } }).catch(() => null);
  await log("urun.sil", p?.sku ?? id);
  revalidatePath("/", "layout");
  if (geri) redirect(geri);
}

/** Hızlı fiyat değişikliği (liste satırından). */
export async function fiyatDegistir(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const fiyat = kurusa(formData.get("fiyat"));
  if (!id) return;
  await db.product.update({ where: { id }, data: { priceCents: fiyat } });
  await log("urun.fiyat", `${id} → ${(fiyat / 100).toFixed(2)}`);
  revalidatePath("/", "layout");
}

/** Hızlı stok güncelleme (liste satırından). */
export async function stokGuncelle(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const stok = i(formData.get("stok"));
  if (!id) return;

  const p = await db.product.findUnique({ where: { id }, select: { stock: true, sku: true } });
  if (!p) return;
  await db.product.update({ where: { id }, data: { stock: stok } });
  await stokHareketi(id, p.sku, p.stock, stok, "correction", "hızlı güncelleme");
  await log("stok.guncelle", `${p.sku}: ${p.stock} → ${stok}`);
  revalidatePath("/", "layout");
}

/** Yayına al / yayından kaldır. */
export async function yayinDegistir(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const yayinda = s(formData.get("yayinda"), 2) === "1";
  if (!id) return;
  await db.product.update({ where: { id }, data: { hidden: !yayinda } });
  await log("urun.yayin", `${id} → ${yayinda ? "yayında" : "gizli"}`);
  revalidatePath("/", "layout");
}

/* ---------------------------------------------------------------
   TOPLU İŞLEM
   --------------------------------------------------------------- */

export async function topluIslem(formData: FormData) {
  if (!dbVar) return;

  const islem = s(formData.get("islem"), 40);
  const idler = formData.getAll("sec").map((v) => String(v)).filter(Boolean).slice(0, 500);
  if (!islem || idler.length === 0) return;

  switch (islem) {
    case "yayinla":
      await db.product.updateMany({ where: { id: { in: idler } }, data: { hidden: false } });
      break;

    case "gizle":
      await db.product.updateMany({ where: { id: { in: idler } }, data: { hidden: true } });
      break;

    case "oneCikar":
      await db.product.updateMany({ where: { id: { in: idler } }, data: { featured: true } });
      break;

    case "oneCikarma":
      await db.product.updateMany({ where: { id: { in: idler } }, data: { featured: false } });
      break;

    case "kategori": {
      const hedef = s(formData.get("hedefKategori"), 60);
      if (hedef) {
        await db.product.updateMany({ where: { id: { in: idler } }, data: { categoryId: hedef } });
      }
      break;
    }

    case "fiyatYuzde": {
      const yuzde = Number(String(formData.get("yuzde") ?? "0").replace(",", "."));
      if (Number.isFinite(yuzde) && yuzde !== 0) {
        const liste = await db.product.findMany({
          where: { id: { in: idler } },
          select: { id: true, priceCents: true },
        });
        for (const p of liste) {
          const yeni = Math.max(0, Math.round(p.priceCents * (1 + yuzde / 100)));
          await db.product.update({ where: { id: p.id }, data: { priceCents: yeni } });
        }
      }
      break;
    }

    case "stokAyarla": {
      const yeni = i(formData.get("yeniStok"));
      const liste = await db.product.findMany({
        where: { id: { in: idler } },
        select: { id: true, sku: true, stock: true },
      });
      for (const p of liste) {
        await db.product.update({ where: { id: p.id }, data: { stock: yeni } });
        await stokHareketi(p.id, p.sku, p.stock, yeni, "correction", "toplu stok");
      }
      break;
    }

    case "sil":
      await db.product.deleteMany({ where: { id: { in: idler } } });
      break;

    default:
      return;
  }

  await log("urun.toplu", `${islem} · ${idler.length} ürün`);
  revalidatePath("/", "layout");
}
