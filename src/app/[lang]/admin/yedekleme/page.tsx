import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { sayi, tarihSaat } from "@/lib/admin-ui";
import { yedekAl, yedekSil } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { Bos, DUGME, Kart, Kutu, Rozet, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

const DISA = [
  { tip: "urunler", ad: "Ürünler", not: "Tüm ürünler, fiyat, stok, kategori" },
  { tip: "kategoriler", ad: "Kategoriler", not: "Kategori ağacı ve ürün sayıları" },
  { tip: "siparisler", ad: "Siparişler", not: "Sipariş başlıkları ve tutarlar" },
  { tip: "musteriler", ad: "Müşteriler", not: "İletişim ve fatura bilgileri" },
  { tip: "tedarikciler", ad: "Tedarikçiler", not: "Firma ve iletişim" },
  { tip: "gelirgider", ad: "Gelir-Gider", not: "Muhasebe kalemleri" },
  { tip: "stok", ad: "Stok", not: "Güncel stok ve maliyet" },
  { tip: "kuponlar", ad: "Kuponlar", not: "Kupon tanımları" },
  { tip: "loglar", ad: "Sistem logları", not: "İşlem geçmişi" },
];

export default async function Yedekleme({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Yedekleme" />;

  let yedekler, sayimlar;
  try {
    [yedekler, sayimlar] = await Promise.all([
      db.backup.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      (async () => {
        const [urun, kategori, siparis, musteri, kalem, log] = await Promise.all([
          db.product.count(), db.category.count(), db.order.count(),
          db.customer.count(), db.expense.count(), db.auditLog.count(),
        ]);
        return { urun, kategori, siparis, musteri, kalem, log };
      })(),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Yedekleme" hata={String(e)} />;
  }

  return (
    <Sayfa
      baslik="Yedekleme"
      ozet="Verileri CSV olarak indirin ve yedek kaydı tutun."
    >
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kart etiket="Ürün" deger={sayi(sayimlar.urun)} />
        <Kart etiket="Kategori" deger={sayi(sayimlar.kategori)} />
        <Kart etiket="Sipariş" deger={sayi(sayimlar.siparis)} />
        <Kart etiket="Müşteri" deger={sayi(sayimlar.musteri)} />
        <Kart etiket="Muhasebe" deger={sayi(sayimlar.kalem)} />
        <Kart etiket="Log" deger={sayi(sayimlar.log)} />
      </div>

      {/* --- dışa aktarma --- */}
      <div className="mt-5">
        <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Veri indir (CSV)</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {DISA.map((d) => (
            <Kutu key={d.tip} className="flex items-center justify-between gap-3 p-3.5">
              <span className="min-w-0">
                <span className="block text-[13.4px] font-bold text-navy-900">{d.ad}</span>
                <span className="block text-[11.8px] text-steel-600">{d.not}</span>
              </span>
              <a
                href={`/api/admin/disa-aktar?tip=${d.tip}&lang=${lang}`}
                className={DUGME.sade + " shrink-0"}
              >
                İndir
              </a>
            </Kutu>
          ))}
        </div>
        <p className="mt-2 text-[12.2px] text-steel-600">
          Dosyalar noktalı virgülle ayrılmış ve BOM’ludur — Excel’de Türkçe karakterler doğru açılır.
        </p>
      </div>

      {/* --- yedek kaydı --- */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Yedek kayıtları</h2>
          {yedekler.length === 0 ? (
            <Bos metin="Henüz yedek kaydı yok. Sağdaki formdan oluşturabilirsiniz." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th>Etiket</Th>
                  <Th w="100px" orta>Tür</Th>
                  <Th w="90px" orta>Ürün</Th>
                  <Th w="90px" orta>Sipariş</Th>
                  <Th w="160px">Tarih</Th>
                  <Th w="70px" sag>İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {yedekler.map((y) => (
                  <tr key={y.id} className="hover:bg-steel-50">
                    <Td>
                      <div className="font-semibold text-navy-900">{y.label}</div>
                      {y.note && <div className="text-[11.8px] text-steel-500">{y.note}</div>}
                    </Td>
                    <Td orta><Rozet ton={y.kind === "tam" ? "navy" : "gri"}>{y.kind}</Rozet></Td>
                    <Td orta className="tabular-nums">{sayi(y.products)}</Td>
                    <Td orta className="tabular-nums">{sayi(y.orders)}</Td>
                    <Td className="text-[12.2px] text-steel-600">{tarihSaat(y.createdAt)}</Td>
                    <Td sag>
                      <form action={yedekSil}>
                        <input type="hidden" name="id" value={y.id} />
                        <button type="submit" className="text-[12.2px] font-bold text-danger hover:underline">
                          Sil
                        </button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tablo>
          )}
        </div>

        <div>
          <Kutu className="space-y-3.5 p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Yedek kaydı oluştur</h2>
            <form action={yedekAl} className="space-y-3">
              <label className="block">
                <span className="block text-[12px] font-bold text-navy-900">Etiket</span>
                <input name="etiket" placeholder="Aylık yedek — Ağustos" maxLength={120} className={girdi + " mt-1"} />
              </label>
              <label className="block">
                <span className="block text-[12px] font-bold text-navy-900">Tür</span>
                <select name="tur" defaultValue="katalog" className={girdi + " mt-1"}>
                  <option value="katalog">Katalog</option>
                  <option value="tam">Tam</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-[12px] font-bold text-navy-900">Not</span>
                <textarea name="not" rows={2} maxLength={300} className={girdi + " mt-1 resize-y"} />
              </label>
              <button type="submit" className={DUGME.ana + " w-full justify-center"}>
                Kaydı oluştur
              </button>
            </form>
            <p className="text-[11.8px] leading-relaxed text-steel-500">
              Bu kayıt, o andaki veri sayılarını not eder. Asıl veriyi indirmek için yukarıdaki
              CSV bağlantılarını kullanın.
            </p>
          </Kutu>

          <Kutu className="mt-3 p-4">
            <h3 className="text-[13px] font-extrabold text-navy-900">Veritabanı yedeği</h3>
            <p className="mt-1.5 text-[12.4px] leading-relaxed text-steel-700">
              Tam veritabanı yedeği sağlayıcı tarafında alınır. PostgreSQL kullanılıyorsa
              Neon/Supabase panelinden otomatik yedek açık olmalıdır. Geliştirmede tüm veri{" "}
              <code className="rounded bg-steel-100 px-1 font-mono text-[11.6px]">dev.db</code>{" "}
              dosyasındadır; bu dosyayı kopyalamak yedek almaya yeter.
            </p>
          </Kutu>
        </div>
      </div>
    </Sayfa>
  );
}
