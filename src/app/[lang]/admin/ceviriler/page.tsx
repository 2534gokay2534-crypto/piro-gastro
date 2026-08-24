import Link from "next/link";
import { notFound } from "next/navigation";
import { allVisibleProducts, mainCategories, type Product } from "@/lib/catalog";
import { LANG_DEFS, isLang, strict, isTranslated, title as urunAdi, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const SAYFA = 60;

type Durum = { ad: boolean; aciklama: boolean; ozellikOran: number; eksikOzellik: number };

function durum(p: Product, kod: string): Durum {
  const specs = p.specs ?? [];
  const cevrili = specs.filter((s) => s.i18n?.[kod]?.label).length;
  return {
    ad: isTranslated(p, "name", kod),
    aciklama: !!strict(p, "desc", kod),
    ozellikOran: specs.length ? cevrili / specs.length : 1,
    eksikOzellik: specs.length - cevrili,
  };
}

const Rozet = ({ ok, metin }: { ok: boolean; metin: string }) => (
  <span
    className={
      "inline-block rounded px-2 py-0.5 text-[11px] font-semibold " +
      (ok ? "bg-emerald-50 text-ok" : "bg-red-50 text-danger")
    }
  >
    {metin}
  </span>
);

export default async function CevirilerPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ d?: string; s?: string; f?: string; k?: string }>;
}) {
  const { lang } = await params;
  const { d, s, f, k } = await searchParams;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  const hedefDil = d && isLang(d) ? d : "tr";
  const sayfa = Math.max(1, Number(s) || 1);
  const suzgec = f ?? "eksik";              // eksik | tam | hepsi
  const katSuzgec = k ?? "";

  let urunler = allVisibleProducts();
  if (katSuzgec) urunler = urunler.filter((p) => p.categoryId === katSuzgec);

  const kayitlar = urunler.map((p) => ({ p, s: durum(p, hedefDil) }));
  const eksikMi = (x: Durum) => !x.ad || !x.aciklama || x.ozellikOran < 1;

  const suzulen =
    suzgec === "eksik" ? kayitlar.filter((x) => eksikMi(x.s))
      : suzgec === "tam" ? kayitlar.filter((x) => !eksikMi(x.s))
        : kayitlar;

  const toplam = suzulen.length;
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));
  const dilim = suzulen.slice((sayfa - 1) * SAYFA, sayfa * SAYFA);

  // genel özet — her dil için
  const ozet = LANG_DEFS.map((L) => {
    const hepsi = allVisibleProducts();
    const d2 = hepsi.map((p) => durum(p, L.code));
    return {
      kod: L.code,
      ad: L.name,
      adTam: d2.filter((x) => x.ad).length,
      acTam: d2.filter((x) => x.aciklama).length,
      ozTam: d2.filter((x) => x.ozellikOran >= 1).length,
      toplam: hepsi.length,
    };
  });

  const url = (ek: Record<string, string | number>) => {
    const q = new URLSearchParams({ d: hedefDil, f: suzgec, ...(katSuzgec ? { k: katSuzgec } : {}) });
    for (const [a, b] of Object.entries(ek)) q.set(a, String(b));
    return `/${l}/admin/ceviriler?${q}`;
  };

  return (
    <div className="mx-auto max-w-[1320px] px-[30px] py-8">
      <nav className="text-[12.6px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">Piro Gastro</Link>
        <span className="px-2">/</span>
        <b className="text-navy-900">Süper Admin — Çeviri durumu</b>
      </nav>

      <h1 className="mt-3 text-[30px] font-extrabold tracking-tight text-navy-900">
        Çeviri durumu
      </h1>
      <p className="mt-1 text-steel-700">
        Eksik çeviriler kırmızı işaretlidir. Ürün metinleri yalnızca kendi dilinde
        gösterilir; çeviri yoksa müşteri sayfasında İngilizce metin görünmez.
      </p>

      {/* --- genel özet --- */}
      <div className="mt-6 overflow-x-auto rounded-[10px] border border-steel-200">
        <table className="w-full text-[13.4px]">
          <thead className="bg-steel-50 text-left">
            <tr className="border-b border-steel-200">
              <th className="px-4 py-3">Dil</th>
              <th className="px-4 py-3">Ürün adı</th>
              <th className="px-4 py-3">Açıklama</th>
              <th className="px-4 py-3">Teknik özellik</th>
            </tr>
          </thead>
          <tbody>
            {ozet.map((o) => (
              <tr key={o.kod} className="border-b border-steel-200 last:border-0">
                <td className="px-4 py-3 font-semibold text-navy-900">
                  {o.ad} <span className="font-mono text-[11.6px] text-steel-500">{o.kod}</span>
                </td>
                {[[o.adTam], [o.acTam], [o.ozTam]].map(([v], i) => (
                  <td key={i} className="px-4 py-3">
                    <span className={v === o.toplam ? "text-ok" : v === 0 ? "text-danger" : "text-warn"}>
                      {v} / {o.toplam}
                    </span>
                    <span className="ml-2 text-[11.6px] text-steel-500">
                      %{Math.round((v / o.toplam) * 100)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- süzgeçler --- */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="text-[12.6px] font-semibold text-steel-700">Dil:</span>
        {LANG_DEFS.map((L) => (
          <Link
            key={L.code}
            href={url({ d: L.code, s: 1 })}
            className={
              "rounded-full border px-3 py-1 text-[12.6px] " +
              (L.code === hedefDil
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-steel-200 hover:border-gold")
            }
          >
            {L.name}
          </Link>
        ))}

        <span className="ml-4 text-[12.6px] font-semibold text-steel-700">Göster:</span>
        {[["eksik", "Eksik olanlar"], ["tam", "Tamamlananlar"], ["hepsi", "Hepsi"]].map(([v, ad]) => (
          <Link
            key={v}
            href={url({ f: v, s: 1 })}
            className={
              "rounded-full border px-3 py-1 text-[12.6px] " +
              (v === suzgec
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-steel-200 hover:border-gold")
            }
          >
            {ad}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={url({ k: "", s: 1 })}
          className={
            "rounded-full border px-3 py-1 text-[12px] " +
            (!katSuzgec ? "border-gold bg-gold-200/40" : "border-steel-200 hover:border-gold")
          }
        >
          Tüm kategoriler
        </Link>
        {mainCategories().map((c) => (
          <Link
            key={c.id}
            href={url({ k: c.id, s: 1 })}
            className={
              "rounded-full border px-3 py-1 text-[12px] " +
              (katSuzgec === c.id ? "border-gold bg-gold-200/40" : "border-steel-200 hover:border-gold")
            }
          >
            {c.i18n?.[l]?.name ?? c.i18n?.en?.name}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-[13.4px] text-steel-700">
        <b className="text-navy-900">{toplam}</b> ürün listeleniyor
      </p>

      {/* --- ürün listesi --- */}
      <div className="mt-3 overflow-x-auto rounded-[10px] border border-steel-200">
        <table className="w-full text-[13px]">
          <thead className="bg-steel-50 text-left">
            <tr className="border-b border-steel-200">
              <th className="px-4 py-3">Stok kodu</th>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3">Ad</th>
              <th className="px-4 py-3">Açıklama</th>
              <th className="px-4 py-3">Teknik özellik</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {dilim.map(({ p, s: st }) => (
              <tr key={p.id} className="border-b border-steel-200 last:border-0">
                <td className="px-4 py-2.5 font-mono text-[11.6px] text-steel-500">{p.sku}</td>
                <td className="max-w-[320px] px-4 py-2.5">
                  <span className="line-clamp-1 text-navy-900">{urunAdi(p, "en")}</span>
                </td>
                <td className="px-4 py-2.5">
                  <Rozet ok={st.ad} metin={st.ad ? "çevrildi" : "eksik"} />
                </td>
                <td className="px-4 py-2.5">
                  <Rozet ok={st.aciklama} metin={st.aciklama ? "çevrildi" : "eksik"} />
                </td>
                <td className="px-4 py-2.5">
                  {(p.specs ?? []).length === 0 ? (
                    <span className="text-[11.6px] text-steel-500">özellik yok</span>
                  ) : (
                    <Rozet
                      ok={st.ozellikOran >= 1}
                      metin={
                        st.ozellikOran >= 1
                          ? "tam"
                          : `${st.eksikOzellik} satır eksik`
                      }
                    />
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/${hedefDil}/urun/${p.slug}`}
                    className="text-[12.2px] font-semibold text-navy-600 hover:text-gold"
                  >
                    aç →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sonSayfa > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {sayfa > 1 && (
            <Link href={url({ s: sayfa - 1 })} className="rounded border border-steel-200 px-4 py-2 text-[13px] hover:border-gold">←</Link>
          )}
          <span className="px-3 text-[13px] text-steel-700">{sayfa} / {sonSayfa}</span>
          {sayfa < sonSayfa && (
            <Link href={url({ s: sayfa + 1 })} className="rounded border border-steel-200 px-4 py-2 text-[13px] hover:border-gold">→</Link>
          )}
        </div>
      )}

      <div className="mt-10 rounded-[10px] border border-steel-200 bg-steel-50 p-5 text-[13.2px] leading-relaxed text-steel-700">
        <b className="text-navy-900">Yeni dil eklemek</b>
        <p className="mt-2">
          Dil listesi kodda sabit değil, veriden okunur. Yeni bir dil eklemek için
          <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">src/data/catalog.json</code>
          içindeki <code className="font-mono text-[12px]">languages</code> dizisine
          kod, ad, yerel ayar ve para birimini içeren bir kayıt eklemek yeterlidir.
          Rotalar (<code className="font-mono text-[12px]">/de/…</code>), dil seçici ve bu
          ekran o dili kendiliğinden tanır; ürün metinleri
          <code className="mx-1 font-mono text-[12px]">i18n</code> haritasına o dilin
          anahtarıyla yazılır.
        </p>
      </div>
    </div>
  );
}
