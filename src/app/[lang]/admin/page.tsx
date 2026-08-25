import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { CIRO_DURUMLARI, SIPARIS_DURUM, nezaman, para, sayi, tarihSaat, dilAdi} from "@/lib/admin-ui";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { Bos, DUGME, Kart, Kutu, Rozet, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

function ayBasi() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function gunBasi() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Tüm veriyi tek yerde toplar — JSX try/catch dışında kalsın diye ayrıldı. */
async function yukle(lang: string) {
  const [
    urunSayisi, yayindaSayisi, stokYok, azStok, musteriSayisi,
    yeniSiparis, acikSohbet, bugunToplam, ayToplam, ayAdet,
    sonSiparisler, cokSatanlar, sonLoglar,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { hidden: false } }),
    db.product.count({ where: { stock: { lte: 0 }, onRequest: false } }),
    db.product.count({ where: { stock: { gt: 0, lte: 5 }, onRequest: false } }),
    db.customer.count(),
    db.order.count({ where: { status: "new" } }),
    db.chatSession.count({ where: { status: "open" } }),
    db.order.aggregate({
      _sum: { totalCents: true },
      where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: gunBasi() } },
    }),
    db.order.aggregate({
      _sum: { totalCents: true, costCents: true, vatCents: true },
      where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: ayBasi() } },
    }),
    db.order.count({ where: { status: { in: CIRO_DURUMLARI }, createdAt: { gte: ayBasi() } } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, number: true, status: true, totalCents: true, createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    db.product.findMany({
      where: { sold: { gt: 0 } },
      orderBy: { sold: "desc" },
      take: 6,
      select: {
        id: true, sku: true, sold: true, priceCents: true,
        texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
      },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return {
    urunSayisi, yayindaSayisi, stokYok, azStok, musteriSayisi,
    yeniSiparis, acikSohbet, ayAdet, sonSiparisler, cokSatanlar, sonLoglar,
    bugunCiro: bugunToplam._sum.totalCents ?? 0,
    ciroAy: ayToplam._sum.totalCents ?? 0,
    maliyetAy: ayToplam._sum.costCents ?? 0,
    kdvAy: ayToplam._sum.vatCents ?? 0,
  };
}

export default async function Dashboard({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Dashboard" />;

  const kok = `/${lang}/admin`;

  let v: Awaited<ReturnType<typeof yukle>> | null = null;
  let hata = "";
  try {
    v = await yukle(lang);
  } catch (e) {
    hata = String(e);
  }
  if (!v) return <VeritabaniGerekli lang={lang} sayfa="Dashboard" hata={hata} />;

  const karAy = v.ciroAy - v.maliyetAy;

  return (
    <Sayfa
      baslik="Dashboard"
      ozet="Piro Gastro Center AB — yönetim özeti"
      eylem={
        <>
          <Link href={`${kok}/siparisler`} className={DUGME.koyu}>Siparişler</Link>
          <Link href={`${kok}/urunler`} className={DUGME.ana}>Ürünler</Link>
        </>
      }
    >
      {/* --- üst kartlar --- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Bugün ciro" deger={para(v.bugunCiro, false)} renk="ok" />
        <Kart etiket="Bu ay ciro" deger={para(v.ciroAy, false)} alt={`${sayi(v.ayAdet)} sipariş`} renk="navy" />
        <Kart
          etiket="Bu ay kâr"
          deger={para(karAy, false)}
          alt={`KDV ${para(v.kdvAy, false)}`}
          renk={karAy >= 0 ? "ok" : "danger"}
        />
        <Kart
          etiket="Bekleyen sipariş"
          deger={sayi(v.yeniSiparis)}
          alt={v.acikSohbet > 0 ? `${sayi(v.acikSohbet)} açık sohbet` : undefined}
          renk={v.yeniSiparis > 0 ? "warn" : "navy"}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Ürün" deger={sayi(v.urunSayisi)} alt={`${sayi(v.yayindaSayisi)} yayında`} />
        <Kart etiket="Stokta yok" deger={sayi(v.stokYok)} renk={v.stokYok ? "danger" : "ok"} />
        <Kart etiket="Az stok" deger={sayi(v.azStok)} renk={v.azStok ? "warn" : "ok"} />
        <Kart etiket="Müşteri" deger={sayi(v.musteriSayisi)} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* --- son siparişler --- */}
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-navy-900">Son siparişler</h2>
            <Link href={`${kok}/siparisler`} className="text-[12.4px] font-bold text-navy-600 hover:text-gold">
              Tümü →
            </Link>
          </div>
          {v.sonSiparisler.length === 0 ? (
            <Bos metin="Henüz sipariş yok. Mağazadan ilk sipariş geldiğinde burada listelenir." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th>Sipariş</Th>
                  <Th>Müşteri</Th>
                  <Th w="130px">Durum</Th>
                  <Th w="120px" sag>Tutar</Th>
                  <Th w="120px" sag>Tarih</Th>
                </tr>
              </thead>
              <tbody>
                {v.sonSiparisler.map((o) => {
                  const d = SIPARIS_DURUM[o.status] ?? SIPARIS_DURUM.new;
                  return (
                    <tr key={o.id} className="hover:bg-steel-50">
                      <Td>
                        <Link
                          href={`${kok}/siparisler/${o.id}`}
                          className="font-mono font-bold text-navy-600 hover:text-gold"
                        >
                          {o.number}
                        </Link>
                      </Td>
                      <Td className="text-steel-700">{o.customer?.name ?? "—"}</Td>
                      <Td><Rozet ton={d.ton}>{d.ad}</Rozet></Td>
                      <Td sag className="font-semibold tabular-nums">{para(o.totalCents)}</Td>
                      <Td sag className="text-[12.2px] text-steel-500">{nezaman(o.createdAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tablo>
          )}
        </div>

        {/* --- yan sütun --- */}
        <div className="min-w-0 space-y-4">
          <div>
            <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Çok satanlar</h2>
            {v.cokSatanlar.length === 0 ? (
              <Bos metin="Satış verisi yok." />
            ) : (
              <Kutu className="divide-y divide-steel-100">
                {v.cokSatanlar.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <Link
                      href={`${kok}/urunler/${p.id}`}
                      className="min-w-0 flex-1 truncate text-[13px] font-semibold text-navy-900 hover:text-gold"
                    >
                      {dilAdi(p.texts, lang, p.sku)}
                    </Link>
                    <span className="shrink-0 text-[12.4px] font-bold tabular-nums text-steel-600">
                      {sayi(p.sold)} adet
                    </span>
                  </div>
                ))}
              </Kutu>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Son işlemler</h2>
            {v.sonLoglar.length === 0 ? (
              <Bos metin="Kayıt yok." />
            ) : (
              <Kutu className="divide-y divide-steel-100">
                {v.sonLoglar.map((l) => (
                  <div key={l.id} className="px-3.5 py-2">
                    <div className="text-[12.4px] font-semibold text-navy-900">{l.action}</div>
                    <div className="truncate text-[11.8px] text-steel-600">{l.detail ?? "—"}</div>
                    <div className="text-[11px] text-steel-400">{tarihSaat(l.createdAt)}</div>
                  </div>
                ))}
              </Kutu>
            )}
          </div>
        </div>
      </div>
    </Sayfa>
  );
}
