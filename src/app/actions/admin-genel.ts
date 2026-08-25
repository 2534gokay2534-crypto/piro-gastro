"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, dbVar } from "@/lib/db";

/**
 * Süper Admin — kategori, tedarikçi, kupon, müşteri, sipariş,
 * gelir-gider, kullanıcı, rol, ayar ve yedekleme işlemleri.
 *
 * Hepsi void döner (form action imzası). Veritabanı yoksa sessizce çıkar.
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
const tarih = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
};

async function log(action: string, detail: string) {
  try {
    await db.auditLog.create({ data: { actor: "super-admin", action, detail } });
  } catch {
    /* log yazılamazsa asıl işlem sürsün */
  }
}

const yenile = () => revalidatePath("/", "layout");

/* =============================================================
   KATEGORİLER
   ============================================================= */

export async function kategoriKaydet(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const lang = s(formData.get("lang"), 8) || "tr";
  const ad = s(formData.get("ad"), 200);
  const parentId = s(formData.get("parentId"), 60);
  const sort = i(formData.get("sort"));
  const icon = s(formData.get("icon"), 40);
  if (!ad) return;

  if (id) {
    await db.category.update({
      where: { id },
      data: { parentId: parentId || null, sort, icon: icon || null },
    });
    await db.categoryText.upsert({
      where: { categoryId_langCode: { categoryId: id, langCode: lang } },
      create: { categoryId: id, langCode: lang, name: ad, origin: "manual" },
      update: { name: ad, origin: "manual" },
    });
    await log("kategori.duzenle", `${id} · ${ad}`);
  } else {
    const yeni = "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const slug =
      ad.toLocaleLowerCase("tr")
        .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
        .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "kategori";
    await db.category.create({
      data: {
        id: yeni,
        slug: `${slug}-${yeni.slice(-4)}`,
        parentId: parentId || null,
        sort,
        icon: icon || null,
        texts: { create: { langCode: lang, name: ad, origin: "manual" } },
      },
    });
    await log("kategori.ekle", ad);
  }
  yenile();
}

export async function kategoriSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  if (!id) return;

  // İçinde ürün varsa silme — ürünler kategorisiz kalmasın.
  const adet = await db.product.count({ where: { OR: [{ categoryId: id }, { subId: id }] } });
  if (adet > 0) return;

  await db.category.delete({ where: { id } }).catch(() => null);
  await log("kategori.sil", id);
  yenile();
}

/* =============================================================
   TEDARİKÇİLER
   ============================================================= */

export async function tedarikciKaydet(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const veri = {
    name: s(formData.get("ad"), 150),
    contact: s(formData.get("yetkili"), 120) || null,
    email: s(formData.get("eposta"), 150) || null,
    phone: s(formData.get("telefon"), 60) || null,
    country: s(formData.get("ulke"), 4) || "SE",
    address: s(formData.get("adres"), 300) || null,
    leadDays: i(formData.get("teslim")),
    notes: s(formData.get("not"), 600) || null,
    active: formData.get("aktif") === "1",
  };
  if (!veri.name) return;

  if (id) await db.supplier.update({ where: { id }, data: veri });
  else await db.supplier.create({ data: veri });

  await log(id ? "tedarikci.duzenle" : "tedarikci.ekle", veri.name);
  yenile();
}

export async function tedarikciSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  if (!id) return;
  await db.supplier.delete({ where: { id } }).catch(() => null);
  await log("tedarikci.sil", id);
  yenile();
}

/* =============================================================
   KUPONLAR
   ============================================================= */

