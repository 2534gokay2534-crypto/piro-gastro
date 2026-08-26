import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { para, sayi, tarihSaat, dilAdi} from "@/lib/admin-ui";
import { stokGuncelle, topluIslem } from "@/app/actions/admin-urun";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import {
  AramaCubugu, Bos, DUGME, Kart, Kutu, Sayfa, Sayfalama, Secim, Tablo, Td, Th,
} from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const SAYFA = 50;

export default async function StokPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; d?: string; s?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Stok Yönetimi" />;

  const kok = `/${lang}/admin/stok`;
  const q = (sp.q ?? "").trim();
  const durum = sp.d ?? "kritik";
  const sayfa = Math.max(1, Number(sp.s) || 1);

  const kosul: Record<string, unknown> = { onRequest: false };
  if (durum === "kritik") kosul.stock = { lte: 5 };
  else if (durum === "yok") kosul.stock = { lte: 0 };
  else if (durum === "az") kosul.stock = { gt: 0, lte: 5 };
  else if (durum === "var") kosul.stock = { gt: 5 };
  if (q) {
    kosul.OR = [{ sku: { contains: q } }, { texts: { some: { name: { contains: q } } } }];
  }

  let toplam = 0, urunler, hareketler, ozet;
  try {
    [toplam, urunler, hareketler, ozet] = await Promise.all([
      db.product.count({ where: kosul }),
      db.product.findMany({
        where: kosul,
        orderBy: [{ stock: "asc" }, { sold: "desc" }],
        skip: (sayfa - 1) * SAYFA,
        take: SAYFA,
        select: {
          id: true, sku: true, stock: true, threshold: true, priceCents: true, costCents: true, sold: true,
          texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } },
          category: { select: { texts: { where: { langCode: { in: [lang, "en"] } }, select: { name: true, langCode: true } } } },
        },
      }),
      db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      (async () => {
        const [yok, az, toplamAdet, deger] = await Promise.all([
          db.product.count({ where: { stock: { lte: 0 }, onRequest: false } }),
          db.product.count({ where: { stock: { gt: 0, lte: 5 }, onRequest: false } }),
          db.product.aggregate({ _sum: { stock: true } }),
          db.product.findMany({ select: { stock: true, costCents: true }, where: { stock: { gt: 0 } } }),
        ]);
        const stokDegeri = deger.reduce((t, p) => t + p.stock * p.costCents, 0);
        return { yok, az, toplamAdet: toplamAdet._sum.stock ?? 0, stokDegeri };
      })(),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Stok Yönetimi" hata={gizliTemizle(e)} />;
  }

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));
  const url = (ek: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (durum) p.set("d", durum);
    for (const [a, b] of Object.entries(ek)) p.set(a, String(b));
    return `${kok}?${p}`;
  };

  return (
    <Sayfa
      baslik="Stok Yönetimi"
      ozet="Kritik seviyedeki ürünler önce gelir."
      eylem={
        <a href={`/api/admin/disa-aktar?tip=stok&lang=${lang}`} className={DUGME.sade}>
          Dışa aktar (CSV)
        </a>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Stokta yok" deger={sayi(ozet.yok)} renk={ozet.yok ? "danger" : "ok"} />
        <Kart etiket="Az stok (≤5)" deger={sayi(ozet.az)} renk={ozet.az ? "warn" : "ok"} />
        <Kart etiket="Toplam adet" deger={sayi(ozet.toplamAdet)} />
        <Kart etiket="Stok değeri" deger={para(ozet.stokDegeri, false)} alt="maliyet üzerinden" renk="gold" />
      </div>

      <div className="mt-4">
        <AramaCubugu eylem={kok} q={q} yerTutucu="Ürün adı veya stok kodu…">
          <Secim
            ad="d"
            deger={durum}
            etiket="Süzgeç"
            secenekler={[
              { v: "kritik", a: "Kritik (≤5)" },
              { v: "yok", a: "Stokta yok" },
              { v: "az", a: "Az stok" },
              { v: "var", a: "Stok var" },
              { v: "hepsi", a: "Tümü" },
            ]}
          />
        </AramaCubugu>
      </div>

      {urunler.length === 0 ? (
        <div className="mt-4"><Bos metin="Bu süzgeçle ürün yok — stok durumu iyi görünüyor." /></div>
      ) : (
        <form action={topluIslem} className="mt-4">
          <Kutu className="mb-3 flex flex-wrap items-center gap-2 p-3">
            <input type="hidden" name="islem" value="stokAyarla" />
            <span className="text-[12.4px] font-bold text-steel-700">Seçilenlerin stoğunu şu değere ayarla:</span>
            <input
              name="yeniStok"
              defaultValue="10"
              className="w-[90px] rounded-[8px] border border-steel-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-navy-500"
              inputMode="numeric"
            />
            <button type="submit" className={DUGME.koyu}>Uygula</button>
          </Kutu>

          <Tablo>
            <thead>
              <tr>
                <Th w="34px" orta><span className="sr-only">Seç</span></Th>
                <Th>Ürün</Th>
                <Th w="150px">Kategori</Th>
                <Th w="90px" orta>Stok</Th>
                <Th w="80px" orta>Eşik</Th>
                <Th w="110px" sag>Maliyet</Th>
                <Th w="190px" sag>Hızlı güncelle</Th>
              </tr>
            </thead>
            <tbody>
              {urunler.map((p) => (
                <tr key={p.id} className="hover:bg-steel-50">
                  <Td orta>
                    <input type="checkbox" name="sec" value={p.id} className="h-4 w-4 accent-navy-600" aria-label="Seç" />
                  </Td>
                  <Td>
                    <Link href={`/${lang}/admin/urunler/${p.id}`} className="font-semibold text-navy-900 hover:text-gold">
                      {dilAdi(p.texts, lang, p.sku)}
                    </Link>
                    <div className="font-mono text-[11.4px] text-steel-500">{p.sku}</div>
                  </Td>
                  <Td className="text-[12.4px] text-steel-700">{dilAdi(p.category.texts, lang)}</Td>
                  <Td orta>
                    <span
                      className={
                        "inline-block min-w-[34px] rounded px-1.5 py-0.5 text-[12.6px] font-bold tabular-nums " +
                        (p.stock <= 0 ? "bg-red-50 text-danger" : p.stock <= 5 ? "bg-amber-50 text-warn" : "bg-emerald-50 text-ok")
                      }
                    >
                      {p.stock}
                    </span>
                  </Td>
                  <Td orta className="tabular-nums text-steel-600">{p.threshold}</Td>
                  <Td sag className="tabular-nums text-steel-700">{para(p.costCents)}</Td>
                  <Td sag>
                    <span className="text-[11.6px] text-steel-500">satır formu aşağıda</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tablo>
        </form>
      )}

      {/* hızlı stok formları — toplu formun dışında olmalı (iç içe form olmaz) */}
      {urunler.length > 0 && (
        <Kutu className="mt-3 p-4">
          <h2 className="text-[13.4px] font-extrabold text-navy-900">Tek tek stok güncelle</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {urunler.slice(0, 24).map((p) => (
              <form key={p.id} action={stokGuncelle} className="flex items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <span className="min-w-0 flex-1 truncate text-[12.4px] text-steel-700" title={dilAdi(p.texts, lang, p.sku)}>
                  {dilAdi(p.texts, lang, p.sku)}
                </span>
                <input
                  name="stok"
                  defaultValue={p.stock}
                  className="w-[70px] rounded-[7px] border border-steel-300 px-2 py-1 text-[12.6px] tabular-nums outline-none focus:border-navy-500"
                  inputMode="numeric"
                  aria-label="Yeni stok"
                />
                <button type="submit" className="rounded-[7px] bg-navy-900 px-2.5 py-1 text-[12px] font-bold text-white hover:bg-navy-800">
                  Kaydet
                </button>
              </form>
            ))}
          </div>
          {urunler.length > 24 && (
            <p className="mt-2 text-[11.8px] text-steel-500">
              İlk 24 ürün gösteriliyor — kalanı için aramayı veya toplu işlemi kullanın.
            </p>
          )}
        </Kutu>
      )}

      <Sayfalama sayfa={sayfa} sonSayfa={sonSayfa} toplam={toplam} url={(x) => url({ s: x })} />

      <div className="mt-6">
        <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Son stok hareketleri</h2>
        {hareketler.length === 0 ? (
          <Bos metin="Henüz stok hareketi yok." />
        ) : (
          <Tablo>
            <thead>
              <tr>
                <Th w="160px">Tarih</Th>
                <Th w="140px">Stok kodu</Th>
                <Th w="100px" orta>Değişim</Th>
                <Th w="100px" orta>Önce → Sonra</Th>
                <Th>Sebep</Th>
              </tr>
            </thead>
            <tbody>
              {hareketler.map((h) => (
                <tr key={h.id}>
                  <Td className="text-[12.2px] text-steel-600">{tarihSaat(h.createdAt)}</Td>
                  <Td className="font-mono text-[12px]">{h.sku}</Td>
                  <Td orta>
                    <span className={"font-bold tabular-nums " + (h.delta >= 0 ? "text-ok" : "text-danger")}>
                      {h.delta > 0 ? "+" : ""}{h.delta}
                    </span>
                  </Td>
                  <Td orta className="tabular-nums text-steel-600">{h.before} → {h.after}</Td>
                  <Td className="text-[12.2px] text-steel-600">{h.reason}{h.note ? ` · ${h.note}` : ""}</Td>
                </tr>
              ))}
            </tbody>
          </Tablo>
        )}
      </div>
    </Sayfa>
  );
}
