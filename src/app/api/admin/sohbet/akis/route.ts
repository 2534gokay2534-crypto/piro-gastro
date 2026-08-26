import { NextResponse, type NextRequest } from "next/server";
import { db, dbVar } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * YÖNETİCİ CANLI SOHBET AKIŞI
 *
 * Yönetici panelindeki bildirim çubuğu ve sohbet ekranı bu uçtan beslenir.
 * Sayfa yenilemeden güncellensin diye kısa aralıklarla yoklanır.
 *
 *   ?oturum=<id>  → o oturumun mesajları da döner (sohbet ekranı için)
 *
 * Erişim: /api/admin/* yolları proxy tarafından korunur; buraya yalnızca
 * oturumu açık yönetici ulaşabilir.
 */
export async function GET(istek: NextRequest) {
  if (!dbVar) {
    return NextResponse.json({ hazir: false, oturumlar: [], okunmamis: 0, mesajlar: [] });
  }

  const oturumId = istek.nextUrl.searchParams.get("oturum");

  try {
    const oturumlar = await db.chatSession.findMany({
      where: { status: { in: ["open", "waiting"] } },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: {
        id: true, name: true, email: true, lang: true, page: true,
        status: true, createdAt: true, updatedAt: true, agentSeenAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, sender: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
    });

    // Okunmamış = ajan son baktıktan sonra gelen ziyaretçi mesajları
    const okunmamisSayilari = await Promise.all(
      oturumlar.map((o) =>
        db.chatMessage.count({
          where: {
            sessionId: o.id,
            sender: "visitor",
            ...(o.agentSeenAt ? { createdAt: { gt: o.agentSeenAt } } : {}),
          },
        }),
      ),
    );

    const liste = oturumlar.map((o, i) => ({
      id: o.id,
      ad: o.name ?? "",
      eposta: o.email ?? "",
      dil: o.lang,
      sayfa: o.page ?? "",
      durum: o.status,
      olusturma: o.createdAt.toISOString(),
      guncelleme: o.updatedAt.toISOString(),
      mesajSayisi: o._count.messages,
      okunmamis: okunmamisSayilari[i],
      son: o.messages[0]
        ? {
            metin: o.messages[0].body.slice(0, 140),
            kim: o.messages[0].sender,
            zaman: o.messages[0].createdAt.toISOString(),
          }
        : null,
    }));

    const toplamOkunmamis = okunmamisSayilari.reduce((t, n) => t + n, 0);

    // Seçili oturumun mesajları
    let mesajlar: Array<{ id: string; kim: string; metin: string; zaman: string }> = [];
    if (oturumId) {
      const m = await db.chatMessage.findMany({
        where: { sessionId: oturumId },
        orderBy: { createdAt: "asc" },
        take: 500,
        select: { id: true, sender: true, body: true, createdAt: true },
      });
      mesajlar = m.map((x) => ({
        id: x.id,
        kim: x.sender,
        metin: x.body,
        zaman: x.createdAt.toISOString(),
      }));
    }

    return NextResponse.json(
      { hazir: true, oturumlar: liste, okunmamis: toplamOkunmamis, mesajlar },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { hazir: false, hata: String(e), oturumlar: [], okunmamis: 0, mesajlar: [] },
      { status: 200 },
    );
  }
}
