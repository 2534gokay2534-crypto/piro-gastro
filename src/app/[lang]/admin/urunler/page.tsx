import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { para, sayi, dilAdi } from "@/lib/admin-ui";
import { topluIslem } from "@/app/actions/admin-urun";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import Icon from "@/components/Icon";
import UrunSatiri from "@/components/admin/UrunSatiri";
import {
  AramaCubugu, Bos, DUGME, Kart, Kutu, Sayfa, Sayfalama, Secim,
} from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const SAYFA = 24;

type Ara = {
  q?: string;
  k?: string;   // kategori
  a?: string;   // alt kategori
  d?: string;   // durum
  s?: string;   // sayfa
  sir?: string; // sıralama
};

/**
 * SÜPER ADMIN — ÜRÜNLER
 *
 * İki görünüm:
 *   1) Kategori kartları — ikonlu, yönetici uyarılarıyla (stok yok, gizli,
 *      indirimli, liste değeri). Müşteri menüsünün kopyası değildir.
 *   2) Ürün listesi — seçilen kategorinin ürünleri; fiyat, indirim, stok,
 *      yayın durumu, kategori ve görseller satırın içinden yönetilir.
 *
 * Buradaki her değişiklik mağazaya anında yansır (katalog nesnesi yerinde
 * güncellenir, ayrıca catalog.json'a yazılır).
 */

