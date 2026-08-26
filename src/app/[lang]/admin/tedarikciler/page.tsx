import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { sayi } from "@/lib/admin-ui";
import { tedarikciKaydet, tedarikciSil } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import { AramaCubugu, Bos, DUGME, Kutu, Rozet, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

const Alan = ({ etiket, children }: { etiket: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-[12px] font-bold text-navy-900">{etiket}</span>
    <span className="mt-1 block">{children}</span>
  </label>
);

export default async function Tedarikciler({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; d?: string }>;
}) {
  const { lang } = await params;
  const { q: qq, d } = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Tedarikçiler" />;

  const kok = `/${lang}/admin/tedarikciler`;
  const q = (qq ?? "").trim();

  let liste, urunSayilari;
  try {
    [liste, urunSayilari] = await Promise.all([
      db.supplier.findMany({
        where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { contact: { contains: q } }] } : {},
        orderBy: [{ active: "desc" }, { name: "asc" }],
        take: 200,
      }),
      db.product.groupBy({ by: ["supplierId"], _count: { _all: true } }),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Tedarikçiler" hata={gizliTemizle(e)} />;
  }

  const say = new Map(urunSayilari.map((x) => [x.supplierId ?? "", x._count._all]));
  const duzenlenen = d ? liste.find((t) => t.id === d) : null;

  return (
    <Sayfa
      baslik="Tedarikçiler"
      ozet={`${sayi(liste.length)} kayıt`}
      eylem={
        <a href={`/api/admin/disa-aktar?tip=tedarikciler&lang=${lang}`} className={DUGME.sade}>
          Dışa aktar (CSV)
        </a>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <AramaCubugu eylem={kok} q={q} yerTutucu="Firma, yetkili veya e-posta…" />

          <div className="mt-4">
            {liste.length === 0 ? (
              <Bos metin="Tedarikçi kaydı yok. Sağdaki formdan ekleyebilirsiniz." />
            ) : (
              <Tablo>
                <thead>
                  <tr>
                    <Th>Firma</Th>
                    <Th w="180px">Yetkili / İletişim</Th>
                    <Th w="90px" orta>Ürün</Th>
                    <Th w="90px" orta>Teslim</Th>
                    <Th w="100px" orta>Durum</Th>
                    <Th w="90px" sag>İşlem</Th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((t) => (
                    <tr key={t.id} className="hover:bg-steel-50">
                      <Td>
                        <div className="font-semibold text-navy-900">{t.name}</div>
                        <div className="text-[11.8px] text-steel-500">
                          {t.country}
                          {t.address ? ` · ${t.address}` : ""}
                        </div>
                      </Td>
                      <Td className="text-[12.4px] text-steel-700">
                        {t.contact && <div>{t.contact}</div>}
                        {t.email && (
                          <a href={`mailto:${t.email}`} className="text-navy-600 hover:text-gold">{t.email}</a>
                        )}
                        {t.phone && <div className="text-steel-500">{t.phone}</div>}
                      </Td>
                      <Td orta className="tabular-nums font-semibold">{sayi(say.get(t.id) ?? 0)}</Td>
                      <Td orta className="tabular-nums text-steel-600">{t.leadDays} gün</Td>
                      <Td orta>
                        <Rozet ton={t.active ? "ok" : "gri"}>{t.active ? "Aktif" : "Pasif"}</Rozet>
                      </Td>
                      <Td sag>
                        <Link href={`${kok}?d=${t.id}`} className="text-[12.4px] font-bold text-navy-600 hover:text-gold">
                          Düzenle
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tablo>
            )}
          </div>
        </div>

        <div>
          <Kutu className="space-y-3.5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-navy-900">
                {duzenlenen ? "Tedarikçiyi düzenle" : "Yeni tedarikçi"}
              </h2>
              {duzenlenen && (
                <Link href={kok} className="text-[12px] font-bold text-steel-500 hover:text-gold">Vazgeç</Link>
              )}
            </div>

            <form action={tedarikciKaydet} className="space-y-3">
              {duzenlenen && <input type="hidden" name="id" value={duzenlenen.id} />}

              <Alan etiket="Firma adı">
                <input name="ad" defaultValue={duzenlenen?.name ?? ""} maxLength={150} className={girdi} required />
              </Alan>
              <Alan etiket="Yetkili kişi">
                <input name="yetkili" defaultValue={duzenlenen?.contact ?? ""} maxLength={120} className={girdi} />
              </Alan>
              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="E-posta">
                  <input name="eposta" type="email" defaultValue={duzenlenen?.email ?? ""} className={girdi} />
                </Alan>
                <Alan etiket="Telefon">
                  <input name="telefon" defaultValue={duzenlenen?.phone ?? ""} className={girdi} />
                </Alan>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="Ülke">
                  <input name="ulke" defaultValue={duzenlenen?.country ?? "SE"} maxLength={4} className={girdi} />
                </Alan>
                <Alan etiket="Teslim (gün)">
                  <input name="teslim" defaultValue={duzenlenen?.leadDays ?? 14} className={girdi} inputMode="numeric" />
                </Alan>
              </div>
              <Alan etiket="Adres">
                <input name="adres" defaultValue={duzenlenen?.address ?? ""} maxLength={300} className={girdi} />
              </Alan>
              <Alan etiket="Not">
                <textarea name="not" defaultValue={duzenlenen?.notes ?? ""} rows={3} className={girdi + " resize-y"} />
              </Alan>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
                <input type="checkbox" name="aktif" value="1" defaultChecked={duzenlenen?.active ?? true} className="h-4 w-4 accent-navy-600" />
                Aktif tedarikçi
              </label>

              <button type="submit" className={DUGME.ana + " w-full justify-center"}>
                {duzenlenen ? "Kaydet" : "Tedarikçi ekle"}
              </button>
            </form>

            {duzenlenen && (
              <form action={tedarikciSil} className="border-t border-steel-200 pt-3">
                <input type="hidden" name="id" value={duzenlenen.id} />
                <button type="submit" className={DUGME.tehlike + " w-full justify-center"}>Sil</button>
              </form>
            )}
          </Kutu>
        </div>
      </div>
    </Sayfa>
  );
}
