"use client";

import { usePathname } from "next/navigation";

/**
 * Mağaza başlığı ve alt bilgisi yalnızca mağaza sayfalarında görünür.
 * /admin altında gizlenir; yönetim paneli kendi kabuğunu kullanır.
 *
 * İçerik sunucuda üretilir, burada sadece gösterilip gösterilmeyeceğine
 * karar verilir — mağaza tarafında hiçbir davranış değişmez.
 */
export default function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const yol = usePathname() ?? "";
  if (yol.includes("/admin")) return null;
  return <>{children}</>;
}
