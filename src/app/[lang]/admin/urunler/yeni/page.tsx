import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { dilAdi } from "@/lib/admin-ui";
import { urunEkle } from "@/app/actions/admin-urun";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { DUGME, Kutu, Sayfa } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.8px] outline-none focus:border-navy-500";

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

export default async function YeniUrun({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Yeni ürün" />;

  const kok = `/${lang}/admin/urunler`;

  let kategoriler, markalar;
  try {
    [kategoriler, markalar] = await Promise.all([
      db.category.findMany({
        orderBy: { sort: "asc" },
        select: {
          id: true, parentId: true,
          texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
        },
      }),
      db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Yeni ürün" hata={String(e)} />;
  }

  const anaKat = kategoriler.filter((c) => !c.parentId);
  const altKat = kategoriler.filter((c) => c.parentId);

  return (
    <Sayfa
      baslik="Yeni ürün ekle"
      ozet="Zorunlu alanlar: ürün adı, stok kodu ve kategori."
      eylem={<Link href={kok} className={DUGME.sade}>← Listeye dön</Link>}
    >
      <form action={urunEkle} className="max-w-[760px] space-y-4">
        <input type="hidden" name="lang" value={lang} />

        <Kutu className="space-y-3.5 p-4">
          <Alan etiket={`Ürün adı (${lang.toUpperCase()})`}>
            <input name="ad" maxLength={300} className={girdi} required autoFocus />
          </Alan>

          <div className="grid gap-3 sm:grid-cols-2">
            <Alan etiket="Stok kodu (SKU)" ipucu="benzersiz">
              <input name="sku" maxLength={60} className={girdi} required />
            </Alan>
            <Alan etiket="Marka">
              <select name="brandId" defaultValue="" className={girdi}>
                <option value="">—</option>
                {markalar.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Alan>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Alan etiket="Ana kategori">
              <select name="categoryId" defaultValue="" className={girdi} required>
                <option value="" disabled>Seçin…</option>
                {anaKat.map((c) => (
                  <option key={c.id} value={c.id}>{dilAdi(c.texts, lang, c.id)}</option>
                ))}
              </select>
            </Alan>
            <Alan etiket="Alt kategori" ipucu="isteğe bağlı">
              <select name="subId" defaultValue="" className={girdi}>
                <option value="">—</option>
                {altKat.map((c) => (
                  <option key={c.id} value={c.id}>{dilAdi(c.texts, lang, c.id)}</option>
                ))}
              </select>
            </Alan>
          </div>
        </Kutu>

        <Kutu className="grid gap-3 p-4 sm:grid-cols-3">
          <Alan etiket="Satış fiyatı" ipucu="€">
            <input name="fiyat" defaultValue="0" className={girdi} inputMode="decimal" />
          </Alan>
          <Alan etiket="Alış maliyeti" ipucu="€">
            <input name="maliyet" defaultValue="0" className={girdi} inputMode="decimal" />
          </Alan>
          <Alan etiket="Başlangıç stoğu">
            <input name="stok" defaultValue="0" className={girdi} inputMode="numeric" />
          </Alan>
        </Kutu>

        <Kutu className="p-4">
          <label className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
            <input type="checkbox" name="yayinda" value="1" defaultChecked className="h-4 w-4 accent-navy-600" />
            Kaydettikten sonra mağazada yayında olsun
          </label>
        </Kutu>

        <div className="flex gap-2">
          <button type="submit" className={DUGME.ana}>Ürünü oluştur</button>
          <Link href={kok} className={DUGME.sade}>Vazgeç</Link>
        </div>
      </form>
    </Sayfa>
  );
}
