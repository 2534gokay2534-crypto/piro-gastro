import { NextResponse } from "next/server";
import { db, dbVar } from "@/lib/db";
import { CIRO_DURUMLARI, ODEME, SIPARIS_DURUM, csvPara, csvYap } from "@/lib/admin-ui";
import { DONEMLER, donemBaslangici, donemlereBol, genelToplam, type DonemTuru } from "@/lib/rapor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Yönetim ekranlarının "Dışa aktar (CSV)" bağlantısı.
 *
 * Excel'in Türkçe yerelde sorunsuz açması için ayraç ";" ve başta BOM
 * kullanılır (csvYap içinde).
 */

const LIMIT = 5000;
const PARCA = 400; // SQLite sorgu parametre sınırını aşmamak için

/** İlişkili metinlerle birlikte ürünleri parça parça çeker. */
async function urunleriGetir(
  kosul: Record<string, unknown>,
  lang: string,
  sirala: "sku" | "stok",
) {
  type Satir = Awaited<ReturnType<typeof sayfaCek>>[number];
  const sonuc: Satir[] = [];

  async function sayfaCek(atla: number) {
    return db.product.findMany({
      where: kosul,
      orderBy: sirala === "sku" ? { sku: "asc" } : { stock: "asc" },
      skip: atla,
      take: PARCA,
      include: {
        texts: { where: { langCode: lang }, select: { name: true } },
        category: { select: { texts: { where: { langCode: lang }, select: { name: true } } } },
        brand: { select: { name: true } },
      },
    });
  }

  for (let atla = 0; atla < LIMIT; atla += PARCA) {
    const p = await sayfaCek(atla);
    sonuc.push(...p);
    if (p.length < PARCA) break;
  }
  return sonuc;
}

