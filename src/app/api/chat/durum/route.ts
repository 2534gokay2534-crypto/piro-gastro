import { NextResponse } from "next/server";
import { ILETISIM, cevrimIciMi, karsilamaMetni, sohbetHazirMi } from "@/lib/sohbet";
import { korsEkle, onKontrol } from "@/lib/sohbet-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dış vitrinden (Shopify) gelen ön kontrol isteği. */
export async function OPTIONS(req: Request) {
  return onKontrol(req);
}

export async function GET(req: Request) {
  return korsEkle(await islem(), req);
}

/**
 * Sohbet penceresi açılırken çağrılır.
 * Veritabanı yoksa hata DEĞİL, { hazir:false } döner — pencere
 * "mesaj bırak" kipine geçer.
 */
async function islem() {
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
