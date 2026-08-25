import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { CEREZ, cerezSuanGecerliMi, sifreVar } from "@/lib/admin-kapi";
import { MUSTERI_CEREZ, oturumSuan } from "@/lib/musteri-oturum";
import { dosyaAdi, erisebilirMi, makbuzGetir } from "@/lib/makbuz";
import { makbuzPdf } from "@/lib/makbuz-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MAKBUZ PDF'İ
 *
 * Erişim iki yoldan biriyle açılır:
 *   • Müşteri oturumu (imzalı çerez) siparişin e-postasıyla eşleşiyorsa
 *   • Yönetici oturumu açıksa
 * Aksi halde 403 — sipariş numarası tahmin edilerek başkasının makbuzu
 * indirilemez.
 *
 * ?ek=1 → tarayıcı indirir, yoksa gömülü görüntüler.
 */
export async function GET(istek: NextRequest, ctx: { params: Promise<{ no: string }> }) {
  const { no } = await ctx.params;
  const numara = decodeURIComponent(no ?? "").trim().toUpperCase();
  if (!numara) return NextResponse.json({ hata: "sipariş numarası yok" }, { status: 400 });

  const m = await makbuzGetir(numara);
  if (!m) return NextResponse.json({ hata: "bulunamadı" }, { status: 404 });

  const kutu = await cookies();
  const musteri = await oturumSuan(kutu.get(MUSTERI_CEREZ)?.value);
  const yoneticiMi = sifreVar()
    ? await cerezSuanGecerliMi(kutu.get(CEREZ)?.value)
    : process.env.NODE_ENV !== "production";

  if (!yoneticiMi && !erisebilirMi(m, musteri)) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const dil = istek.nextUrl.searchParams.get("dil") ?? "sv";
  const ek = istek.nextUrl.searchParams.get("ek") === "1";

  let pdf: Uint8Array;
  try {
    pdf = await makbuzPdf(m, dil);
  } catch (e) {
    return NextResponse.json({ hata: "pdf üretilemedi", detay: String(e) }, { status: 500 });
  }

  return new NextResponse(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${ek ? "attachment" : "inline"}; filename="${dosyaAdi(m)}"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