async function kategoriOzetleri(lang: string) {
  const [kategoriler, sayimlar, gizliler, stoksuzlar, kampanyalilar, degerler] = await Promise.all([
    db.category.findMany({
      orderBy: { sort: "asc" },
      select: {
        id: true, parentId: true, icon: true, slug: true,
        texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
      },
    }),
    db.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
    db.product.groupBy({ by: ["categoryId"], where: { hidden: true }, _count: { _all: true } }),
    db.product.groupBy({ by: ["categoryId"], where: { stock: { lte: 0 }, onRequest: false }, _count: { _all: true } }),
    db.product.groupBy({ by: ["categoryId"], where: { campaignOn: true }, _count: { _all: true } }),
    db.product.groupBy({ by: ["categoryId"], _sum: { priceCents: true } }),
  ]);

  const say = (l: Array<{ categoryId: string; _count: { _all: number } }>) =>
    new Map(l.map((x) => [x.categoryId, x._count._all]));

  const toplam = say(sayimlar);
  const gizli = say(gizliler);
  const stoksuz = say(stoksuzlar);
  const kampanya = say(kampanyalilar);
  const deger = new Map(degerler.map((x) => [x.categoryId, x._sum.priceCents ?? 0]));

  const ana = kategoriler.filter((c) => !c.parentId);

  return ana.map((c) => {
    const altlar = kategoriler.filter((x) => x.parentId === c.id);
    const ids = [c.id, ...altlar.map((a) => a.id)];
    const topla = (m: Map<string, number>) => ids.reduce((t, id) => t + (m.get(id) ?? 0), 0);

    return {
      id: c.id,
      ad: dilAdi(c.texts, lang, c.slug),
      ikon: c.icon ?? "grid",
      urun: topla(toplam),
      gizli: topla(gizli),
      stoksuz: topla(stoksuz),
      kampanya: topla(kampanya),
      deger: topla(deger),
      alt: altlar.map((a) => ({ id: a.id, ad: dilAdi(a.texts, lang, a.slug), urun: toplam.get(a.id) ?? 0 })),
    };
  });
}

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
  const alt = sp.a ?? "";
  const durum = sp.d ?? "";
  const sayfaNo = Math.max(1, Number(sp.s) || 1);
  const sir = sp.sir ?? "buyuk";

  /* ============ 1) KATEGORİ KARTLARI ============ */
  if (!kat && !q && !durum) {
    let kartlar: Awaited<ReturnType<typeof kategoriOzetleri>> = [];
    let ozet = { hepsi: 0, yayinda: 0, gizli: 0, stoksuz: 0, kampanya: 0 };
    try {
      const [k, hepsi, yayinda, stoksuz, kampanya] = await Promise.all([
        kategoriOzetleri(lang),
        db.product.count(),
        db.product.count({ where: { hidden: false } }),
        db.product.count({ where: { stock: { lte: 0 }, onRequest: false } }),
        db.product.count({ where: { campaignOn: true } }),
      ]);
      kartlar = k;
      ozet = { hepsi, yayinda, gizli: hepsi - yayinda, stoksuz, kampanya };
    } catch (e) {
      return <VeritabaniGerekli lang={lang} sayfa="Ürünler" hata={String(e)} />;
    }

    return (
      <Sayfa
        baslik="Ürünler"
        ozet={`${sayi(ozet.hepsi)} ürün · ${sayi(kartlar.length)} kategori`}
        eylem={
          <>
            <Link href={`/${lang}/admin/kategoriler`} className={DUGME.sade}>Kategoriler</Link>
            <Link href={`${kok}/yeni`} className={DUGME.ana}>+ Yeni ürün</Link>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kart etiket="Toplam ürün" deger={sayi(ozet.hepsi)} alt={`${sayi(ozet.yayinda)} yayında`} />
          <Kart etiket="Yayından kaldırılmış" deger={sayi(ozet.gizli)} renk={ozet.gizli ? "warn" : "ok"} />
          <Kart etiket="Stokta yok" deger={sayi(ozet.stoksuz)} renk={ozet.stoksuz ? "danger" : "ok"} />
          <Kart etiket="İndirimli" deger={sayi(ozet.kampanya)} renk={ozet.kampanya ? "gold" : "navy"} />
        </div>

        <div className="mt-4">
          <AramaCubugu eylem={kok} q="" yerTutucu="Tüm kategorilerde ürün adı veya stok kodu ara…">
            <button type="submit" className={DUGME.koyu}>Ara</button>
          </AramaCubugu>
        </div>

        <h2 className="mt-5 mb-2 text-[15px] font-extrabold text-navy-900">Kategori seçin</h2>

        {kartlar.length === 0 ? (
          <Bos metin="Kategori yok. Önce Kategoriler ekranından kategori oluşturun." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {kartlar.map((c) => (
              <Link
                key={c.id}
                href={`${kok}?k=${c.id}`}
                className="group flex flex-col rounded-[12px] border border-steel-200 bg-white p-4 transition hover:border-gold hover:shadow-c2"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-navy-950 text-gold transition group-hover:bg-gold group-hover:text-navy-950">
                    <Icon name={c.ikon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.4px] font-extrabold leading-snug text-navy-900">{c.ad}</span>
                    <span className="mt-0.5 block text-[12.4px] text-steel-500">
                      {sayi(c.urun)} ürün{c.alt.length > 0 && ` · ${c.alt.length} alt kategori`}
                    </span>
                  </span>
                </div>

                {/* yönetici uyarıları — müşteri menüsünde olmayan bilgiler */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.stoksuz > 0 && (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10.8px] font-bold text-danger">
                      {sayi(c.stoksuz)} stok yok
                    </span>
                  )}
                  {c.gizli > 0 && (
                    <span className="rounded bg-steel-100 px-1.5 py-0.5 text-[10.8px] font-bold text-steel-600">
                      {sayi(c.gizli)} gizli
                    </span>
                  )}
                  {c.kampanya > 0 && (
                    <span className="rounded bg-gold-200 px-1.5 py-0.5 text-[10.8px] font-bold text-gold-800">
                      {sayi(c.kampanya)} indirimli
                    </span>
                  )}
                  {c.urun > 0 && c.stoksuz === 0 && c.gizli === 0 && c.kampanya === 0 && (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10.8px] font-bold text-ok">sorun yok</span>
                  )}
                </div>

                <div className="mt-auto flex items-end justify-between pt-3">
                  <span className="text-[11.4px] text-steel-500">
                    liste değeri <b className="text-navy-900">{para(c.deger, false)}</b>
                  </span>
                  <span className="text-[12.4px] font-bold text-navy-600 transition group-hover:text-gold">Yönet →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`${kok}?d=stokyok`} className={DUGME.sade}>Stokta olmayanlar</Link>
          <Link href={`${kok}?d=gizli`} className={DUGME.sade}>Yayından kaldırılanlar</Link>
          <Link href={`${kok}?d=kampanya`} className={DUGME.sade}>İndirimli ürünler</Link>
          <Link href={`${kok}?d=azstok`} className={DUGME.sade}>Az stoklular</Link>
        </div>
      </Sayfa>
    );
  }

  /* ============ 2) ÜRÜN LİSTESİ ============ */

  const kosul: Record<string, unknown> = {};
  if (alt) kosul.subId = alt;
  else if (kat) kosul.OR = [{ categoryId: kat }, { subId: kat }];
  if (durum === "yayinda") kosul.hidden = false;
  if (durum === "gizli") kosul.hidden = true;
  if (durum === "stokyok") { kosul.stock = { lte: 0 }; kosul.onRequest = false; }
  if (durum === "azstok") { kosul.stock = { gt: 0, lte: 5 }; }
  if (durum === "kampanya") kosul.campaignOn = true;
  if (q) {
    kosul.AND = [{
      OR: [
        { sku: { contains: q } },
        { slug: { contains: q } },
        { texts: { some: { name: { contains: q } } } },
      ],
    }];
  }

  // Varsayılan: mağazadakiyle birebir aynı sıra — büyük/ana ürünler önce.
  const siralama =
    sir === "fiyatArtan" ? [{ priceCents: "asc" as const }]
      : sir === "fiyatAzalan" ? [{ priceCents: "desc" as const }]
        : sir === "stokAz" ? [{ stock: "asc" as const }]
          : sir === "cokSatan" ? [{ sold: "desc" as const }]
            : sir === "yeni" ? [{ createdAt: "desc" as const }]
              : [
                  { featured: "desc" as const },
                  { sortRank: "desc" as const },
                  { priceCents: "desc" as const },
                  { sold: "desc" as const },
                  { sku: "asc" as const },
                ];

  let toplam = 0;
  let urunler: Array<{
    id: string; sku: string; slug: string; priceCents: number; costCents: number;
    stock: number; threshold: number; hidden: boolean; featured: boolean;
    onRequest: boolean; campaignOn: boolean; campaignPercent: number; sold: number;
    categoryId: string; subId: string | null;
    texts: Array<{ name: string; langCode: string }>;
    images: Array<{ url: string }>;
    _count: { images: number };
  }> = [];
  let kategoriler: Array<{ id: string; ad: string; ikon: string; alt: Array<{ id: string; ad: string; urun: number }> }> = [];

  try {
    const [t, u, k] = await Promise.all([
      db.product.count({ where: kosul }),
      db.product.findMany({
        where: kosul,
        orderBy: siralama,
        skip: (sayfaNo - 1) * SAYFA,
        take: SAYFA,
        select: {
          id: true, sku: true, slug: true, priceCents: true, costCents: true,
          stock: true, threshold: true, hidden: true, featured: true,
          onRequest: true, campaignOn: true, campaignPercent: true, sold: true,
          categoryId: true, subId: true,
          texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
          images: { take: 1, orderBy: { sort: "asc" }, select: { url: true } },
          _count: { select: { images: true } },
        },
      }),
      kategoriOzetleri(lang),
    ]);
    toplam = t;
    urunler = u;
    kategoriler = k.map((c) => ({ id: c.id, ad: c.ad, ikon: c.ikon, alt: c.alt }));
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Ürünler" hata={String(e)} />;
  }

  const secili = kategoriler.find((c) => c.id === kat);
  const seciliAlt = secili?.alt.find((a) => a.id === alt);
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));

  // İşlem sonrası dönülecek adres — süzgeçler korunsun
  const sorgu = (s: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (kat) p.set("k", kat);
    if (alt) p.set("a", alt);
    if (durum) p.set("d", durum);
    if (s > 1) p.set("s", String(s));
    if (sir !== "buyuk") p.set("sir", sir);
    return p.toString() ? `${kok}?${p.toString()}` : kok;
  };
  const geriAdres = sorgu(sayfaNo);

  const baslik = seciliAlt?.ad ?? secili?.ad ?? (q ? `“${q}” araması` : "Süzülmüş ürünler");

  return (
    <Sayfa
      baslik={baslik}
      ozet={`${sayi(toplam)} ürün${secili && !seciliAlt ? " · alt kategoriler dahil" : ""}`}
      eylem={
        <>
          <Link href={kok} className={DUGME.sade}>← Kategoriler</Link>
          <Link href={`${kok}/yeni`} className={DUGME.ana}>+ Yeni ürün</Link>
        </>
      }
    >
      {/* --- kategori şeridi --- */}
      {secili && (
        <Kutu className="mb-4 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-950 text-gold">
              <Icon name={secili.ikon} className="h-4 w-4" />
            </span>
            <Link
              href={`${kok}?k=${secili.id}`}
              className={
                "rounded-full px-3 py-1 text-[12.6px] font-bold transition " +
                (!alt ? "bg-navy-900 text-white" : "bg-steel-100 text-steel-700 hover:bg-steel-200")
              }
            >
              Tümü
            </Link>
            {secili.alt.map((a) => (
              <Link
                key={a.id}
                href={`${kok}?k=${secili.id}&a=${a.id}`}
                className={
                  "rounded-full px-3 py-1 text-[12.6px] font-bold transition " +
                  (alt === a.id ? "bg-navy-900 text-white" : "bg-steel-100 text-steel-700 hover:bg-steel-200")
                }
              >
                {a.ad} <span className="opacity-60">{a.urun}</span>
              </Link>
            ))}
          </div>
        </Kutu>
      )}

      {/* --- arama ve süzgeç --- */}
      <AramaCubugu eylem={kok} q={q} yerTutucu="Ürün adı veya stok kodu ara…" gizli={{ k: kat, a: alt }}>
        <Secim
          ad="d"
          deger={durum}
          secenekler={[
            { v: "", a: "Tüm durumlar" },
            { v: "yayinda", a: "Yayında" },
            { v: "gizli", a: "Gizli" },
            { v: "stokyok", a: "Stokta yok" },
            { v: "azstok", a: "Az stok" },
            { v: "kampanya", a: "İndirimli" },
          ]}
        />
        <Secim
          ad="sir"
          deger={sir}
          secenekler={[
            { v: "buyuk", a: "Büyükten küçüğe (mağaza sırası)" },
            { v: "yeni", a: "En yeni" },
            { v: "fiyatArtan", a: "Fiyat ↑" },
            { v: "fiyatAzalan", a: "Fiyat ↓" },
            { v: "stokAz", a: "Stok azdan" },
            { v: "cokSatan", a: "Çok satan" },
          ]}
        />
        <button type="submit" className={DUGME.koyu}>Uygula</button>
        {(q || durum || alt) && (
          <Link href={kat ? `${kok}?k=${kat}` : kok} className="text-[12.6px] font-semibold text-steel-500 hover:text-gold">
            Temizle
          </Link>
        )}
      </AramaCubugu>

      {urunler.length === 0 ? (
        <div className="mt-4">
          <Bos metin="Bu süzgeçle ürün bulunamadı." />
        </div>
      ) : (
        <>
          {/* --- ürün satırları ---
              Onay kutuları HTML5 form özniteliğiyle aşağıdaki toplu işlem
              formuna bağlanır; böylece satır içi formlar iç içe girmez. */}
          <div className="mt-4 space-y-2">
            {urunler.map((u) => (
              <div key={u.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="sec"
                  value={u.id}
                  aria-label={`${u.sku} seç`}
                  form="topluForm"
                  className="mt-4 h-4 w-4 shrink-0 accent-navy-700"
                />
                <div className="min-w-0 flex-1">
                  <UrunSatiri
                    lang={lang}
                    geriDon={geriAdres}
                    kategoriler={kategoriler}
                    u={{
                      id: u.id, sku: u.sku, slug: u.slug,
                      priceCents: u.priceCents, costCents: u.costCents,
                      stock: u.stock, threshold: u.threshold,
                      hidden: u.hidden, featured: u.featured, onRequest: u.onRequest,
                      campaignOn: u.campaignOn, campaignPercent: u.campaignPercent, sold: u.sold,
                      categoryId: u.categoryId, subId: u.subId,
                      ad: dilAdi(u.texts, lang, u.sku),
                      gorsel: u.images[0]?.url ?? null,
                      gorselSayisi: u._count.images,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* --- toplu işlem --- */}
          <form id="topluForm" action={topluIslem} className="mt-4 rounded-[10px] border border-steel-200 bg-white p-4">
            <h3 className="text-[13.4px] font-extrabold text-navy-900">Seçili ürünlere toplu işlem</h3>
            <div className="mt-2.5 flex flex-wrap items-end gap-2.5">
              <label className="block">
                <span className="block text-[11.4px] font-bold text-navy-900">İşlem</span>
                <select name="islem" className="mt-1 rounded-[8px] border border-steel-300 px-3 py-2 text-[13px] outline-none focus:border-navy-500">
                  <option value="yayinla">Yayına al</option>
                  <option value="gizle">Yayından kaldır</option>
                  <option value="oneCikar">Öne çıkar</option>
                  <option value="oneCikarma">Öne çıkarmayı kaldır</option>
                  <option value="fiyatYuzde">Fiyatı yüzde değiştir</option>
                  <option value="stokAyarla">Stoğu ayarla</option>
                  <option value="kategori">Kategori değiştir</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-[11.4px] font-bold text-navy-900">Yüzde</span>
                <input name="yuzde" placeholder="−10" className="mt-1 w-[92px] rounded-[8px] border border-steel-300 px-3 py-2 text-[13px] outline-none focus:border-navy-500" />
              </label>
              <label className="block">
                <span className="block text-[11.4px] font-bold text-navy-900">Yeni stok</span>
                <input name="yeniStok" placeholder="25" className="mt-1 w-[92px] rounded-[8px] border border-steel-300 px-3 py-2 text-[13px] outline-none focus:border-navy-500" />
              </label>
              <label className="block">
                <span className="block text-[11.4px] font-bold text-navy-900">Hedef kategori</span>
                <select name="hedefKategori" className="mt-1 rounded-[8px] border border-steel-300 px-3 py-2 text-[13px] outline-none focus:border-navy-500">
                  <option value="">— kategori —</option>
                  {kategoriler.map((c) => (
                    <option key={c.id} value={c.id}>{c.ad}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className={DUGME.tehlike}>Seçililere uygula</button>
            </div>
            <p className="mt-2 text-[11.8px] text-steel-500">
              İşlem yalnızca yukarıda kutusunu işaretlediğiniz ürünlere uygulanır.
            </p>
          </form>
        </>
      )}

      {sonSayfa > 1 && (
        <div className="mt-4">
          <Sayfalama sayfa={sayfaNo} sonSayfa={sonSayfa} toplam={toplam} url={sorgu} />
        </div>
      )}
    </Sayfa>
  );
}
