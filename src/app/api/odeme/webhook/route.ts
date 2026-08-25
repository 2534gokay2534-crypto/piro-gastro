import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { db, dbVar } from "@/lib/db";
import { WEBHOOK_GIZLI, stripe, stripeVar, yontemAdi } from "@/lib/odeme-saglayici";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * STRIPE WEBHOOK
 *
 * Ödemenin gerçekten alındığına dair TEK güvenilir kaynak budur; başarı
 * sayfasına dönmüş olmak ödeme yapıldığı anlamına gelmez (müşteri URL'i
 * elle açabilir). Bu yüzden sipariş yalnızca burada "paid" olur.
 *
 * İmza doğrulanmadan hiçbir işlem yapılmaz.
 */
export async function POST(istek: NextRequest) {
  if (!stripeVar || !WEBHOOK_GIZLI) {
    return NextResponse.json({ hata: "odeme yapilandirilmamis" }, { status: 503 });
  }

  const imza = istek.headers.get("stripe-signature");
  if (!imza) return NextResponse.json({ hata: "imza yok" }, { status: 400 });

  const ham = await istek.text();

  let olay: Stripe.Event;
  try {
    olay = stripe().webhooks.constructEvent(ham, imza, WEBHOOK_GIZLI);
  } catch {
    return NextResponse.json({ hata: "imza gecersiz" }, { status: 400 });
  }

  if (!dbVar) return NextResponse.json({ alindi: true, not: "veritabani yok" });

  try {
    switch (olay.type) {
      case "checkout.session.completed": {
        const o = olay.data.object;
        if (o.payment_status === "paid") await odendi(o);
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        // Swish ve Klarna gecikmeli onaylanabilir.
        await odendi(olay.data.object);
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        await basarisiz(olay.data.object);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // Stripe yeniden denesin diye 500 döneriz.
    return NextResponse.json({ hata: String(e) }, { status: 500 });
  }

  return NextResponse.json({ alindi: true });
}

async function siparisBul(o: Stripe.Checkout.Session) {
  const id = o.metadata?.siparisId;
  if (id) {
    const s = await db.order.findUnique({ where: { id }, select: { id: true, status: true, number: true } });
    if (s) return s;
  }
  return db.order.findFirst({
    where: { providerRef: o.id },
    select: { id: true, status: true, number: true },
  });
}

async function odendi(o: Stripe.Checkout.Session) {
  const siparis = await siparisBul(o);
  if (!siparis) return;
  if (siparis.status === "paid") return; // aynı olay iki kez gelebilir

  let yontem = "card";
  const pi = o.payment_intent;
  if (typeof pi === "string") {
    try {
      const niyet = await stripe().paymentIntents.retrieve(pi, { expand: ["payment_method"] });
      const pm = niyet.payment_method as Stripe.PaymentMethod | null;
      yontem = yontemAdi(pm?.type, pm?.card?.wallet?.type);
    } catch {
      /* yöntem okunamazsa "card" kalır — ödeme yine de geçerlidir */
    }
  }

  await db.order.update({
    where: { id: siparis.id },
    data: {
      status: "paid",
      paidAt: new Date(),
      payMethod: yontem === "swish" ? "swish" : yontem === "klarna" ? "invoice" : "card",
      paidMethod: yontem,
      paymentRef: typeof pi === "string" ? pi : null,
      providerRef: o.id,
    },
  });

  await db.auditLog
    .create({
      data: {
        actor: "stripe",
        action: "siparis.odendi",
        detail: `${siparis.number} · ${yontem} · ${((o.amount_total ?? 0) / 100).toFixed(2)} ${String(o.currency ?? "sek").toUpperCase()}`,
      },
    })
    .catch(() => null);
}

async function basarisiz(o: Stripe.Checkout.Session) {
  const siparis = await siparisBul(o);
  if (!siparis || siparis.status !== "pending") return;

  await db.order.update({ where: { id: siparis.id }, data: { status: "cancelled" } });
  await db.auditLog
    .create({ data: { actor: "stripe", action: "siparis.odeme-basarisiz", detail: siparis.number } })
    .catch(() => null);
}
