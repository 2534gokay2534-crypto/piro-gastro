import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLang, type Lang } from "@/lib/i18n";
import { ULKELER } from "@/lib/siparis";
import { ad, om } from "@/lib/odeme-metin";
import { faturaBasvur } from "@/app/actions/fatura";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = isLang(lang) ? lang : "sv";
  return { title: `${om("bvBaslik", l)} | Piro Gastro`, description: om("bvOzet", l) };
}

const girdi =
  // Mobilde 16px: iOS Safari daha küçük yazıda alana odaklanınca sayfayı yakınlaştırır.
  "w-full rounded-[8px] border border-steel-300 px-3 py-2.5 text-[16px] outline-none focus:border-navy-500 sm:text-[14px]";
const girdiHata =
  "w-full rounded-[8px] border border-danger px-3 py-2.5 text-[16px] outline-none sm:text-[14px]";

function Alan({
  etiket, ad: alanAdi, deger, hata, l, tip = "text", gerekli = true, otomatik, ipucu,
}: {
  etiket: string; ad: string; deger?: string; hata?: string; l: Lang;
  tip?: string; gerekli?: boolean; otomatik?: string; ipucu?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-bold text-navy-900">
        {etiket}
        {!gerekli && <span className="ml-1 font-normal text-steel-500">({om("istegeBagli", l)})</span>}
      </span>
      <input
        name={alanAdi}
        type={tip}
        defaultValue={deger}
        placeholder={ipucu}
        autoComplete={otomatik}
        maxLength={200}
        aria-invalid={hata ? true : undefined}
        className={(hata ? girdiHata : girdi) + " mt-1"}
      />
      {hata && (
        <span className="mt-1 block text-[11.8px] font-semibold text-danger">
          {om(hata === "eposta" ? "epostaHata" : hata === "orgNr" ? "bvOrgNrHata" : hata === "secim" ? "secimHata" : "zorunlu", l)}
        </span>
      )}
    </label>
  );
}

export default async function FaturaBasvuru({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  /* --- başvuru alındı --- */
  if (sp.alindi === "1") {
    return (
      <div className="mx-auto max-w-[640px] px-[30px] py-16 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok/12 text-ok">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12.5l5.2 5.2L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="mt-4 text-[26px] font-extrabold text-navy-900">{om("bvAlindi", l)}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-steel-700">{om("bvAlindiMetin", l)}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/${l}/sepet`} className="rounded-md bg-navy-900 px-6 py-3 text-[14px] font-bold text-white hover:bg-navy-800">
            {om("sepet", l)}
          </Link>
          <Link href={`/${l}/urunler`} className="rounded-md border border-steel-300 px-6 py-3 text-[14px] font-bold text-navy-900 hover:border-gold hover:text-gold">
            {om("devamEt", l)}
          </Link>
        </div>
      </div>
    );
  }

  const hataliAlanlar = new Set((sp.hata ?? "").split(",").filter(Boolean));
  const eski = (k: string) => sp[k] ?? "";
  const h = (k: string) =>
    hataliAlanlar.has(k)
      ? k === "email" ? "eposta" : k === "orgNr" ? "orgNr" : k === "country" ? "secim" : "zorunlu"
      : undefined;

  return (
    <div className="mx-auto max-w-[760px] px-[30px] py-10">
      <nav className="text-[12.4px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">{om("anasayfa", l)}</Link>
        <span className="px-1.5">/</span>
        <span className="text-steel-700">{om("bvBaslik", l)}</span>
      </nav>

      <h1 className="mt-3 text-[28px] font-extrabold tracking-tight text-navy-900">{om("bvBaslik", l)}</h1>
      <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-steel-700">{om("bvOzet", l)}</p>

      {sp.zaten === "1" && (
        <p className="mt-4 rounded-[9px] bg-warn/10 px-4 py-2.5 text-[13px] font-semibold text-warn">
          {om("bvZatenVar", l)}
        </p>
      )}
      {sp.hata === "sistem" && (
        <p className="mt-4 rounded-[9px] bg-danger/10 px-4 py-2.5 text-[13px] font-semibold text-danger">
          {om("sistemHata", l)}
        </p>
      )}
      {hataliAlanlar.size > 0 && sp.hata !== "sistem" && (
        <p className="mt-4 rounded-[9px] bg-danger/10 px-4 py-2.5 text-[13px] font-semibold text-danger">
          {om("formHata", l)}
        </p>
      )}

      <form action={faturaBasvur} className="mt-6 space-y-5">
        <input type="hidden" name="dil" value={l} />

        <section className="rounded-[10px] border border-steel-200 p-5">
          <h2 className="text-[15px] font-extrabold text-navy-900">{om("firmaBolum", l)}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Alan etiket={om("bvSirket", l)} ad="company" deger={eski("company")} hata={h("company")} l={l} otomatik="organization" />
            <Alan etiket={om("bvOrgNr", l)} ad="orgNr" deger={eski("orgNr")} hata={h("orgNr")} l={l} ipucu="556677-8899" />
            <Alan etiket={om("bvVatNr", l)} ad="vatNr" deger={eski("vatNr")} l={l} gerekli={false} ipucu="SE556677889901" />
            <Alan etiket={om("bvYetkili", l)} ad="contact" deger={eski("contact")} hata={h("contact")} l={l} otomatik="name" />
            <Alan etiket={om("eposta", l)} ad="email" deger={eski("email")} hata={h("email")} l={l} tip="email" otomatik="email" />
            <Alan etiket={om("telefon", l)} ad="phone" deger={eski("phone")} hata={h("phone")} l={l} tip="tel" otomatik="tel" />
          </div>
        </section>

        <section className="rounded-[10px] border border-steel-200 p-5">
          <h2 className="text-[15px] font-extrabold text-navy-900">{om("bvFaturaAdres", l)}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Alan etiket={om("adres", l)} ad="billAddr" deger={eski("billAddr")} hata={h("billAddr")} l={l} otomatik="street-address" />
            </div>
            <Alan etiket={om("postaKodu", l)} ad="billZip" deger={eski("billZip")} hata={h("billZip")} l={l} otomatik="postal-code" />
            <Alan etiket={om("sehir", l)} ad="billCity" deger={eski("billCity")} hata={h("billCity")} l={l} otomatik="address-level2" />
            <label className="block">
              <span className="block text-[12px] font-bold text-navy-900">{om("ulke", l)}</span>
              <select name="country" defaultValue={eski("country") || "SE"} className={girdi + " mt-1"}>
                {ULKELER.map((u) => (
                  <option key={u.kod} value={u.kod}>{ad(u.ad, l)}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="block text-[12px] font-bold text-navy-900">{om("not", l)}</span>
            <textarea name="note" rows={3} maxLength={1000} defaultValue={eski("note")} className={girdi + " mt-1 resize-y"} />
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-gold px-7 py-3.5 text-[15px] font-bold text-navy-950 transition hover:bg-gold-400"
          >
            {om("bvGonder", l)}
          </button>
          <Link href={`/${l}/sepet`} className="text-[13px] text-steel-700 hover:text-gold">
            {om("sepeteDon", l)}
          </Link>
        </div>
      </form>
    </div>
  );
}
