import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isLang, langDef, type Lang } from "@/lib/i18n";
import { MUSTERI_CEREZ, oturumSuan } from "@/lib/musteri-oturum";
import { demoMu, YONTEMLER } from "@/lib/odeme-modu";
import { eurCentToOre } from "@/lib/odeme-saglayici";
import { makbuzGetir } from "@/lib/makbuz";
import { om, ad } from "@/lib/odeme-metin";
import { testOdemeOnayla, testOdemeReddet, testOdemeVazgec } from "@/app/actions/odeme-test";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Test betalning · Piro Gastro",
  robots: { index: false, follow: false },
};

/**
 * TEST ÖDEME EKRANI
 *
 * Gerçek sağlayıcının (Stripe Checkout) barındırılan ekranının yerine
 * geçer. Görev sırası birebir aynıdır: tutarı ve satıcıyı göster, ödeme
 * yöntemini onaylat, sonucu mağazaya bildir.
 *
 * FARK: hiçbir yere para gitmez. Kart numarası istenmez — istenseydi
 * gerçek kart bilgisi toplamış olurduk; test ekranının bunu yapması
 * yanlış olur. Bunun yerine sağlayıcının döneceği sonuç seçtirilir.
 */

const SEK = (ore: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2 }).format(ore / 100);

const EUR = (cents: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(cents / 100);

export default async function TestOdeme({
  params,
}: {
  params: Promise<{ lang: string; no: string }>;
}) {
  const { lang, no } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;
  const numara = decodeURIComponent(no ?? "").trim().toUpperCase();

  // Canlı modda bu ekran yoktur.
  if (!demoMu()) notFound();

  const m = await makbuzGetir(numara);
  if (!m) notFound();

  // Yalnızca siparişin sahibi görebilir.
  const kutu = await cookies();
  const eposta = await oturumSuan(kutu.get(MUSTERI_CEREZ)?.value);
  if (!eposta || eposta.toLowerCase() !== m.musteri.eposta.toLowerCase()) {
    redirect(`/${l}/siparislerim`);
  }

  if (m.durum === "paid") redirect(`/${l}/odeme/tamam?no=${numara}&test=1`);

  const yontem = YONTEMLER.find((y) => y.kod === m.odemeYontemi) ?? YONTEMLER[0];
  const kur = langDef("sv")?.rate ?? 11.4;
  const ore = eurCentToOre(m.toplamCents, kur);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[460px] flex-col justify-center px-[30px] py-10">
      {/* --- test bandı --- */}
      <div className="rounded-t-[12px] bg-warn px-4 py-2.5 text-center text-[12.6px] font-extrabold uppercase tracking-wider text-navy-950">
        {om("testOrtami", l)}
      </div>

      <div className="rounded-b-[12px] border border-t-0 border-steel-200 bg-white p-6">
        {/* --- satıcı --- */}
        <div className="flex items-center gap-2.5 border-b border-steel-200 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-6 w-auto" />
          </span>
          <span className="leading-tight">
            <span className="block text-[13.6px] font-extrabold text-navy-900">Piro Gastro Center AB</span>
            <span className="block text-[11.4px] text-steel-500">Org.nr 559214-8830</span>
          </span>
        </div>

        {/* --- tutar --- */}
        <div className="py-5 text-center">
          <div className="text-[11.6px] font-semibold uppercase tracking-wider text-steel-500">
            {om("odenecekTutar", l)}
          </div>
          <div className="mt-1 text-[34px] font-extrabold leading-none tabular-nums text-navy-900">{SEK(ore)}</div>
          <div className="mt-1 text-[12.4px] text-steel-500">
            {EUR(m.toplamCents)} · {om("kdvDahil", l)}
          </div>
          <div className="mt-2 font-mono text-[12.4px] text-steel-600">{m.numara}</div>
        </div>

        {/* --- yöntem --- */}
        <div className="rounded-[9px] bg-steel-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-steel-500">{om("odemeYontemi", l)}</div>
          <div className="mt-1 text-[15px] font-extrabold text-navy-900">{ad(yontem.ad, l)}</div>
          <div className="mt-0.5 text-[12.4px] leading-relaxed text-steel-600">{ad(yontem.aciklama, l)}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {yontem.rozetler.map((r) => (
              <span
                key={r}
                className="rounded border border-steel-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-steel-700"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[12.2px] leading-relaxed text-steel-600">{om("testAciklama", l)}</p>

        {/* --- sonuç seçimi --- */}
        <div className="mt-5 space-y-2.5">
          <form action={testOdemeOnayla}>
            <input type="hidden" name="dil" value={l} />
            <input type="hidden" name="no" value={m.numara} />
            <input type="hidden" name="yontem" value={yontem.kod} />
            <button
              type="submit"
              className="w-full cursor-pointer rounded-md bg-ok px-6 py-3.5 text-[15px] font-bold text-white transition hover:brightness-110"
            >
              {om("testOnayla", l)} — {ad(yontem.ad, l)}
            </button>
          </form>

          <form action={testOdemeReddet}>
            <input type="hidden" name="dil" value={l} />
            <input type="hidden" name="no" value={m.numara} />
            <button
              type="submit"
              className="w-full cursor-pointer rounded-md border border-danger/40 bg-danger/5 px-6 py-2.5 text-[13.4px] font-bold text-danger transition hover:bg-danger/10"
            >
              {om("testReddet", l)}
            </button>
          </form>

          <form action={testOdemeVazgec}>
            <input type="hidden" name="dil" value={l} />
            <input type="hidden" name="no" value={m.numara} />
            <button
              type="submit"
              className="w-full cursor-pointer py-2 text-[12.6px] font-semibold text-steel-500 transition hover:text-navy-900"
            >
              {om("testVazgec", l)}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-4 text-center text-[11.6px] leading-relaxed text-steel-500">
        {om("testAltNot", l)}
      </p>
      <p className="mt-2 text-center">
        <Link href={`/${l}/sepet`} className="text-[12.4px] font-semibold text-steel-500 hover:text-gold">
          {om("sepeteDon", l)}
        </Link>
      </p>
    </div>
  );
}
