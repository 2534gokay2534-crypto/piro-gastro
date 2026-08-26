import { notFound } from "next/navigation";
import AdminKenar from "@/components/admin/AdminKenar";
import SohbetBildirim from "@/components/admin/SohbetBildirim";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * SÜPER ADMIN KABUĞU
 *
 * Sol menü + içerik alanı. Mağaza başlığı ve alt bilgisi burada
 * gizlenir (StorefrontChrome), böylece yönetim ekranları kendi
 * düzenine sahip olur. Mağaza tarafı hiç etkilenmez.
 */

async function sayaclariGetir() {
  if (!dbVar) return { siparis: 0, sohbet: 0, stok: 0, fatura: 0 };
  try {
    const [siparis, sohbet, stok, fatura] = await Promise.all([
      db.order.count({ where: { status: "new" } }),
      // Rozet: okunmamış müşteri mesajı olan sohbet sayısı
      db.chatSession.count({
        where: {
          status: { in: ["open", "waiting"] },
          messages: { some: { sender: "visitor" } },
        },
      }),
      db.product.count({ where: { hidden: false, onRequest: false, stock: { lte: 0 } } }),
      db.invoiceApplication.count({ where: { status: "pending" } }),
    ]);
    return { siparis, sohbet, stok, fatura };
  } catch {
    return { siparis: 0, sohbet: 0, stok: 0, fatura: 0 };
  }
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const sayac = await sayaclariGetir();

  return (
    <div className="flex min-h-screen bg-steel-50">
      <AdminKenar lang={lang} sayac={sayac} />
      <div className="min-w-0 flex-1">{children}</div>

      {/* Canlı sohbet bildirimi — her yönetici sayfasında çalışır,
          yeni müşteri mesajında sesli uyarı verir ve okunana kadar durur. */}
      <SohbetBildirim lang={lang} />
    </div>
  );
}
