import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { sayi } from "@/lib/admin-ui";
import { kategoriKaydet, kategoriSil } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { Bos, DUGME, Kutu, Rozet, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

export default async function Kategoriler({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { lang } = await params;
  const { d } = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Kategoriler" />;

  const kok = `/${lang}/admin/kategoriler`;

  let kategoriler, sayimlar;
  try {
    [kategoriler, sayimlar] = await Promise.all([
      db.category.findMany({
        orderBy: [{ sort: "asc" }],
        select: {
          id: true, slug: true, parentId: true, sort: true, icon: true,
          texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
        },
      }),
      db.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Kategoriler" hata={String(e)} />;
  }

  const say = new Map(sayimlar.map((x) => [x.categoryId, x._count._all]));
  const ad = (t: Array<{ name: string; langCode: string }>) =>
    t.find((x) => x.langCode === lang)?.name ?? t[0]?.name ?? "—";

  const ana = kategoriler.filter((c) => !c.parentId);
  const duzenlenen = d ? kategoriler.find((c) => c.id === d) : null;

  return (
    <Sayfa
      baslik="Kategoriler"
      ozet={`${sayi(ana.length)} ana kategori · ${sayi(kategoriler.length - ana.length)} alt kategori`}
      eylem={
        <a href={`/api/admin/disa-aktar?tip=kategoriler&lang=${lang}`} className={DUGME.sade}>
          Dışa aktar (CSV)
        </a>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---- liste ---- */}
        <div className="min-w-0">
          {kategoriler.length === 0 ? (
            <Bos metin="Kategori yok." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th>Kategori</Th>
                  <Th w="110px" orta>Ürün</Th>
                  <Th w="80px" orta>Sıra</Th>
                  <Th w="150px" sag>İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {ana.map((c) => {
                  const alt = kategoriler.filter((x) => x.parentId === c.id);
                  const toplam =
                    (say.get(c.id) ?? 0) + alt.reduce((t, a) => t + (say.get(a.id) ?? 0), 0);
                  return (
                    <Fragment key={c.id}>
                      <tr className="hover:bg-steel-50">
                        <Td>
                          <Link
                            href={`/${lang}/admin/urunler?k=${c.id}`}
                            className="font-bold text-navy-900 hover:text-gold"
                          >
                            {ad(c.texts)}
                          </Link>
                          <span className="ml-2 font-mono text-[11.2px] text-steel-400">{c.slug}</span>
                        </Td>
                        <Td orta className="tabular-nums font-semibold">{sayi(toplam)}</Td>
                        <Td orta className="tabular-nums text-steel-600">{c.sort}</Td>
                        <Td sag>
                          <Link href={`${kok}?d=${c.id}`} className="text-[12.4px] font-bold text-navy-600 hover:text-gold">
                            Düzenle
                          </Link>
                        </Td>
                      </tr>
                      {alt.map((a) => (
                        <tr key={a.id} className="hover:bg-steel-50">
                          <Td>
                            <span className="pl-5 text-steel-400">↳</span>{" "}
                            <Link
                              href={`/${lang}/admin/urunler?k=${a.id}`}
                              className="text-steel-800 hover:text-gold"
                            >
                              {ad(a.texts)}
                            </Link>
                            <span className="ml-2 font-mono text-[11.2px] text-steel-400">{a.slug}</span>
                          </Td>
                          <Td orta className="tabular-nums">{sayi(say.get(a.id) ?? 0)}</Td>
                          <Td orta className="tabular-nums text-steel-600">{a.sort}</Td>
                          <Td sag>
                            <Link href={`${kok}?d=${a.id}`} className="text-[12.4px] font-bold text-navy-600 hover:text-gold">
                              Düzenle
                            </Link>
                          </Td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </Tablo>
          )}
        </div>

        {/* ---- ekle / düzenle ---- */}
        <div>
          <Kutu className="space-y-3.5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-navy-900">
                {duzenlenen ? "Kategoriyi düzenle" : "Yeni kategori"}
              </h2>
              {duzenlenen && (
                <Link href={kok} className="text-[12px] font-bold text-steel-500 hover:text-gold">
                  Vazgeç
                </Link>
              )}
            </div>

            <form action={kategoriKaydet} className="space-y-3">
              <input type="hidden" name="lang" value={lang} />
              {duzenlenen && <input type="hidden" name="id" value={duzenlenen.id} />}

              <label className="block">
                <span className="block text-[12px] font-bold text-navy-900">
                  Kategori adı ({lang.toUpperCase()})
                </span>
                <input
                  name="ad"
                  defaultValue={duzenlenen ? ad(duzenlenen.texts) : ""}
                  maxLength={200}
                  className={girdi + " mt-1"}
                  required
                />
              </label>

              <label className="block">
                <span className="block text-[12px] font-bold text-navy-900">Üst kategori</span>
                <select
                  name="parentId"
                  defaultValue={duzenlenen?.parentId ?? ""}
                  className={girdi + " mt-1"}
                >
                  <option value="">— ana kategori —</option>
                  {ana
                    .filter((c) => c.id !== duzenlenen?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{ad(c.texts)}</option>
                    ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[12px] font-bold text-navy-900">Sıra</span>
                  <input
                    name="sort"
                    defaultValue={duzenlenen?.sort ?? 0}
                    className={girdi + " mt-1"}
                    inputMode="numeric"
                  />
                </label>
                <label className="block">
                  <span className="block text-[12px] font-bold text-navy-900">İkon</span>
                  <input
                    name="icon"
                    defaultValue={duzenlenen?.icon ?? ""}
                    placeholder="flame, snow…"
                    className={girdi + " mt-1"}
                  />
                </label>
              </div>

              <button type="submit" className={DUGME.ana + " w-full justify-center"}>
                {duzenlenen ? "Kaydet" : "Kategori oluştur"}
              </button>
            </form>

            {duzenlenen && (
              <form action={kategoriSil} className="border-t border-steel-200 pt-3">
                <input type="hidden" name="id" value={duzenlenen.id} />
                <button type="submit" className={DUGME.tehlike + " w-full justify-center"}>
                  Kategoriyi sil
                </button>
                <p className="mt-1.5 text-[11.6px] text-steel-500">
                  İçinde ürün varsa silinmez — önce ürünleri başka kategoriye taşıyın.
                </p>
              </form>
            )}
          </Kutu>

          <Kutu className="mt-3 p-4">
            <h3 className="text-[13px] font-extrabold text-navy-900">Not</h3>
            <p className="mt-1.5 text-[12.4px] leading-relaxed text-steel-700">
              Kategori adları mağazadaki dil sırasına göre gösterilir. Başka bir dile çeviri
              eklemek için{" "}
              <Link href={`/${lang}/admin/ceviriler`} className="font-semibold text-navy-600 hover:text-gold">
                Diller ve Çeviriler
              </Link>{" "}
              ekranını kullanın.
            </p>
            <div className="mt-2 flex gap-1.5">
              <Rozet ton="navy">{lang.toUpperCase()}</Rozet>
              <Rozet>düzenlenen dil</Rozet>
            </div>
          </Kutu>
        </div>
      </div>
    </Sayfa>
  );
}
