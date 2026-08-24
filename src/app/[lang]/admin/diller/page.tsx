import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang, type Lang } from "@/lib/i18n";
import { dilEkle, dilDurumu } from "@/app/actions/ceviri";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";

export const dynamic = "force-dynamic";

export default async function DillerPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  // Veritabanı yoksa hiç bağlanmayı deneme — kurulum ekranını göster.
  if (!dbVar) return <VeritabaniGerekli lang={l} sayfa="Diller" />;

  let diller, urunSayisi;
  try {
    diller = await db.language.findMany({ orderBy: { sort: "asc" } });
    urunSayisi = await db.product.count();
  } catch (e) {
    return <VeritabaniGerekli lang={l} sayfa="Diller" hata={String(e).slice(0, 300)} />;
  }

  // dil başına kapsam
  const kapsam = await Promise.all(
    diller.map(async (d) => {
      const [ad, aciklama, ozellik, elle, makine] = await Promise.all([
        db.productText.count({ where: { langCode: d.code, name: { not: "" } } }),
        db.productText.count({ where: { langCode: d.code, desc: { not: null } } }),
        db.specText.count({ where: { langCode: d.code } }),
        db.productText.count({ where: { langCode: d.code, origin: "manual" } }),
        db.productText.count({ where: { langCode: d.code, origin: "machine" } }),
      ]);
      return { ...d, ad, aciklama, ozellik, elle, makine };
    }),
  );

  const islemler = await db.translationRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 8,
  });

  return (
    <div className="mx-auto max-w-[1320px] px-[30px] py-8">
      <nav className="text-[12.6px] text-steel-500">
        <Link href={`/${l}`} className="hover:text-gold">Piro Gastro</Link>
        <span className="px-2">/</span>
        <Link href={`/${l}/admin/ceviriler`} className="hover:text-gold">Süper Admin</Link>
        <span className="px-2">/</span>
        <b className="text-navy-900">Diller</b>
      </nav>

      <h1 className="mt-3 text-[30px] font-extrabold tracking-tight text-navy-900">
        Dil yönetimi
      </h1>
      <p className="mt-1 text-steel-700">
        Yeni dil eklendiğinde tüm ürünler için o dilin alanları kendiliğinden açılır.
        Şema değişikliği gerekmez.
      </p>

      {/* --- mevcut diller --- */}
      <div className="mt-6 overflow-x-auto rounded-[10px] border border-steel-200">
        <table className="w-full text-[13.4px]">
          <thead className="bg-steel-50 text-left">
            <tr className="border-b border-steel-200">
              <th className="px-4 py-3">Dil</th>
              <th className="px-4 py-3">Kaynak</th>
              <th className="px-4 py-3">Para</th>
              <th className="px-4 py-3">Ürün adı</th>
              <th className="px-4 py-3">Açıklama</th>
              <th className="px-4 py-3">Özellik satırı</th>
              <th className="px-4 py-3">Elle / Makine</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody>
            {kapsam.map((d) => (
              <tr key={d.code} className="border-b border-steel-200 last:border-0">
                <td className="px-4 py-3">
                  <b className="text-navy-900">{d.name}</b>{" "}
                  <span className="font-mono text-[11.6px] text-steel-500">{d.code}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-steel-700">{d.sourceCode}</td>
                <td className="px-4 py-3 text-steel-700">{d.currency}</td>
                <td className="px-4 py-3">
                  {d.ad} / {urunSayisi}
                </td>
                <td className="px-4 py-3">
                  <span className={d.aciklama === 0 ? "text-danger" : d.aciklama < urunSayisi ? "text-warn" : "text-ok"}>
                    {d.aciklama} / {urunSayisi}
                  </span>
                </td>
                <td className="px-4 py-3">{d.ozellik.toLocaleString("tr-TR")}</td>
                <td className="px-4 py-3 text-[12.4px] text-steel-700">
                  {d.elle} elle · {d.makine} makine
                </td>
                <td className="px-4 py-3">
                  <form action={dilDurumu}>
                    <input type="hidden" name="code" value={d.code} />
                    <input type="hidden" name="enabled" value={d.enabled ? "0" : "1"} />
                    <button
                      type="submit"
                      className={
                        "cursor-pointer rounded px-2 py-1 text-[11.6px] font-semibold " +
                        (d.enabled ? "bg-emerald-50 text-ok" : "bg-steel-100 text-steel-700")
                      }
                    >
                      {d.enabled ? "açık" : "kapalı"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- yeni dil --- */}
      <div className="mt-8 rounded-[10px] border border-steel-200 p-5">
        <h2 className="text-[18px] font-extrabold text-navy-900">Yeni dil ekle</h2>
        <p className="mt-1 text-[13px] text-steel-700">
          Örnek: Rusça için kod <code className="font-mono">ru</code>, ad{" "}
          <code className="font-mono">Русский</code>, yerel <code className="font-mono">ru-RU</code>.
        </p>
        <form action={dilEkle} className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["code", "Kod", "ru", true],
            ["name", "Dil adı", "Русский", true],
            ["locale", "Yerel ayar", "ru-RU", false],
            ["currency", "Para birimi", "EUR", false],
            ["rate", "Kur", "1", false],
            ["sourceCode", "Kaynak dil", "en", false],
          ].map(([ad, etiket, ornek, zorunlu]) => (
            <label key={ad as string} className="block">
              <span className="mb-1 block text-[11.6px] font-semibold text-steel-700">
                {etiket as string}
              </span>
              <input
                name={ad as string}
                placeholder={ornek as string}
                required={!!zorunlu}
                defaultValue={ad === "sourceCode" ? "en" : ad === "currency" ? "EUR" : ad === "rate" ? "1" : ""}
                className="w-full rounded-md border border-steel-300 px-3 py-2 text-[13.4px] outline-none focus:border-gold"
              />
            </label>
          ))}
          <div className="sm:col-span-3 lg:col-span-6">
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-navy-900 px-6 py-2.5 text-[14px] font-bold text-white hover:bg-navy-800"
            >
              Dili ekle
            </button>
          </div>
        </form>

        <div className="mt-4 rounded-md bg-steel-50 p-4 text-[12.6px] leading-relaxed text-steel-700">
          Dil eklendikten sonra çevirileri doldurmak için:
          <code className="mt-2 block rounded bg-white px-3 py-2 font-mono text-[12px] text-navy-900">
            node scripts/ceviri-calistir.mjs ru --prova{"\n"}
            node scripts/ceviri-calistir.mjs ru
          </code>
          <span className="mt-2 block">
            İlk komut ne kadar çeviri yapılacağını ve kaç karakter tutacağını gösterir,
            API çağırmaz. İkincisi gerçekten çevirir ve veritabanına yazar.
          </span>
        </div>
      </div>

      {/* --- çeviri işlemleri --- */}
      {islemler.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[18px] font-extrabold text-navy-900">Son çeviri işlemleri</h2>
          <div className="mt-3 overflow-x-auto rounded-[10px] border border-steel-200">
            <table className="w-full text-[13px]">
              <thead className="bg-steel-50 text-left">
                <tr className="border-b border-steel-200">
                  <th className="px-4 py-2.5">Dil</th>
                  <th className="px-4 py-2.5">Sağlayıcı</th>
                  <th className="px-4 py-2.5">Yazılan</th>
                  <th className="px-4 py-2.5">Karakter</th>
                  <th className="px-4 py-2.5">Önbellek</th>
                  <th className="px-4 py-2.5">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {islemler.map((r) => (
                  <tr key={r.id} className="border-b border-steel-200 last:border-0">
                    <td className="px-4 py-2 font-mono">{r.langCode}</td>
                    <td className="px-4 py-2">{r.provider}</td>
                    <td className="px-4 py-2">{r.items}</td>
                    <td className="px-4 py-2">{r.chars.toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-2">{r.cacheHits}</td>
                    <td className="px-4 py-2 text-steel-700">
                      {new Date(r.startedAt).toLocaleString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
