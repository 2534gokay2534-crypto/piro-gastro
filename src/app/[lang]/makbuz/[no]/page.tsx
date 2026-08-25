import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isLang, type Lang } from "@/lib/i18n";
import { MUSTERI_CEREZ, oturumSuan } from "@/lib/musteri-oturum";
import { CEREZ, cerezSuanGecerliMi, sifreVar } from "@/lib/admin-kapi";
import { erisebilirMi, makbuzGetir } from "@/lib/makbuz";
import { om } from "@/lib/odeme-metin";
import MakbuzBelge from "@/components/MakbuzBelge";
import YazdirDugmesi from "@/components/YazdirDugmesi";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Piro Gastro",
  robots: { index: false, follow: false },
};

export default async function MakbuzSayfasi({
  params,
}: {
  params: Promise<{ lang: string; no: string }>;
}) {
  const { lang, no } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;
  const numara = decodeURIComponent(no ?? "").trim().toUpperCase();

  const m = await makbuzGetir(numara, l);
  if (!m) notFound();

  /* --- erişim: müşteri oturumu ya da yönetici --- */
  const kutu = await cookies();
  const musteri = await oturumSuan(kutu.get(MUSTERI_CEREZ)?.value);
  const yoneticiMi = sifreVar()
    ? await cerezSuanGecerliMi(kutu.get(CEREZ)?.value)
    : process.env.NODE_ENV !== "production";

  if (!yoneticiMi && !erisebilirMi(m, musteri)) {
    return (
      <div className="mx-auto max-w-[520px] px-[30px] py-20 text-center">
        <h1 className="text-[22px] font-extrabold text-navy-900">{om("belgeYetkisiz", l)}</h1>
        <Link
          href={`/${l}/siparislerim`}
          className="mt-6 inline-block rounded-md bg-navy-900 px-6 py-3 text-[14px] font-bold text-white hover:bg-navy-800"
        >
          {om("erisimAc", l)}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[880px] px-[30px] py-8">
      <div className="yazdirma-gizle">
        <nav className="text-[12.4px] text-steel-500">
          <Link href={`/${l}`} className="hover:text-gold">{om("anasayfa", l)}</Link>
          <span className="px-1.5">/</span>
          <Link href={`/${l}/siparislerim`} className="hover:text-gold">{om("siparislerim", l)}</Link>
          <span className="px-1.5">/</span>
          <span className="text-steel-700">{m.numara}</span>
        </nav>

        <div className="mt-3 mb-4 flex flex-wrap gap-2">
          <YazdirDugmesi etiket={om("yazdirBelge", l)} />
          <a
            href={`/api/makbuz/${m.numara}/pdf?dil=${l}&ek=1`}
            className="rounded-[8px] bg-navy-900 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-navy-800"
          >
            {om("pdfIndir", l)}
          </a>
          <a
            href={`/api/makbuz/${m.numara}/pdf?dil=${l}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-[8px] border border-steel-300 px-4 py-2.5 text-[13px] font-bold text-navy-900 transition hover:border-gold hover:text-gold"
          >
            {om("pdfAc", l)}
          </a>
          <Link
            href={`/${l}/siparislerim`}
            className="rounded-[8px] border border-steel-300 px-4 py-2.5 text-[13px] font-bold text-steel-700 transition hover:border-gold hover:text-gold"
          >
            {om("siparislerim", l)}
          </Link>
        </div>
      </div>

      <MakbuzBelge m={m} dil={l} />
    </div>
  );
}
