import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { CIRO_DURUMLARI, ODEME, SIPARIS_DURUM, para, sayi, tarih, tarihSaat } from "@/lib/admin-ui";
import { musteriKaydet, musteriSil } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import { Bos, DUGME, Kart, Kutu, Rozet, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

const Alan = ({ etiket, children }: { etiket: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-[12px] font-bold text-navy-900">{etiket}</span>
    <span className="mt-1 block">{children}</span>
  </label>
);

export default async function MusteriDetay({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Müşteri" />;

  const kok = `/${lang}/admin/musteriler`;

  let m;
  try {
    m = await db.customer.findUnique({
      where: { id },
      include: { orders: { orderBy: { createdAt: "desc" }, take: 50 } },
    });
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Müşteri" hata={gizliTemizle(e)} />;
  }
  if (!m) notFound();

  const gecerli = m.orders.filter((o) => CIRO_DURUMLARI.includes(o.status));
  const ciro = gecerli.reduce((t, o) => t + o.totalCents, 0);
  const ortalama = gecerli.length ? Math.round(ciro / gecerli.length) : 0;
  const sonSiparis = m.orders[0]?.createdAt ?? null;

  return (
    <Sayfa
      baslik={m.name}
      ozet={
        <span className="flex flex-wrap items-center gap-2">
          <Rozet ton={m.type === "business" ? "navy" : "gri"}>
            {m.type === "business" ? "Kurumsal" : "Bireysel"}
          </Rozet>
          {m.company && <span>{m.company}</span>}
          <span className="text-steel-400">·</span>
          <span>Kayıt: {tarih(m.createdAt)}</span>
        </span>
      }
      eylem={<Link href={kok} className={DUGME.sade}>← Müşteriler</Link>}
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <Kart etiket="Toplam ciro" deger={para(ciro, false)} renk="ok" />
        <Kart etiket="Sipariş" deger={sayi(gecerli.length)} />
        <Kart etiket="Ortalama sepet" deger={para(ortalama, false)} />
        <Kart etiket="Son sipariş" deger={sonSiparis ? tarih(sonSiparis) : "—"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        {/* ---- siparişler ---- */}
        <div className="min-w-0">
          <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Siparişleri</h2>
          {m.orders.length === 0 ? (
            <Bos metin="Bu müşterinin siparişi yok." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th w="140px">Sipariş no</Th>
                  <Th w="130px" orta>Durum</Th>
                  <Th w="110px" orta>Ödeme</Th>
                  <Th w="130px" sag>Tutar</Th>
                  <Th w="130px" sag>Tarih</Th>
                </tr>
              </thead>
              <tbody>
                {m.orders.map((o) => {
                  const d = SIPARIS_DURUM[o.status] ?? SIPARIS_DURUM.new;
                  return (
                    <tr key={o.id} className="hover:bg-steel-50">
                      <Td>
                        <Link
                          href={`/${lang}/admin/siparisler/${o.id}`}
                          className="font-mono font-bold text-navy-600 hover:text-gold"
                        >
                          {o.number}
                        </Link>
                      </Td>
                      <Td orta><Rozet ton={d.ton}>{d.ad}</Rozet></Td>
                      <Td orta className="text-[12.4px] text-steel-700">{ODEME[o.payMethod] ?? o.payMethod}</Td>
                      <Td sag className="font-bold tabular-nums">{para(o.totalCents)}</Td>
                      <Td sag className="text-[12.2px] text-steel-500">{tarihSaat(o.createdAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tablo>
          )}
        </div>

        {/* ---- düzenleme ---- */}
        <div className="space-y-4">
          <Kutu className="p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Müşteri bilgileri</h2>
            <form action={musteriKaydet} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={m.id} />

              <Alan etiket="Ad soyad / Firma">
                <input name="ad" defaultValue={m.name} className={girdi} required />
              </Alan>
              <Alan etiket="Firma">
                <input name="firma" defaultValue={m.company ?? ""} className={girdi} />
              </Alan>
              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="E-posta">
                  <input name="eposta" type="email" defaultValue={m.email ?? ""} className={girdi} />
                </Alan>
                <Alan etiket="Telefon">
                  <input name="telefon" defaultValue={m.phone ?? ""} className={girdi} />
                </Alan>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="Org.nr">
                  <input name="orgNr" defaultValue={m.orgNr ?? ""} className={girdi} />
                </Alan>
                <Alan etiket="VAT no">
                  <input name="vatNr" defaultValue={m.vatNr ?? ""} className={girdi} />
                </Alan>
              </div>
              <Alan etiket="Adres">
                <input name="adres" defaultValue={m.address ?? ""} className={girdi} />
              </Alan>
              <div className="grid grid-cols-3 gap-3">
                <Alan etiket="Posta k.">
                  <input name="posta" defaultValue={m.zip ?? ""} className={girdi} />
                </Alan>
                <Alan etiket="Şehir">
                  <input name="sehir" defaultValue={m.city ?? ""} className={girdi} />
                </Alan>
                <Alan etiket="Ülke">
                  <input name="ulke" defaultValue={m.country} maxLength={4} className={girdi} />
                </Alan>
              </div>
              <Alan etiket="Tür">
                <select name="tur" defaultValue={m.type} className={girdi}>
                  <option value="business">Kurumsal</option>
                  <option value="retail">Bireysel</option>
                </select>
              </Alan>
              <Alan etiket="Not">
                <textarea name="not" defaultValue={m.notes ?? ""} rows={3} className={girdi + " resize-y"} />
              </Alan>

              <button type="submit" className={DUGME.ana + " w-full justify-center"}>Kaydet</button>
            </form>
          </Kutu>

          <form action={musteriSil}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="geri" value={kok} />
            <button type="submit" className={DUGME.tehlike + " w-full justify-center"}>
              Müşteriyi sil
            </button>
            <p className="mt-1.5 text-[11.6px] text-steel-500">
              Siparişleri müşterisiz kalır, silinmez.
            </p>
          </form>
        </div>
      </div>
    </Sayfa>
  );
}
