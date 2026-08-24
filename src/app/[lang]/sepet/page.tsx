import Link from "next/link";
import { notFound } from "next/navigation";
import { cartDetail, shippingCents, FREE_SHIPPING_CENTS } from "@/lib/cart";
import { setQtyForm, removeForm } from "@/app/actions/cart";
import { pick, t, isLang, type Lang } from "@/lib/i18n";
import { money } from "@/lib/money";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

const S = {
  sv: {
    title: "Varukorg", empty: "Din varukorg är tom", cont: "Fortsätt handla",
    sum: "Delsumma", total: "Att betala", ship: "Frakt", free: "Fri frakt", checkout: "Till kassan",
    remove: "Ta bort", freeHint: (x: string) => `Handla för ${x} till för fri frakt`,
  },
  en: {
    title: "Cart", empty: "Your cart is empty", cont: "Continue shopping",
    sum: "Subtotal", total: "Total", ship: "Shipping", free: "Free shipping", checkout: "Checkout",
    remove: "Remove", freeHint: (x: string) => `Add ${x} more for free shipping`,
  },
  tr: {
    title: "Sepetim", empty: "Sepetiniz boş", cont: "Alışverişe devam et",
    sum: "Ara toplam", total: "Genel toplam", ship: "Kargo", free: "Ücretsiz kargo", checkout: "Ödemeye geç",
    remove: "Kaldır", freeHint: (x: string) => `Ücretsiz kargo için ${x} daha ekleyin`,
  },
} as const;

export default async function CartPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;
  const s = S[l];

  const cart = await cartDetail(l);
  const kargo = shippingCents(cart.netCents);
  const eksik = FREE_SHIPPING_CENTS - cart.netCents;

  if (!cart.lines.length) {
    return (
      <div className="mx-auto max-w-[1320px] px-[30px] py-20 text-center">
        <Icon name="cart" className="mx-auto h-12 w-12 text-steel-300" />
        <h1 className="mt-4 text-[24px] font-extrabold text-navy-900">{s.empty}</h1>
        <Link
          href={`/${l}/urunler`}
          className="mt-6 inline-block rounded-md bg-navy-900 px-6 py-3 text-[14px] font-bold text-white hover:bg-navy-800"
        >
          {s.cont}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] px-[30px] py-8">
      <h1 className="text-[30px] font-extrabold tracking-tight text-navy-900">{s.title}</h1>
      <p className="mt-1 text-steel-700">
        {cart.count} {t("products", l).toLowerCase()}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* satırlar */}
        <div className="divide-y divide-steel-200 rounded-[10px] border border-steel-200">
          {cart.lines.map(({ product: p, qty, unitCents, lineCents }) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 p-4">
              <Link
                href={`/${l}/urun/${p.slug}`}
                className="h-20 w-20 shrink-0 overflow-hidden rounded border border-steel-200 bg-steel-50"
              >
                {p.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt="" className="h-full w-full object-contain p-1" />
                )}
              </Link>

              <div className="min-w-[180px] flex-1">
                <Link href={`/${l}/urun/${p.slug}`} className="font-semibold text-navy-900 hover:text-gold">
                  {pick(p, "name", l)}
                </Link>
                <div className="font-mono text-[11.6px] text-steel-500">{p.sku}</div>
                <div className="text-[12.6px] text-steel-700">
                  {money(unitCents, l)} / {l === "tr" ? "adet" : l === "sv" ? "st" : "ea"}
                </div>
              </div>

              <form action={setQtyForm.bind(null, p.id)} className="flex items-center gap-2">
                <input
                  name="qty"
                  type="number"
                  min={0}
                  max={999}
                  defaultValue={qty}
                  className="w-[74px] rounded border border-steel-300 px-2 py-1.5 text-right text-[14px] outline-none focus:border-gold"
                />
                <button
                  type="submit"
                  className="cursor-pointer rounded border border-steel-200 px-3 py-1.5 text-[12.6px] hover:border-gold"
                >
                  ✓
                </button>
              </form>

              <div className="w-28 text-right text-[16px] font-extrabold text-navy-900">
                {money(lineCents, l)}
              </div>

              <form action={removeForm.bind(null, p.id)}>
                <button
                  type="submit"
                  aria-label={s.remove}
                  className="cursor-pointer rounded p-2 text-steel-500 hover:bg-steel-50 hover:text-danger"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>

        {/* özet */}
        <aside className="h-fit rounded-[10px] border border-steel-200 p-5">
          <div className="flex justify-between py-2 text-[14px]">
            <span className="text-steel-700">{s.sum}</span>
            <b className="text-navy-900">{money(cart.netCents, l)}</b>
          </div>
          <div className="flex justify-between border-b border-steel-200 py-2 text-[14px]">
            <span className="text-steel-700">{s.ship}</span>
            <b className={kargo === 0 ? "text-ok" : "text-navy-900"}>
              {kargo === 0 ? s.free : money(kargo, l)}
            </b>
          </div>
          <div className="flex justify-between py-3 text-[18px] font-extrabold text-navy-900">
            <span>{s.total}</span>
            <span>{money(cart.netCents + kargo, l)}</span>
          </div>
          <p className="text-[11.6px] text-steel-500">{t("exVat", l)}</p>

          {eksik > 0 && (
            <p className="mt-3 rounded bg-gold-200/50 p-2.5 text-[12.2px] text-gold-800">
              {s.freeHint(money(eksik, l))}
            </p>
          )}

          <Link
            href={`/${l}/odeme`}
            className="mt-5 block rounded-md bg-gold px-6 py-3.5 text-center text-[15px] font-bold text-navy-950 transition hover:bg-gold-400"
          >
            {s.checkout}
          </Link>
          <Link
            href={`/${l}/urunler`}
            className="mt-2 block py-2 text-center text-[13px] text-steel-700 hover:text-gold"
          >
            {s.cont}
          </Link>
        </aside>
      </div>
    </div>
  );
}
