import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cartDetail } from "@/lib/cart";
import { pick, t, isLang, type Lang } from "@/lib/i18n";
import { money } from "@/lib/money";
import { ULKELER, tutarlariHesapla } from "@/lib/siparis";
import { YONTEMLER, demoMu, odemeAcik } from "@/lib/odeme-modu";
import { ad, om } from "@/lib/odeme-metin";
import { faturaAcikMi, odemeBaslat } from "@/app/actions/odeme";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

/** Ödeme adımı arama motorlarına kapalı — sepete bağlı, tekil içeriği yok. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = isLang(lang) ? lang : "sv";
  return { title: `${om("baslik", l)} | Piro Gastro`, robots: { index: false, follow: false } };
}

const girdi =
  // Mobilde 16px: iOS Safari daha küçük yazıda alana odaklanınca sayfayı yakınlaştırır.
  "w-full rounded-[8px] border border-steel-300 px-3 py-2.5 text-[16px] outline-none focus:border-navy-500 sm:text-[14px]";
const girdiHata =
  "w-full rounded-[8px] border border-danger px-3 py-2.5 text-[16px] outline-none sm:text-[14px]";

function Alan({
  etiket,
  ad: alanAdi,
  deger,
  hata,
  l,
  tip = "text",
  gerekli = true,
  otomatik,
}: {
  etiket: string;
  ad: string;
  deger?: string;
  hata?: string;
  l: Lang;
  tip?: string;
  gerekli?: boolean;
  otomatik?: string;
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
        autoComplete={otomatik}
        maxLength={200}
        aria-invalid={hata ? true : undefined}
        className={(hata ? girdiHata : girdi) + " mt-1"}
      />
      {hata && (
        <span className="mt-1 block text-[11.8px] font-semibold text-danger">
          {om(hata === "eposta" ? "epostaHata" : hata === "secim" ? "secimHata" : "zorunlu", l)}
        </span>
      )}
    </label>
  );
}

export default async function OdemePage({
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

  const sepet = await cartDetail(l);

  /* --- sepet boşsa ödeme adımı anlamsız --- */
  if (!sepet.lines.length) {
    return (
      <div className="mx-auto max-w-[1320px] px-[30px] py-20 text-center">
        <Icon name="cart" className="mx-auto h-12 w-12 text-steel-300" />
        <h1 className="mt-4 text-[24px] font-extrabold text-navy-900">{om("bosSepet", l)}</h1>
        <Link
          href={`/${l}/urunler`}
          className="mt-6 inline-block rounded-md bg-navy-900 px-6 py-3 text-[14px] font-bold text-white hover:bg-navy-800"
        >
          {om("alisverise", l)}
        </Link>
      </div>
    );
  }

  // Sunucudan dönen hata listesi ve önceki değerler
  const hataliAlanlar = new Set((sp.hata ?? "").split(",").filter(Boolean));
  const eski = (k: string) => sp[k] ?? "";
  const h = (k: string) =>
    hataliAlanlar.has(k) ? (k === "eposta" ? "eposta" : k === "ulke" || k === "odeme" ? "secim" : "zorunlu") : undefined;

  const ulke = (sp.ulke ?? "SE").toUpperCase();
  const tutar = tutarlariHesapla(sepet.lines, ulke);

  // Fatura seçeneği yalnızca onaylı başvurusu olan firmaya gösterilir.
  // Formda org.nr + e-posta doluysa kontrol edilir; boşsa gösterilmez.
  const faturaAcik = await faturaAcikMi(sp.vergiNo ?? "", sp.eposta ?? "");

  // Ödeme alınabiliyor mu? (canlı sağlayıcı veya demo modu)
  const acik = odemeAcik();
  const demo = demoMu();

  return (
    <div className="mx-auto max-w-[1320px] px-[30px] py-8">
      <nav className="text-[12.4px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">{om("anasayfa", l)}</Link>
        <span className="px-1.5">/</span>
        <Link href={`/${l}/sepet`} className="hover:text-gold">{om("sepet", l)}</Link>
        <span className="px-1.5">/</span>
        <span className="text-steel-700">{om("baslik", l)}</span>
      </nav>

      <h1 className="mt-3 text-[30px] font-extrabold tracking-tight text-navy-900">{om("baslik", l)}</h1>
      <p className="mt-1 text-[14px] text-steel-700">{om("altBaslik", l)}</p>

      {demo && (
        <p className="mt-4 rounded-[9px] border border-warn/40 bg-warn/10 px-4 py-2.5 text-[13px] font-bold text-warn">
          {om("demoUyari", l)}
        </p>
      )}

      {!acik && !faturaAcik && (
        <p className="mt-4 rounded-[9px] border border-warn/40 bg-warn/10 px-4 py-2.5 text-[13px] font-semibold text-warn">
          {om("odemeKapali", l)}
        </p>
      )}

      {sp.iptal === "1" && (
        <p className="mt-4 rounded-[9px] bg-warn/10 px-4 py-2.5 text-[13px] font-semibold text-warn">
          {om("odemeIptal", l)}
        </p>
      )}

      {sp.hata === "sistem" && (
        <p className="mt-4 rounded-[9px] bg-danger/10 px-4 py-2.5 text-[13px] font-semibold text-danger">
          {om("sistemHata", l)}
        </p>
      )}

      {hataliAlanlar.size > 0 && sp.hata !== "sistem" && (
        <p className="mt-4 rounded-[9px] bg-danger/10 px-4 py-2.5 text-[13px] font-semibold text-danger">
          {sp.faturaYok === "1" ? om("faturaYetkiYok", l) : om("formHata", l)}
        </p>
      )}

      <form action={odemeBaslat} className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <input type="hidden" name="dil" value={l} />

        {/* ---------------- form ---------------- */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-[10px] border border-steel-200 p-5">
            <h2 className="text-[15px] font-extrabold text-navy-900">{om("firmaBolum", l)}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Alan etiket={om("firma", l)} ad="firma" deger={eski("firma")} hata={h("firma")} l={l} otomatik="organization" />
              <Alan etiket={om("vergiNo", l)} ad="vergiNo" deger={eski("vergiNo")} l={l} gerekli={false} />
              <Alan etiket={om("ad", l)} ad="ad" deger={eski("ad")} hata={h("ad")} l={l} otomatik="name" />
              <Alan etiket={om("eposta", l)} ad="eposta" deger={eski("eposta")} hata={h("eposta")} l={l} tip="email" otomatik="email" />
              <Alan etiket={om("telefon", l)} ad="telefon" deger={eski("telefon")} hata={h("telefon")} l={l} tip="tel" otomatik="tel" />
            </div>
          </section>

          <section className="rounded-[10px] border border-steel-200 p-5">
            <h2 className="text-[15px] font-extrabold text-navy-900">{om("teslimatBolum", l)}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Alan etiket={om("adres", l)} ad="adres" deger={eski("adres")} hata={h("adres")} l={l} otomatik="street-address" />
              </div>
              <Alan etiket={om("postaKodu", l)} ad="postaKodu" deger={eski("postaKodu")} hata={h("postaKodu")} l={l} otomatik="postal-code" />
              <Alan etiket={om("sehir", l)} ad="sehir" deger={eski("sehir")} hata={h("sehir")} l={l} otomatik="address-level2" />
              <label className="block">
                <span className="block text-[12px] font-bold text-navy-900">{om("ulke", l)}</span>
                <select name="ulke" defaultValue={ulke} className={girdi + " mt-1"}>
                  {ULKELER.map((u) => (
                    <option key={u.kod} value={u.kod}>
                      {ad(u.ad, l)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-[10px] border border-steel-200 p-5">
            <h2 className="text-[15px] font-extrabold text-navy-900">{om("odemeBolum", l)}</h2>

            {/* Swish, kart ve Klarna ayrı ayrı seçilir; Swish İsveç'te en
                yaygın yöntem olduğu için "kart" başlığı altında saklanmaz.
                Apple Pay ve Google Pay uygun cihazlarda kart seçeneği içinde
                kendiliğinden görünür. */}
            <div className="mt-3 space-y-2.5">
              {YONTEMLER.map((y, i) => (
                <label
                  key={y.kod}
                  className={
                    "flex gap-3 rounded-[9px] border p-3.5 " +
                    (acik
                      ? "cursor-pointer border-steel-200 hover:border-gold has-checked:border-gold has-checked:bg-gold-200/20"
                      : "cursor-not-allowed border-steel-200 bg-steel-50 opacity-60")
                  }
                >
                  <input
                    type="radio"
                    name="odeme"
                    value={y.kod}
                    defaultChecked={acik && (eski("odeme") ? eski("odeme") === y.kod : i === 0)}
                    disabled={!acik}
                    className="mt-0.5 h-4 w-4 accent-navy-700"
                  />
                  <span className="min-w-0 flex-1">
                    <b className="block text-[13.6px] text-navy-900">{ad(y.ad, l)}</b>
                    <span className="block text-[12.4px] leading-relaxed text-steel-600">
                      {ad(y.aciklama, l)}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {y.rozetler.map((r) => (
                        <span
                          key={r}
                          className="rounded border border-steel-200 bg-white px-2 py-0.5 text-[11.2px] font-semibold text-steel-700"
                        >
                          {r}
                        </span>
                      ))}
                    </span>
                  </span>
                </label>
              ))}

              <p className="text-[11.8px] leading-relaxed text-steel-500">
                {acik ? `${om("saglayiciMetin", l)} ${om("sekBilgi", l)}` : om("odemeKapali", l)}
              </p>
            </div>

            {/* Fatura — yalnızca onaylı başvurusu olan firmaya açılır. */}
            {faturaAcik ? (
              <label className="mt-2.5 flex cursor-pointer gap-3 rounded-[9px] border border-ok/40 bg-ok/5 p-3.5 hover:border-gold has-checked:border-gold has-checked:bg-gold-200/20">
                <input type="radio" name="odeme" value="invoice" className="mt-0.5 h-4 w-4 accent-navy-700" />
                <span>
                  <b className="block text-[13.6px] text-navy-900">{om("faturaBaslik", l)}</b>
                  <span className="block text-[12.4px] text-ok">{om("faturaAcik", l)}</span>
                </span>
              </label>
            ) : (
              <div className="mt-2.5 rounded-[9px] border border-steel-200 bg-steel-50 p-3.5">
                <b className="block text-[13.4px] text-navy-900">{om("faturaBaslik", l)}</b>
                <span className="mt-0.5 block text-[12.4px] leading-relaxed text-steel-600">
                  {om("faturaKapali", l)}
                </span>
                <Link
                  href={`/${l}/fatura-basvuru`}
                  className="mt-2 inline-flex text-[12.6px] font-bold text-navy-700 underline-offset-2 hover:text-gold hover:underline"
                >
                  {om("faturaBasvur", l)} →
                </Link>
              </div>
            )}

            {h("odeme") && (
              <span className="mt-2 block text-[11.8px] font-semibold text-danger">
                {sp.faturaYok === "1" ? om("faturaYetkiYok", l) : om("secimHata", l)}
              </span>
            )}

            <label className="mt-4 block">
              <span className="block text-[12px] font-bold text-navy-900">{om("not", l)}</span>
              <textarea
                name="not"
                rows={3}
                maxLength={1000}
                defaultValue={eski("not")}
                className={girdi + " mt-1 resize-y"}
              />
            </label>
          </section>
        </div>

        {/* ---------------- özet ---------------- */}
        <aside className="h-fit rounded-[10px] border border-steel-200 p-5 lg:sticky lg:top-4">
          <h2 className="text-[15px] font-extrabold text-navy-900">{om("ozetBolum", l)}</h2>

          <div className="mt-3 max-h-[280px] space-y-2.5 overflow-y-auto">
            {sepet.lines.map(({ product: p, qty, unitCents, lineCents }) => (
              <div key={p.id} className="flex gap-2.5">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded border border-steel-200 bg-steel-50">
                  {p.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0].url} alt="" className="h-full w-full object-contain p-0.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.6px] font-semibold text-navy-900">
                    {pick(p, "name", l)}
                  </span>
                  <span className="block font-mono text-[11px] text-steel-500">
                    {p.sku} · {qty} × {unitCents > 0 ? money(unitCents, l) : "—"}
                  </span>
                </span>
                <span className="shrink-0 text-[12.6px] font-bold tabular-nums text-navy-900">
                  {lineCents > 0 ? money(lineCents, l) : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-steel-200 pt-3">
            <div className="flex justify-between py-1 text-[13.4px]">
              <span className="text-steel-700">{om("araToplam", l)}</span>
              <b className="text-navy-900 tabular-nums">{money(tutar.netCents, l)}</b>
            </div>
            <div className="flex justify-between py-1 text-[13.4px]">
              <span className="text-steel-700">{om("kargo", l)}</span>
              <b className={tutar.shipCents === 0 ? "text-ok" : "text-navy-900 tabular-nums"}>
                {tutar.shipCents === 0 ? om("ucretsizKargo", l) : money(tutar.shipCents, l)}
              </b>
            </div>
            <div className="flex justify-between border-b border-steel-200 py-1 text-[13.4px]">
              <span className="text-steel-700">
                {om("kdv", l)} %{tutar.kdvYuzde}
              </span>
              <b className="text-navy-900 tabular-nums">{money(tutar.vatCents, l)}</b>
            </div>
            <div className="flex justify-between py-3 text-[18px] font-extrabold text-navy-900">
              <span>{om("genelToplam", l)}</span>
              <span className="tabular-nums">{money(tutar.totalCents, l)}</span>
            </div>
            <p className="text-[11.6px] text-steel-500">{om("kdvDahil", l)}</p>
          </div>

          {tutar.fiyatSorulacak && (
            <p className="mt-3 rounded bg-gold-200/50 p-2.5 text-[12px] leading-relaxed text-gold-800">
              {om("fiyatSorulacak", l)}
            </p>
          )}

          <button
            type="submit"
            disabled={!acik && !faturaAcik}
            className="mt-4 w-full cursor-pointer rounded-md bg-gold px-6 py-3.5 text-[15px] font-bold text-navy-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {om("odemeyeGec", l)}
          </button>
          <p className="mt-2 text-[11.6px] leading-relaxed text-steel-500">
            {acik ? om("saglayiciMetin", l) : om("kosul", l)}
          </p>

          <Link
            href={`/${l}/sepet`}
            className="mt-2 block py-2 text-center text-[13px] text-steel-700 hover:text-gold"
          >
            {om("sepeteDon", l)}
          </Link>
        </aside>
      </form>

      <p className="mt-6 text-[11.8px] text-steel-500">{t("exVat", l)}</p>
    </div>
  );
}
