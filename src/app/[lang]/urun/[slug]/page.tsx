import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { productBySlug, categoryById, brand as getBrand } from "@/lib/catalog";
import { pick, strict, title as urunAdi, t, isLang, type Lang } from "@/lib/i18n";
import { money, netCents, stockState } from "@/lib/money";
import AddToCart from "@/components/AddToCart";
import DimensionDiagram from "@/components/DimensionDiagram";
import UrunGaleri from "@/components/UrunGaleri";

export const revalidate = 300;

function getProduct(slug: string) {
  const p = productBySlug(slug);
  if (!p) return null;
  const category = categoryById(p.categoryId);
  if (!category) return null;
  return {
    ...p,
    category,
    sub: p.subId ? categoryById(p.subId) ?? null : null,
    brand: getBrand(p.brandId) ?? null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = getProduct(slug);
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

  const p = getProduct(slug);
  if (!p) notFound();

  const net = netCents(p);
  const indirimli = net < p.priceCents;
  const st = stockState(p);

  // --- SIKI TEK DİL ---
  // Açıklama: yalnızca seçilen dilde; yoksa boş (bildirim gösterilir).
  const aciklama = strict(p, "desc", l);
  // Özellikler: yalnızca bu dile çevrilmiş satırlar; gerisi gizlenir.
  const ozellikler = (p.specs ?? [])
    .map((s) => s.i18n?.[l])
    .filter((x): x is { label: string; value: string } => !!x?.label);
  const gizlenen = (p.specs ?? []).length - ozellikler.length;

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
          {/* Görsel + ölçü katmanı yan yana.
              Geniş ekranda şema görselin sağında, dar ekranda altına iner.
              Şema, galeriye children olarak geçirilir; yerleşim değişmez. */}
          <UrunGaleri images={p.images} alt={pick(p, "name", l)} sku={p.sku} lang={l}>
            {p.dims && (
              <div className="xl:w-[268px] xl:shrink-0">
                <DimensionDiagram dims={p.dims} lang={l} weightKg={p.weightKg} />
              </div>
            )}
          </UrunGaleri>
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
                    : st === "request"
                      ? "bg-steel-100 text-steel-700"
                      : "bg-emerald-50 text-ok")
              }
            >
              {st === "out"
                ? t("outOfStock", l)
                : st === "low"
                  ? t("lowStock", l)
                  : st === "request"
                    ? `${t("onRequest", l)} · ${p.leadDays} ${t("days", l)}`
                    : t("inStock", l)}
              {st === "ok" || st === "low" ? ` · ${p.stock}` : ""}
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

      {/* AÇIKLAMA — yalnızca seçilen dilde. Çeviri yoksa İngilizce metin
          buraya SIZDIRILMAZ; açık bir bildirim gösterilir. */}
      <section className="mt-14 max-w-[820px]">
        <h2 className="text-[20px] font-extrabold text-navy-900">{t("description", l)}</h2>
        {aciklama ? (
          <p className="mt-3 leading-relaxed whitespace-pre-line text-steel-900">{aciklama}</p>
        ) : (
          <p className="mt-3 rounded-md border border-steel-200 bg-steel-50 px-4 py-3 text-[13.4px] text-steel-700">
            {t("noDesc", l)}
          </p>
        )}
      </section>

      {/* TEKNİK ÖZELLİKLER — yalnızca bu dile çevrilmiş satırlar */}
      <section className="mt-12 max-w-[820px]">
        <h2 className="text-[20px] font-extrabold text-navy-900">{t("specs", l)}</h2>
        {ozellikler.length > 0 ? (
          <table className="mt-3 w-full text-[13.4px]">
            <tbody>
              {ozellikler.map((s, i) => (
                <tr key={i} className="border-b border-steel-200">
                  <td className="py-2 pr-4 text-steel-700">{s.label}</td>
                  <td className="py-2 font-semibold text-navy-900">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 rounded-md border border-steel-200 bg-steel-50 px-4 py-3 text-[13.4px] text-steel-700">
            {t("noSpecs", l)}
          </p>
        )}

        {gizlenen > 0 && (
          <p className="mt-2 text-[12.2px] text-steel-500">
            {gizlenen} {t("partialSpecs", l)}
          </p>
        )}
      </section>
    </div>
  );
}
