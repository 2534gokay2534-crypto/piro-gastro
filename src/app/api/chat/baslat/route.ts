import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SINIR, cevrimIciMi, epostaGecerli, kirp, sohbetHazirMi } from "@/lib/sohbet";
import { korsEkle, onKontrol } from "@/lib/sohbet-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dış vitrinden (Shopify) gelen ön kontrol isteği. */
export async function OPTIONS(req: Request) {
  return onKontrol(req);
}

export async function POST(req: Request) {
  return korsEkle(await islem(req), req);
}

/** Yeni sohbet oturumu açar ve ilk mesajı kaydeder. */
async function islem(req: Request) {
  if (!(await sohbetHazirMi())) {
    return NextResponse.json({ ok: false, hazir: false }, { status: 200 });
  }

  let g: Record<string, unknown>;
  try {
    g = await req.json();
  } catch {
    return NextResponse.json({ ok: false, hata: "gecersiz" }, { status: 400 });
  }

  const ad = kirp(g.ad, SINIR.adUzunluk);
  const eposta = kirp(g.eposta, SINIR.epostaUzunluk);
  const metin = kirp(g.metin, SINIR.mesajUzunluk);
  const ziyaretci = kirp(g.ziyaretci, 64) || "anon";
  const dil = kirp(g.dil, 8) || "sv";
  const sayfa = kirp(g.sayfa, 300);

  if (!metin) return NextResponse.json({ ok: false, hata: "bos" }, { status: 400 });
  if (!epostaGecerli(eposta)) {
    return NextResponse.json({ ok: false, hata: "eposta" }, { status: 400 });
  }

  const cevrimIci = await cevrimIciMi();

  try {
    const oturum = await db.chatSession.create({
      data: {
        visitorId: ziyaretci,
        name: ad || null,
        email: eposta || null,
        lang: dil,
        page: sayfa || null,
        mode: cevrimIci ? "live" : "offline",
        status: "open",
        updatedAt: new Date(),
        messages: { create: { sender: "visitor", body: metin } },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({
      ok: true,
      hazir: true,
      cevrimIci,
      oturumId: oturum.id,
      mesajlar: oturum.messages.map((m) => ({
        id: m.id,
        kim: m.sender,
        metin: m.body,
        zaman: m.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, hazir: false }, { status: 200 });
  }
}