export async function kuponKaydet(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const kod = s(formData.get("kod"), 40).toUpperCase().replace(/\s+/g, "");
  const kind = s(formData.get("tur"), 10) === "amount" ? "amount" : "percent";
  if (!kod) return;

  const veri = {
    code: kod,
    kind,
    value: kind === "percent" ? Math.min(90, Math.max(0, i(formData.get("deger")))) : kurusa(formData.get("deger")),
    minTotalCents: kurusa(formData.get("altSinir")),
    usageLimit: i(formData.get("limit")),
    startsAt: tarih(formData.get("baslangic")),
    endsAt: tarih(formData.get("bitis")),
    active: formData.get("aktif") === "1",
    note: s(formData.get("not"), 300) || null,
  };

  if (id) await db.coupon.update({ where: { id }, data: veri });
  else await db.coupon.create({ data: veri }).catch(() => null); // kod benzersiz

  await log(id ? "kupon.duzenle" : "kupon.ekle", kod);
  yenile();
}

export async function kuponSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  if (!id) return;
  await db.coupon.delete({ where: { id } }).catch(() => null);
  await log("kupon.sil", id);
  yenile();
}

/* =============================================================
   MÜŞTERİLER
   ============================================================= */

export async function musteriKaydet(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const veri = {
    name: s(formData.get("ad"), 150),
    email: s(formData.get("eposta"), 150) || null,
    phone: s(formData.get("telefon"), 60) || null,
    company: s(formData.get("firma"), 150) || null,
    orgNr: s(formData.get("orgNr"), 40) || null,
    vatNr: s(formData.get("vatNr"), 40) || null,
    address: s(formData.get("adres"), 300) || null,
    zip: s(formData.get("posta"), 20) || null,
    city: s(formData.get("sehir"), 80) || null,
    country: s(formData.get("ulke"), 4) || "SE",
    type: s(formData.get("tur"), 20) === "retail" ? "retail" : "business",
    notes: s(formData.get("not"), 800) || null,
    updatedAt: new Date(),
  };
  if (!veri.name) return;

  if (id) await db.customer.update({ where: { id }, data: veri });
  else await db.customer.create({ data: veri });

  await log(id ? "musteri.duzenle" : "musteri.ekle", veri.name);
  yenile();
}

export async function musteriSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const geri = s(formData.get("geri"), 300);
  if (!id) return;
  // Siparişler silinmez; yalnızca müşteri bağı çözülür (muhasebe kaydı korunsun).
  await db.order.updateMany({ where: { customerId: id }, data: { customerId: null } });
  await db.customer.delete({ where: { id } }).catch(() => null);
  await log("musteri.sil", id);
  yenile();
  if (geri) redirect(geri);
}

/* =============================================================
   SİPARİŞLER
   ============================================================= */

export async function siparisDurum(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const durum = s(formData.get("durum"), 20);
  const gecerli = ["new", "paid", "packing", "shipped", "delivered", "cancelled", "refunded"];
  if (!id || !gecerli.includes(durum)) return;

  const ek: Record<string, Date> = { updatedAt: new Date() };
  if (durum === "paid") ek.paidAt = new Date();
  if (durum === "shipped") ek.shippedAt = new Date();
  if (durum === "refunded") ek.refundedAt = new Date();

  await db.order.update({ where: { id }, data: { status: durum, ...ek } });
  await log("siparis.durum", `${id} → ${durum}`);
  yenile();
}

export async function siparisNot(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const not = s(formData.get("not"), 1000);
  if (!id) return;
  await db.order.update({ where: { id }, data: { note: not || null, updatedAt: new Date() } });
  yenile();
}

export async function siparisSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const geri = s(formData.get("geri"), 300);
  if (!id) return;
  await db.order.delete({ where: { id } }).catch(() => null);
  await log("siparis.sil", id);
  yenile();
  if (geri) redirect(geri);
}

/* =============================================================
   GELİR-GİDER
   ============================================================= */

export async function kalemKaydet(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const veri = {
    kind: s(formData.get("tur"), 10) === "income" ? "income" : "expense",
    category: s(formData.get("kategori"), 60) || "genel",
    description: s(formData.get("aciklama"), 300),
    amountCents: kurusa(formData.get("tutar")),
    vatCents: kurusa(formData.get("kdv")),
    method: s(formData.get("yontem"), 20) || "bank",
    supplierId: s(formData.get("tedarikci"), 60) || null,
    date: tarih(formData.get("tarih")) ?? new Date(),
    note: s(formData.get("not"), 500) || null,
  };
  if (!veri.description || !veri.amountCents) return;

  if (id) await db.expense.update({ where: { id }, data: veri });
  else await db.expense.create({ data: veri });

  await log(id ? "kalem.duzenle" : "kalem.ekle", `${veri.kind} · ${veri.description}`);
  yenile();
}

