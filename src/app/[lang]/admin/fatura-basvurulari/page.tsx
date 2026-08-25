import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { para, sayi, tarihSaat, nezaman } from "@/lib/admin-ui";
import { BASVURU_DURUM } from "@/lib/fatura-basvuru";
import { basvuruGeriAl, basvuruOnayla, basvuruReddet, basvuruSil } from "@/app/actions/fatura";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { Bos, DUGME, Kart, Kutu, Rozet, Sayfa, Tablo, Td, Th, AramaCubugu, Secim } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

/** Tüm veriyi tek yerde toplar — JSX try/catch dışında kalsın diye ayrıldı. */
async function yukle(q: string, durum: string) {
  const kosul: Record<string, unknown> = {};
  if (durum) kosul.status = durum;
  if (q) {
    kosul.OR = [
      { company: { contains: q } },
      { orgNr: { contains: q } },
      { email: { contains: q } },
      { contact: { contains: q } },
      { vatNr: { contains: q } },
    ];
  }

  const [liste, bekleyen, onayli, reddedilen] = await Promise.all([
    db.invoiceApplication.findMany({
      where: kosul,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
    }),
    db.invoiceApplication.count({ where: { status: "pending" } }),
    db.invoiceApplication.count({ where: { status: "approved" } }),
    db.invoiceApplication.count({ where: { status: "rejected" } }),
  ]);

  return { liste, bekleyen, onayli, reddedilen };
}

