import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { CIRO_DURUMLARI, ODEME, para, sayi, yuzde } from "@/lib/admin-ui";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import { Bos, DUGME, Kart, Kutu, Sayfa, Secim, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

function araligiCoz(a: string): { bas: Date; bit: Date; ad: string } {
  const s = new Date();
  const bit = new Date();
  if (a === "bugun") return { bas: new Date(s.getFullYear(), s.getMonth(), s.getDate()), bit, ad: "Bugün" };
  if (a === "hafta") {
    const g = new Date(s);
    g.setDate(s.getDate() - 7);
    return { bas: g, bit, ad: "Son 7 gün" };
  }
  if (a === "yil") return { bas: new Date(s.getFullYear(), 0, 1), bit, ad: "Bu yıl" };
  if (a === "gecenAy") {
    return {
      bas: new Date(s.getFullYear(), s.getMonth() - 1, 1),
      bit: new Date(s.getFullYear(), s.getMonth(), 0, 23, 59, 59),
      ad: "Geçen ay",
    };
  }
  return { bas: new Date(s.getFullYear(), s.getMonth(), 1), bit, ad: "Bu ay" };
}

export default async function Muhasebe({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const { lang } = await params;
  const { a } = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Muhasebe" />;

  const kok = `/${lang}/admin/muhasebe`;
  const aralik = a ?? "ay";
  const { bas, bit, ad } = araligiCoz(aralik);

  let satis, iadeler, odemeler, giderler, gelirler, kdvOran;
  try {
    [satis, iadeler, odemeler, giderler, gelirler, kdvOran] = await Promise.all([
      db.order.aggregate({
        _sum: { totalCents: true, vatCents: true, costCents: true, subtotalCents: true, shipCents: true, discountCents: true },
        _count: { _all: true },
        where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: bas, lte: bit } },
      }),
      db.order.aggregate({
        _sum: { totalCents: true, vatCents: true },
        _count: { _all: true },
        where: { status: "refunded", createdAt: { gte: bas, lte: bit } },
      }),
      db.order.groupBy({
        by: ["payMethod"],
        _sum: { totalCents: true },
        _count: { _all: true },
        where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: bas, lte: bit } },
      }),
      db.expense.aggregate({
        _sum: { amountCents: true, vatCents: true },
        _count: { _all: true },
        where: { kind: "expense", date: { gte: bas, lte: bit } },
      }),
      db.expense.aggregate({
        _sum: { amountCents: true, vatCents: true },
        _count: { _all: true },
        where: { kind: "income", date: { gte: bas, lte: bit } },
      }),
      db.expense.groupBy({
        by: ["category"],
        _sum: { amountCents: true },
        where: { kind: "expense", date: { gte: bas, lte: bit } },
        orderBy: { _sum: { amountCents: "desc" } },
        take: 10,
      }),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Muhasebe" hata={gizliTemizle(e)} />;
  }

  const ciro = satis._sum.totalCents ?? 0;
  const kdvTahsil = satis._sum.vatCents ?? 0;
  const maliyet = satis._sum.costCents ?? 0;
  const iadeTutar = iadeler._sum.totalCents ?? 0;
  const giderTutar = giderler._sum.amountCents ?? 0;
  const kdvIndirilecek = giderler._sum.vatCents ?? 0;
  const digerGelir = gelirler._sum.amountCents ?? 0;

  const brutKar = ciro - kdvTahsil - maliyet;
  const netKar = brutKar + digerGelir - giderTutar - iadeTutar;
  const odenecekKdv = kdvTahsil - kdvIndirilecek;

  const secim = (
    <form action={kok} method="get" className="flex items-center gap-2">
      <Secim
        ad="a"
        deger={aralik}
        etiket="Dönem"
        secenekler={[
          { v: "bugun", a: "Bugün" },
          { v: "hafta", a: "Son 7 gün" },
          { v: "ay", a: "Bu ay" },
          { v: "gecenAy", a: "Geçen ay" },
          { v: "yil", a: "Bu yıl" },
        ]}
      />
      <button type="submit" className={DUGME.koyu}>Göster</button>
    </form>
  );

  return (
    <Sayfa
      baslik="Muhasebe"
      ozet={`${ad} · tutarlar temel para biriminde (€), KDV dahil/hariç ayrımı aşağıda`}
      eylem={
        <>
          {secim}
          <a href={`/api/admin/disa-aktar?tip=muhasebe&lang=${lang}&a=${aralik}`} className={DUGME.sade}>
            Dışa aktar (CSV)
          </a>
        </>
      }
    >
      {/* --- ana rakamlar --- */}
      <p className="mb-3 rounded-[9px] border border-steel-200 bg-steel-50 px-4 py-2.5 text-[12.8px] leading-relaxed text-steel-700">
        Ödenmiş her sipariş bu sayfadaki ciro, KDV ve kâr hesabına kendiliğinden
        girer. Belgelerin kendisi{" "}
        <Link href={`/${lang}/admin/makbuzlar`} className="font-bold text-navy-700 hover:text-gold">
          Sipariş Makbuzları ve Belgeler
        </Link>{" "}
        bölümünde; oradan yazdırabilir veya PDF indirebilirsiniz.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Ciro (KDV dahil)" deger={para(ciro, false)} alt={`${sayi(satis._count._all)} sipariş`} renk="ok" />
        <Kart etiket="Net satış (KDV hariç)" deger={para(ciro - kdvTahsil, false)} renk="navy" />
        <Kart etiket="Brüt kâr" deger={para(brutKar, false)} alt={`marj ${yuzde(brutKar, ciro - kdvTahsil)}`} renk={brutKar >= 0 ? "ok" : "danger"} />
        <Kart etiket="Net kâr" deger={para(netKar, false)} alt="giderler ve iadeler düşülmüş" renk={netKar >= 0 ? "ok" : "danger"} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Tahsil edilen KDV" deger={para(kdvTahsil, false)} />
        <Kart etiket="İndirilecek KDV" deger={para(kdvIndirilecek, false)} />
        <Kart etiket="Ödenecek KDV" deger={para(odenecekKdv, false)} renk={odenecekKdv > 0 ? "warn" : "ok"} />
        <Kart etiket="İadeler" deger={para(iadeTutar, false)} alt={`${sayi(iadeler._count._all)} adet`} renk={iadeTutar ? "danger" : "ok"} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {/* --- kâr-zarar --- */}
        <div>
          <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Kâr-zarar tablosu</h2>
          <Kutu className="p-4">
            <dl className="space-y-2 text-[13.6px]">
              <div className="flex justify-between">
                <dt className="text-steel-700">Satış geliri (KDV hariç)</dt>
                <dd className="tabular-nums font-semibold">{para(ciro - kdvTahsil)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-steel-700">Satılan malın maliyeti</dt>
                <dd className="tabular-nums text-danger">−{para(maliyet)}</dd>
              </div>
              <div className="flex justify-between border-t border-steel-200 pt-2 font-bold">
                <dt>Brüt kâr</dt>
                <dd className={"tabular-nums " + (brutKar >= 0 ? "text-ok" : "text-danger")}>{para(brutKar)}</dd>
              </div>
              <div className="flex justify-between pt-1">
                <dt className="text-steel-700">Diğer gelirler</dt>
                <dd className="tabular-nums text-ok">+{para(digerGelir)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-steel-700">İşletme giderleri</dt>
                <dd className="tabular-nums text-danger">−{para(giderTutar)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-steel-700">İadeler</dt>
                <dd className="tabular-nums text-danger">−{para(iadeTutar)}</dd>
              </div>
              <div className="flex justify-between border-t-2 border-navy-900 pt-2 text-[16px] font-extrabold">
                <dt>Net kâr</dt>
                <dd className={"tabular-nums " + (netKar >= 0 ? "text-ok" : "text-danger")}>{para(netKar)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11.8px] leading-relaxed text-steel-500">
              Maliyet, ürün kartlarındaki “alış maliyeti” alanından hesaplanır. Bu alan boşsa
              brüt kâr olduğundan yüksek görünür.
            </p>
          </Kutu>
        </div>

        {/* --- ödeme yöntemleri --- */}
        <div>
          <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Ödeme yöntemleri</h2>
          {odemeler.length === 0 ? (
            <Bos metin="Bu dönemde tahsilat yok." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th>Yöntem</Th>
                  <Th w="90px" orta>Adet</Th>
                  <Th w="140px" sag>Tutar</Th>
                  <Th w="90px" sag>Pay</Th>
                </tr>
              </thead>
              <tbody>
                {odemeler.map((o) => (
                  <tr key={o.payMethod}>
                    <Td className="font-semibold text-navy-900">{ODEME[o.payMethod] ?? o.payMethod}</Td>
                    <Td orta className="tabular-nums">{o._count._all}</Td>
                    <Td sag className="tabular-nums font-bold">{para(o._sum.totalCents ?? 0)}</Td>
                    <Td sag className="tabular-nums text-steel-600">{yuzde(o._sum.totalCents ?? 0, ciro)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tablo>
          )}

          <h2 className="mb-2 mt-5 text-[15px] font-extrabold text-navy-900">Gider kalemleri</h2>
          {kdvOran.length === 0 ? (
            <Bos metin="Bu dönemde gider kaydı yok." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th>Kategori</Th>
                  <Th w="140px" sag>Tutar</Th>
                  <Th w="90px" sag>Pay</Th>
                </tr>
              </thead>
              <tbody>
                {kdvOran.map((g) => (
                  <tr key={g.category}>
                    <Td className="capitalize text-steel-800">{g.category}</Td>
                    <Td sag className="tabular-nums font-semibold">{para(g._sum.amountCents ?? 0)}</Td>
                    <Td sag className="tabular-nums text-steel-600">{yuzde(g._sum.amountCents ?? 0, giderTutar)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tablo>
          )}
        </div>
      </div>

      <p className="mt-5 text-[12.6px] text-steel-600">
        Gider ve gelir kalemlerini{" "}
        <Link href={`/${lang}/admin/gelir-gider`} className="font-bold text-navy-600 hover:text-gold">
          Gelir-Gider
        </Link>{" "}
        ekranından girebilir, satış kırılımlarını{" "}
        <Link href={`/${lang}/admin/raporlar`} className="font-bold text-navy-600 hover:text-gold">
          Satış Raporları
        </Link>{" "}
        ekranından inceleyebilirsiniz.
      </p>
    </Sayfa>
  );
}