export async function kalemSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  if (!id) return;
  await db.expense.delete({ where: { id } }).catch(() => null);
  await log("kalem.sil", id);
  yenile();
}

/* =============================================================
   KULLANICILAR / ROLLER
   ============================================================= */

export async function kullaniciKaydet(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const veri = {
    name: s(formData.get("ad"), 120),
    email: s(formData.get("eposta"), 150).toLowerCase(),
    phone: s(formData.get("telefon"), 60) || null,
    roleId: s(formData.get("rol"), 60) || null,
    active: formData.get("aktif") === "1",
  };
  if (!veri.name || !veri.email) return;

  if (id) await db.adminUser.update({ where: { id }, data: veri });
  else await db.adminUser.create({ data: veri }).catch(() => null); // e-posta benzersiz

  await log(id ? "kullanici.duzenle" : "kullanici.ekle", veri.email);
  yenile();
}

export async function kullaniciSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  if (!id) return;
  await db.adminUser.delete({ where: { id } }).catch(() => null);
  await log("kullanici.sil", id);
  yenile();
}

export async function rolKaydet(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  const ad = s(formData.get("ad"), 60);
  const perms = formData.getAll("yetki").map((v) => String(v)).filter(Boolean).join(",");
  const not = s(formData.get("not"), 300) || null;
  if (!ad) return;

  if (id) await db.role.update({ where: { id }, data: { name: ad, perms, note: not } });
  else await db.role.create({ data: { name: ad, perms, note: not } }).catch(() => null);

  await log(id ? "rol.duzenle" : "rol.ekle", ad);
  yenile();
}

export async function rolSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  if (!id) return;
  await db.adminUser.updateMany({ where: { roleId: id }, data: { roleId: null } });
  await db.role.delete({ where: { id } }).catch(() => null);
  await log("rol.sil", id);
  yenile();
}

/* =============================================================
   AYARLAR
   ============================================================= */

export async function ayarKaydet(formData: FormData) {
  if (!dbVar) return;
  const cift: Array<[string, string]> = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("ayar.")) continue;
    cift.push([k.slice(5), String(v).slice(0, 500)]);
  }
  for (const [key, value] of cift) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  await log("ayar.kaydet", cift.map(([k]) => k).join(", "));
  yenile();
}

/* =============================================================
   LOG / YEDEK
   ============================================================= */

export async function loglariTemizle(formData: FormData) {
  if (!dbVar) return;
  const gun = i(formData.get("gun")) || 90;
  const esik = new Date(Date.now() - gun * 86400000);
  const n = await db.auditLog.deleteMany({ where: { createdAt: { lt: esik } } });
  await log("log.temizle", `${gun} günden eski ${n.count} kayıt`);
  yenile();
}

export async function yedekAl(formData: FormData) {
  if (!dbVar) return;
  const label = s(formData.get("etiket"), 120) || `Yedek ${new Date().toLocaleString("tr-TR")}`;
  const kind = s(formData.get("tur"), 20) === "tam" ? "tam" : "katalog";

  const [urun, siparis] = await Promise.all([db.product.count(), db.order.count()]);
  await db.backup.create({
    data: { label, kind, products: urun, orders: siparis, note: s(formData.get("not"), 300) || null },
  });
  await log("yedek.al", `${label} · ${urun} ürün`);
  yenile();
}

export async function yedekSil(formData: FormData) {
  if (!dbVar) return;
  const id = s(formData.get("id"), 60);
  if (!id) return;
  await db.backup.delete({ where: { id } }).catch(() => null);
  yenile();
}
