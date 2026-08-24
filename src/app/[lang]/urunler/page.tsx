import Link from "next/link";
import { notFound } from "next/navigation";
import { searchProducts, sortForListing } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import { t, isLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

const SAYFA = 48;

export default async function AllProducts({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ s?: string; q?: string }>;
}) {
  const { lang } = await params;
  const { s, q } = await searchParams;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  const sayfa = Math.max(1, Number(s) || 1);
  const arama = (q ?? "").trim();

  const hepsi = sortForListing(searchProducts(arama));
  const toplam = hepsi.length;
  const urunler = hepsi.slice((sayfa - 1) * SAYFA, sayfa * SAYFA);

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));
  const temel = `/${l}/urunler${arama ? `?q=${encodeURIComponent(arama)}&` : "?"}`;

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-8">
      <h1 className="text-[30px] font-extrabold tracking-tight text-navy-900">
        {t("products", l)}
      </h1>
      <p className="mt-1 text-steel-700">
        {toplam} {t("products", l).toLowerCase()}
        {arama && ` · “${arama}”`}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {urunler.map((p) => (
          <ProductCard key={p.id} p={p} lang={l} />
        ))}
      </div>

      {sonSayfa > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {sayfa > 1 && (
            <Link
              href={`${temel}s=${sayfa - 1}`}
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
              href={`${temel}s=${sayfa + 1}`}
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
