import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { para, sayi, tarihSaat, dilAdi} from "@/lib/admin-ui";
import { urunKaydet, urunSil } from "@/app/actions/admin-urun";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { DUGME, Kutu, Rozet, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const Alan = ({
  etiket,
  ipucu,
  children,
}: {
  etiket: string;
  ipucu?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="block text-[12px] font-bold text-navy-900">
      {etiket}
      {ipucu && <span className="ml-1 font-normal text-steel-500">({ipucu})</span>}
    </span>
    <span className="mt-1 block">{children}</span>
  </label>
);

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.8px] outline-none focus:border-navy-500";

export default async function UrunDuzenle({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Ürün" />;

  const kok = `/${lang}/admin/urunler`;

  let p, kategoriler, markalar, tedarikciler, hareketler;
  try {
    [p, kategoriler, markalar, tedarikciler, hareketler] = await Promise.all([
      db.product.findUnique({
        where: { id },
        include: {
          texts: { where: { langCode: { in: [lang, "en"] } } },
          images: { select: { url: true }, take: 6 },
        },
      }),
      db.category.findMany({
        orderBy: { sort: "asc" },
        select: {
          id: true, parentId: true,
          texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
        },
      }),
      db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      db.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      db.stockMovement.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Ürün" hata={String(e)} />;
  }
  if (!p) notFound();

  const metin = p.texts.find((t) => t.langCode === lang) ?? p.texts[0];
  const anaKat = kategoriler.filter((c) => !c.parentId);
  const altKat = kategoriler.filter((c) => c.parentId);
  const kar = p.priceCents - p.costCents;
  const marj = p.priceCents ? (kar / p.priceCents) * 100 : 0;

  return (
    <Sayfa
      baslik={metin?.name ?? p.sku}
      ozet={
        <span className="font-mono text-[12.4px]">
          {p.sku} · {p.slug}
        </span>
      }
      eylem={
        <>
          <Link href={kok} className={DUGME.sade}>← Listeye dön</Link>
          <Link href={`/${lang}/urun/${p.slug}`} className={DUGME.sade}>Mağazada gör</Link>
        </>
      }
    >
      <form action={urunKaydet} className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="lang" value={lang} />

        {/* ---- sol: içerik ---- */}
        <div className="min-w-0 space-y-4">
          <Kutu className="space-y-3.5 p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Ürün bilgileri</h2>

            <Alan etiket={`Ürün adı (${lang.toUpperCase()})`}>
              <input name="ad" defaultValue={metin?.name ?? ""} maxLength={300} className={girdi} required />
            </Alan>

            <Alan etiket={`Açıklama (${lang.toUpperCase()})`}>
              <textarea
                name="aciklama"
                defaultValue={metin?.desc ?? ""}
                rows={5}
                maxLength={4000}
                className={girdi + " resize-y"}
              />
            </Alan>

            <div className="grid gap-3 sm:grid-cols-2">
              <Alan etiket="Stok kodu (SKU)">
                <input name="sku" defaultValue={p.sku} maxLength={60} className={girdi} required />
              </Alan>
              <Alan etiket="Marka">
                <select name="brandId" defaultValue={p.brandId ?? ""} className={girdi}>
                  <option value="">—</option>
                  {markalar.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </Alan>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Alan etiket="Ana kategori">
                <select name="categoryId" defaultValue={p.categoryId} className={girdi} required>
                  {anaKat.map((c) => (
                    <option key={c.id} value={c.id}>{dilAdi(c.texts, lang, c.id)}</option>
                  ))}
                </select>
              </Alan>
              <Alan etiket="Alt kategori" ipucu="isteğe bağlı">
                <select name="subId" defaultValue={p.subId ?? ""} className={girdi}>
                  <option value="">—</option>
                  {altKat.map((c) => (
                    <option key={c.id} value={c.id}>{dilAdi(c.texts, lang, c.id)}</option>
                  ))}
                </select>
              </Alan>
            </div>

            <Alan etiket="Tedarikçi" ipucu="isteğe bağlı">
              <select name="supplierId" defaultValue={p.supplierId ?? ""} className={girdi}>
                <option value="">—</option>
                {tedarikciler.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Alan>
          </Kutu>

          {p.images.length > 0 && (
            <Kutu className="p-4">
              <h2 className="text-[14px] font-extrabold text-navy-900">Görseller</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.images.map((im, n) => (
                  <span
                    key={n}
                    className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[8px] border border-steel-200 bg-steel-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt="" className="h-full w-full object-contain" />
                  </span>
                ))}
              </div>
            </Kutu>
          )}

          <Kutu className="p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Son stok hareketleri</h2>
            {hareketler.length === 0 ? (
              <p className="mt-2 text-[13px] text-steel-600">Kayıt yok.</p>
            ) : (
              <div className="mt-3">
                <Tablo>
                  <thead>
                    <tr>
                      <Th>Tarih</Th>
                      <Th w="90px" orta>Değişim</Th>
                      <Th w="90px" orta>Sonuç</Th>
                      <Th>Sebep</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {hareketler.map((h) => (
                      <tr key={h.id}>
                        <Td className="text-[12.2px] text-steel-600">{tarihSaat(h.createdAt)}</Td>
                        <Td orta>
                          <span className={"font-bold tabular-nums " + (h.delta >= 0 ? "text-ok" : "text-danger")}>
                            {h.delta > 0 ? "+" : ""}{h.delta}
                          </span>
                        </Td>
                        <Td orta className="tabular-nums">{h.after}</Td>
                        <Td className="text-[12.2px] text-steel-600">{h.reason}{h.note ? ` · ${h.note}` : ""}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Tablo>
              </div>
            )}
          </Kutu>
        </div>

        {/* ---- sağ: fiyat / stok / durum ---- */}
        <div className="space-y-4">
          <Kutu className="space-y-3.5 p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Fiyat ve maliyet</h2>
            <Alan etiket="Satış fiyatı" ipucu="€, KDV hariç">
              <input name="fiyat" defaultValue={(p.priceCents / 100).toFixed(2)} className={girdi} inputMode="decimal" />
            </Alan>
            <Alan etiket="Alış maliyeti" ipucu="€">
              <input name="maliyet" defaultValue={(p.costCents / 100).toFixed(2)} className={girdi} inputMode="decimal" />
            </Alan>
            <div className="rounded-[8px] bg-steel-50 px-3 py-2 text-[12.4px]">
              Kâr: <b className={kar >= 0 ? "text-ok" : "text-danger"}>{para(kar)}</b>
              <span className="px-1.5 text-steel-400">·</span>
              Marj: <b>{marj.toFixed(1).replace(".", ",")}%</b>
            </div>

            <label className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
              <input type="checkbox" name="kampanyaAcik" value="1" defaultChecked={p.campaignOn} className="h-4 w-4 accent-navy-600" />
              Kampanya uygula
            </label>
            <Alan etiket="Kampanya indirimi" ipucu="%">
              <input name="kampanyaYuzde" defaultValue={p.campaignPercent} className={girdi} inputMode="numeric" />
            </Alan>
          </Kutu>

          <Kutu className="space-y-3.5 p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Stok</h2>
            <div className="grid grid-cols-2 gap-3">
              <Alan etiket="Adet">
                <input name="stok" defaultValue={p.stock} className={girdi} inputMode="numeric" />
              </Alan>
              <Alan etiket="Uyarı eşiği">
                <input name="esik" defaultValue={p.threshold} className={girdi} inputMode="numeric" />
              </Alan>
            </div>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
              <input type="checkbox" name="talepUzerine" value="1" defaultChecked={p.onRequest} className="h-4 w-4 accent-navy-600" />
              Sipariş üzerine (stok takibi yok)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Alan etiket="Teslim" ipucu="gün">
                <input name="teslim" defaultValue={p.leadDays} className={girdi} inputMode="numeric" />
              </Alan>
              <Alan etiket="Garanti" ipucu="ay">
                <input name="garanti" defaultValue={p.warranty} className={girdi} inputMode="numeric" />
              </Alan>
            </div>
            <p className="text-[12px] text-steel-600">Toplam satış: <b>{sayi(p.sold)}</b> adet</p>
          </Kutu>

          <Kutu className="space-y-3 p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Yayın durumu</h2>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
              <input type="checkbox" name="yayinda" value="1" defaultChecked={!p.hidden} className="h-4 w-4 accent-navy-600" />
              Mağazada yayında
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
              <input type="checkbox" name="oneCikan" value="1" defaultChecked={p.featured} className="h-4 w-4 accent-navy-600" />
              Öne çıkan ürün
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Rozet ton={p.hidden ? "gri" : "ok"}>{p.hidden ? "Gizli" : "Yayında"}</Rozet>
              {p.featured && <Rozet ton="gold">Öne çıkan</Rozet>}
              {p.campaignOn && <Rozet ton="danger">Kampanya</Rozet>}
            </div>
          </Kutu>

          <button type="submit" className={DUGME.ana + " w-full justify-center py-2.5"}>
            Değişiklikleri kaydet
          </button>
        </div>
      </form>

      {/* silme — ayrı form (iç içe form olmaz) */}
      <form action={urunSil} className="mt-4">
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="geri" value={kok} />
        <button type="submit" className={DUGME.tehlike}>
          Bu ürünü sil
        </button>
      </form>
    </Sayfa>
  );
}
