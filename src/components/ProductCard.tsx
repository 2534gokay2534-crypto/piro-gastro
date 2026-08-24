import Link from "next/link";
import { pick, t, type Lang } from "@/lib/i18n";
import { money, netCents, stockState } from "@/lib/money";

import type { Product } from "@/lib/catalog";

export type CardProduct = Product;

export default function ProductCard({ p, lang }: { p: CardProduct; lang: Lang }) {
  const net = netCents(p);
  const indirimli = net < p.priceCents;
  const st = stockState(p);
  const img = p.images[0]?.url;

  return (
    <Link
      href={`/${lang}/urun/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-[10px] border border-steel-200 bg-white transition hover:-translate-y-0.5 hover:border-gold hover:shadow-c3"
    >
      <div className="relative aspect-[4/3] bg-steel-50">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={pick(p, "name", lang)}
            loading="lazy"
            className="h-full w-full object-contain p-3 transition group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-steel-500">
            {p.sku}
          </div>
        )}
        {p.badge && (
          <span className="absolute top-2 left-2 rounded bg-navy-900 px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
            {p.badge}
          </span>
        )}
        {indirimli && (
          <span className="absolute top-2 right-2 rounded bg-danger px-2 py-1 text-[10px] font-bold text-white">
            −{p.campaignPercent}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="font-mono text-[10.6px] text-steel-500">{p.sku}</span>
        <h3 className="line-clamp-2 text-[13.4px] leading-snug font-semibold text-navy-900">
          {pick(p, "name", lang)}
        </h3>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[16px] font-extrabold text-navy-900">
              {money(net, lang)}
            </span>
            {indirimli && (
              <s className="text-[12px] text-steel-500">{money(p.priceCents, lang)}</s>
            )}
          </div>
          <span className="text-[10.6px] text-steel-500">{t("exVat", lang)}</span>

          <div className="mt-2">
            <span
              className={
                "inline-block rounded-full px-2 py-0.5 text-[10.6px] font-semibold " +
                (st === "out"
                  ? "bg-red-50 text-danger"
                  : st === "low"
                    ? "bg-amber-50 text-warn"
                    : st === "request"
                      ? "bg-steel-100 text-steel-700"
                      : "bg-emerald-50 text-ok")
              }
            >
              {st === "out"
                ? t("outOfStock", lang)
                : st === "low"
                  ? t("lowStock", lang)
                  : st === "request"
                    ? t("onRequest", lang)
                    : t("inStock", lang)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
