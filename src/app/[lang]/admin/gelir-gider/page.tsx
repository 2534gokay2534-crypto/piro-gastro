import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { ODEME, para, tarih } from "@/lib/admin-ui";
import { kalemKaydet, kalemSil } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import {
  AramaCubugu, Bos, DUGME, Kart, Kutu, Rozet, Sayfa, Sayfalama, Secim, Tablo, Td, Th,
} from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const SAYFA = 40;
const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

const KATEGORILER = [
  "genel", "kira", "maaş", "nakliye", "reklam", "sigorta", "vergi",
  "elektrik-su", "yazılım", "bakım-onarım", "ofis", "banka",
];

const Alan = ({ etiket, children }: { etiket: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-[12px] font-bold text-navy-900">{etiket}</span>
    <span className="mt-1 block">{children}</span>
  </label>
);

export default async function GelirGider({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; t?: string; k?: string; s?: string; d?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Gelir-Gider" />;

  const kok = `/${lang}/admin/gelir-gider`;
  const q = (sp.q ?? "").trim();
  const tur = sp.t ?? "";
  const kategori = sp.k ?? "";
  const sayfa = Math.max(1, Number(sp.s) || 1);

  const kosul: Record<string, unknown> = {};
  if (tur) kosul.kind = tur;
  if (kategori) kosul.category = kategori;
  if (q) kosul.OR = [{ description: { contains: q } }, { note: { contains: q } }];

  let toplam = 0, liste, tedarikciler, ozet, duzenlenen = null;
  try {
    [toplam, liste, tedarikciler, ozet] = await Promise.all([
      db.expense.count({ where: kosul }),
      db.expense.findMany({
        where: kosul,
        orderBy: { date: "desc" },
        skip: (sayfa - 1) * SAYFA,
        take: SAYFA,
      }),
      db.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      (async () => {
        const ayBas = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const [gelir, gider] = await Promise.all([
          db.expense.aggregate({ _sum: { amountCents: true }, where: { kind: "income", date: { gte: ayBas } } }),
          db.expense.aggregate({ _sum: { amountCents: true }, where: { kind: "expense", date: { gte: ayBas } } }),
        ]);
        return { gelir: gelir._sum.amountCents ?? 0, gider: gider._sum.amountCents ?? 0 };
      })(),
    ]);
    if (sp.d) duzenlenen = await db.expense.findUnique({ where: { id: sp.d } });
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Gelir-Gider" hata={String(e)} />;
  }

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));
  const url = (ek: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (tur) p.set("t", tur);
    if (kategori) p.set("k", kategori);
    for (const [a, b] of Object.entries(ek)) p.set(a, String(b));
    return `${kok}?${p}`;
  };

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <Sayfa
      baslik="Gelir-Gider"
      ozet="Satış dışı gelirler ve işletme giderleri. Muhasebe ekranındaki net kâr bu kalemleri kullanır."
      eylem={
        <a href={`/api/admin/disa-aktar?tip=gelirgider&lang=${lang}`} className={DUGME.sade}>
          Dışa aktar (CSV)
        </a>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Kart etiket="Bu ay gelir" deger={para(ozet.gelir, false)} renk="ok" />
        <Kart etiket="Bu ay gider" deger={para(ozet.gider, false)} renk="danger" />
        <Kart
          etiket="Fark"
          deger={para(ozet.gelir - ozet.gider, false)}
          renk={ozet.gelir - ozet.gider >= 0 ? "ok" : "danger"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <AramaCubugu eylem={kok} q={q} yerTutucu="Açıklama veya not…">
            <Secim
              ad="t"
              deger={tur}
              etiket="Tür"
              secenekler={[
                { v: "", a: "Tümü" },
                { v: "income", a: "Gelir" },
                { v: "expense", a: "Gider" },
              ]}
            />
            <Secim
              ad="k"
              deger={kategori}
              etiket="Kategori"
              secenekler={[{ v: "", a: "Tümü" }, ...KATEGORILER.map((k) => ({ v: k, a: k }))]}
            />
          </AramaCubugu>

          <div className="mt-4">
            {liste.length === 0 ? (
              <Bos metin="Kayıt yok. Sağdaki formdan gelir veya gider ekleyin." />
            ) : (
              <Tablo>
                <thead>
                  <tr>
                    <Th w="100px">Tarih</Th>
                    <Th>Açıklama</Th>
                    <Th w="120px">Kategori</Th>
                    <Th w="100px" orta>Yöntem</Th>
                    <Th w="130px" sag>Tutar</Th>
                    <Th w="80px" sag>İşlem</Th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((k) => (
                    <tr key={k.id} className="hover:bg-steel-50">
                      <Td className="text-[12.4px] text-steel-600">{tarih(k.date)}</Td>
                      <Td>
                        <div className="font-semibold text-navy-900">{k.description}</div>
                        {k.note && <div className="text-[11.8px] text-steel-500">{k.note}</div>}
                      </Td>
                      <Td>
                        <Rozet ton={k.kind === "income" ? "ok" : "gri"}>{k.category}</Rozet>
                      </Td>
                      <Td orta className="text-[12.2px] text-steel-600">{ODEME[k.method] ?? k.method}</Td>
                      <Td sag>
                        <span className={"font-bold tabular-nums " + (k.kind === "income" ? "text-ok" : "text-danger")}>
                          {k.kind === "income" ? "+" : "−"}{para(k.amountCents)}
                        </span>
                        {k.vatCents > 0 && (
                          <div className="text-[11px] text-steel-500">KDV {para(k.vatCents)}</div>
                        )}
                      </Td>
                      <Td sag>
                        <Link href={`${kok}?d=${k.id}`} className="text-[12.4px] font-bold text-navy-600 hover:text-gold">
                          Düzenle
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tablo>
            )}
          </div>

          <Sayfalama sayfa={sayfa} sonSayfa={sonSayfa} toplam={toplam} url={(x) => url({ s: x })} />
        </div>

        {/* ---- form ---- */}
        <div>
          <Kutu className="space-y-3.5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-navy-900">
                {duzenlenen ? "Kalemi düzenle" : "Yeni kalem"}
              </h2>
              {duzenlenen && (
                <Link href={kok} className="text-[12px] font-bold text-steel-500 hover:text-gold">Vazgeç</Link>
              )}
            </div>

            <form action={kalemKaydet} className="space-y-3">
              {duzenlenen && <input type="hidden" name="id" value={duzenlenen.id} />}

              <Alan etiket="Tür">
                <select name="tur" defaultValue={duzenlenen?.kind ?? "expense"} className={girdi}>
                  <option value="expense">Gider</option>
                  <option value="income">Gelir</option>
                </select>
              </Alan>

              <Alan etiket="Açıklama">
                <input name="aciklama" defaultValue={duzenlenen?.description ?? ""} maxLength={300} className={girdi} required />
              </Alan>

              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="Tutar (€)">
                  <input
                    name="tutar"
                    defaultValue={duzenlenen ? (duzenlenen.amountCents / 100).toFixed(2) : ""}
                    className={girdi}
                    inputMode="decimal"
                    required
                  />
                </Alan>
                <Alan etiket="KDV (€)">
                  <input
                    name="kdv"
                    defaultValue={duzenlenen ? (duzenlenen.vatCents / 100).toFixed(2) : "0"}
                    className={girdi}
                    inputMode="decimal"
                  />
                </Alan>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="Kategori">
                  <select name="kategori" defaultValue={duzenlenen?.category ?? "genel"} className={girdi}>
                    {KATEGORILER.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </Alan>
                <Alan etiket="Yöntem">
                  <select name="yontem" defaultValue={duzenlenen?.method ?? "bank"} className={girdi}>
                    {Object.entries(ODEME).map(([v, a]) => (
                      <option key={v} value={v}>{a}</option>
                    ))}
                  </select>
                </Alan>
              </div>

              <Alan etiket="Tarih">
                <input
                  type="date"
                  name="tarih"
                  defaultValue={duzenlenen ? duzenlenen.date.toISOString().slice(0, 10) : bugun}
                  className={girdi}
                />
              </Alan>

              <Alan etiket="Tedarikçi (isteğe bağlı)">
                <select name="tedarikci" defaultValue={duzenlenen?.supplierId ?? ""} className={girdi}>
                  <option value="">—</option>
                  {tedarikciler.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Alan>

              <Alan etiket="Not">
                <textarea name="not" defaultValue={duzenlenen?.note ?? ""} rows={2} className={girdi + " resize-y"} />
              </Alan>

              <button type="submit" className={DUGME.ana + " w-full justify-center"}>
                {duzenlenen ? "Kaydet" : "Kalemi ekle"}
              </button>
            </form>

            {duzenlenen && (
              <form action={kalemSil} className="border-t border-steel-200 pt-3">
                <input type="hidden" name="id" value={duzenlenen.id} />
                <button type="submit" className={DUGME.tehlike + " w-full justify-center"}>Sil</button>
              </form>
            )}
          </Kutu>
        </div>
      </div>
    </Sayfa>
  );
}
