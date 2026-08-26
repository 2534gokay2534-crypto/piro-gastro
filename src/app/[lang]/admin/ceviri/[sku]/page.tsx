import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang, type Lang } from "@/lib/i18n";
import { urunMetniKaydet, ozellikMetniKaydet, kilidiAc } from "@/app/actions/ceviri";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";

export const dynamic = "force-dynamic";

const Kaynak = ({ o, kilit }: { o: string; kilit: boolean }) => {
  const renk =
    o === "manual" ? "bg-emerald-50 text-ok"
      : o === "source" ? "bg-steel-100 text-steel-700"
        : "bg-amber-50 text-warn";
  const ad = o === "manual" ? "elle düzeltildi" : o === "source" ? "özgün" : "otomatik çeviri";
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${renk}`}>
      {ad}{kilit ? " · kilitli" : ""}
    </span>
  );
};

export default async function CeviriDuzenle({
  params,
}: {
  params: Promise<{ lang: string; sku: string }>;
}) {
  const { lang, sku } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  if (!dbVar) return <VeritabaniGerekli lang={l} sayfa="Çeviri düzenle" />;

  let urun, diller;
  try {
    urun = await db.product.findUnique({
      where: { sku: decodeURIComponent(sku) },
      include: {
        texts: true,
        specs: { orderBy: { sort: "asc" }, include: { texts: true } },
      },
    });
    diller = await db.language.findMany({ where: { enabled: true }, orderBy: { sort: "asc" } });
  } catch (e) {
    return <VeritabaniGerekli lang={l} sayfa="Çeviri düzenle" hata={gizliTemizle(e)} />;
  }
  if (!urun) notFound();
  const metin = (kod: string) => urun.texts.find((t) => t.langCode === kod);

  return (
    <div className="mx-auto max-w-[1100px] px-[30px] py-8">
      <nav className="text-[12.6px] text-steel-500">
        <Link href={`/${l}/admin/ceviriler`} className="hover:text-gold">Süper Admin</Link>
        <span className="px-2">/</span>
        <b className="text-navy-900">{urun.sku}</b>
      </nav>

      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-navy-900">
        Çeviri düzenle
      </h1>
      <p className="mt-1 text-[13.4px] text-steel-700">
        Elle kaydettiğiniz metin <b>kilitlenir</b> — otomatik çeviri bir daha üzerine yazmaz.
      </p>

      {/* --- ad + açıklama --- */}
      <div className="mt-6 space-y-4">
        {diller.map((d) => {
          const m = metin(d.code);
          return (
            <form
              key={d.code}
              action={urunMetniKaydet}
              className="rounded-[10px] border border-steel-200 p-4"
            >
              <input type="hidden" name="productId" value={urun.id} />
              <input type="hidden" name="langCode" value={d.code} />

              <div className="mb-3 flex flex-wrap items-center gap-3">
                <b className="text-[15px] text-navy-900">{d.name}</b>
                <span className="font-mono text-[11.6px] text-steel-500">{d.code}</span>
                {m ? <Kaynak o={m.origin} kilit={m.locked} /> : (
                  <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-danger">
                    çeviri yok
                  </span>
                )}
              </div>

              <label className="block">
                <span className="mb-1 block text-[11.6px] font-semibold text-steel-700">Ürün adı</span>
                <input
                  name="name"
                  defaultValue={m?.name ?? ""}
                  className="w-full rounded-md border border-steel-300 px-3 py-2 text-[14px] outline-none focus:border-gold"
                />
              </label>

              <label className="mt-3 block">
                <span className="mb-1 block text-[11.6px] font-semibold text-steel-700">Açıklama</span>
                <textarea
                  name="desc"
                  rows={4}
                  defaultValue={m?.desc ?? ""}
                  className="w-full rounded-md border border-steel-300 px-3 py-2 text-[13.4px] leading-relaxed outline-none focus:border-gold"
                />
              </label>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="submit"
                  className="cursor-pointer rounded-md bg-navy-900 px-5 py-2 text-[13.4px] font-bold text-white hover:bg-navy-800"
                >
                  Kaydet ve kilitle
                </button>
                {m?.locked && (
                  <button
                    type="submit"
                    formAction={kilidiAc}
                    className="cursor-pointer rounded-md border border-steel-300 px-4 py-2 text-[13px] text-steel-700 hover:border-gold"
                  >
                    Kilidi aç
                  </button>
                )}
              </div>
            </form>
          );
        })}
      </div>

      {/* --- teknik özellikler --- */}
      {urun.specs.length > 0 && (
        <>
          <h2 className="mt-10 text-[20px] font-extrabold text-navy-900">
            Teknik özellikler ({urun.specs.length} satır)
          </h2>
          <div className="mt-3 space-y-3">
            {urun.specs.slice(0, 40).map((s) => {
              const kaynak = s.texts.find((t) => t.langCode === "en");
              return (
                <div key={s.id} className="rounded-[10px] border border-steel-200 p-3">
                  <div className="mb-2 text-[12.4px] text-steel-500">
                    Özgün: <b className="text-navy-900">{kaynak?.label ?? "—"}</b> = {kaynak?.value ?? "—"}
                  </div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    {diller.filter((d) => d.code !== "en").map((d) => {
                      const st = s.texts.find((t) => t.langCode === d.code);
                      return (
                        <form key={d.code} action={ozellikMetniKaydet} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="specId" value={s.id} />
                          <input type="hidden" name="langCode" value={d.code} />
                          <span className="w-8 font-mono text-[11.6px] text-steel-500">{d.code}</span>
                          <input
                            name="label"
                            defaultValue={st?.label ?? ""}
                            placeholder="etiket"
                            className="min-w-[120px] flex-1 rounded border border-steel-300 px-2 py-1.5 text-[12.6px] outline-none focus:border-gold"
                          />
                          <input
                            name="value"
                            defaultValue={st?.value ?? ""}
                            placeholder="değer"
                            className="min-w-[120px] flex-1 rounded border border-steel-300 px-2 py-1.5 text-[12.6px] outline-none focus:border-gold"
                          />
                          <button
                            type="submit"
                            className="cursor-pointer rounded border border-steel-300 px-3 py-1.5 text-[12px] hover:border-gold"
                          >
                            ✓
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {urun.specs.length > 40 && (
            <p className="mt-3 text-[12.6px] text-steel-500">
              İlk 40 satır gösteriliyor ({urun.specs.length} satırdan).
            </p>
          )}
        </>
      )}
    </div>
  );
}
