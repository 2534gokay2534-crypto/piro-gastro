import { NextResponse, type NextRequest } from "next/server";
import { CEREZ, GIRIS_YOLU, cerezGecerliMi, sifreVar, yoneticiYolu } from "@/lib/admin-kapi";

/**
 * Yönetici paneli kapısı.
 *
 * Yalnızca /{dil}/admin* ve /api/admin* yollarını korur; mağazanın hiçbir
 * sayfası bu proxy'den geçmez (matcher aşağıda sınırlıdır), dolayısıyla
 * mevcut vitrin, SEO ve ödeme akışı etkilenmez.
 *
 * ADMIN_SIFRE tanımlı değilse:
 *   - geliştirmede  → serbest (yerelde çalışmayı engellememek için)
 *   - yayında       → kapalı, kurulum uyarısına yönlendirir (güvenli varsayılan)
 */
export async function proxy(istek: NextRequest) {
  const yol = istek.nextUrl.pathname;
  if (!yoneticiYolu(yol)) return NextResponse.next();

  const apiMi = yol.startsWith("/api/admin");
  const dil = apiMi ? (istek.nextUrl.searchParams.get("lang") ?? "sv") : yol.split("/")[1];

  // Şifre tanımlı değil
  if (!sifreVar()) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    if (apiMi) {
      return NextResponse.json({ hata: "ADMIN_SIFRE tanımlı değil" }, { status: 503 });
    }
    return NextResponse.redirect(new URL(`/${dil}/${GIRIS_YOLU}?kurulum=1`, istek.url));
  }

  const gecerli = await cerezGecerliMi(istek.cookies.get(CEREZ)?.value, Date.now());
  if (gecerli) return NextResponse.next();

  if (apiMi) {
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const hedef = new URL(`/${dil}/${GIRIS_YOLU}`, istek.url);
  hedef.searchParams.set("devam", yol + istek.nextUrl.search);
  return NextResponse.redirect(hedef);
}

export const config = {
  matcher: ["/:dil/admin", "/:dil/admin/:yol*", "/api/admin/:yol*"],
};
