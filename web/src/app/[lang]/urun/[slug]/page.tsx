import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { pick, t, isLang, type Lang } from "@/lib/i18n";
import { money, netCents, stockState } from "@/lib/money";
import AddToCart from "@/components/AddToCart";

export const revalidate = 300;

async function getProduct(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sort: "asc" } },
      specs: { orderBy: { sort: "asc" } },
      brand: true,
      category: true,
      sub: true,
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = await getProduct(slug);
  if (!p || !isLang(lang)) return {};
  const l = lang as Lang;
  return {
    title: `${pick(p, "name", l)} | Piro Gastro`,
    description: (pick(p, "desc", l) || "").slice(0, 155),
    openGraph: { images: p.images[0]?.url ? [p.images[0].url] : [] },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  const p = await getProduct(slug);
  if (!p) notFound();

  const net = netCents(p);
  const indirimli = net < p.priceCents;
  const st = stockState(p);

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-8">
      <nav className="flex flex-wrap items-center gap-2 text-[12.6px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">
          {t("home", l)}
        </Link>
        <span>/</span>
        <Link href={`/${l}/kategori/${p.category.slug}`} className="hover:text-gold">
          {pick(p.category, "name", l)}
        </Link>
        {p.sub && (
          <>
            <span>/</span>
            <Link href={`/${l}/kategori/${p.sub.slug}`} className="hover:text-gold">
              {pick(p.sub, "name", l)}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* görseller */}
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-[10px] border border-steel-200 bg-steel-50">
            {p.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.images[0].url}
                alt={pick(p, "name", l)}
                className="h-full w-full object-contain p-6"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-steel-500">{p.sku}</div>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {p.images.slice(0, 10).map((im) => (
                <div
                  key={im.id}
                  className="aspect-square overflow-hidden rounded border border-steel-200 bg-steel-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* bilgi */}
        <div>
          <span className="font-mono text-[12px] text-steel-500">
            {t("itemNo", l)}: {p.sku}
          </span>
          <h1 className="mt-2 text-[28px] leading-tight font-extrabold text-navy-900">
            {pick(p, "name", l)}
          </h1>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-[32px] font-extrabold text-navy-900">{money(net, l)}</span>
            {indirimli && <s className="text-[16px] text-steel-500">{money(p.priceCents, l)}</s>}
          </div>
          <span className="text-[12px] text-steel-500">{t("exVat", l)}</span>

          <div className="mt-4">
            <span
              className={
                "inline-block rounded-full px-3 py-1 text-[12px] font-semibold " +
                (st === "out"
                  ? "bg-red-50 text-danger"
                  : st === "low"
                    ? "bg-amber-50 text-warn"
                    : "bg-emerald-50 text-ok")
              }
            >
              {st === "out" ? t("outOfStock", l) : st === "low" ? t("lowStock", l) : t("inStock", l)}
              {st !== "out" && ` · ${p.stock}`}
            </span>
          </div>

          <AddToCart productId={p.id} lang={l} disabled={st === "out"} />

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-steel-200 pt-6 text-[13.4px]">
            {p.brand && (
              <>
                <dt className="text-steel-700">{t("brandLabel", l)}</dt>
                <dd className="font-semibold text-navy-900">{p.brand.name}</dd>
              </>
            )}
            <dt className="text-steel-700">{t("warranty", l)}</dt>
            <dd className="font-semibold text-navy-900">
              {p.warranty} {t("months", l)}
            </dd>
            <dt className="text-steel-700">{t("leadTime", l)}</dt>
            <dd className="font-semibold text-navy-900">
              {p.leadDays} {t("days", l)}
            </dd>
          </dl>
        </div>
      </div>

      {/* açıklama */}
      {pick(p, "desc", l) && (
        <section className="mt-14 max-w-[820px]">
          <h2 className="text-[20px] font-extrabold text-navy-900">{t("description", l)}</h2>
          <p className="mt-3 leading-relaxed whitespace-pre-line text-steel-900">
            {pick(p, "desc", l)}
          </p>
        </section>
      )}

      {/* teknik özellikler */}
      {p.specs.length > 0 && (
        <section className="mt-12 max-w-[820px]">
          <h2 className="text-[20px] font-extrabold text-navy-900">{t("specs", l)}</h2>
          <table className="mt-3 w-full text-[13.4px]">
            <tbody>
              {p.specs.map((s) => (
                <tr key={s.id} className="border-b border-steel-200">
                  <td className="py-2 pr-4 text-steel-700">{s.label}</td>
                  <td className="py-2 font-semibold text-navy-900">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
