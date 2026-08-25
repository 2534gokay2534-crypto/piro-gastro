"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, dbVar } from "@/lib/db";
import { CART_COOKIE, cartDetail } from "@/lib/cart";
import { langDef, pick } from "@/lib/i18n";
import { SON_SIPARIS_COOKIE, formuDogrula, formuOku, siparisNo, tutarlariHesapla, varyantOzeti } from "@/lib/siparis";
import { ODEME_PARA, eurCentToOre, stripe } from "@/lib/odeme-saglayici";
import { YONTEM_KODLARI, demoMu, odemeAcik, stripeYontemi } from "@/lib/odeme-modu";
import { orgNrSade } from "@/lib/fatura-basvuru";
import { MUSTERI_CEREZ, MUSTERI_SURE_MS, oturumUret } from "@/lib/musteri-oturum";

/**
 * ÖDEME BAŞLATMA
 *
 * Akış:
 *   1) Sepet SUNUCUDA yeniden okunur, tutarlar katalogdan hesaplanır.
 *   2) Sipariş "pending" olarak yazılır (ödeme öncesi kayıt — para alınıp
 *      kaydı olmayan sipariş kalmasın).
 *   3) Stripe Checkout oturumu açılır ve müşteri oraya yönlendirilir.
 *   4) Ödeme tamamlanınca webhook siparişi "paid" yapar.
 *
 * Fatura ile ödeme yalnızca onaylı başvurusu olan firmalara açıktır;
 * seçilse bile burada tekrar doğrulanır — istemciye güvenilmez.
 */

/** Bu org.nr / e-posta için onaylı fatura başvurusu var mı? */
export async function faturaAcikMi(orgNr: string, eposta: string): Promise<boolean> {
  if (!dbVar) return false;
  const sade = orgNrSade(orgNr);
  if (!sade || !eposta) return false;
  try {
    const k = await db.invoiceApplication.findFirst({
      where: { status: "approved", orgNr: { not: "" }, email: eposta.toLowerCase() },
      select: { orgNr: true },
    });
    return !!k && orgNrSade(k.orgNr) === sade;
  } catch {
    return false;
  }
}

