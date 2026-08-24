import Link from "next/link";
import { mainCategories } from "@/lib/catalog";
import Icon from "@/components/Icon";
import LangSwitch from "@/components/LangSwitch";
import { pick, t, type Lang } from "@/lib/i18n";
import { CURRENCY, money } from "@/lib/money";
import { cartDetail } from "@/lib/cart";

/**
 * Üst başlık — onaylı prototipin birebir aynısı:
 *   1) altın şerit  (.gstrip)   — kargo mesajı + dil + para birimi
 *   2) lacivert başlık (.ghead) — menü + logo + hesap/sepet + büyük arama
 *   3) beyaz kategori ızgarası (.gcats) — 6 sütun, ikonlu
 */
export default async function SiteHeader({ lang }: { lang: Lang }) {
  const cats = mainCategories();

  const cart = await cartDetail(lang);

  const KARGO: Record<string, string> = {
    sv: "Fri frakt på alla order över 25 000 kr",
    en: "Free shipping on all orders over €2,500",
    tr: "2.500 € üzeri tüm siparişlerde ücretsiz kargo",
  };
  const kargo = KARGO[lang] ?? KARGO.en;

  return (
    <>
      {/* 1 — ALTIN ŞERİT */}
      <div className="bg-gold text-navy-950">
        <div className="relative mx-auto flex min-h-[38px] max-w-[1320px] flex-wrap items-center justify-center gap-5 px-[30px] py-[5px]">
          <span className="text-center text-[12.8px] font-[650]">{kargo}</span>
          <div className="flex items-center gap-3.5 sm:absolute sm:right-[30px]">
            <LangSwitch lang={lang} />
            <span className="flex items-center gap-1.5 text-[12.4px] font-[650]">
              <Icon name="card" className="h-[15px] w-[15px]" />
              {CURRENCY[lang].code}
            </span>
          </div>
        </div>
      </div>

      {/* 2 — LACİVERT BAŞLIK */}
      <header className="sticky top-0 z-[95] bg-navy-950 pb-3.5">
        <div className="mx-auto max-w-[1320px] px-[30px]">
          <div className="flex min-h-[84px] items-center gap-5">
            <Link
              href={`/${lang}/urunler`}
              aria-label={t("allCategories", lang)}
              className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-lg text-white hover:bg-white/10"
            >
              <Icon name="menu" className="h-[26px] w-[26px]" />
            </Link>

            <Link href={`/${lang}`} className="flex shrink-0 items-center gap-[13px]">
              <span className="grid h-[52px] w-[52px] place-items-center rounded-[9px] bg-white shadow-[0_2px_8px_rgba(0,0,0,.18)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-mark.png" alt="Piro Gastro" className="h-[38px] w-auto" />
              </span>
              <span>
                <b className="block text-[26px] leading-[1.05] font-extrabold text-white">
                  Piro <em className="not-italic text-gold">Gastro</em>
                </b>
                <small
                  lang="en"
                  className="mt-1 block text-[8.4px] font-[650] tracking-[.3em] text-gold uppercase"
                >
                  Professional Kitchen Solutions
                </small>
              </span>
            </Link>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Link
                href={`/${lang}/hesabim`}
                aria-label={t("account", lang)}
                className="flex items-center gap-2.5 rounded-lg p-2.5 text-white hover:bg-white/10"
              >
                <Icon name="user" className="h-6 w-6" />
              </Link>
              <Link
                href={`/${lang}/sepet`}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-white hover:bg-white/10"
              >
                <span className="relative grid place-items-center">
                  <Icon name="cart" className="h-6 w-6" />
                  {cart.count > 0 && (
                    <span className="absolute -top-2 -right-2.5 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy-950">
                      {cart.count}
                    </span>
                  )}
                </span>
                <span className="hidden text-[13.6px] sm:inline">
                  <b className="font-bold">{t("cart", lang)}</b>
                  {cart.count > 0 && (
                    <span className="ml-1 text-[#9CB0C6]">({money(cart.netCents, lang)})</span>
                  )}
                </span>
              </Link>
            </div>
          </div>

          {/* büyük arama */}
          <form
            action={`/${lang}/urunler`}
            className="flex h-[54px] items-stretch rounded-[10px] bg-white shadow-[0_6px_20px_rgba(0,0,0,.22)]"
          >
            <input
              name="q"
              placeholder={t("search", lang)}
              className="min-w-0 flex-1 rounded-l-[10px] bg-transparent px-[22px] text-[15.5px] outline-none"
            />
            <select
              name="k"
              defaultValue=""
              className="max-w-[190px] cursor-pointer border-l border-steel-200 bg-steel-50 px-3.5 text-[13.2px] font-semibold text-navy-900 outline-none"
            >
              <option value="">{t("allCategories", lang)}</option>
              {cats.map((c) => (
                <option key={c.id} value={c.slug}>
                  {pick(c, "name", lang)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              aria-label={t("search", lang)}
              className="grid w-16 cursor-pointer place-items-center rounded-r-[10px] bg-gold text-navy-950 transition hover:bg-gold-400"
            >
              <Icon name="search" className="h-[22px] w-[22px]" />
            </button>
          </form>
        </div>
      </header>

      {/* 3 — KATEGORİ IZGARASI */}
      <nav className="relative z-[90] border-b border-steel-200 bg-white">
        <div className="mx-auto max-w-[1320px] px-[30px]">
          <div className="grid grid-cols-2 border-t border-l border-steel-200 sm:grid-cols-3 lg:grid-cols-6">
            {cats.map((c) => (
              <div key={c.id} className="border-r border-b border-steel-200">
                <Link
                  href={`/${lang}/kategori/${c.slug}`}
                  className="flex h-full min-h-[58px] items-center gap-3 px-[15px] py-4 text-[13.4px] font-semibold text-navy-900 transition hover:bg-steel-50 hover:text-navy-600"
                >
                  <Icon name={c.icon ?? "box"} className="h-[22px] w-[22px] shrink-0 text-gold-700" />
                  {pick(c, "name", lang)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
