import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SINIR, kirp, sohbetHazirMi } from "@/lib/sohbet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ziyaretçinin mevcut oturuma mesaj eklemesi. */
export async function POST(req: Request) {
  if (!(await sohbetHazirMi())) {
    return NextResponse.json({ ok: false, hazir: false }, { status: 200 });
  }

  let g: Record<string, unknown>;
  try {
    g = await req.json();
  } catch {
    return NextResponse.json({ ok: false, hata: "gecersiz" }, { status: 400 });
  }

  const oturumId = kirp(g.oturumId, 40);
  const metin = kirp(g.metin, SINIR.mesajUzunluk);
  if (!oturumId || !metin) {
    return NextResponse.json({ ok: false, hata: "bos" }, { status: 400 });
  }

  try {
    const oturum = await db.chatSession.findUnique({
      where: { id: oturumId },
      select: { id: true, _count: { select: { messages: true } } },
    });
    if (!oturum) return NextResponse.json({ ok: false, hata: "yok" }, { status: 404 });
    if (oturum._count.messages >= SINIR.oturumBasinaMesaj) {
      return NextResponse.json({ ok: false, hata: "sinir" }, { status: 429 });
    }

    const m = await db.chatMessage.create({
      data: { sessionId: oturumId, sender: "visitor", body: metin },
    });
    // Kapalı oturuma yazılırsa yeniden açılır — müşteri beklemede kalmasın.
    await db.chatSession.update({
      where: { id: oturumId },
      data: { updatedAt: new Date(), status: "open" },
    });

    return NextResponse.json({
      ok: true,
      mesaj: { id: m.id, kim: m.sender, metin: m.body, zaman: m.createdAt.toISOString() },
    });
  } catch {
    return NextResponse.json({ ok: false, hazir: false }, { status: 200 });
  }
}