function indir(ad: string, icerik: string) {
  return new NextResponse(icerik, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${ad}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}

function donem(a: string): Date {
  const s = new Date();
  if (a === "bugun") return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  if (a === "hafta") { const g = new Date(s); g.setDate(s.getDate() - 7); return g; }
  if (a === "gun30") { const g = new Date(s); g.setDate(s.getDate() - 30); return g; }
  if (a === "gun90") { const g = new Date(s); g.setDate(s.getDate() - 90); return g; }
  if (a === "yil") return new Date(s.getFullYear(), 0, 1);
  if (a === "gecenAy") return new Date(s.getFullYear(), s.getMonth() - 1, 1);
  return new Date(s.getFullYear(), s.getMonth(), 1);
}

export async function GET(req: Request) {
  if (!dbVar) {
    return new NextResponse("Veritabanı bağlı değil.", { status: 503 });
  }

  const u = new URL(req.url);
  const tip = (u.searchParams.get("tip") ?? "").trim();
  const lang = (u.searchParams.get("lang") ?? "tr").trim();
  const kat = (u.searchParams.get("k") ?? "").trim();
  const q = (u.searchParams.get("q") ?? "").trim();
  const durum = (u.searchParams.get("d") ?? "").trim();
  const a = (u.searchParams.get("a") ?? "ay").trim();

  const ad = (t: Array<{ name: string }>) => t[0]?.name ?? "";

  try {
    switch (tip) {
      /* ---------------- ÜRÜNLER ---------------- */
      case "urunler": {
        const kosul: Record<string, unknown> = {};
        if (kat) kosul.OR = [{ categoryId: kat }, { subId: kat }];
        if (q) {
          kosul.AND = [{ OR: [{ sku: { contains: q } }, { texts: { some: { name: { contains: q } } } }] }];
        }
        const liste = await urunleriGetir(kosul, lang, "sku");
        return indir(
          "urunler",
          csvYap(
            ["Stok kodu", "Ürün", "Kategori", "Marka", "Fiyat", "Maliyet", "Stok", "Eşik", "Durum", "Öne çıkan", "Kampanya %", "Satış"],
            liste.map((p) => [
              p.sku, ad(p.texts), ad(p.category.texts), p.brand?.name ?? "",
              csvPara(p.priceCents), csvPara(p.costCents), p.stock, p.threshold,
              p.hidden ? "Gizli" : "Yayında", p.featured ? "Evet" : "Hayır",
              p.campaignOn ? p.campaignPercent : 0, p.sold,
            ]),
          ),
        );
      }

      /* ---------------- KATEGORİLER ---------------- */
      case "kategoriler": {
        const [liste, say] = await Promise.all([
          db.category.findMany({
            orderBy: { sort: "asc" },
            include: { texts: { where: { langCode: lang }, select: { name: true }, take: 1 } },
          }),
          db.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
        ]);
        const harita = new Map(say.map((x) => [x.categoryId, x._count._all]));
        const adlar = new Map(liste.map((c) => [c.id, ad(c.texts)]));
        return indir(
          "kategoriler",
          csvYap(
            ["ID", "Kategori", "Üst kategori", "Slug", "Sıra", "Ürün sayısı"],
            liste.map((c) => [
              c.id, ad(c.texts), c.parentId ? adlar.get(c.parentId) ?? "" : "",
              c.slug, c.sort, harita.get(c.id) ?? 0,
            ]),
          ),
        );
      }

      /* ---------------- SİPARİŞLER ---------------- */
      case "siparisler": {
        const liste = await db.order.findMany({
          where: durum ? { status: durum } : {},
          orderBy: { createdAt: "desc" },
          take: LIMIT,
          include: { customer: { select: { name: true, company: true, email: true } }, _count: { select: { items: true } } },
        });
        return indir(
          "siparisler",
          csvYap(
            ["Sipariş no", "Tarih", "Durum", "Ödeme", "Müşteri", "Firma", "E-posta", "Kalem", "Ara toplam", "İndirim", "Kargo", "KDV", "Toplam", "Maliyet", "Kupon"],
            liste.map((o) => [
              o.number, o.createdAt.toISOString().slice(0, 16).replace("T", " "),
              SIPARIS_DURUM[o.status]?.ad ?? o.status, ODEME[o.payMethod] ?? o.payMethod,
              o.customer?.name ?? "", o.customer?.company ?? "", o.customer?.email ?? "",
              o._count.items, csvPara(o.subtotalCents), csvPara(o.discountCents),
              csvPara(o.shipCents), csvPara(o.vatCents), csvPara(o.totalCents),
              csvPara(o.costCents), o.couponCode ?? "",
            ]),
          ),
        );
      }

      /* ---------------- MÜŞTERİLER ---------------- */
      case "musteriler": {
        const liste = await db.customer.findMany({
          orderBy: { createdAt: "desc" },
          take: LIMIT,
          include: { orders: { where: { status: { in: CIRO_DURUMLARI } }, select: { totalCents: true } } },
        });
        return indir(
          "musteriler",
          csvYap(
            ["Ad", "Firma", "E-posta", "Telefon", "Org.nr", "VAT", "Adres", "Posta k.", "Şehir", "Ülke", "Tür", "Sipariş", "Toplam ciro", "Kayıt"],
            liste.map((m) => [
              m.name, m.company ?? "", m.email ?? "", m.phone ?? "", m.orgNr ?? "", m.vatNr ?? "",
              m.address ?? "", m.zip ?? "", m.city ?? "", m.country,
              m.type === "business" ? "Kurumsal" : "Bireysel",
              m.orders.length, csvPara(m.orders.reduce((t, o) => t + o.totalCents, 0)),
              m.createdAt.toISOString().slice(0, 10),
            ]),
          ),
        );
      }

      /* ---------------- TEDARİKÇİLER ---------------- */
      case "tedarikciler": {
        const liste = await db.supplier.findMany({ orderBy: { name: "asc" }, take: LIMIT });
        return indir(
          "tedarikciler",
          csvYap(
            ["Firma", "Yetkili", "E-posta", "Telefon", "Ülke", "Adres", "Teslim (gün)", "Durum", "Not"],
            liste.map((t) => [
              t.name, t.contact ?? "", t.email ?? "", t.phone ?? "", t.country,
              t.address ?? "", t.leadDays, t.active ? "Aktif" : "Pasif", t.notes ?? "",
            ]),
          ),
        );
      }

      /* ---------------- GELİR-GİDER ---------------- */
      case "gelirgider": {
        const liste = await db.expense.findMany({ orderBy: { date: "desc" }, take: LIMIT });
        return indir(
          "gelir-gider",
          csvYap(
            ["Tarih", "Tür", "Kategori", "Açıklama", "Tutar", "KDV", "Yöntem", "Not"],
            liste.map((k) => [
              k.date.toISOString().slice(0, 10),
              k.kind === "income" ? "Gelir" : "Gider",
              k.category, k.description, csvPara(k.amountCents), csvPara(k.vatCents),
              ODEME[k.method] ?? k.method, k.note ?? "",
            ]),
          ),
        );
      }

      /* ---------------- STOK ---------------- */
      case "stok": {
        const liste = await urunleriGetir({}, lang, "stok");
        return indir(
          "stok",
          csvYap(
            ["Stok kodu", "Ürün", "Kategori", "Stok", "Eşik", "Maliyet", "Stok değeri", "Sipariş üzerine"],
            liste.map((p) => [
              p.sku, ad(p.texts), ad(p.category.texts), p.stock, p.threshold,
              csvPara(p.costCents), csvPara(p.stock * p.costCents), p.onRequest ? "Evet" : "Hayır",
            ]),
          ),
        );
      }

      /* ---------------- KUPONLAR ---------------- */
      case "rapor": {
        const tur = (u.searchParams.get("d") ?? "ay") as DonemTuru;
        const secili = DONEMLER.find((x: { kod: DonemTuru }) => x.kod === tur) ?? DONEMLER[2];
        const liste = await db.order.findMany({
          where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: donemBaslangici(secili.kod, secili.adet) } },
          select: {
            createdAt: true, totalCents: true, subtotalCents: true,
            vatCents: true, shipCents: true, costCents: true,
            _count: { select: { items: true } },
          },
        });
        const satirlar = donemlereBol(liste.map((o) => ({ ...o, _kalem: o._count.items })), secili.kod);
        const t = genelToplam(satirlar);
        return indir(
          `muhasebe-raporu-${secili.kod}`,
          csvYap(
            ["Dönem", "Sipariş", "Kalem", "Net satış", "Kargo", "KDV", "Ciro", "Kâr", "Ortalama sipariş"],
            [
              ...satirlar.map((s) => [
                s.baslik, s.siparis, s.urunAdedi,
                csvPara(s.netCents), csvPara(s.kargoCents), csvPara(s.kdvCents),
                csvPara(s.ciroCents), csvPara(s.karCents), csvPara(s.ortalamaCents),
              ]),
              ["TOPLAM", t.siparis, t.urunAdedi,
               csvPara(t.netCents), csvPara(t.kargoCents), csvPara(t.kdvCents),
               csvPara(t.ciroCents), csvPara(t.karCents), csvPara(t.ortalamaCents)],
            ],
          ),
        );
      }

      case "makbuzlar": {
        const liste = await db.order.findMany({
          orderBy: { createdAt: "desc" },
          take: LIMIT,
          select: {
            number: true, status: true, payMethod: true, paidMethod: true,
            subtotalCents: true, vatCents: true, shipCents: true, totalCents: true,
            createdAt: true, paidAt: true,
            shipName: true, shipAddr: true, shipZip: true, shipCity: true,
            customer: { select: { name: true, company: true, email: true, phone: true, orgNr: true, country: true } },
            items: { select: { sku: true, name: true, variant: true, qty: true, unitPriceCents: true, vatRate: true, lineTotalCents: true } },
            _count: { select: { items: true } },
          },
        });
        const durumAdi: Record<string, string> = {
          paid: "Ödendi", pending: "Ödeme bekleniyor", new: "Yeni / faturalanacak",
          packing: "Hazırlanıyor", shipped: "Kargoda", delivered: "Teslim edildi",
          cancelled: "İptal", refunded: "İade",
        };
        return indir(
          "makbuzlar",
          csvYap(
            ["Belge no", "Tür", "Tarih", "Ödeme tarihi", "Durum", "Ödeme yöntemi",
             "Firma", "Kişi", "E-posta", "Telefon", "Org.nr", "Ülke",
             "Teslimat adresi", "Posta kodu", "Şehir",
             "Kalem", "Ürünler (adet × SKU · ad · özellik = tutar)", "Ara toplam", "Kargo", "KDV", "Toplam"],
            liste.map((o) => [
              o.number,
              ["paid", "packing", "shipped", "delivered"].includes(o.status) ? "Makbuz" : "Fatura",
              o.createdAt.toISOString().slice(0, 16).replace("T", " "),
              o.paidAt?.toISOString().slice(0, 16).replace("T", " ") ?? "",
              durumAdi[o.status] ?? o.status,
              o.paidMethod || o.payMethod,
              o.customer?.company ?? "", o.customer?.name ?? "",
              o.customer?.email ?? "", o.customer?.phone ?? "",
              o.customer?.orgNr ?? "", o.customer?.country ?? "",
              o.shipAddr ?? "", o.shipZip ?? "", o.shipCity ?? "",
              o._count.items,
              o.items
                .map((i) => `${i.qty} × ${i.sku} · ${i.name}${i.variant ? " · " + i.variant : ""} = ${(i.lineTotalCents / 100).toFixed(2)}`)
                .join(" | "),
              csvPara(o.subtotalCents), csvPara(o.shipCents),
              csvPara(o.vatCents), csvPara(o.totalCents),
            ]),
          ),
        );
      }

      case "faturaBasvuru": {
        const liste = await db.invoiceApplication.findMany({
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: LIMIT,
        });
        const durumAdi: Record<string, string> = {
          pending: "Bekliyor", approved: "Onaylı", rejected: "Reddedildi",
        };
        return indir(
          "fatura-basvurulari",
          csvYap(
            ["Firma", "Org.nr", "KDV no", "Yetkili", "E-posta", "Telefon",
             "Fatura adresi", "Posta kodu", "Şehir", "Ülke", "Durum",
             "Kredi limiti", "Karar veren", "Karar tarihi", "Gerekçe", "Başvuru tarihi", "Not"],
            liste.map((b) => [
              b.company, b.orgNr, b.vatNr ?? "", b.contact, b.email, b.phone,
              b.billAddr, b.billZip, b.billCity, b.country,
              durumAdi[b.status] ?? b.status,
              b.creditLimitCents ? csvPara(b.creditLimitCents) : "sınırsız",
              b.decidedBy ?? "", b.decidedAt?.toISOString().slice(0, 16).replace("T", " ") ?? "",
              b.decision ?? "", b.createdAt.toISOString().slice(0, 16).replace("T", " "),
              b.note ?? "",
            ]),
          ),
        );
      }

      case "kuponlar": {
        const liste = await db.coupon.findMany({ orderBy: { createdAt: "desc" }, take: LIMIT });
        return indir(
          "kuponlar",
          csvYap(
            ["Kod", "Tür", "Değer", "Alt sınır", "Limit", "Kullanım", "Başlangıç", "Bitiş", "Durum", "Not"],
            liste.map((k) => [
              k.code, k.kind === "percent" ? "Yüzde" : "Tutar",
              k.kind === "percent" ? k.value : csvPara(k.value),
              csvPara(k.minTotalCents), k.usageLimit || "sınırsız", k.usedCount,
              k.startsAt?.toISOString().slice(0, 10) ?? "", k.endsAt?.toISOString().slice(0, 10) ?? "",
              k.active ? "Aktif" : "Pasif", k.note ?? "",
            ]),
          ),
        );
      }

      /* ---------------- LOGLAR ---------------- */
      case "loglar": {
        const liste = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: LIMIT });
        return indir(
          "loglar",
          csvYap(
            ["Zaman", "Kullanıcı", "İşlem", "Ayrıntı"],
            liste.map((l) => [
              l.createdAt.toISOString().slice(0, 19).replace("T", " "),
              l.actor, l.action, l.detail ?? "",
            ]),
          ),
        );
      }

      /* ---------------- MUHASEBE ÖZETİ ---------------- */
      case "muhasebe": {
        const bas = donem(a);
        const [satis, gider, gelir] = await Promise.all([
          db.order.aggregate({
            _sum: { totalCents: true, vatCents: true, costCents: true },
            _count: { _all: true },
            where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: bas } },
          }),
          db.expense.aggregate({ _sum: { amountCents: true, vatCents: true }, where: { kind: "expense", date: { gte: bas } } }),
          db.expense.aggregate({ _sum: { amountCents: true }, where: { kind: "income", date: { gte: bas } } }),
        ]);
        const ciro = satis._sum.totalCents ?? 0;
        const kdv = satis._sum.vatCents ?? 0;
        const maliyet = satis._sum.costCents ?? 0;
        const giderT = gider._sum.amountCents ?? 0;
        const gelirT = gelir._sum.amountCents ?? 0;
        return indir(
          "muhasebe",
          csvYap(
            ["Kalem", "Tutar"],
            [
              ["Dönem başlangıcı", bas.toISOString().slice(0, 10)],
              ["Sipariş adedi", satis._count._all],
              ["Ciro (KDV dahil)", csvPara(ciro)],
              ["Tahsil edilen KDV", csvPara(kdv)],
              ["Net satış (KDV hariç)", csvPara(ciro - kdv)],
              ["Satılan malın maliyeti", csvPara(maliyet)],
              ["Brüt kâr", csvPara(ciro - kdv - maliyet)],
              ["Diğer gelirler", csvPara(gelirT)],
              ["İşletme giderleri", csvPara(giderT)],
              ["İndirilecek KDV", csvPara(gider._sum.vatCents ?? 0)],
              ["Ödenecek KDV", csvPara(kdv - (gider._sum.vatCents ?? 0))],
              ["Net kâr", csvPara(ciro - kdv - maliyet + gelirT - giderT)],
            ],
          ),
        );
      }

      /* ---------------- SATIŞ RAPORU ---------------- */
      case "raporlar": {
        const bas = donem(a);
        const kalemler = await db.orderItem.findMany({
          where: { order: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: bas } } },
          take: LIMIT,
          select: { sku: true, name: true, qty: true, lineTotalCents: true, unitCostCents: true },
        });
        const harita = new Map<string, { ad: string; adet: number; tutar: number; maliyet: number }>();
        for (const k of kalemler) {
          const v = harita.get(k.sku) ?? { ad: k.name, adet: 0, tutar: 0, maliyet: 0 };
          v.adet += k.qty;
          v.tutar += k.lineTotalCents;
          v.maliyet += k.unitCostCents * k.qty;
          harita.set(k.sku, v);
        }
        return indir(
          "satis-raporu",
          csvYap(
            ["Stok kodu", "Ürün", "Adet", "Ciro", "Maliyet", "Kâr"],
            [...harita.entries()]
              .sort((x, y) => y[1].tutar - x[1].tutar)
              .map(([sku, v]) => [sku, v.ad, v.adet, csvPara(v.tutar), csvPara(v.maliyet), csvPara(v.tutar - v.maliyet)]),
          ),
        );
      }

      /* ---------------- KULLANICILAR ---------------- */
      case "kullanicilar": {
        const liste = await db.adminUser.findMany({
          orderBy: { createdAt: "desc" },
          include: { role: { select: { name: true } } },
        });
        return indir(
          "kullanicilar",
          csvYap(
            ["Ad", "E-posta", "Telefon", "Rol", "Durum", "Son giriş", "Kayıt"],
            liste.map((k) => [
              k.name, k.email, k.phone ?? "", k.role?.name ?? "",
              k.active ? "Aktif" : "Pasif",
              k.lastLoginAt?.toISOString().slice(0, 16).replace("T", " ") ?? "",
              k.createdAt.toISOString().slice(0, 10),
            ]),
          ),
        );
      }

      default:
        return new NextResponse("Bilinmeyen dışa aktarma türü.", { status: 400 });
    }
  } catch (e) {
    return new NextResponse("Dışa aktarma başarısız: " + String(e), { status: 500 });
  }
}
