import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { dilAdi } from "@/lib/admin-ui";
import { gorselAnaYap, gorselEkle, gorselSil, gorselTasi } from "@/app/actions/admin-urun";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import { Bos, DUGME, Kutu, Sayfa } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

/**
 * ÜRÜN GÖRSELLERİ — Süper Admin
 *
 * Sıralama mağazadaki galeriyle birebir aynıdır: listenin ilki ANA görseldir,
 * ürün kartlarında ve makbuzlarda o kullanılır. Buradaki her değişiklik
 * mağazaya anında yansır.
 */

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.4px] outline-none focus:border-navy-500";

export default async function UrunGorselleri({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Ürün görselleri" />;

  let urun: {
    id: string; sku: string; slug: string;
    texts: Array<{ name: string; langCode: string }>;
    images: Array<{ id: string; url: string; sort: number }>;
  } | null = null;

  try {
    urun = await db.product.findUnique({
      where: { id },
      select: {
        id: true, sku: true, slug: true,
        texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
        images: { orderBy: { sort: "asc" }, select: { id: true, url: true, sort: true } },
      },
    });
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Ürün görselleri" hata={gizliTemizle(e)} />;
  }

  if (!urun) notFound();

  const ad = dilAdi(urun.texts, lang, urun.sku);
  const geri = `/${lang}/admin/urunler/${urun.id}/gorseller`;

  return (
    <Sayfa
      baslik="Ürün görselleri"
      ozet={`${ad} · ${urun.sku} · ${urun.images.length} görsel`}
      eylem={
        <>
          <Link href={`/${lang}/admin/urunler/${urun.id}`} className={DUGME.sade}>← Ürüne dön</Link>
          <a
            href={`/${lang}/urun/${urun.slug}`}
            target="_blank"
            rel="noreferrer"
            className={DUGME.koyu}
          >
            Mağazada gör
          </a>
        </>
      }
    >
      <Kutu className="mb-4 p-4">
        <h2 className="text-[14px] font-extrabold text-navy-900">Görsel ekle</h2>
        <p className="mt-1 text-[12.4px] leading-relaxed text-steel-600">
          Görselin tam adresini yapıştırın. Tedarikçi görselleri doğrudan
          bağlanır; sunucuya dosya yüklenmez.
        </p>
        <form action={gorselEkle} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={urun.id} />
          <input type="hidden" name="geri" value={geri} />
          <label className="block min-w-[280px] flex-1">
            <span className="block text-[11.4px] font-bold text-navy-900">Görsel adresi</span>
            <input
              name="url"
              type="url"
              placeholder="https://…/urun.jpg"
              required
              maxLength={600}
              className={girdi + " mt-1"}
            />
          </label>
          <button type="submit" className={DUGME.ana}>Ekle</button>
        </form>
      </Kutu>

      {urun.images.length === 0 ? (
        <Bos metin="Bu ürünün görseli yok. Yukarıdan bir görsel adresi ekleyin." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {urun.images.map((g, n) => (
            <div
              key={g.id}
              className={
                "rounded-[10px] border bg-white p-3 " +
                (n === 0 ? "border-gold ring-1 ring-gold" : "border-steel-200")
              }
            >
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded border border-steel-200 bg-steel-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt="" loading="lazy" className="h-full w-full object-contain p-2" />
                <span
                  className={
                    "absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10.4px] font-bold " +
                    (n === 0 ? "bg-gold text-navy-950" : "bg-navy-950/70 text-white")
                  }
                >
                  {n === 0 ? "ANA GÖRSEL" : `${n + 1}. sıra`}
                </span>
              </div>

              <p className="mt-2 break-all text-[10.6px] leading-snug text-steel-500">{g.url}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {n !== 0 && (
                  <form action={gorselAnaYap}>
                    <input type="hidden" name="gorselId" value={g.id} />
                    <input type="hidden" name="geri" value={geri} />
                    <button
                      type="submit"
                      className="cursor-pointer rounded border border-gold px-2 py-1 text-[11.4px] font-bold text-gold-800 transition hover:bg-gold-200"
                    >
                      Ana yap
                    </button>
                  </form>
                )}

                <form action={gorselTasi}>
                  <input type="hidden" name="gorselId" value={g.id} />
                  <input type="hidden" name="yon" value="ileri" />
                  <input type="hidden" name="geri" value={geri} />
                  <button
                    type="submit"
                    disabled={n === 0}
                    title="Bir sıra öne al"
                    className="cursor-pointer rounded border border-steel-300 px-2 py-1 text-[11.4px] font-bold text-navy-700 transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ←
                  </button>
                </form>

                <form action={gorselTasi}>
                  <input type="hidden" name="gorselId" value={g.id} />
                  <input type="hidden" name="yon" value="geri" />
                  <input type="hidden" name="geri" value={geri} />
                  <button
                    type="submit"
                    disabled={n === urun.images.length - 1}
                    title="Bir sıra arkaya al"
                    className="cursor-pointer rounded border border-steel-300 px-2 py-1 text-[11.4px] font-bold text-navy-700 transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    →
                  </button>
                </form>

                <form action={gorselSil} className="ml-auto">
                  <input type="hidden" name="gorselId" value={g.id} />
                  <input type="hidden" name="geri" value={geri} />
                  <button
                    type="submit"
                    className="cursor-pointer rounded border border-danger/40 px-2 py-1 text-[11.4px] font-bold text-danger transition hover:bg-danger/10"
                  >
                    Sil
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-steel-500">
        Listenin ilk görseli <b>ana görseldir</b>; ürün kartlarında, sepette,
        makbuzlarda ve arama sonuçlarında o kullanılır. Sıra değişikliği
        mağazadaki galeriye anında yansır.
      </p>
    </Sayfa>
  );
}