async function yeniNumara(yil: number): Promise<string> {
  const onek = `PG-${yil}-`;
  const son = await db.order.findFirst({
    where: { number: { startsWith: onek } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const sira = son ? Number(son.number.slice(onek.length)) + 1 : 1;
  return siparisNo(yil, Number.isFinite(sira) && sira > 0 ? sira : 1);
}

export async function odemeBaslat(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const form = formuOku(veri);

  const sepet = await cartDetail(dil);
  if (!sepet.lines.length) redirect(`/${dil}/sepet`);

  const hatalar = formuDogrula(form);
  if (Object.keys(hatalar).length > 0) {
    const p = new URLSearchParams();
    p.set("hata", Object.keys(hatalar).join(","));
    for (const [k, v] of Object.entries(form)) if (v) p.set(k, v);
    redirect(`/${dil}/odeme?${p.toString()}`);
  }

  // --- fatura seçildiyse yetki gerçekten var mı? ---
  const faturali = form.odeme === "invoice";
  if (faturali) {
    const izin = await faturaAcikMi(form.vergiNo, form.eposta);
    if (!izin) {
      const p = new URLSearchParams({ hata: "odeme", faturaYok: "1" });
      for (const [k, v] of Object.entries(form)) if (v && k !== "odeme") p.set(k, v);
      redirect(`/${dil}/odeme?${p.toString()}`);
    }
  }

  // Seçilen ödeme yöntemi (swish | card | klarna); fatura ayrı yol.
  const yontem = faturali ? "invoice" : (YONTEM_KODLARI.includes(form.odeme) ? form.odeme : "card");

  // --- ödeme alınacaksa veritabanı ZORUNLU ---
  // Para alınıp siparişi kaydedilemeyen müşteri kalmasın.
  if (!dbVar) redirect(`/${dil}/odeme?hata=sistem&sebep=veritabani`);
  if (!faturali && !odemeAcik()) redirect(`/${dil}/odeme?hata=sistem&sebep=saglayici`);

  // Demo modunda tahsilat yapılmaz; sipariş ödenmiş sayılır ve makbuz
  // zinciri (Siparişlerim → Muhasebe → Süper Admin) baştan sona işler.
  const demo = !faturali && demoMu();

  const tutar = tutarlariHesapla(sepet.lines, form.ulke);
  const simdi = new Date();

  let numara: string;
  let siparisId: string;
  try {
    numara = await yeniNumara(simdi.getFullYear());
    const musteri = await db.customer.create({
      data: {
        name: form.ad, email: form.eposta, phone: form.telefon,
        company: form.firma, orgNr: form.vergiNo || null,
        address: form.adres, zip: form.postaKodu, city: form.sehir,
        country: form.ulke, type: "business",
      },
    });
    const siparis = await db.order.create({
      data: {
        number: numara,
        customerId: musteri.id,
        // Faturalı sipariş doğrudan "new"; kartlı ödeme önce "pending".
        status: faturali ? "new" : demo ? "paid" : "pending",
        payMethod: faturali ? "invoice" : yontem,
        paidMethod: demo ? yontem : null,
        paidAt: demo ? simdi : null,
        currency: "EUR",
        subtotalCents: tutar.netCents,
        vatCents: tutar.vatCents,
        shipCents: tutar.shipCents,
        totalCents: tutar.totalCents,
        costCents: 0,
        note: form.not || null,
        shipName: form.firma, shipAddr: form.adres,
        shipZip: form.postaKodu, shipCity: form.sehir,
        provider: faturali ? null : demo ? "demo" : "stripe",
        paymentRef: demo ? `demo_${simdi.getTime()}` : null,
        items: {
          create: sepet.lines.map((l) => ({
            productId: l.product.id, sku: l.product.sku,
            name: pick(l.product, "name", dil),
            // Sipariş anındaki ayırt edici özellikler makbuza donuk yazılır
            variant: varyantOzeti(l.product, dil) || null,
            qty: l.qty, unitPriceCents: l.unitCents, unitCostCents: 0,
            vatRate: tutar.kdvYuzde, lineTotalCents: l.lineCents,
          })),
        },
      },
      select: { id: true },
    });
    siparisId = siparis.id;
  } catch {
    redirect(`/${dil}/odeme?hata=sistem&sebep=kayit`);
  }

  await db.auditLog
    .create({
      data: {
        actor: "magaza",
        action: faturali ? "siparis.fatura" : demo ? "siparis.odendi-demo" : "siparis.odeme-basladi",
        detail: `${numara} · ${form.firma} · ${(tutar.totalCents / 100).toFixed(2)} EUR`,
      },
    })
    .catch(() => null);


  // "Siparişlerim" ve makbuzlar bu tarayıcıda kendiliğinden açılsın diye
  // imzalı müşteri oturumu bırakılır (parola yok, imza sunucudan).
  const musteriCerezi = await oturumUret(form.eposta, simdi.getTime());
  const musteriCerezAyari = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(MUSTERI_SURE_MS / 1000),
  };

  const ozet = JSON.stringify({
    no: numara, ulke: form.ulke, odeme: faturali ? "invoice" : yontem,
    firma: form.firma, eposta: form.eposta,
    satir: sepet.lines.map((l) => `${l.product.id}:${l.qty}`).join(","),
  });

  /* ---------- faturalı veya demo: sağlayıcıya gidilmez ---------- */
  if (faturali || demo) {
    const kutu = await cookies();
    kutu.delete(CART_COOKIE);
    kutu.set(SON_SIPARIS_COOKIE, ozet, { maxAge: 3600, httpOnly: false, sameSite: "lax", path: "/" });
    kutu.set(MUSTERI_CEREZ, musteriCerezi, musteriCerezAyari);
    revalidatePath("/", "layout");
    redirect(`/${dil}/odeme/tamam?no=${numara}${faturali ? "&fatura=1" : ""}${demo ? "&demo=1" : ""}`);
  }

  /* ---------- kartlı/Swish/Klarna: Stripe Checkout ---------- */
  const kur = langDef("sv")?.rate ?? 11.4; // tahsilat SEK üzerinden
  const bas = await headers();
  const kaynak =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    `${bas.get("x-forwarded-proto") ?? "https"}://${bas.get("host") ?? "localhost:3000"}`;

  let gitUrl = "";
  try {
    const oturum = await stripe().checkout.sessions.create({
      mode: "payment",
      // Müşteri hangi yöntemi seçtiyse Stripe'ta yalnızca o açılır.
      payment_method_types: stripeYontemi(yontem),
      locale: dil === "sv" ? "sv" : dil === "de" ? "de" : "en",
      customer_email: form.eposta,
      client_reference_id: numara,
      metadata: { siparisId, numara, dil },
      line_items: [
        ...sepet.lines.map((l) => ({
          quantity: l.qty,
          price_data: {
            currency: ODEME_PARA,
            unit_amount: eurCentToOre(l.unitCents, kur),
            product_data: {
              name: `${pick(l.product, "name", dil)} (${l.product.sku})`,
            },
          },
        })),
        ...(tutar.shipCents > 0
          ? [{
              quantity: 1,
              price_data: {
                currency: ODEME_PARA,
                unit_amount: eurCentToOre(tutar.shipCents, kur),
                product_data: { name: dil === "sv" ? "Frakt" : dil === "tr" ? "Kargo" : dil === "de" ? "Versand" : "Shipping" },
              },
            }]
          : []),
        {
          quantity: 1,
          price_data: {
            currency: ODEME_PARA,
            unit_amount: eurCentToOre(tutar.vatCents, kur),
            product_data: { name: `${dil === "sv" ? "Moms" : dil === "tr" ? "KDV" : dil === "de" ? "MwSt." : "VAT"} ${tutar.kdvYuzde}%` },
          },
        },
      ],
      success_url: `${kaynak}/${dil}/odeme/tamam?no=${numara}&oturum={CHECKOUT_SESSION_ID}`,
      cancel_url: `${kaynak}/${dil}/odeme?iptal=1`,
    });

    gitUrl = oturum.url ?? "";
    await db.order.update({ where: { id: siparisId }, data: { providerRef: oturum.id } });
  } catch {
    // Oturum açılamadı — sipariş "pending" kalır, müşteriye hata gösterilir.
    redirect(`/${dil}/odeme?hata=sistem&sebep=saglayici`);
  }

  if (!gitUrl) redirect(`/${dil}/odeme?hata=sistem&sebep=saglayici`);

  // Sepet henüz BOŞALTILMAZ — müşteri ödemeden vazgeçerse sepeti dursun.
  const kutu = await cookies();
  kutu.set(SON_SIPARIS_COOKIE, ozet, { maxAge: 3600, httpOnly: false, sameSite: "lax", path: "/" });
  kutu.set(MUSTERI_CEREZ, musteriCerezi, musteriCerezAyari);
  redirect(gitUrl);
}
