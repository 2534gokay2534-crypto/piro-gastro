import { NextResponse } from "next/server";
import { ILETISIM, cevrimIciMi, karsilamaMetni, sohbetHazirMi } from "@/lib/sohbet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sohbet penceresi açılırken çağrılır.
 * Veritabanı yoksa hata DEĞİL, { hazir:false } döner — pencere
 * "mesaj bırak" kipine geçer.
 */
export async function GET() {
  const hazir = await sohbetHazirMi();
  return NextResponse.json(
    {
      hazir,
      cevrimIci: hazir ? await cevrimIciMi() : false,
      karsilama: hazir ? await karsilamaMetni() : "",
      eposta: ILETISIM.eposta,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
