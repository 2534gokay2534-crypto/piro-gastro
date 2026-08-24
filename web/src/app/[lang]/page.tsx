import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import Hero from "@/components/Hero";
import { pick, t, isLang, type Lang } from "@/lib/i18n";
import { notFound } from "next/navigation";

export const revalidate = 300;

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  const cats = await db.category.findMany({
    where: { parentId: null },
    orderBy: { sort: "asc" },
    include: {
      _count: { select: { products: true } },
      products: {
        where: { hidden: false, images: { some: {} } },
        orderBy: { priceCents: "desc" },
        take: 1,
        include: { images: { orderBy: { sort: "asc" }, take: 1 } },
      },
    },
  });

  const oneCikan = await db.product.findMany({
    where: { hidden: false },
    orderBy: { sold: "desc" },
    take: 8,
    include: { images: { orderBy: { sort: "asc" }, take: 1 } },
  });

  return (
    <>
      <Hero lang={l} />

      {/* KATEGORİLER */}
      <section className="mx-auto max-w-[1320px] px-5 py-14">
        <h2 className="text-[26px] font-extrabold tracking-tight text-navy-900">
          {t("categories", l)}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cats.map((c) => {
            const img = c.image ?? c.products[0]?.images[0]?.url;
            return (
              <Link
                key={c.id}
                href={`/${l}/kategori/${c.slug}`}
                className="group flex flex-col overflow-hidden rounded-[10px] border border-steel-200 bg-white transition hover:-translate-y-0.5 hover:border-gold hover:shadow-c3"
              >
                <div className="aspect-[16/10] bg-steel-50">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain p-2 transition group-hover:scale-[1.05]"
                    />
                  )}
                </div>
                <div className="p-3">
                  <b className="block text-[13.6px] leading-snug text-navy-900">
                    {pick(c, "name", l)}
                  </b>
                  <small className="text-[11.6px] text-steel-700">
                    {c._count.products} {t("products", l).toLowerCase()}
                  </small>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ÖNE ÇIKAN ÜRÜNLER */}
      <section className="mx-auto max-w-[1320px] px-5 pb-16">
        <div className="flex items-end justify-between">
          <h2 className="text-[26px] font-extrabold tracking-tight text-navy-900">
            {t("products", l)}
          </h2>
          <Link href={`/${l}/urunler`} className="text-[13px] font-semibold text-navy-600 hover:text-gold">
            {t("viewAll", l)} →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {oneCikan.map((p) => (
            <ProductCard key={p.id} p={p} lang={l} />
          ))}
        </div>
      </section>
    </>
  );
}
