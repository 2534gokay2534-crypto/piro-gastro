import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isLang, type Lang } from "@/lib/i18n";
import { MUSTERI_CEREZ, oturumSuan } from "@/lib/musteri-oturum";
import { ODEME_ADI, ODEME_DURUM, siparislerimGetir } from "@/lib/makbuz";
import { om } from "@/lib/odeme-metin";
import { siparisAra, siparisCikis } from "@/app/actions/siparislerim";
import { dbVar } from "@/lib/db";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = isLang(lang) ? lang : "sv";
  return { title: `${om("siparislerim", l)} | Piro Gastro`, robots: { index: false, follow: false } };
}

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2.5 text-[16px] outline-none focus:border-navy-500 sm:text-[14px]";

const para = (c: number) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c / 100) + " €";

const tarihSaat = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(d);

export default async function Siparislerim({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ hata?: string; cikis?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  const kutu = await cookies();
  const eposta = await oturumSuan(kutu.get(MUSTERI_CEREZ)?.value);
  const liste = eposta ? await siparislerimGetir(eposta) : [];

  /* ---------------- oturum yok: erişim formu ---------------- */
  if (!eposta) {
    return (
      <div className="mx-auto max-w-[520px] px-[30px] py-14">
        <nav className="text-[12.4px] text-steel-500">
          <Link href={`/${l}`} className="hover:text-gold">{om("anasayfa", l)}</Link>
          <span className="px-1.5">/</span>
          <span className="text-steel-700">{om("siparislerim", l)}</span>
        </nav>

        <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-navy-900">{om("erisimBaslik", l)}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-steel-700">{om("erisimOzet", l)}</p>

        {sp.cikis === "1" && (
          <p className="mt-4 rounded-[9px] bg-ok/10 px-4 py-2.5 text-[13px] font-semibold text-ok">
            {om("cikisYap", l)} ✓
          </p>
        )}
        {sp.hata === "1" && (
          <p className="mt-4 rounded-[9px] bg-danger/10 px-4 py-2.5 text-[13px] font-semibold text-danger">
            {om("erisimHata", l)}
          </p>
        )}
        {sp.hata === "cok" && (
          <p className="mt-4 rounded-[9px] bg-danger/10 px-4 py-2.5 text-[13px] font-semibold text-danger">
            {om("formHata", l)}
          </p>
        )}
        {!dbVar && (
          <p className="mt-4 rounded-[9px] bg-warn/10 px-4 py-2.5 text-[13px] font-semibold text-warn">
            {om("sistemHata", l)}
          </p>
        )}

        <form action={siparisAra} className="mt-5 space-y-3 rounded-[10px] border border-steel-200 p-5">
          <input type="hidden" name="dil" value={l} />
          <label className="block">
            <span className="block text-[12px] font-bold text-navy-900">{om("erisimNo", l)}</span>
            <input name="numara" placeholder="PG-2026-0001" maxLength={40} required className={girdi + " mt-1 font-mono"} />
          </label>
          <label className="block">
            <span className="block text-[12px] font-bold text-navy-900">{om("eposta", l)}</span>
            <input name="eposta" type="email" autoComplete="email" maxLength={120} required className={girdi + " mt-1"} />
          </label>
          <button
            type="submit"
            className="w-full cursor-pointer rounded-md bg-navy-900 px-6 py-3 text-[14px] font-bold text-white transition hover:bg-navy-800"
          >
            {om("erisimAc", l)}
          </button>
        </form>

        <p className="mt-4 text-center text-[12.4px] text-steel-500">
          <Link href={`/${l}/hesabim`} className="hover:text-gold">{om("baslik", l) && "← "}{om("anasayfa", l)}</Link>
        </p>
      </div>
    );
  }

  /* ---------------- oturum var: sipariş listesi ---------------- */
  return (
    <div className="mx-auto max-w-[900px] px-[30px] py-10">
      <nav className="text-[12.4px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">{om("anasayfa", l)}</Link>
        <span className="px-1.5">/</span>
        <span className="text-steel-700">{om("siparislerim", l)}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-navy-900">{om("siparislerim", l)}</h1>
          <p className="mt-1 text-[13.4px] text-steel-700">
            {om("siparislerimOzet", l)} · <b className="text-navy-900">{eposta}</b>
          </p>
        </div>
        <form action={siparisCikis}>
          <input type="hidden" name="dil" value={l} />
          <button type="submit" className="cursor-pointer text-[12.6px] font-semibold text-steel-500 hover:text-danger">
            {om("cikisYap", l)}
          </button>
        </form>
      </div>

      {liste.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-steel-200 py-16 text-center">
          <Icon name="cart" className="mx-auto h-10 w-10 text-steel-300" />
          <p className="mt-3 text-[15px] font-bold text-navy-900">{om("siparisYok", l)}</p>
          <Link
            href={`/${l}/urunler`}
            className="mt-5 inline-block rounded-md bg-navy-900 px-6 py-3 text-[14px] font-bold text-white hover:bg-navy-800"
          >
            {om("alisverise", l)}
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {liste.map((m) => {
            const d = ODEME_DURUM[m.durum] ?? ODEME_DURUM.new;
            const ton =
              d.ton === "ok" ? "bg-ok/12 text-ok"
                : d.ton === "warn" ? "bg-warn/12 text-warn"
                  : d.ton === "danger" ? "bg-danger/12 text-danger"
                    : "bg-steel-100 text-steel-600";
            return (
              <div key={m.id} className="rounded-[10px] border border-steel-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[14px] font-bold text-navy-900">{m.numara}</span>
                      <span className={"rounded-full px-2 py-0.5 text-[11.4px] font-bold " + ton}>
                        {d.ad[l] ?? d.ad.en}
                      </span>
                      <span className="rounded-full border border-steel-200 px-2 py-0.5 text-[11.4px] font-semibold text-steel-600">
                        {m.tur === "fatura" ? om("fatura", l) : om("makbuz", l)}
                      </span>
                    </div>
                    <div className="mt-1 text-[12.4px] text-steel-600">
                      {tarihSaat(m.tarih)} · {ODEME_ADI[m.odemeYontemi] ?? m.odemeYontemi} · {m.kalemler.length}{" "}
                      {om("urun", l).toLowerCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] font-extrabold tabular-nums text-navy-900">{para(m.toplamCents)}</div>
                    <div className="text-[11.4px] text-steel-500">{om("kdvDahil", l)}</div>
                  </div>
                </div>

                {/* ürün görselleri */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.kalemler.slice(0, 8).map((k) => (
                    <span
                      key={k.id}
                      title={`${k.adet} × ${k.ad}`}
                      className="flex h-11 w-11 items-center justify-center overflow-hidden rounded border border-steel-200 bg-steel-50"
                    >
                      {k.gorsel && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={k.gorsel} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" />
                      )}
                    </span>
                  ))}
                  {m.kalemler.length > 8 && (
                    <span className="flex h-11 items-center px-2 text-[12px] font-semibold text-steel-500">
                      +{m.kalemler.length - 8}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-steel-100 pt-3">
                  <Link
                    href={`/${l}/makbuz/${m.numara}`}
                    className="rounded-[8px] bg-navy-900 px-3.5 py-2 text-[12.6px] font-bold text-white transition hover:bg-navy-800"
                  >
                    {om("makbuzGoruntule", l)}
                  </Link>
                  <a
                    href={`/api/makbuz/${m.numara}/pdf?dil=${l}&ek=1`}
                    className="rounded-[8px] border border-steel-300 px-3.5 py-2 text-[12.6px] font-bold text-navy-900 transition hover:border-gold hover:text-gold"
                  >
                    {om("pdfIndir", l)}
                  </a>
                  <a
                    href={`/api/makbuz/${m.numara}/pdf?dil=${l}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[8px] border border-steel-300 px-3.5 py-2 text-[12.6px] font-bold text-navy-900 transition hover:border-gold hover:text-gold"
                  >
                    {om("pdfAc", l)}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
