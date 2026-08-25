import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { CIRO_DURUMLARI, para, sayi } from "@/lib/admin-ui";
import { DONEMLER, donemlereBol, genelToplam, donemBaslangici, type DonemTuru } from "@/lib/rapor";
import { ODEME_ADI } from "@/lib/makbuz";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import YazdirDugmesi from "@/components/YazdirDugmesi";
import { Bos, DUGME, Kart, Kutu, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

/** Tüm veriyi tek yerde toplar — JSX try/catch dışında kalsın diye ayrıldı. */
async function yukle(tur: DonemTuru, adet: number) {
  const bas = donemBaslangici(tur, adet);

  const [siparisler, acikFatura, yontemler] = await Promise.all([
    db.order.findMany({
      where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: bas } },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true, totalCents: true, subtotalCents: true,
        vatCents: true, shipCents: true, costCents: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.aggregate({
      _sum: { totalCents: true }, _count: true,
      where: { status: "new", payMethod: "invoice" },
    }),
    db.order.groupBy({
      by: ["paidMethod"],
      where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: bas } },
      _sum: { totalCents: true },
      _count: true,
    }),
  ]);

  const satirlar = donemlereBol(
    siparisler.map((o) => ({ ...o, _kalem: o._count.items })),
    tur,
  );

  return {
    satirlar,
    toplam: genelToplam(satirlar),
    acikFaturaTutar: acikFatura._sum.totalCents ?? 0,
    acikFaturaAdet: acikFatura._count,
    yontemler: yontemler.sort((a, b) => (b._sum.totalCents ?? 0) - (a._sum.totalCents ?? 0)),
  };
}

