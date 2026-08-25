import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang, type Lang } from "@/lib/i18n";
import { sohbetDurum, sohbetSil, sohbetYanitla } from "@/app/actions/sohbet";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";

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
    return <VeritabaniGerekli lang={l} sayfa="Sohbet" hata={String(e)} />;
  }
  if (!oturum) notFound();

  const kapali = oturum.status === "closed";

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
            <p className="mt-1 text-[13px] text-steel-700">
              {oturum.email ? (
                <a href={`mailto:${oturum.email}`} className="text-navy-600 underline">
                  {oturum.email}
                </a>
              ) : (
                <span className="text-steel-500">e-posta yok</span>
              )}
              <span className="px-2 text-steel-300">|</span>
              dil: <b className="uppercase">{oturum.lang}</b>
              {oturum.page && (
                <>
                  <span className="px-2 text-steel-300">|</span>
                  sayfa: <span className="font-mono text-[12px]">{oturum.page}</span>
                </>
              )}
            </p>
            <p className="mt-1 text-[12.2px] text-steel-500">
              Başlangıç: {damga(oturum.createdAt)} · Son hareket: {damga(oturum.updatedAt)} ·{" "}
              {oturum.mode === "offline" ? "çevrim dışı bırakılmış mesaj" : "canlı görüşme"}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <form action={sohbetDurum}>
              <input type="hidden" name="oturumId" value={oturum.id} />
              <input type="hidden" name="durum" value={kapali ? "open" : "closed"} />
              <button
                type="submit"
                className="rounded-[8px] border border-steel-300 bg-white px-3 py-1.5 text-[12.6px] font-semibold text-steel-900 transition hover:bg-steel-50"
              >
                {kapali ? "Yeniden aç" : "Kapat"}
              </button>
            </form>
            <form action={sohbetSil}>
              <input type="hidden" name="oturumId" value={oturum.id} />
              <button
                type="submit"
                className="rounded-[8px] border border-red-200 bg-white px-3 py-1.5 text-[12.6px] font-semibold text-danger transition hover:bg-red-50"
              >
                Sil
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* yazışma */}
      <div className="mt-5 space-y-3 rounded-[10px] border border-steel-200 bg-steel-50 p-5">
        {oturum.messages.map((m) => {
          const danisman = m.sender === "agent";
          if (m.sender === "system") {
            return (
              <p key={m.id} className="py-1 text-center text-[12px] text-steel-500">
                {m.body}
              </p>
            );
          }
          return (
            <div key={m.id} className={"flex " + (danisman ? "justify-end" : "justify-start")}>
              <div className="max-w-[78%]">
                <div
                  className={
                    "whitespace-pre-wrap break-words rounded-[12px] px-3.5 py-2.5 text-[14px] leading-relaxed " +
                    (danisman
                      ? "rounded-br-[4px] bg-navy-600 text-white"
                      : "rounded-bl-[4px] border border-steel-200 bg-white text-steel-900")
                  }
                >
                  {m.body}
                </div>
                <div
                  className={"mt-0.5 px-1 text-[11px] text-steel-500 " + (danisman ? "text-right" : "")}
                >
                  {danisman ? "Siz" : oturum.name?.trim() || "Ziyaretçi"} · {damga(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* yanıt */}
      <form action={sohbetYanitla} className="mt-4">
        <input type="hidden" name="oturumId" value={oturum.id} />
        <label className="block text-[12.6px] font-bold text-navy-900">Yanıtınız</label>
        <textarea
          name="metin"
          rows={4}
          maxLength={2000}
          required
          placeholder="Yanıtı yazın…"
          className="mt-1 w-full resize-y rounded-[8px] border border-steel-300 px-3 py-2.5 text-[14px] outline-none focus:border-navy-500"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[12.2px] text-steel-500">
            {oturum.mode === "offline" || kapali
              ? "Ziyaretçi bu yanıtı siteye döndüğünde görür. Acilse e-posta da atın."
              : "Ziyaretçi pencereyi açık tutuyorsa yanıtı birkaç saniye içinde görür."}
          </p>
          <button
            type="submit"
            className="shrink-0 rounded-[8px] bg-gold px-5 py-2.5 text-[14px] font-bold text-navy-950 transition hover:bg-gold-400"
          >
            Gönder
          </button>
        </div>
      </form>

      <p className="mt-6 text-[12.6px]">
        <Link href={`/${l}/admin/sohbet`} className="font-semibold text-navy-600 hover:text-gold">
          ← Tüm sohbetler
        </Link>
      </p>
    </div>
  );
}
