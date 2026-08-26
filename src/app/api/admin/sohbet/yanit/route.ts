import { NextResponse, type NextRequest } from "next/server";
import { db, dbVar } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * YÖNETİCİ SOHBET İŞLEMLERİ — sayfa yenilemeden
 *
 *   { is: "yanit",  oturum, metin }   → ajan yanıtı ekler, oturumu "open" yapar
 *   { is: "okundu", oturum }          → okunmamış sayacını sıfırlar
 *   { is: "durum",  oturum, durum }   → open | waiting | closed
 *
 * Sunucu tarafındaki server action'lar (sohbetYanitla vb.) duruyor; onlar
 * JavaScript kapalıyken de çalışan yedek yol. Bu uç canlı akış içindir.
 */

const DURUMLAR = new Set(["open", "waiting", "closed"]);

export async function POST(istek: NextRequest) {
  if (!dbVar) return NextResponse.json({ ok: false, hata: "veritabani yok" }, { status: 503 });

  let govde: { is?: string; oturum?: string; metin?: string; durum?: string };
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ ok: false, hata: "gecersiz istek" }, { status: 400 });
  }

  const oturum = String(govde.oturum ?? "").trim();
  if (!oturum) return NextResponse.json({ ok: false, hata: "oturum yok" }, { status: 400 });

  try {
    switch (govde.is) {
      case "yanit": {
        const metin = String(govde.metin ?? "").trim().slice(0, 2000);
        if (!metin) return NextResponse.json({ ok: false, hata: "bos mesaj" }, { status: 400 });

        const m = await db.chatMessage.create({
          data: { sessionId: oturum, sender: "agent", body: metin },
          select: { id: true, createdAt: true },
        });
        // Yanıt verildi: oturum açık ve okunmuş sayılır
        await db.chatSession.update({
          where: { id: oturum },
          data: { status: "open", updatedAt: new Date(), agentSeenAt: new Date() },
        });
        return NextResponse.json({ ok: true, id: m.id, zaman: m.createdAt.toISOString() });
      }

      case "okundu": {
        await db.chatSession.update({ where: { id: oturum }, data: { agentSeenAt: new Date() } });
        return NextResponse.json({ ok: true });
      }

      case "durum": {
        const d = String(govde.durum ?? "");
        if (!DURUMLAR.has(d)) return NextResponse.json({ ok: false, hata: "gecersiz durum" }, { status: 400 });
        await db.chatSession.update({ where: { id: oturum }, data: { status: d, updatedAt: new Date() } });
        await db.auditLog
          .create({ data: { actor: "super-admin", action: "sohbet.durum", detail: `${oturum} → ${d}` } })
          .catch(() => null);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: false, hata: "bilinmeyen islem" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, hata: String(e) }, { status: 500 });
  }
}
