import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { para, sayi, dilAdi} from "@/lib/admin-ui";
import { topluIslem, yayinDegistir } from "@/app/actions/admin-urun";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import {
  AramaCubugu,
  Bos,
  DUGME,
  Kutu,
  Rozet,
  Sayfa,
  Sayfalama,
  Secim,
  Tablo,
  Td,
  Th,
} from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const SAYFA = 50;

type Ara = {
  q?: string;
  k?: string; // kategori
  d?: string; // durum
  s?: string; // sayfa
  sir?: string; // sıralama
};

export default async function UrunlerPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Ara>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Ürünler" />;

  const kok = `/${lang}/admin/urunler`;
  const q = (sp.q ?? "").trim();
  const kat = sp.k ?? "";
  const durum = sp.d ?? "";
  const sayfa = Math.max(1, Number(sp.s) || 1);
  const sir = sp.sir ?? "yeni";

  /* ---- süzgeç ---- */
  const kosul: Record<string, unknown> = {};
  if (kat) kosul.OR = [{ categoryId: kat }, { subId: kat }];
  if (durum === "yayinda") kosul.hidden = false;
  if (durum === "gizli") kosul.hidden = true;
  if (durum === "stokyok") { kosul.stock = { lte: 0 }; kosul.onRequest = false; }
  if (durum === "azstok") { kosul.stock = { gt: 0, lte: 5 }; }
  if (durum === "kampanya") kosul.campaignOn = true;
  if (q) {
    kosul.AND = [
      {
        OR: [
          { sku: { contains: q } },
          { slug: { contains: q } },
          { texts: { some: { name: { contains: q } } } },
        ],
      },
    ];
  }

  const siralama =
    sir === "fiyatArtan" ? { priceCents: "asc" as const }
      : sir === "fiyatAzalan" ? { priceCents: "desc" as const }
        : sir === "stokAz" ? { stock: "asc" as const }
          : sir === "cokSatan" ? { sold: "desc" as const }
            : { createdAt: "desc" as const };

  let toplam = 0;
  let urunler: Array<{
    id: string; sku: string; slug: string; priceCents: number; costCents: number;
    stock: number; threshold: number; hidden: boolean; featured: boolean;
    onRequest: boolean; campaignOn: boolean; campaignPercent: number; sold: number;
    categoryId: string;
    texts: Array<{ name: string; langCode: string }>;
    images: Array<{ url: string }>;
    category: { id: string; texts: Array<{ name: string }> };
  }> = [];
  let kategoriler: Array<{ id: string; ad: string; sayi: number; alt: Array<{ id: string; ad: string; sayi: number }> }> = [];
  let ozet = { hepsi: 0, yayinda: 0, gizli: 0, stokyok: 0 };

  try {
    [toplam, urunler] = await Promise.all([
      db.product.count({ where: kosul }),
      db.product.findMany({
        where: kosul,
        orderBy: siralama,
        skip: (sayfa - 1) * SAYFA,
        take: SAYFA,
        include: {
          texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
          images: { take: 1, select: { url: true } },
          category: { select: { id: true, texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } } } },
        },
      }),
    ]);

    const [anaKat, sayimlar, hepsi, yayinda, stokyok] = await Promise.all([
      db.category.findMany({
        orderBy: { sort: "asc" },
        select: {
          id: true, parentId: true,
          texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
        },
      }),
      db.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
      db.product.count(),
      db.product.count({ where: { hidden: false } }),
      db.product.count({ where: { stock: { lte: 0 }, onRequest: false } }),
    ]);

    const sayimHarita = new Map(sayimlar.map((x) => [x.categoryId, x._count._all]));
    const ad = (t: Array<{ name: string; langCode?: string }>) => dilAdi(t, lang);
    kategoriler = anaKat
      .filter((c) => !c.parentId)
      .map((c) => ({
        id: c.id,
        ad: ad(c.texts),
        sayi: sayimHarita.get(c.id) ?? 0,
        alt: anaKat
          .filter((x) => x.parentId === c.id)
          .map((x) => ({ id: x.id, ad: ad(x.texts), sayi: sayimHarita.get(x.id) ?? 0 })),
      }));

    ozet = { hepsi, yayinda, gizli: hepsi - yayinda, stokyok };
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Ürünler" hata={String(e)} />;
  }

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));
  const url = (ek: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (kat) p.set("k", kat);
    if (durum) p.set("d", durum);
    if (sir !== "yeni") p.set("sir", sir);
    for (const [a, b] of Object.entries(ek)) {
      if (b === "" || b === undefined) p.delete(a);
      else p.set(a, String(b));
    }
    const qs = p.toString();
    return qs ? `${kok}?${qs}` : kok;
  };

  const urunAdi = (t: Array<{ name: string; langCode: string }>) =>
    t.find((x) => x.langCode === lang)?.name ?? t[0]?.name ?? "—";

  return (
    <Sayfa
      baslik="Ürünler"
      ozet={
        <>
          {sayi(ozet.hepsi)} ürün · {sayi(ozet.yayinda)} yayında · {sayi(ozet.gizli)} gizli ·{" "}
          <b className="text-danger">{sayi(ozet.stokyok)} stokta yok</b>
        </>
      }
      eylem={
        <>
          <Link href={`${kok}/yeni`} className={DUGME.ana}>
            + Yeni ürün ekle
          </Link>
          <Link href={`/${lang}/admin/kategoriler`} className={DUGME.koyu}>
            Yeni kategori oluştur
          </Link>
          <a
            href={`/api/admin/disa-aktar?tip=urunler&lang=${lang}${kat ? `&k=${kat}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={DUGME.sade}
          >
            Dışa aktar (CSV)
          </a>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* ---------- kategori ağacı ---------- */}
        <Kutu className="h-max overflow-hidden">
          <div className="border-b border-steel-200 px-3.5 py-2.5 text-[11.6px] font-bold uppercase tracking-wider text-steel-600">
            Kategoriler
          </div>
          <div className="max-h-[70vh] overflow-y-auto py-1.5">
            <Link
              href={url({ k: "", s: 1 })}
              className={
                "flex items-center justify-between px-3.5 py-1.5 text-[13px] transition hover:bg-steel-50 " +
                (!kat ? "font-bold text-navy-900" : "text-steel-700")
              }
            >
              <span>Tüm ürünler</span>
              <span className="tabular-nums text-[11.6px] text-steel-500">{sayi(ozet.hepsi)}</span>
            </Link>
            {kategoriler.map((c) => (
              <div key={c.id}>
                <Link
                  href={url({ k: c.id, s: 1 })}
                  className={
                    "flex items-center justify-between px-3.5 py-1.5 text-[13px] transition hover:bg-steel-50 " +
                    (kat === c.id ? "bg-steel-50 font-bold text-navy-900" : "text-steel-700")
                  }
                >
                  <span className="truncate">{c.ad}</span>
                  <span className="tabular-nums text-[11.6px] text-steel-500">{sayi(c.sayi)}</span>
                </Link>
                {c.alt.length > 0 && (kat === c.id || c.alt.some((a) => a.id === kat)) && (
                  <div className="pb-1">
                    {c.alt.map((a) => (
                      <Link
                        key={a.id}
                        href={url({ k: a.id, s: 1 })}
                        className={
                          "flex items-center justify-between py-1 pl-7 pr-3.5 text-[12.4px] transition hover:bg-steel-50 " +
                          (kat === a.id ? "font-bold text-navy-900" : "text-steel-600")
                        }
                      >
                        <span className="truncate">{a.ad}</span>
                        <span className="tabular-nums text-[11.2px] text-steel-500">{sayi(a.sayi)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Kutu>

        {/* ---------- liste ---------- */}
        <div className="min-w-0">
          <AramaCubugu
            eylem={kok}
            q={q}
            yerTutucu="Ürün adı, stok kodu…"
            gizli={{ k: kat }}
          >
            <Secim
              ad="d"
              deger={durum}
              etiket="Durum"
              secenekler={[
                { v: "", a: "Tümü" },
                { v: "yayinda", a: "Yayında" },
                { v: "gizli", a: "Gizli" },
                { v: "stokyok", a: "Stokta yok" },
                { v: "azstok", a: "Az stok" },
                { v: "kampanya", a: "Kampanyalı" },
              ]}
            />
            <Secim
              ad="sir"
              deger={sir}
              etiket="Sırala"
              secenekler={[
                { v: "yeni", a: "En yeni" },
                { v: "fiyatArtan", a: "Fiyat ↑" },
                { v: "fiyatAzalan", a: "Fiyat ↓" },
                { v: "stokAz", a: "Stok azdan" },
                { v: "cokSatan", a: "Çok satan" },
              ]}
            />
          </AramaCubugu>

          {urunler.length === 0 ? (
            <div className="mt-4">
              <Bos metin="Bu süzgeçle ürün bulunamadı." />
            </div>
          ) : (
            <form action={topluIslem} className="mt-4">
              {/* toplu işlem çubuğu */}
              <Kutu className="mb-3 flex flex-wrap items-center gap-2 p-3">
                <span className="text-[12.4px] font-bold text-steel-700">Seçilenlere:</span>
                <select
                  name="islem"
                  defaultValue="yayinla"
                  className="rounded-[8px] border border-steel-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-navy-500"
                >
                  <option value="yayinla">Yayına al</option>
                  <option value="gizle">Yayından kaldır</option>
                  <option value="oneCikar">Öne çıkar</option>
                  <option value="oneCikarma">Öne çıkarmayı kaldır</option>
                  <option value="kategori">Kategori değiştir</option>
                  <option value="fiyatYuzde">Fiyatı yüzde değiştir</option>
                  <option value="stokAyarla">Stok ayarla</option>
                  <option value="sil">Sil</option>
                </select>
                <select
                  name="hedefKategori"
                  defaultValue=""
                  className="rounded-[8px] border border-steel-300 bg-white px-2.5 py-1.5 text-[12.6px] outline-none focus:border-navy-500"
                >
                  <option value="">— kategori —</option>
                  {kategoriler.map((c) => (
                    <optgroup key={c.id} label={c.ad}>
                      <option value={c.id}>{c.ad}</option>
                      {c.alt.map((a) => (
                        <option key={a.id} value={a.id}>
                          &nbsp;&nbsp;{a.ad}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  name="yuzde"
                  placeholder="% (örn -10)"
                  className="w-[110px] rounded-[8px] border border-steel-300 px-2.5 py-1.5 text-[12.6px] outline-none focus:border-navy-500"
                />
                <input
                  name="yeniStok"
                  placeholder="stok"
                  className="w-[80px] rounded-[8px] border border-steel-300 px-2.5 py-1.5 text-[12.6px] outline-none focus:border-navy-500"
                />
                <button type="submit" className={DUGME.koyu}>
                  Uygula
                </button>
              </Kutu>

              <Tablo>
                <thead>
                  <tr>
                    <Th w="34px" orta>
                      <span className="sr-only">Seç</span>
                    </Th>
                    <Th>Ürün</Th>
                    <Th w="170px">Kategori</Th>
                    <Th w="130px" sag>Fiyat</Th>
                    <Th w="110px" orta>Stok</Th>
                    <Th w="150px">Durum</Th>
                    <Th w="90px" sag>İşlem</Th>
                  </tr>
                </thead>
                <tbody>
                  {urunler.map((p) => {
                    const ad = urunAdi(p.texts);
                    const stokYok = !p.onRequest && p.stock <= 0;
                    const azStok = !p.onRequest && p.stock > 0 && p.stock <= Math.max(p.threshold, 5);
                    return (
                      <tr key={p.id} className="hover:bg-steel-50">
                        <Td orta>
                          <input
                            type="checkbox"
                            name="sec"
                            value={p.id}
                            aria-label={`${ad} seç`}
                            className="h-4 w-4 accent-navy-600"
                          />
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-steel-200 bg-steel-50">
                              {p.images[0]?.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.images[0].url} alt="" className="h-full w-full object-contain" />
                              ) : (
                                <span className="text-[9px] leading-tight text-steel-400">görsel<br />yok</span>
                              )}
                            </span>
                            <span className="min-w-0">
                              <Link
                                href={`${kok}/${p.id}`}
                                className="block truncate font-semibold text-navy-900 hover:text-gold"
                              >
                                {ad}
                              </Link>
                              <span className="block font-mono text-[11.4px] text-steel-500">{p.sku}</span>
                            </span>
                          </div>
                        </Td>
                        <Td className="text-[12.4px] text-steel-700">
                          {dilAdi(p.category.texts, lang)}
                        </Td>
                        <Td sag>
                          <div className="font-semibold tabular-nums text-navy-900">{para(p.priceCents)}</div>
                          {p.campaignOn && p.campaignPercent > 0 && (
                            <div className="text-[11px] font-bold text-danger">−%{p.campaignPercent}</div>
                          )}
                        </Td>
                        <Td orta>
                          <span
                            className={
                              "inline-block min-w-[36px] rounded px-1.5 py-0.5 text-[12.4px] font-bold tabular-nums " +
                              (p.onRequest
                                ? "bg-steel-100 text-steel-600"
                                : stokYok
                                  ? "bg-red-50 text-danger"
                                  : azStok
                                    ? "bg-amber-50 text-warn"
                                    : "bg-emerald-50 text-ok")
                            }
                          >
                            {p.onRequest ? "sipariş" : p.stock}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-1">
                            <Rozet ton={p.hidden ? "gri" : "ok"}>{p.hidden ? "Gizli" : "Yayında"}</Rozet>
                            {p.featured && <Rozet ton="gold">Öne çıkan</Rozet>}
                          </div>
                        </Td>
                        <Td sag>
                          <Link
                            href={`${kok}/${p.id}`}
                            className="text-[12.4px] font-bold text-navy-600 hover:text-gold"
                          >
                            Düzenle
                          </Link>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tablo>
            </form>
          )}

          <Sayfalama sayfa={sayfa} sonSayfa={sonSayfa} toplam={toplam} url={(x) => url({ s: x })} />

          {/* hızlı yayın açma/kapama — toplu formun dışında ayrı form */}
          <form action={yayinDegistir} className="hidden" />
        </div>
      </div>
    </Sayfa>
  );
}
