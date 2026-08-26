"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { urunleriYansit, urunuKaldir, urunuYansit } from "@/lib/katalog-yaz";

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

/** İşlem sonrası dönülecek adres — yalnızca kendi /admin yollarımız. */
function geriDon(formData: FormData): string | null {
  const y = String(formData.get("geri") ?? "").trim();
  if (!y.startsWith("/") || y.startsWith("//") || y.includes("\\")) return null;
  return /^\/[^/]+\/admin\//.test(y) ? y : null;
}

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
  urunuKaldir(id);
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
  urunuYansit(id, { priceCents: fiyat });
  await log("urun.fiyat", `${id} → ${(fiyat / 100).toFixed(2)}`);
  revalidatePath("/", "layout");

  const geri = geriDon(formData);
  if (geri) redirect(geri);
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
  urunuYansit(id, { stock: stok });
  await stokHareketi(id, p.sku, p.stock, stok, "correction", "hızlı güncelleme");
  await log("stok.guncelle", `${p.sku}: ${p.stock} → ${stok}`);
  revalidatePath("/", "layout");

  const geri = geriDon(formData);
  if (geri) redirect(geri);
}

/** Yayına al / yayından kaldır. */
export async function yayinDegistir(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const yayinda = s(formData.get("yayinda"), 2) === "1";
  if (!id) return;
  await db.product.update({ where: { id }, data: { hidden: !yayinda } });
  urunuYansit(id, { hidden: !yayinda });
  await log("urun.yayin", `${id} → ${yayinda ? "yayında" : "gizli"}`);
  revalidatePath("/", "layout");

  const geri = geriDon(formData);
  if (geri) redirect(geri);
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
  // Toplu değişikliği katalog nesnelerine de yansıt — mağaza anında görsün.
  try {
    const guncel = await db.product.findMany({
      where: { id: { in: idler } },
      select: {
        id: true, priceCents: true, stock: true, hidden: true, featured: true,
        campaignOn: true, campaignPercent: true, categoryId: true, subId: true,
      },
    });
    urunleriYansit(guncel.map((p) => ({ id: p.id, degisiklik: p })));
  } catch {
    /* katalog tazelenemezse veritabanı yine doğru; sonraki okumada düzelir */
  }

  revalidatePath("/", "layout");
}

/* ---------------------------------------------------------------
   HIZLI İŞLEMLER — Ürünler ekranından tek tıkla
   Hepsi mağazaya ANINDA yansır (katalog nesnesi yerinde güncellenir).
   --------------------------------------------------------------- */

/** İndirim tanımlar veya kaldırır. */
export async function indirimTanimla(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"));
  const yuzde = Math.max(0, Math.min(90, i(formData.get("yuzde"))));
  const acik = yuzde > 0;
  if (!id) return;

  const p = await db.product.update({
    where: { id },
    data: { campaignOn: acik, campaignPercent: acik ? yuzde : 0 },
    select: { sku: true },
  });

  urunuYansit(id, { campaignOn: acik, campaignPercent: acik ? yuzde : 0 });
  await log("urun.indirim", `${p.sku} · ${acik ? `%${yuzde}` : "kaldırıldı"}`);
  revalidatePath("/", "layout");

  const geri = geriDon(formData);
  if (geri) redirect(geri);
}

/** Ürünü başka bir kategoriye taşır. */
export async function kategoriyeTasi(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"));
  const kategori = s(formData.get("kategori"));
  const alt = s(formData.get("alt"));
  if (!id || !kategori) return;

  const p = await db.product.update({
    where: { id },
    data: { categoryId: kategori, subId: alt || null },
    select: { sku: true },
  });

  urunuYansit(id, { categoryId: kategori, subId: alt || null });
  await log("urun.kategori", `${p.sku} → ${kategori}${alt ? " / " + alt : ""}`);
  revalidatePath("/", "layout");

  const geri = geriDon(formData);
  if (geri) redirect(geri);
}

