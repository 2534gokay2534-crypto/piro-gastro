"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, dbVar } from "@/lib/db";
import { CART_COOKIE, cartDetail } from "@/lib/cart";
import { SON_SIPARIS_COOKIE } from "@/lib/siparis";
import { pick } from "@/lib/i18n";
import { formuDogrula, formuOku, siparisNo, tutarlariHesapla } from "@/lib/siparis";

/**
 * SİPARİŞ OLUŞTURMA
 *
 * 1) Sepet SUNUCUDA yeniden okunur; fiyatlar katalogdan alınır, istemciden
 *    gelen hiçbir tutara güvenilmez.
 * 2) Veritabanı varsa Customer + Order + OrderItem yazılır ve sipariş
 *    Süper Admin → Siparişler ekranına düşer.
 * 3) Veritabanı yoksa (Vercel'de DATABASE_URL tanımlı değil) akış
 *    KESİLMEZ: onay sayfası özetle birlikte açılır ve müşteriye özeti
 *    e-posta ile göndermesi için hazır bir bağlantı sunulur.
 *    Sohbet bileşenindeki aynı "veritabanısız da çalış" yaklaşımı.
 */

/** O yılın son sırasından bir sonraki sipariş numarasını üretir. */
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

export async function siparisOlustur(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const form = formuOku(veri);

  // --- sepeti sunucuda doğrula ---
  const sepet = await cartDetail(dil);
  if (!sepet.lines.length) redirect(`/${dil}/sepet`);

  // --- formu doğrula ---
  const hatalar = formuDogrula(form);
  if (Object.keys(hatalar).length > 0) {
    const p = new URLSearchParams();
    p.set("hata", Object.keys(hatalar).join(","));
    // Girilen değerler kaybolmasın diye forma geri taşınır.
    for (const [k, v] of Object.entries(form)) if (v) p.set(k, v);
    redirect(`/${dil}/odeme?${p.toString()}`);
  }

  const tutar = tutarlariHesapla(sepet.lines, form.ulke);
  const simdi = new Date();

  let numara = "";
  let kaydedildi = false;

  if (dbVar) {
    try {
      numara = await yeniNumara(simdi.getFullYear());

      const musteri = await db.customer.create({
        data: {
          name: form.ad,
          email: form.eposta,
          phone: form.telefon,
          company: form.firma,
          orgNr: form.vergiNo || null,
          address: form.adres,
          zip: form.postaKodu,
          city: form.sehir,
          country: form.ulke,
          type: "business",
        },
      });

      await db.order.create({
        data: {
          number: numara,
          customerId: musteri.id,
          status: "new",
          payMethod: form.odeme,
          currency: "EUR",
          subtotalCents: tutar.netCents,
          vatCents: tutar.vatCents,
          shipCents: tutar.shipCents,
          discountCents: 0,
          totalCents: tutar.totalCents,
          // Katalogda maliyet verisi yok; kâr hesabı için admin panelinden girilir.
          costCents: 0,
          note: form.not || null,
          shipName: form.firma,
          shipAddr: form.adres,
          shipZip: form.postaKodu,
          shipCity: form.sehir,
          items: {
            create: sepet.lines.map((l) => ({
              productId: l.product.id,
              sku: l.product.sku,
              name: pick(l.product, "name", dil),
              qty: l.qty,
              unitPriceCents: l.unitCents,
              unitCostCents: 0,
              vatRate: tutar.kdvYuzde,
              lineTotalCents: l.lineCents,
            })),
          },
        },
      });

      await db.auditLog.create({
        data: {
          actor: "magaza",
          action: "siparis.olustur",
          detail: `${numara} · ${form.firma} · ${(tutar.totalCents / 100).toFixed(2)} EUR`,
        },
      }).catch(() => null); // günlük yazılamazsa sipariş yine de geçerlidir

      kaydedildi = true;
    } catch {
      // Veritabanına yazılamadı — akışı kesmeyiz, onay sayfası özetle açılır.
      kaydedildi = false;
    }
  }

  // Kaydedilemediyse müşterinin elinde kalacak bir referans üretilir.
  if (!numara) {
    numara = siparisNo(simdi.getFullYear(), (simdi.getTime() % 10000) || 1);
  }

  // --- onay sayfası özeti (sepet birazdan boşalacağı için saklanır) ---
  const ozet = {
    no: numara,
    ulke: form.ulke,
    odeme: form.odeme,
    firma: form.firma,
    eposta: form.eposta,
    // "urunId:adet" — sepet çerezinin biçimi; onay sayfası katalogdan çözer
    satir: sepet.lines.map((l) => `${l.product.id}:${l.qty}`).join(","),
  };

  // --- sepeti boşalt ---
  const kutu = await cookies();
  kutu.delete(CART_COOKIE);
  kutu.set(SON_SIPARIS_COOKIE, JSON.stringify(ozet), {
    maxAge: 60 * 60, // 1 saat — onay sayfası açılabilsin diye
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");

  const p = new URLSearchParams();
  p.set("no", numara);
  if (!kaydedildi) p.set("bekliyor", "1");
  redirect(`/${dil}/odeme/tamam?${p.toString()}`);
}
