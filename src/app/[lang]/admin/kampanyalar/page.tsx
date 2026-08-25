import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { para, sayi, tarih, dilAdi} from "@/lib/admin-ui";
import { kuponKaydet, kuponSil } from "@/app/actions/admin-genel";
import { topluIslem } from "@/app/actions/admin-urun";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
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

function isoGun(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function Kampanyalar({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { lang } = await params;
  const { d } = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Kampanyalar ve Kuponlar" />;

  const kok = `/${lang}/admin/kampanyalar`;

  let kuponlar, kampanyaliUrunler, kampanyaSayisi;
  try {
    [kuponlar, kampanyaliUrunler, kampanyaSayisi] = await Promise.all([
      db.coupon.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }], take: 200 }),
      db.product.findMany({
        where: { campaignOn: true },
        orderBy: { campaignPercent: "desc" },
        take: 50,
        select: {
          id: true, sku: true, priceCents: true, campaignPercent: true,
          texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
        },
      }),
      db.product.count({ where: { campaignOn: true } }),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Kampanyalar ve Kuponlar" hata={String(e)} />;
  }

  const duzenlenen = d ? kuponlar.find((k) => k.id === d) : null;
  const aktifKupon = kuponlar.filter((k) => k.active).length;
  const simdi = new Date();

  return (
    <Sayfa
      baslik="Kampanyalar ve Kuponlar"
      ozet={`${sayi(aktifKupon)} aktif kupon · ${sayi(kampanyaSayisi)} kampanyalı ürün`}
      eylem={
        <a href={`/api/admin/disa-aktar?tip=kuponlar&lang=${lang}`} className={DUGME.sade}>
          Dışa aktar (CSV)
        </a>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Kart etiket="Aktif kupon" deger={sayi(aktifKupon)} renk="ok" />
        <Kart etiket="Toplam kupon" deger={sayi(kuponlar.length)} />
        <Kart etiket="Kampanyalı ürün" deger={sayi(kampanyaSayisi)} renk="gold" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* ---- kuponlar ---- */}
          <div>
            <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Kuponlar</h2>
            {kuponlar.length === 0 ? (
              <Bos metin="Kupon yok. Sağdaki formdan oluşturabilirsiniz." />
            ) : (
              <Tablo>
                <thead>
                  <tr>
                    <Th w="140px">Kod</Th>
                    <Th w="120px" sag>İndirim</Th>
                    <Th w="120px" sag>Alt sınır</Th>
                    <Th w="130px" orta>Geçerlilik</Th>
                    <Th w="110px" orta>Kullanım</Th>
                    <Th w="90px" orta>Durum</Th>
                    <Th w="80px" sag>İşlem</Th>
                  </tr>
                </thead>
                <tbody>
                  {kuponlar.map((k) => {
                    const suresiGecti = k.endsAt ? k.endsAt < simdi : false;
                    const doldu = k.usageLimit > 0 && k.usedCount >= k.usageLimit;
                    return (
                      <tr key={k.id} className="hover:bg-steel-50">
                        <Td><span className="font-mono font-bold text-navy-900">{k.code}</span></Td>
                        <Td sag className="font-semibold tabular-nums">
                          {k.kind === "percent" ? `%${k.value}` : para(k.value)}
                        </Td>
                        <Td sag className="tabular-nums text-steel-700">
                          {k.minTotalCents ? para(k.minTotalCents) : "—"}
                        </Td>
                        <Td orta className="text-[12px] text-steel-600">
                          {k.startsAt || k.endsAt ? (
                            <>{tarih(k.startsAt)} → {tarih(k.endsAt)}</>
                          ) : "süresiz"}
                        </Td>
                        <Td orta className="tabular-nums text-steel-700">
                          {k.usedCount}{k.usageLimit > 0 ? ` / ${k.usageLimit}` : ""}
                        </Td>
                        <Td orta>
                          <Rozet ton={!k.active ? "gri" : suresiGecti || doldu ? "danger" : "ok"}>
                            {!k.active ? "Pasif" : suresiGecti ? "Süresi doldu" : doldu ? "Limit doldu" : "Aktif"}
                          </Rozet>
                        </Td>
                        <Td sag>
                          <Link href={`${kok}?d=${k.id}`} className="text-[12.4px] font-bold text-navy-600 hover:text-gold">
                            Düzenle
                          </Link>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tablo>
            )}
          </div>

          {/* ---- kampanyalı ürünler ---- */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-navy-900">Kampanyalı ürünler</h2>
              <Link href={`/${lang}/admin/urunler?d=kampanya`} className="text-[12.4px] font-bold text-navy-600 hover:text-gold">
                Ürünlerde gör →
              </Link>
            </div>
            {kampanyaliUrunler.length === 0 ? (
              <Bos metin="Kampanyalı ürün yok. Ürün düzenleme ekranından kampanya açabilirsiniz." />
            ) : (
              <form action={topluIslem}>
                <input type="hidden" name="islem" value="oneCikarma" />
                <Tablo>
                  <thead>
                    <tr>
                      <Th>Ürün</Th>
                      <Th w="120px" sag>Liste fiyatı</Th>
                      <Th w="90px" orta>İndirim</Th>
                      <Th w="130px" sag>Kampanyalı</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {kampanyaliUrunler.map((p) => (
                      <tr key={p.id} className="hover:bg-steel-50">
                        <Td>
                          <Link href={`/${lang}/admin/urunler/${p.id}`} className="font-semibold text-navy-900 hover:text-gold">
                            {dilAdi(p.texts, lang, p.sku)}
                          </Link>
                          <div className="font-mono text-[11.4px] text-steel-500">{p.sku}</div>
                        </Td>
                        <Td sag className="tabular-nums text-steel-600 line-through">{para(p.priceCents)}</Td>
                        <Td orta><Rozet ton="danger">−%{p.campaignPercent}</Rozet></Td>
                        <Td sag className="font-bold tabular-nums text-ok">
                          {para(Math.round(p.priceCents * (1 - p.campaignPercent / 100)))}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Tablo>
              </form>
            )}
          </div>
        </div>

        {/* ---- kupon formu ---- */}
        <div>
          <Kutu className="space-y-3.5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-navy-900">
                {duzenlenen ? "Kuponu düzenle" : "Yeni kupon"}
              </h2>
              {duzenlenen && (
                <Link href={kok} className="text-[12px] font-bold text-steel-500 hover:text-gold">Vazgeç</Link>
              )}
            </div>

            <form action={kuponKaydet} className="space-y-3">
              {duzenlenen && <input type="hidden" name="id" value={duzenlenen.id} />}

              <Alan etiket="Kupon kodu">
                <input
                  name="kod"
                  defaultValue={duzenlenen?.code ?? ""}
                  placeholder="YAZ2026"
                  maxLength={40}
                  className={girdi + " font-mono uppercase"}
                  required
                />
              </Alan>

              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="Tür">
                  <select name="tur" defaultValue={duzenlenen?.kind ?? "percent"} className={girdi}>
                    <option value="percent">Yüzde (%)</option>
                    <option value="amount">Tutar (€)</option>
                  </select>
                </Alan>
                <Alan etiket="Değer">
                  <input
                    name="deger"
                    defaultValue={
                      duzenlenen
                        ? duzenlenen.kind === "percent"
                          ? String(duzenlenen.value)
                          : (duzenlenen.value / 100).toFixed(2)
                        : ""
                    }
                    className={girdi}
                    inputMode="decimal"
                  />
                </Alan>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="Alt sınır (€)">
                  <input
                    name="altSinir"
                    defaultValue={duzenlenen ? (duzenlenen.minTotalCents / 100).toFixed(2) : "0"}
                    className={girdi}
                    inputMode="decimal"
                  />
                </Alan>
                <Alan etiket="Kullanım limiti">
                  <input
                    name="limit"
                    defaultValue={duzenlenen?.usageLimit ?? 0}
                    className={girdi}
                    inputMode="numeric"
                  />
                </Alan>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="Başlangıç">
                  <input type="date" name="baslangic" defaultValue={isoGun(duzenlenen?.startsAt ?? null)} className={girdi} />
                </Alan>
                <Alan etiket="Bitiş">
                  <input type="date" name="bitis" defaultValue={isoGun(duzenlenen?.endsAt ?? null)} className={girdi} />
                </Alan>
              </div>

              <Alan etiket="Not">
                <input name="not" defaultValue={duzenlenen?.note ?? ""} maxLength={300} className={girdi} />
              </Alan>

              <label className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
                <input type="checkbox" name="aktif" value="1" defaultChecked={duzenlenen?.active ?? true} className="h-4 w-4 accent-navy-600" />
                Kupon aktif
              </label>

              <button type="submit" className={DUGME.ana + " w-full justify-center"}>
                {duzenlenen ? "Kaydet" : "Kupon oluştur"}
              </button>
            </form>

            {duzenlenen && (
              <form action={kuponSil} className="border-t border-steel-200 pt-3">
                <input type="hidden" name="id" value={duzenlenen.id} />
                <button type="submit" className={DUGME.tehlike + " w-full justify-center"}>Kuponu sil</button>
              </form>
            )}
          </Kutu>

          <Kutu className="mt-3 p-4">
            <h3 className="text-[13px] font-extrabold text-navy-900">Toplu kampanya</h3>
            <p className="mt-1.5 text-[12.4px] leading-relaxed text-steel-700">
              Bir kategorinin tüm ürünlerine indirim uygulamak için{" "}
              <Link href={`/${lang}/admin/urunler`} className="font-semibold text-navy-600 hover:text-gold">
                Ürünler
              </Link>{" "}
              ekranında kategoriyi seçip <b>“Fiyatı yüzde değiştir”</b> toplu işlemini kullanın.
            </p>
          </Kutu>
        </div>
      </div>
    </Sayfa>
  );
}
