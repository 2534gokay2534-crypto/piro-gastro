import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cevrimIciMi, kirp, sohbetHazirMi } from "@/lib/sohbet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Yoklama uçtası. Pencere açıkken 4 sn'de bir, kapalıyken 25 sn'de
 * bir çağrılır. "sonra" verilirse yalnızca ondan yeni mesajlar döner.
 */
export async function GET(req: Request) {
  if (!(await sohbetHazirMi())) {
    return NextResponse.json({ ok: false, hazir: false }, { status: 200 });
  }

  const u = new URL(req.url);
  const oturumId = kirp(u.searchParams.get("o"), 40);
  const sonra = kirp(u.searchParams.get("sonra"), 40);
  if (!oturumId) return NextResponse.json({ ok: false, hata: "bos" }, { status: 400 });

  const esik = sonra ? new Date(sonra) : null;
  const gecerliEsik = esik && !Number.isNaN(esik.getTime()) ? esik : null;

  try {
    const oturum = await db.chatSession.findUnique({
      where: { id: oturumId },
      select: { id: true, status: true },
    });
    if (!oturum) return NextResponse.json({ ok: false, hata: "yok" }, { status: 404 });

    const mesajlar = await db.chatMessage.findMany({
      where: {
        sessionId: oturumId,
        ...(gecerliEsik ? { createdAt: { gt: gecerliEsik } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(
      {
        ok: true,
        hazir: true,
        cevrimIci: await cevrimIciMi(),
        kapali: oturum.status === "closed",
        mesajlar: mesajlar.map((m) => ({
          id: m.id,
          kim: m.sender,
          metin: m.body,
          zaman: m.createdAt.toISOString(),
        })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, hazir: false }, { status: 200 });
  }
}
