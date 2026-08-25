import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { CIRO_DURUMLARI, para, sayi, yuzde } from "@/lib/admin-ui";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { Bos, DUGME, Kart, Kutu, Sayfa, Secim, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

function aralik(a: string) {
  const s = new Date();
  if (a === "hafta") { const g = new Date(s); g.setDate(s.getDate() - 7); return { bas: g, ad: "Son 7 gün", gun: 7 }; }
  if (a === "yil") return { bas: new Date(s.getFullYear(), 0, 1), ad: "Bu yıl", gun: 365 };
  if (a === "gun90") { const g = new Date(s); g.setDate(s.getDate() - 90); return { bas: g, ad: "Son 90 gün", gun: 90 }; }
  const g = new Date(s); g.setDate(s.getDate() - 30);
  return { bas: g, ad: "Son 30 gün", gun: 30 };
}

export default async function Raporlar({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const { lang } = await params;
  const { a } = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Satış Raporları" />;

  const kok = `/${lang}/admin/raporlar`;
  const secili = a ?? "gun30";
  const { bas, ad, gun } = aralik(secili);

  let siparisler, kalemler, ozet;
  try {
    [siparisler, kalemler, ozet] = await Promise.all([
      db.order.findMany({
        where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: bas } },
        select: { totalCents: true, costCents: true, vatCents: true, createdAt: true, customerId: true },
        orderBy: { createdAt: "asc" },
      }),
      db.orderItem.findMany({
        where: { order: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: bas } } },
        select: { sku: true, name: true, qty: true, lineTotalCents: true, productId: true },
      }),
      (async () => {
        const [musteri, yeniMusteri] = await Promise.all([
          db.customer.count(),
          db.customer.count({ where: { createdAt: { gte: bas } } }),
        ]);
        return { musteri, yeniMusteri };
      })(),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Satış Raporları" hata={String(e)} />;
  }

  const ciro = siparisler.reduce((t, o) => t + o.totalCents, 0);
  const maliyet = siparisler.reduce((t, o) => t + o.costCents, 0);
  const kdv = siparisler.reduce((t, o) => t + o.vatCents, 0);
  const adet = siparisler.length;
  const ortalama = adet ? Math.round(ciro / adet) : 0;
  const kar = ciro - kdv - maliyet;

  /* --- günlük seri --- */
  const gunluk = new Map<string, { ciro: number; adet: number }>();
  for (const o of siparisler) {
    const k = o.createdAt.toISOString().slice(0, 10);
    const v = gunluk.get(k) ?? { ciro: 0, adet: 0 };
    v.ciro += o.totalCents;
    v.adet += 1;
    gunluk.set(k, v);
  }
  const seri = [...gunluk.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  const enYuksek = Math.max(1, ...seri.map(([, v]) => v.ciro));

  /* --- ürün kırılımı --- */
  const urunMap = new Map<string, { ad: string; adet: number; tutar: number; productId: string | null }>();
  for (const k of kalemler) {
    const v = urunMap.get(k.sku) ?? { ad: k.name, adet: 0, tutar: 0, productId: k.productId };
    v.adet += k.qty;
    v.tutar += k.lineTotalCents;
    urunMap.set(k.sku, v);
  }
  const urunler = [...urunMap.entries()]
    .map(([sku, v]) => ({ sku, ...v }))
    .sort((x, y) => y.tutar - x.tutar)
    .slice(0, 20);

  return (
    <Sayfa
      baslik="Satış Raporları"
      ozet={`${ad} · ciroya iptal ve iadeler dahil değildir`}
      eylem={
        <>
          <form action={kok} method="get" className="flex items-center gap-2">
            <Secim
              ad="a"
              deger={secili}
              etiket="Dönem"
              secenekler={[
                { v: "hafta", a: "Son 7 gün" },
                { v: "gun30", a: "Son 30 gün" },
                { v: "gun90", a: "Son 90 gün" },
                { v: "yil", a: "Bu yıl" },
              ]}
            />
            <button type="submit" className={DUGME.koyu}>Göster</button>
          </form>
          <a href={`/api/admin/disa-aktar?tip=raporlar&lang=${lang}&a=${secili}`} className={DUGME.sade}>
            Dışa aktar (CSV)
          </a>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Ciro" deger={para(ciro, false)} alt={`${sayi(adet)} sipariş`} renk="ok" />
        <Kart etiket="Ortalama sepet" deger={para(ortalama, false)} />
        <Kart etiket="Kâr" deger={para(kar, false)} alt={`marj ${yuzde(kar, ciro - kdv)}`} renk={kar >= 0 ? "ok" : "danger"} />
        <Kart etiket="Yeni müşteri" deger={sayi(ozet.yeniMusteri)} alt={`toplam ${sayi(ozet.musteri)}`} />
      </div>

      {/* --- günlük grafik --- */}
      <div className="mt-5">
        <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Günlük ciro</h2>
        {seri.length === 0 ? (
          <Bos metin="Bu dönemde satış yok." />
        ) : (
          <Kutu className="p-4">
            <div className="flex h-[180px] items-end gap-[3px] overflow-x-auto">
              {seri.map(([g, v]) => (
                <div key={g} className="group flex min-w-[10px] flex-1 flex-col items-center justify-end gap-1">
                  <span className="pointer-events-none text-[9.5px] font-bold tabular-nums text-steel-500 opacity-0 group-hover:opacity-100">
                    {Math.round(v.ciro / 100)}
                  </span>
                  <span
                    title={`${g} · ${para(v.ciro)} · ${v.adet} sipariş`}
                    style={{ height: `${Math.max(3, (v.ciro / enYuksek) * 140)}px` }}
                    className="w-full rounded-t-[3px] bg-navy-600 transition group-hover:bg-gold"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11.4px] text-steel-500">
              <span>{seri[0]?.[0]}</span>
              <span>{gun} günlük dönem · en yüksek {para(enYuksek, false)}</span>
              <span>{seri.at(-1)?.[0]}</span>
            </div>
          </Kutu>
        )}
      </div>

      {/* --- ürün kırılımı --- */}
      <div className="mt-5">
        <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">En çok ciro yapan ürünler</h2>
        {urunler.length === 0 ? (
          <Bos metin="Bu dönemde ürün satışı yok." />
        ) : (
          <Tablo>
            <thead>
              <tr>
                <Th w="50px" orta>#</Th>
                <Th>Ürün</Th>
                <Th w="140px">Stok kodu</Th>
                <Th w="90px" orta>Adet</Th>
                <Th w="140px" sag>Ciro</Th>
                <Th w="90px" sag>Pay</Th>
              </tr>
            </thead>
            <tbody>
              {urunler.map((u, n) => (
                <tr key={u.sku} className="hover:bg-steel-50">
                  <Td orta className="tabular-nums text-steel-500">{n + 1}</Td>
                  <Td>
                    {u.productId ? (
                      <Link
                        href={`/${lang}/admin/urunler/${u.productId}`}
                        className="font-semibold text-navy-900 hover:text-gold"
                      >
                        {u.ad}
                      </Link>
                    ) : (
                      <span className="font-semibold text-navy-900">{u.ad}</span>
                    )}
                  </Td>
                  <Td className="font-mono text-[12px] text-steel-600">{u.sku}</Td>
                  <Td orta className="tabular-nums font-semibold">{sayi(u.adet)}</Td>
                  <Td sag className="tabular-nums font-bold">{para(u.tutar)}</Td>
                  <Td sag className="tabular-nums text-steel-600">{yuzde(u.tutar, ciro)}</Td>
                </tr>
              ))}
            </tbody>
          </Tablo>
        )}
      </div>
    </Sayfa>
  );
}
