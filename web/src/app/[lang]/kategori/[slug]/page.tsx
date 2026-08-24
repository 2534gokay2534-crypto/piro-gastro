import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import { pick, t, isLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

const SAYFA = 48;

async function getCat(slug: string) {
  return db.category.findUnique({
    where: { slug },
    include: { children: { orderBy: { sort: "asc" } }, parent: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const c = await getCat(slug);
  if (!c || !isLang(lang)) return {};
  const ad = pick(c, "name", lang as Lang);
  return {
    title: `${ad} | Piro Gastro`,
    description: pick(c, "desc", lang as Lang) || undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { lang, slug } = await params;
  const { s } = await searchParams;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  const c = await getCat(slug);
  if (!c) notFound();

  const sayfa = Math.max(1, Number(s) || 1);

  // Ana kategori seçildiyse alt kategorilerdeki ürünler de gelsin
  const catIds = [c.id, ...c.children.map((k) => k.id)];
  const where = { hidden: false, OR: [{ categoryId: { in: catIds } }, { subId: { in: catIds } }] };

  const [toplam, urunler] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ featured: "desc" }, { sold: "desc" }],
      skip: (sayfa - 1) * SAYFA,
      take: SAYFA,
      include: { images: { orderBy: { sort: "asc" }, take: 1 } },
    }),
  ]);

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-8">
      {/* kırıntı yolu */}
      <nav className="flex items-center gap-2 text-[12.6px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">
          {t("home", l)}
        </Link>
        <span>/</span>
        {c.parent && (
          <>
            <Link href={`/${l}/kategori/${c.parent.slug}`} className="hover:text-gold">
              {pick(c.parent, "name", l)}
            </Link>
            <span>/</span>
          </>
        )}
        <b className="text-navy-900">{pick(c, "name", l)}</b>
      </nav>

      <h1 className="mt-3 text-[30px] font-extrabold tracking-tight text-navy-900">
        {pick(c, "name", l)}
      </h1>
      <p className="mt-1 text-steel-700">
        {pick(c, "desc", l) || `${toplam} ${t("products", l).toLowerCase()}`}
      </p>

      {/* alt kategoriler */}
      {c.children.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {c.children.map((k) => (
            <Link
              key={k.id}
              href={`/${l}/kategori/${k.slug}`}
              className="rounded-full border border-steel-200 px-4 py-1.5 text-[12.6px] text-steel-700 hover:border-gold hover:text-navy-900"
            >
              {pick(k, "name", l)}
            </Link>
          ))}
        </div>
      )}

      {urunler.length === 0 ? (
        <p className="mt-10 text-steel-500">{t("noProducts", l)}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {urunler.map((p) => (
            <ProductCard key={p.id} p={p} lang={l} />
          ))}
        </div>
      )}

      {/* sayfalama */}
      {sonSayfa > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {sayfa > 1 && (
            <Link
              href={`/${l}/kategori/${c.slug}?s=${sayfa - 1}`}
              className="rounded border border-steel-200 px-4 py-2 text-[13px] hover:border-gold"
            >
              ←
            </Link>
          )}
          <span className="px-3 text-[13px] text-steel-700">
            {sayfa} / {sonSayfa}
          </span>
          {sayfa < sonSayfa && (
            <Link
              href={`/${l}/kategori/${c.slug}?s=${sayfa + 1}`}
              className="rounded border border-steel-200 px-4 py-2 text-[13px] hover:border-gold"
            >
              →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