export default async function FaturaBasvurulari({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; d?: string; ac?: string; islem?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Kurumsal Fatura Başvuruları" />;

  const q = (sp.q ?? "").trim();
  const durum = sp.d ?? "";
  const kok = `/${lang}/admin/fatura-basvurulari`;

  let v: Awaited<ReturnType<typeof yukle>> | null = null;
  let hata = "";
  try {
    v = await yukle(q, durum);
  } catch (e) {
    hata = String(e);
  }
  if (!v) return <VeritabaniGerekli lang={lang} sayfa="Kurumsal Fatura Başvuruları" hata={hata} />;

  const acik = sp.ac ? v.liste.find((b) => b.id === sp.ac) : null;

  return (
    <Sayfa
      baslik="Kurumsal Fatura Başvuruları"
      ozet={`${sayi(v.bekleyen)} bekliyor · ${sayi(v.onayli)} onaylı · ${sayi(v.reddedilen)} reddedildi`}
      eylem={
        <a href={`/api/admin/disa-aktar?tip=faturaBasvuru&lang=${lang}`} className={DUGME.sade}>
          Dışa aktar (CSV)
        </a>
      }
    >
      {sp.islem && (
        <p className="mb-3 rounded-[9px] bg-ok/10 px-4 py-2.5 text-[13px] font-semibold text-ok">
          {sp.islem === "onay"
            ? "Başvuru onaylandı — firma artık fatura ile ödeyebilir."
            : sp.islem === "red"
              ? "Başvuru reddedildi."
              : sp.islem === "geri"
                ? "Onay geri alındı — fatura ile ödeme kapatıldı."
                : "Başvuru silindi."}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Kart etiket="Bekleyen" deger={sayi(v.bekleyen)} renk={v.bekleyen ? "warn" : "ok"} />
        <Kart etiket="Onaylı" deger={sayi(v.onayli)} renk="ok" />
        <Kart etiket="Reddedilen" deger={sayi(v.reddedilen)} renk={v.reddedilen ? "danger" : "navy"} />
      </div>

      <div className="mt-4">
        <AramaCubugu eylem={kok} q={q} yerTutucu="Firma, org.nr, KDV no, e-posta veya yetkili ara…">
          <Secim
            ad="d"
            deger={durum}
            secenekler={[
              { v: "", a: "Tüm durumlar" },
              { v: "pending", a: "Bekleyen" },
              { v: "approved", a: "Onaylı" },
              { v: "rejected", a: "Reddedilen" },
            ]}
          />
          <button type="submit" className={DUGME.koyu}>Filtrele</button>
          {(q || durum) && (
            <Link href={kok} className="text-[12.6px] font-semibold text-steel-500 hover:text-gold">
              Temizle
            </Link>
          )}
        </AramaCubugu>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {v.liste.length === 0 ? (
            <Bos metin="Başvuru yok. Mağazadan gelen kurumsal fatura talepleri burada listelenir." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th>Firma</Th>
                  <Th w="140px">Org.nr</Th>
                  <Th w="170px">Yetkili</Th>
                  <Th w="110px" orta>Durum</Th>
                  <Th w="110px" sag>Tarih</Th>
                  <Th w="80px" sag>İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {v.liste.map((b) => {
                  const d = BASVURU_DURUM[b.status] ?? BASVURU_DURUM.pending;
                  return (
                    <tr key={b.id} className={"hover:bg-steel-50" + (acik?.id === b.id ? " bg-gold-200/20" : "")}>
                      <Td>
                        <Link href={`${kok}?ac=${b.id}${q ? `&q=${encodeURIComponent(q)}` : ""}${durum ? `&d=${durum}` : ""}`} className="font-semibold text-navy-900 hover:text-gold">
                          {b.company}
                        </Link>
                        <div className="text-[11.6px] text-steel-500">{b.email}</div>
                      </Td>
                      <Td><span className="font-mono text-[12.4px] text-steel-700">{b.orgNr}</span></Td>
                      <Td className="text-steel-700">
                        {b.contact}
                        <div className="text-[11.6px] text-steel-500">{b.phone}</div>
                      </Td>
                      <Td orta><Rozet ton={d.ton}>{d.ad}</Rozet></Td>
                      <Td sag className="text-[12.2px] text-steel-500">{nezaman(b.createdAt)}</Td>
                      <Td sag>
                        <Link href={`${kok}?ac=${b.id}`} className="text-[12.4px] font-bold text-navy-600 hover:text-gold">
                          Aç
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tablo>
          )}
        </div>

        {/* ---------------- detay / karar ---------------- */}
        <div>
          {!acik ? (
            <Kutu className="p-5">
              <h2 className="text-[14px] font-extrabold text-navy-900">Başvuru seçin</h2>
              <p className="mt-2 text-[12.8px] leading-relaxed text-steel-700">
                Soldaki listeden bir başvuruya tıklayın. Onaylarsanız o firma ödeme
                ekranında <b>Fatura</b> seçeneğini görür; onaylanmadan fatura ile
                ödeme kimseye açık değildir.
              </p>
            </Kutu>
          ) : (
            <>
              <Kutu className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[15px] font-extrabold text-navy-900">{acik.company}</h2>
                  <Rozet ton={(BASVURU_DURUM[acik.status] ?? BASVURU_DURUM.pending).ton}>
                    {(BASVURU_DURUM[acik.status] ?? BASVURU_DURUM.pending).ad}
                  </Rozet>
                </div>

                <dl className="space-y-1.5 text-[12.8px]">
                  {[
                    ["Org.nr", acik.orgNr],
                    ["KDV no", acik.vatNr ?? "—"],
                    ["Yetkili", acik.contact],
                    ["E-posta", acik.email],
                    ["Telefon", acik.phone],
                    ["Fatura adresi", `${acik.billAddr}, ${acik.billZip} ${acik.billCity}, ${acik.country}`],
                    ["Başvuru", tarihSaat(acik.createdAt)],
                  ].map(([k, d]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="w-[104px] shrink-0 font-semibold text-steel-500">{k}</dt>
                      <dd className="min-w-0 flex-1 break-words text-navy-900">{d}</dd>
                    </div>
                  ))}
                </dl>

                {acik.note && (
                  <div className="rounded-[8px] bg-steel-50 p-3 text-[12.4px] leading-relaxed text-steel-700">
                    {acik.note}
                  </div>
                )}

                {acik.decidedAt && (
                  <div className="border-t border-steel-200 pt-2.5 text-[12.2px] text-steel-600">
                    <b className="text-navy-900">{acik.decidedBy}</b> · {tarihSaat(acik.decidedAt)}
                    {acik.decision && <div className="mt-0.5">{acik.decision}</div>}
                    {acik.status === "approved" && (
                      <div className="mt-0.5">
                        Kredi limiti: <b>{acik.creditLimitCents ? para(acik.creditLimitCents) : "sınırsız"}</b>
                      </div>
                    )}
                  </div>
                )}
              </Kutu>

              {acik.status !== "approved" ? (
                <Kutu className="mt-3 space-y-3 p-5">
                  <h3 className="text-[13.4px] font-extrabold text-navy-900">Karar</h3>

                  <form action={basvuruOnayla} className="space-y-2.5">
                    <input type="hidden" name="id" value={acik.id} />
                    <input type="hidden" name="dil" value={lang} />
                    <label className="block">
                      <span className="block text-[12px] font-bold text-navy-900">
                        Kredi limiti (€) <span className="font-normal text-steel-500">0 = sınırsız</span>
                      </span>
                      <input name="limit" defaultValue="0" inputMode="decimal" className={girdi + " mt-1"} />
                    </label>
                    <label className="block">
                      <span className="block text-[12px] font-bold text-navy-900">Not (isteğe bağlı)</span>
                      <input name="gerekce" maxLength={500} className={girdi + " mt-1"} />
                    </label>
                    <button type="submit" className={DUGME.ana + " w-full justify-center"}>
                      Onayla — fatura ile ödemeyi aç
                    </button>
                  </form>

                  <form action={basvuruReddet} className="space-y-2.5 border-t border-steel-200 pt-3">
                    <input type="hidden" name="id" value={acik.id} />
                    <input type="hidden" name="dil" value={lang} />
                    <label className="block">
                      <span className="block text-[12px] font-bold text-navy-900">Red gerekçesi</span>
                      <input name="gerekce" maxLength={500} className={girdi + " mt-1"} />
                    </label>
                    <button type="submit" className={DUGME.tehlike + " w-full justify-center"}>
                      Reddet
                    </button>
                  </form>
                </Kutu>
              ) : (
                <Kutu className="mt-3 space-y-3 p-5">
                  <h3 className="text-[13.4px] font-extrabold text-navy-900">Onaylı firma</h3>
                  <p className="text-[12.4px] leading-relaxed text-steel-700">
                    Bu firma ödeme ekranında <b>Fatura</b> seçeneğini görüyor. Onayı geri
                    alırsanız seçenek hemen kapanır.
                  </p>
                  <form action={basvuruGeriAl}>
                    <input type="hidden" name="id" value={acik.id} />
                    <input type="hidden" name="dil" value={lang} />
                    <button type="submit" className={DUGME.sade + " w-full justify-center"}>
                      Onayı geri al
                    </button>
                  </form>
                </Kutu>
              )}

              <form action={basvuruSil} className="mt-3">
                <input type="hidden" name="id" value={acik.id} />
                <input type="hidden" name="dil" value={lang} />
                <button type="submit" className="text-[12.2px] font-semibold text-steel-500 hover:text-danger">
                  Başvuruyu sil
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </Sayfa>
  );
}