export default async function MuhasebeRaporlari({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Muhasebe Raporları" />;

  const kok = `/${lang}/admin/muhasebe-raporlari`;
  const secili = (DONEMLER.find((d) => d.kod === sp.d) ?? DONEMLER[2]);

  let v: Awaited<ReturnType<typeof yukle>> | null = null;
  let hata = "";
  try {
    v = await yukle(secili.kod, secili.adet);
  } catch (e) {
    hata = String(e);
  }
  if (!v) return <VeritabaniGerekli lang={lang} sayfa="Muhasebe Raporları" hata={hata} />;

  const t = v.toplam;

  return (
    <Sayfa
      baslik="Muhasebe Raporları"
      ozet={`${secili.ad} döküm · son ${secili.adet} dönem · tahsil edilmiş siparişler`}
      eylem={
        <>
          <YazdirDugmesi
            etiket="Yazdır"
            sinif="cursor-pointer rounded-[8px] bg-gold px-3.5 py-2 text-[12.6px] font-bold text-navy-950 transition hover:bg-gold-400"
          />
          <a href={`/api/admin/disa-aktar?tip=rapor&d=${secili.kod}&lang=${lang}`} className={DUGME.sade}>
            Dışa aktar (CSV)
          </a>
        </>
      }
    >
      {/* --- dönem seçimi --- */}
      <div className="yazdirma-gizle mb-4 flex flex-wrap gap-2">
        {DONEMLER.map((d) => (
          <Link
            key={d.kod}
            href={`${kok}?d=${d.kod}`}
            className={
              "rounded-[8px] border px-4 py-2 text-[13px] font-bold transition " +
              (d.kod === secili.kod
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-steel-300 text-navy-900 hover:border-gold hover:text-gold")
            }
          >
            {d.ad}
          </Link>
        ))}
      </div>

      {/* --- özet kartlar --- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Ciro (KDV dahil)" deger={para(t.ciroCents, false)} alt={`${sayi(t.siparis)} sipariş`} renk="navy" />
        <Kart etiket="KDV" deger={para(t.kdvCents, false)} alt="devlete ödenecek" renk="warn" />
        <Kart etiket="Kâr (KDV hariç)" deger={para(t.karCents, false)} renk={t.karCents >= 0 ? "ok" : "danger"} />
        <Kart
          etiket="Açık fatura"
          deger={para(v.acikFaturaTutar, false)}
          alt={`${sayi(v.acikFaturaAdet)} tahsil edilmemiş`}
          renk={v.acikFaturaAdet ? "warn" : "ok"}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Net satış (KDV hariç)" deger={para(t.netCents, false)} />
        <Kart etiket="Kargo geliri" deger={para(t.kargoCents, false)} />
        <Kart etiket="Ortalama sipariş" deger={para(t.ortalamaCents, false)} />
        <Kart etiket="Satılan kalem" deger={sayi(t.urunAdedi)} />
      </div>

      {/* --- ödeme yöntemi dağılımı --- */}
      {v.yontemler.length > 0 && (
        <Kutu className="mt-4 p-4">
          <h2 className="text-[14px] font-extrabold text-navy-900">Ödeme yöntemi dağılımı</h2>
          <div className="mt-2.5 space-y-1.5">
            {v.yontemler.map((y) => {
              const tutar = y._sum.totalCents ?? 0;
              const oran = t.ciroCents ? Math.round((tutar / t.ciroCents) * 100) : 0;
              return (
                <div key={y.paidMethod ?? "-"} className="flex items-center gap-3">
                  <span className="w-[150px] shrink-0 text-[12.8px] font-semibold text-navy-900">
                    {ODEME_ADI[y.paidMethod ?? ""] ?? y.paidMethod ?? "—"}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-steel-100">
                    <span className="block h-full rounded-full bg-navy-600" style={{ width: `${oran}%` }} />
                  </span>
                  <span className="w-[54px] shrink-0 text-right text-[12.4px] font-bold tabular-nums text-steel-700">
                    %{oran}
                  </span>
                  <span className="w-[110px] shrink-0 text-right text-[12.8px] font-bold tabular-nums text-navy-900">
                    {para(tutar)}
                  </span>
                  <span className="w-[70px] shrink-0 text-right text-[12px] tabular-nums text-steel-500">
                    {sayi(y._count)} adet
                  </span>
                </div>
              );
            })}
          </div>
        </Kutu>
      )}

      {/* --- dönem dökümü --- */}
      <h2 className="mt-5 mb-2 text-[15px] font-extrabold text-navy-900">{secili.ad} döküm</h2>
      {v.satirlar.length === 0 ? (
        <Bos metin="Bu dönemde tahsil edilmiş sipariş yok." />
      ) : (
        <Tablo>
          <thead>
            <tr>
              <Th>Dönem</Th>
              <Th w="90px" sag>Sipariş</Th>
              <Th w="80px" sag>Kalem</Th>
              <Th w="120px" sag>Net satış</Th>
              <Th w="110px" sag>Kargo</Th>
              <Th w="110px" sag>KDV</Th>
              <Th w="130px" sag>Ciro</Th>
              <Th w="120px" sag>Kâr</Th>
            </tr>
          </thead>
          <tbody>
            {v.satirlar.map((s) => (
              <tr key={s.anahtar} className="hover:bg-steel-50">
                <Td className="font-semibold text-navy-900">{s.baslik}</Td>
                <Td sag className="tabular-nums">{sayi(s.siparis)}</Td>
                <Td sag className="tabular-nums text-steel-600">{sayi(s.urunAdedi)}</Td>
                <Td sag className="tabular-nums">{para(s.netCents)}</Td>
                <Td sag className="tabular-nums text-steel-600">{para(s.kargoCents)}</Td>
                <Td sag className="tabular-nums text-warn">{para(s.kdvCents)}</Td>
                <Td sag className="font-bold tabular-nums">{para(s.ciroCents)}</Td>
                <Td sag className={"font-bold tabular-nums " + (s.karCents >= 0 ? "text-ok" : "text-danger")}>
                  {para(s.karCents)}
                </Td>
              </tr>
            ))}
            <tr className="border-t-2 border-navy-900 bg-steel-50">
              <Td className="font-extrabold text-navy-900">Toplam</Td>
              <Td sag className="font-bold tabular-nums">{sayi(t.siparis)}</Td>
              <Td sag className="font-bold tabular-nums">{sayi(t.urunAdedi)}</Td>
              <Td sag className="font-bold tabular-nums">{para(t.netCents)}</Td>
              <Td sag className="font-bold tabular-nums">{para(t.kargoCents)}</Td>
              <Td sag className="font-bold tabular-nums text-warn">{para(t.kdvCents)}</Td>
              <Td sag className="font-extrabold tabular-nums">{para(t.ciroCents)}</Td>
              <Td sag className={"font-extrabold tabular-nums " + (t.karCents >= 0 ? "text-ok" : "text-danger")}>
                {para(t.karCents)}
              </Td>
            </tr>
          </tbody>
        </Tablo>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-steel-500">
        Ciro yalnızca tahsilatı tamamlanmış siparişlerden sayılır. Faturalanacak
        siparişler yukarıda <b>Açık fatura</b> olarak ayrı gösterilir; tahsil
        edildiklerinde kendiliğinden ciroya girerler. Kâr = KDV hariç satış +
        kargo − maliyet.
      </p>
    </Sayfa>
  );
}
