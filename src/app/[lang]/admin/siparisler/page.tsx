import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { CIRO_DURUMLARI, ODEME, SIPARIS_DURUM, nezaman, para, sayi } from "@/lib/admin-ui";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import {
  AramaCubugu, Bos, DUGME, Kart, Rozet, Sayfa, Sayfalama, Secim, Tablo, Td, Th,
} from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const SAYFA = 40;

export default async function Siparisler({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; d?: string; o?: string; s?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Siparişler" />;

  const kok = `/${lang}/admin/siparisler`;
  const q = (sp.q ?? "").trim();
  const durum = sp.d ?? "";
  const odeme = sp.o ?? "";
  const sayfa = Math.max(1, Number(sp.s) || 1);

  const kosul: Record<string, unknown> = {};
  if (durum) kosul.status = durum;
  if (odeme) kosul.payMethod = odeme;
  if (q) {
    kosul.OR = [
      { number: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { email: { contains: q } } },
    ];
  }

  let toplam = 0, liste, ozet;
  try {
    [toplam, liste, ozet] = await Promise.all([
      db.order.count({ where: kosul }),
      db.order.findMany({
        where: kosul,
        orderBy: { createdAt: "desc" },
        skip: (sayfa - 1) * SAYFA,
        take: SAYFA,
        select: {
          id: true, number: true, status: true, payMethod: true, totalCents: true,
          createdAt: true, couponCode: true,
          customer: { select: { id: true, name: true, company: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
      (async () => {
        const [yeni, bekleyen, ciro, iade] = await Promise.all([
          db.order.count({ where: { status: "new" } }),
          db.order.count({ where: { status: { in: ["new", "paid", "packing"] } } }),
          db.order.aggregate({ _sum: { totalCents: true }, where: { status: { in: CIRO_DURUMLARI } } }),
          db.order.count({ where: { status: "refunded" } }),
        ]);
        return { yeni, bekleyen, ciro: ciro._sum.totalCents ?? 0, iade };
      })(),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Siparişler" hata={gizliTemizle(e)} />;
  }

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));
  const url = (ek: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (durum) p.set("d", durum);
    if (odeme) p.set("o", odeme);
    for (const [a, b] of Object.entries(ek)) p.set(a, String(b));
    return `${kok}?${p}`;
  };

  return (
    <Sayfa
      baslik="Siparişler"
      ozet={`${sayi(toplam)} sipariş listeleniyor`}
      eylem={
        <a
          href={`/api/admin/disa-aktar?tip=siparisler&lang=${lang}${durum ? `&d=${durum}` : ""}`}
          className={DUGME.sade}
        >
          Dışa aktar (CSV)
        </a>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Yeni sipariş" deger={sayi(ozet.yeni)} renk={ozet.yeni ? "warn" : "navy"} />
        <Kart etiket="İşlemde" deger={sayi(ozet.bekleyen)} />
        <Kart etiket="Toplam ciro" deger={para(ozet.ciro, false)} renk="ok" />
        <Kart etiket="İade" deger={sayi(ozet.iade)} renk={ozet.iade ? "danger" : "ok"} />
      </div>

      <div className="mt-4">
        <AramaCubugu eylem={kok} q={q} yerTutucu="Sipariş no, müşteri adı veya e-posta…">
          <Secim
            ad="d"
            deger={durum}
            etiket="Durum"
            secenekler={[
              { v: "", a: "Tümü" },
              ...Object.entries(SIPARIS_DURUM).map(([v, x]) => ({ v, a: x.ad })),
            ]}
          />
          <Secim
            ad="o"
            deger={odeme}
            etiket="Ödeme"
            secenekler={[{ v: "", a: "Tümü" }, ...Object.entries(ODEME).map(([v, a]) => ({ v, a }))]}
          />
        </AramaCubugu>
      </div>

      <div className="mt-4">
        {liste.length === 0 ? (
          <Bos
            metin={
              toplam === 0 && !q && !durum
                ? "Henüz sipariş yok. Mağazadan ilk sipariş geldiğinde burada listelenir."
                : "Bu süzgeçle sipariş bulunamadı."
            }
          />
        ) : (
          <Tablo>
            <thead>
              <tr>
                <Th w="140px">Sipariş no</Th>
                <Th>Müşteri</Th>
                <Th w="130px" orta>Durum</Th>
                <Th w="110px" orta>Ödeme</Th>
                <Th w="80px" orta>Kalem</Th>
                <Th w="130px" sag>Tutar</Th>
                <Th w="120px" sag>Tarih</Th>
              </tr>
            </thead>
            <tbody>
              {liste.map((o) => {
                const d = SIPARIS_DURUM[o.status] ?? SIPARIS_DURUM.new;
                return (
                  <tr key={o.id} className="hover:bg-steel-50">
                    <Td>
                      <Link href={`${kok}/${o.id}`} className="font-mono font-bold text-navy-600 hover:text-gold">
                        {o.number}
                      </Link>
                      {o.couponCode && <div className="text-[11px] text-gold-700">{o.couponCode}</div>}
                    </Td>
                    <Td>
                      <div className="font-semibold text-navy-900">{o.customer?.name ?? "—"}</div>
                      {o.customer?.company && (
                        <div className="text-[11.8px] text-steel-500">{o.customer.company}</div>
                      )}
                    </Td>
                    <Td orta><Rozet ton={d.ton}>{d.ad}</Rozet></Td>
                    <Td orta className="text-[12.4px] text-steel-700">{ODEME[o.payMethod] ?? o.payMethod}</Td>
                    <Td orta className="tabular-nums text-steel-600">{o._count.items}</Td>
                    <Td sag className="font-bold tabular-nums text-navy-900">{para(o.totalCents)}</Td>
                    <Td sag className="text-[12.2px] text-steel-500">{nezaman(o.createdAt)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Tablo>
        )}
      </div>

      <Sayfalama sayfa={sayfa} sonSayfa={sonSayfa} toplam={toplam} url={(x) => url({ s: x })} />
    </Sayfa>
  );
}
