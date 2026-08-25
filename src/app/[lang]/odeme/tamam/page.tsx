import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { productById } from "@/lib/catalog";
import { pick, isLang, type Lang } from "@/lib/i18n";
import { money, netCents } from "@/lib/money";
import { ILETISIM } from "@/lib/sohbet";
import {
  ODEME_YONTEMLERI,
  SON_SIPARIS_COOKIE,
  sonSiparisOku,
  tutarlariHesapla,
} from "@/lib/siparis";
import { ad, om } from "@/lib/odeme-metin";
import { db, dbVar } from "@/lib/db";
import { demoMu } from "@/lib/odeme-modu";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = isLang(lang) ? lang : "sv";
  return { title: `${om("tesekkur", l)} | Piro Gastro`, robots: { index: false, follow: false } };
}

export default async function OdemeTamam({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ no?: string; bekliyor?: string; fatura?: string; oturum?: string }>;
}) {
  const { lang } = await params;
  const { no, bekliyor, fatura } = await searchParams;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  const kutu = await cookies();
  const ozet = sonSiparisOku(kutu.get(SON_SIPARIS_COOKIE)?.value);
  const numara = no ?? ozet?.no ?? "";

  // Özet çerezindeki "urunId:adet" satırlarını katalogdan çöz
  const satirlar = (ozet?.satir ?? "")
    .split(",")
    .map((p) => {
      const [id, q] = p.split(":");
      const urun = id ? productById(id) : null;
      const qty = Math.max(1, Number(q) || 0);
      if (!urun) return null;
      const unit = netCents(urun);
      return { product: urun, qty, unitCents: unit, lineCents: unit * qty };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const tutar = tutarlariHesapla(satirlar, ozet?.ulke ?? "SE");
  const yontem = ODEME_YONTEMLERI.find((o) => o.kod === ozet?.odeme);

  // Ödeme gerçekten alındı mı? Tek güvenilir kaynak veritabanıdır —
  // bu sayfaya dönmüş olmak ödeme yapıldığı anlamına gelmez (URL elle açılabilir).
  let siparisDurum = "";
  let odenenYontem = "";
  if (dbVar && numara) {
    try {
      const k = await db.order.findUnique({
        where: { number: numara },
        select: { status: true, paidMethod: true },
      });
      siparisDurum = k?.status ?? "";
      odenenYontem = k?.paidMethod ?? "";
    } catch {
      /* okunamazsa durum bilgisi gösterilmez, akış bozulmaz */
    }
  }
  const odendi = siparisDurum === "paid";
  const odemeBekliyor = siparisDurum === "pending";

  // Veritabanına yazılamadıysa müşteri özeti e-posta ile gönderebilsin
  const konu = `${om("siparisNo", l)} ${numara}`;
  const govde = [
    `${om("siparisNo", l)}: ${numara}`,
    ozet?.firma ? `${om("firma", l)}: ${ozet.firma}` : "",
    ozet?.eposta ? `${om("eposta", l)}: ${ozet.eposta}` : "",
    yontem ? `${om("odemeBolum", l)}: ${ad(yontem.ad, l)}` : "",
    "",
    ...satirlar.map(
      (s) => `${s.qty} × ${s.product.sku} — ${pick(s.product, "name", l)} — ${s.lineCents > 0 ? money(s.lineCents, l) : "—"}`,
    ),
    "",
    `${om("araToplam", l)}: ${money(tutar.netCents, l)}`,
    `${om("kargo", l)}: ${tutar.shipCents === 0 ? om("ucretsizKargo", l) : money(tutar.shipCents, l)}`,
    `${om("kdv", l)} %${tutar.kdvYuzde}: ${money(tutar.vatCents, l)}`,
    `${om("genelToplam", l)}: ${money(tutar.totalCents, l)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const mail = `mailto:${ILETISIM.eposta}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(govde)}`;

  return (
    <div className="mx-auto max-w-[720px] px-[30px] py-14">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok/12 text-ok">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12.5l5.2 5.2L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="mt-4 text-[26px] font-extrabold tracking-tight text-navy-900">
          {om("tesekkur", l)}
        </h1>
        {numara && (
          <p className="mt-2 text-[14px] text-steel-700">
            {om("siparisNo", l)}{" "}
            <b className="font-mono text-navy-900">{numara}</b>
          </p>
        )}
      </div>

      {demoMu() && (
        <p className="mt-4 rounded-[9px] border border-warn/40 bg-warn/10 px-4 py-2.5 text-center text-[12.6px] font-bold text-warn">
          {om("demoUyari", l)}
        </p>
      )}

      {odendi && (
        <p className="mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/12 px-3 py-1 text-[12.6px] font-bold text-ok">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12.5l5.2 5.2L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {om("odendi", l)}
            {odenenYontem ? ` · ${odenenYontem.replace("_", " ")}` : ""}
          </span>
        </p>
      )}

      {odemeBekliyor && (
        <p className="mt-4 rounded-[10px] border border-warn/40 bg-warn/10 p-4 text-[13.2px] leading-relaxed text-navy-900">
          {om("odemeBekliyor", l)}
        </p>
      )}

      {fatura === "1" && (
        <p className="mt-4 rounded-[10px] border border-steel-200 bg-steel-50 p-4 text-[13.2px] leading-relaxed text-navy-900">
          {om("faturaSiparis", l)}
        </p>
      )}

      {bekliyor === "1" ? (
        <div className="mt-6 rounded-[10px] border border-warn/40 bg-warn/10 p-4">
          <p className="text-[13.2px] leading-relaxed text-navy-900">{om("kaydedilemedi", l)}</p>
          <a
            href={mail}
            className="mt-3 inline-flex rounded-[9px] bg-navy-900 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-navy-800"
          >
            {om("epostaGonder", l)}
          </a>
        </div>
      ) : (
        <p className="mt-5 text-center text-[14px] leading-relaxed text-steel-700">
          {om("onayMetin", l)}
        </p>
      )}

      {satirlar.length > 0 && (
        <div className="mt-7 rounded-[10px] border border-steel-200 p-5">
          <h2 className="text-[15px] font-extrabold text-navy-900">{om("ozetBolum", l)}</h2>

          <div className="mt-3 divide-y divide-steel-100">
            {satirlar.map(({ product: p, qty, unitCents, lineCents }) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded border border-steel-200 bg-steel-50">
                  {p.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0].url} alt="" className="h-full w-full object-contain p-0.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/${l}/urun/${p.slug}`}
                    className="block truncate text-[13px] font-semibold text-navy-900 hover:text-gold"
                  >
                    {pick(p, "name", l)}
                  </Link>
                  <span className="block font-mono text-[11.2px] text-steel-500">
                    {p.sku} · {qty} × {unitCents > 0 ? money(unitCents, l) : "—"}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-bold tabular-nums text-navy-900">
                  {lineCents > 0 ? money(lineCents, l) : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-steel-200 pt-3">
            <div className="flex justify-between py-1 text-[13.4px]">
              <span className="text-steel-700">{om("araToplam", l)}</span>
              <b className="tabular-nums text-navy-900">{money(tutar.netCents, l)}</b>
            </div>
            <div className="flex justify-between py-1 text-[13.4px]">
              <span className="text-steel-700">{om("kargo", l)}</span>
              <b className={tutar.shipCents === 0 ? "text-ok" : "tabular-nums text-navy-900"}>
                {tutar.shipCents === 0 ? om("ucretsizKargo", l) : money(tutar.shipCents, l)}
              </b>
            </div>
            <div className="flex justify-between py-1 text-[13.4px]">
              <span className="text-steel-700">{om("kdv", l)} %{tutar.kdvYuzde}</span>
              <b className="tabular-nums text-navy-900">{money(tutar.vatCents, l)}</b>
            </div>
            <div className="flex justify-between border-t border-steel-200 py-2.5 text-[17px] font-extrabold text-navy-900">
              <span>{om("genelToplam", l)}</span>
              <span className="tabular-nums">{money(tutar.totalCents, l)}</span>
            </div>
          </div>

          {yontem && (
            <p className="mt-1 text-[12.4px] text-steel-600">
              {om("odemeBolum", l)}: <b className="text-navy-900">{ad(yontem.ad, l)}</b> ·{" "}
              {ad(yontem.aciklama, l)}
            </p>
          )}

          {tutar.fiyatSorulacak && (
            <p className="mt-3 rounded bg-gold-200/50 p-2.5 text-[12px] leading-relaxed text-gold-800">
              {om("fiyatSorulacak", l)}
            </p>
          )}
        </div>
      )}

      {numara && (
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link
            href={`/${l}/makbuz/${numara}`}
            className="rounded-md bg-gold px-5 py-2.5 text-[13.4px] font-bold text-navy-950 transition hover:bg-gold-400"
          >
            {om("makbuzGoruntule", l)}
          </Link>
          <a
            href={`/api/makbuz/${numara}/pdf?dil=${l}&ek=1`}
            className="rounded-md border border-steel-300 px-5 py-2.5 text-[13.4px] font-bold text-navy-900 transition hover:border-gold hover:text-gold"
          >
            {om("pdfIndir", l)}
          </a>
          <Link
            href={`/${l}/siparislerim`}
            className="rounded-md border border-steel-300 px-5 py-2.5 text-[13.4px] font-bold text-navy-900 transition hover:border-gold hover:text-gold"
          >
            {om("siparislerim", l)}
          </Link>
        </div>
      )}

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href={`/${l}/urunler`}
          className="rounded-md bg-navy-900 px-6 py-3 text-[14px] font-bold text-white transition hover:bg-navy-800"
        >
          {om("devamEt", l)}
        </Link>
        <a
          href={`mailto:${ILETISIM.eposta}`}
          className="rounded-md border border-steel-300 px-6 py-3 text-[14px] font-bold text-navy-900 transition hover:border-gold hover:text-gold"
        >
          {ILETISIM.eposta}
        </a>
      </div>
    </div>
  );
}
