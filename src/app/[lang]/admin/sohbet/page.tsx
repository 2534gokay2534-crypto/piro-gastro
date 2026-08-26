import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang, type Lang } from "@/lib/i18n";
import { AYAR_CEVRIMICI, AYAR_KARSILAMA } from "@/lib/sohbet";
import { cevrimIciDegistir, karsilamaKaydet } from "@/app/actions/sohbet";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";

export const dynamic = "force-dynamic";

function ne(d: Date): string {
  const fark = Date.now() - d.getTime();
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  const g = Math.floor(sa / 24);
  if (g < 30) return `${g} gün önce`;
  return d.toLocaleDateString("tr-TR");
}

export default async function SohbetListe({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ f?: string }>;
}) {
  const { lang } = await params;
  const { f } = await searchParams;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;
  const suzgec = f === "closed" || f === "waiting" || f === "hepsi" ? f : "open";

  if (!dbVar) return <VeritabaniGerekli lang={l} sayfa="Sohbetler" />;

  let cevrimIci = false;
  let karsilama = "";
  let oturumlar: Array<{
    id: string;
    name: string | null;
    email: string | null;
    lang: string;
    page: string | null;
    status: string;
    mode: string;
    createdAt: Date;
    updatedAt: Date;
    agentSeenAt: Date | null;
    messages: Array<{ sender: string; body: string; createdAt: Date }>;
    _count: { messages: number };
  }> = [];
  let acikSayi = 0;
  let toplamSayi = 0;

  try {
    const [a, k, liste, acik, toplam] = await Promise.all([
      db.setting.findUnique({ where: { key: AYAR_CEVRIMICI } }),
      db.setting.findUnique({ where: { key: AYAR_KARSILAMA } }),
      db.chatSession.findMany({
        where: suzgec === "hepsi" ? {} : { status: suzgec },
        orderBy: { updatedAt: "desc" },
        take: 100,
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { messages: true } },
        },
      }),
      db.chatSession.count({ where: { status: "open" } }),
      db.chatSession.count(),
    ]);
    cevrimIci = a?.value === "1";
    karsilama = k?.value ?? "";
    oturumlar = liste;
    acikSayi = acik;
    toplamSayi = toplam;
  } catch (e) {
    return <VeritabaniGerekli lang={l} sayfa="Sohbetler" hata={String(e)} />;
  }

  const yanitBekleyen = oturumlar.filter(
    (o) =>
      o.messages[0]?.sender === "visitor" &&
      (!o.agentSeenAt || o.messages[0].createdAt > o.agentSeenAt),
  ).length;

  const sekme = (deger: string, etiket: string) => (
    <Link
      href={`/${l}/admin/sohbet?f=${deger}`}
      className={
        "rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition " +
        (suzgec === deger ? "bg-navy-900 text-white" : "bg-steel-100 text-steel-700 hover:bg-steel-200")
      }
    >
      {etiket}
    </Link>
  );

  return (
    <div className="mx-auto max-w-[1320px] px-[30px] py-8">
      <nav className="text-[12.6px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">Piro Gastro</Link>
        <span className="px-2">/</span>
        <span>Süper Admin</span>
        <span className="px-2">/</span>
        <b className="text-navy-900">Sohbetler</b>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-navy-900">Canlı sohbet</h1>
          <p className="mt-1 text-[13.4px] text-steel-700">
            {toplamSayi} görüşme · {acikSayi} açık
            {yanitBekleyen > 0 && (
              <>
                {" · "}
                <b className="text-danger">{yanitBekleyen} yanıt bekliyor</b>
              </>
            )}
          </p>
        </div>

        {/* çevrim içi anahtarı */}
        <form action={cevrimIciDegistir} className="flex items-center gap-3">
          <input type="hidden" name="deger" value={cevrimIci ? "0" : "1"} />
          <span className="flex items-center gap-2 text-[13px] font-semibold text-steel-700">
            <span
              className={"h-2.5 w-2.5 rounded-full " + (cevrimIci ? "bg-emerald-500" : "bg-steel-400")}
            />
            {cevrimIci ? "Çevrim içi" : "Çevrim dışı"}
          </span>
          <button
            type="submit"
            className={
              "rounded-[8px] px-4 py-2 text-[13px] font-bold transition " +
              (cevrimIci
                ? "bg-steel-200 text-steel-900 hover:bg-steel-300"
                : "bg-emerald-600 text-white hover:bg-emerald-700")
            }
          >
            {cevrimIci ? "Çevrim dışına al" : "Çevrim içine al"}
          </button>
        </form>
      </div>

      <p className="mt-2 rounded-[8px] bg-steel-50 px-3 py-2 text-[12.6px] leading-relaxed text-steel-700">
        <b className="text-navy-900">Çevrim içi</b> → ziyaretçi canlı yazışır ve yanıtı anında görür.{" "}
        <b className="text-navy-900">Çevrim dışı</b> → ziyaretçi e-posta bırakır, yanıtınızı bir sonraki
        ziyaretinde veya e-postayla alır.
      </p>

      {/* karşılama metni */}
      <form
        action={karsilamaKaydet}
        className="mt-5 rounded-[10px] border border-steel-200 bg-white p-4 shadow-c1"
      >
        <label className="block text-[12.6px] font-bold text-navy-900">
          Karşılama metni <span className="font-normal text-steel-500">(boşsa varsayılan metin kullanılır)</span>
        </label>
        <div className="mt-2 flex gap-2">
          <input
            name="karsilama"
            defaultValue={karsilama}
            maxLength={400}
            placeholder="Merhaba! Size nasıl yardımcı olabiliriz?"
            className="flex-1 rounded-[8px] border border-steel-300 px-3 py-2 text-[14px] outline-none focus:border-navy-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-[8px] bg-navy-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-navy-800"
          >
            Kaydet
          </button>
        </div>
      </form>

      <div className="mt-6 flex gap-2">
        {sekme("open", "Açık")}
        {sekme("waiting", "Beklemede")}
        {sekme("closed", "Kapatıldı")}
        {sekme("hepsi", "Tümü")}
      </div>

      {oturumlar.length === 0 ? (
        <p className="mt-8 rounded-[10px] border border-steel-200 bg-steel-50 px-5 py-10 text-center text-[14px] text-steel-700">
          Bu başlıkta görüşme yok.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[10px] border border-steel-200">
          {oturumlar.map((o, i) => {
            const son = o.messages[0];
            const bekliyor =
              son?.sender === "visitor" && (!o.agentSeenAt || son.createdAt > o.agentSeenAt);
            return (
              <Link
                key={o.id}
                href={`/${l}/admin/sohbet/${o.id}`}
                className={
                  "flex items-start gap-3 px-4 py-3.5 transition hover:bg-steel-50 " +
                  (i > 0 ? "border-t border-steel-200 " : "") +
                  (bekliyor ? "bg-gold-200/25" : "bg-white")
                }
              >
                <span
                  className={
                    "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full " +
                    (bekliyor ? "bg-danger" : o.status === "open" ? "bg-emerald-500" : o.status === "waiting" ? "bg-warn" : "bg-steel-300")
                  }
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <b className="text-[14px] text-navy-900">{o.name?.trim() || "İsimsiz ziyaretçi"}</b>
                    {o.email && <span className="text-[12.4px] text-steel-600">{o.email}</span>}
                    <span className="rounded bg-steel-100 px-1.5 py-0.5 text-[10.6px] font-bold uppercase text-steel-600">
                      {o.lang}
                    </span>
                    {o.mode === "offline" && (
                      <span className="rounded bg-gold-200 px-1.5 py-0.5 text-[10.6px] font-bold text-gold-800">
                        mesaj bırakıldı
                      </span>
                    )}
                    {o.status === "waiting" && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10.6px] font-bold text-warn">
                        beklemede
                      </span>
                    )}
                    {o.status === "closed" && (
                      <span className="rounded bg-steel-200 px-1.5 py-0.5 text-[10.6px] font-bold text-steel-700">
                        kapalı
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-steel-700">
                    {son ? (
                      <>
                        <span className="text-steel-500">
                          {son.sender === "agent" ? "Siz: " : ""}
                        </span>
                        {son.body}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11.6px] text-steel-500">{ne(o.updatedAt)}</div>
                  <div className="mt-0.5 text-[11.6px] text-steel-400">{o._count.messages} mesaj</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-[12.6px] text-steel-500">
        <Link href={`/${l}/admin/ceviriler`} className="font-semibold text-navy-600 hover:text-gold">
          Çeviri durumu
        </Link>
        <span className="px-2">·</span>
        <Link href={`/${l}/admin/diller`} className="font-semibold text-navy-600 hover:text-gold">
          Diller
        </Link>
      </p>
    </div>
  );
}
