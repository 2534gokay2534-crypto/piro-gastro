import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang, type Lang } from "@/lib/i18n";
import { sohbetSil } from "@/app/actions/sohbet";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import SohbetPaneli from "@/components/admin/SohbetPaneli";

export const dynamic = "force-dynamic";

function damga(d: Date): string {
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SohbetDetay({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  if (!dbVar) return <VeritabaniGerekli lang={l} sayfa="Sohbet" />;

  let oturum;
  try {
    oturum = await db.chatSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  } catch (e) {
    return <VeritabaniGerekli lang={l} sayfa="Sohbet" hata={gizliTemizle(e)} />;
  }
  if (!oturum) notFound();

  return (
    <div className="mx-auto max-w-[880px] px-[30px] py-8">
      <nav className="text-[12.6px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">Piro Gastro</Link>
        <span className="px-2">/</span>
        <Link href={`/${l}/admin/sohbet`} className="hover:text-gold">Sohbetler</Link>
        <span className="px-2">/</span>
        <b className="text-navy-900">{oturum.name?.trim() || "İsimsiz ziyaretçi"}</b>
      </nav>

      {/* ziyaretçi bilgisi */}
      <div className="mt-3 rounded-[10px] border border-steel-200 bg-white p-4 shadow-c1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-navy-900">
              {oturum.name?.trim() || "İsimsiz ziyaretçi"}
            </h1>
            <div className="mt-1 space-y-0.5 text-[12.8px] text-steel-700">
              {oturum.email && (
                <div>
                  <a href={`mailto:${oturum.email}`} className="font-semibold text-navy-700 hover:text-gold">
                    {oturum.email}
                  </a>
                </div>
              )}
              {oturum.phone && <div>{oturum.phone}</div>}
              <div className="text-steel-500">
                Başlangıç: {damga(oturum.createdAt)} · Son hareket: {damga(oturum.updatedAt)}
              </div>
              <div className="text-steel-500">
                Dil: {oturum.lang.toUpperCase()}
                {oturum.page && <> · Sayfa: <span className="font-mono text-[11.6px]">{oturum.page}</span></>}
              </div>
            </div>
          </div>

          <form action={sohbetSil}>
            <input type="hidden" name="id" value={oturum.id} />
            <input type="hidden" name="dil" value={l} />
            <button
              type="submit"
              className="cursor-pointer rounded-[8px] border border-danger/40 px-3 py-1.5 text-[12.4px] font-bold text-danger transition hover:bg-danger/10"
            >
              Sohbeti sil
            </button>
          </form>
        </div>
      </div>

      {/* canlı sohbet — sayfa yenilemeden */}
      <div className="mt-4">
        <SohbetPaneli
          oturumId={oturum.id}
          ilkDurum={oturum.status}
          ilkMesajlar={oturum.messages.map((m) => ({
            id: m.id,
            kim: m.sender,
            metin: m.body,
            zaman: m.createdAt.toISOString(),
          }))}
        />
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-steel-500">
        Mesajlar 3 saniyede bir yenilenir; müşteri yazdığında sayfayı yenilemenize
        gerek yok. Yanıtınız müşterinin ekranında en geç 4 saniye içinde görünür.
      </p>
    </div>
  );
}