/* ---------------------------------------------------------------
   GÖRSEL YÖNETİMİ
   --------------------------------------------------------------- */

/** Ürünün görsellerini veritabanından okuyup katalog nesnesine yansıtır. */
async function gorselleriYansit(productId: string) {
  const liste = await db.productImage.findMany({
    where: { productId },
    orderBy: { sort: "asc" },
    select: { url: true },
  });
  urunuYansit(productId, { images: liste.map((g) => ({ url: g.url })) });
}

/** Yeni görsel ekler (adres ile). */
export async function gorselEkle(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"));
  const url = s(formData.get("url"), 600);
  if (!id || !/^https?:\/\//i.test(url)) return;

  const son = await db.productImage.findFirst({
    where: { productId: id },
    orderBy: { sort: "desc" },
    select: { sort: true },
  });
  await db.productImage.create({ data: { productId: id, url, sort: (son?.sort ?? -1) + 1 } });

  await gorselleriYansit(id);
  await log("urun.gorsel-ekle", `${id} · ${url.slice(0, 80)}`);
  revalidatePath("/", "layout");

  const geri = geriDon(formData);
  if (geri) redirect(geri);
}

/** Görseli siler. */
export async function gorselSil(formData: FormData) {
  if (!dbVar) return;
  const gorselId = s(formData.get("gorselId"));
  if (!gorselId) return;

  const g = await db.productImage.delete({
    where: { id: gorselId },
    select: { productId: true, url: true },
  });

  await gorselleriYansit(g.productId);
  await log("urun.gorsel-sil", `${g.productId} · ${g.url.slice(0, 80)}`);
  revalidatePath("/", "layout");

  const geri = geriDon(formData);
  if (geri) redirect(geri);
}

/** Görseli ana görsel yapar (listenin başına alır). */
export async function gorselAnaYap(formData: FormData) {
  if (!dbVar) return;
  const gorselId = s(formData.get("gorselId"));
  if (!gorselId) return;

  const hedef = await db.productImage.findUnique({
    where: { id: gorselId },
    select: { productId: true, url: true },
  });
  if (!hedef) return;

  const liste = await db.productImage.findMany({
    where: { productId: hedef.productId },
    orderBy: { sort: "asc" },
    select: { id: true },
  });

  // Hedef başa, kalanlar sırasını koruyarak arkasına
  const yeni = [gorselId, ...liste.map((g) => g.id).filter((x) => x !== gorselId)];
  for (let n = 0; n < yeni.length; n++) {
    await db.productImage.update({ where: { id: yeni[n] }, data: { sort: n } });
  }

  await gorselleriYansit(hedef.productId);
  await log("urun.gorsel-ana", `${hedef.productId} · ${hedef.url.slice(0, 80)}`);
  revalidatePath("/", "layout");

  const geri = geriDon(formData);
  if (geri) redirect(geri);
}

/** Görseli bir sıra öne veya arkaya alır. */
export async function gorselTasi(formData: FormData) {
  if (!dbVar) return;
  const gorselId = s(formData.get("gorselId"));
  const yon = s(formData.get("yon")) === "geri" ? 1 : -1;
  if (!gorselId) return;

  const hedef = await db.productImage.findUnique({
    where: { id: gorselId },
    select: { productId: true },
  });
  if (!hedef) return;

  const liste = await db.productImage.findMany({
    where: { productId: hedef.productId },
    orderBy: { sort: "asc" },
    select: { id: true },
  });
  const n = liste.findIndex((g) => g.id === gorselId);
  const m = n + yon;
  if (n < 0 || m < 0 || m >= liste.length) return;

  const yeni = [...liste];
  [yeni[n], yeni[m]] = [yeni[m], yeni[n]];
  for (let k = 0; k < yeni.length; k++) {
    await db.productImage.update({ where: { id: yeni[k].id }, data: { sort: k } });
  }

  await gorselleriYansit(hedef.productId);
  revalidatePath("/", "layout");

  const geri = geriDon(formData);
  if (geri) redirect(geri);
}
