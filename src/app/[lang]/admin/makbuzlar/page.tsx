import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { para, sayi, tarihSaat } from "@/lib/admin-ui";
import { ODEME_ADI, ODEME_DURUM, belgeTuru, makbuzGetir } from "@/lib/makbuz";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import MakbuzBelge from "@/components/MakbuzBelge";
import YazdirDugmesi from "@/components/YazdirDugmesi";
import { AramaCubugu, Bos, DUGME, Kart, Kutu, Rozet, Sayfa, Secim, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const CIRO = ["paid", "packing", "shipped", "delivered"];

/** Tüm veriyi tek yerde toplar — JSX try/catch dışında kalsın diye ayrıldı. */
async function yukle(q: string, durum: string, yontem: string, tur: string) {
  const kosul: Record<string, unknown> = {};
  if (durum) kosul.status = durum;
  if (yontem) kosul.payMethod = yontem;
  if (q) {
    kosul.OR = [
      { number: { contains: q } },
      { shipName: { contains: q } },
      { shipCity: { contains: q } },
      { customer: { is: { company: { contains: q } } } },
      { customer: { is: { name: { contains: q } } } },
      { customer: { is: { email: { contains: q } } } },
      { customer: { is: { orgNr: { contains: q } } } },
      { items: { some: { sku: { contains: q } } } },
    ];
  }

  const [liste, toplamAdet, odenen, faturaBekleyen, ciro, kdvToplam] = await Promise.all([
    db.order.findMany({
      where: kosul,
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true, number: true, status: true, payMethod: true, paidMethod: true,
        totalCents: true, vatCents: true, createdAt: true, paidAt: true,
        customer: { select: { name: true, company: true, email: true, phone: true } },
        _count: { select: { items: true } },
      },
    }),
    db.order.count(),
    db.order.count({ where: { status: { in: CIRO } } }),
    db.order.count({ where: { status: "new", payMethod: "invoice" } }),
    db.order.aggregate({ _sum: { totalCents: true }, where: { status: { in: CIRO } } }),
    db.order.aggregate({ _sum: { vatCents: true }, where: { status: { in: CIRO } } }),
  ]);

  const belgeler = liste.filter((o) => (tur ? belgeTuru(o.status) === tur : true));

  return {
    belgeler,
    toplamAdet,
    odenen,
    faturaBekleyen,
    ciro: ciro._sum.totalCents ?? 0,
    kdv: kdvToplam._sum.vatCents ?? 0,
  };
}

export default async function Makbuzlar({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; d?: string; y?: string; t?: string; ac?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Sipariş Makbuzları ve Belgeler" />;

  const q = (sp.q ?? "").trim();
  const durum = sp.d ?? "";
  const yontem = sp.y ?? "";
  const tur = sp.t ?? "";
  const kok = `/${lang}/admin/makbuzlar`;

  let v: Awaited<ReturnType<typeof yukle>> | null = null;
  let hata = "";
  try {
    v = await yukle(q, durum, yontem, tur);
  } catch (e) {
    hata = String(e);
  }
  if (!v) return <VeritabaniGerekli lang={lang} sayfa="Sipariş Makbuzları ve Belgeler" hata={hata} />;

  // Seçili belge — sağda tam görünüm, yazdırılabilir
  const acik = sp.ac ? await makbuzGetir(sp.ac, lang) : null;

  const sorgu = new URLSearchParams();
  if (q) sorgu.set("q", q);
  if (durum) sorgu.set("d", durum);
  if (yontem) sorgu.set("y", yontem);
  if (tur) sorgu.set("t", tur);
  const ek = sorgu.toString() ? `&${sorgu.toString()}` : "";

  return (
    <Sayfa
      baslik="Sipariş Makbuzları ve Belgeler"
      ozet={`${sayi(v.belgeler.length)} belge listeleniyor · ${sayi(v.toplamAdet)} toplam sipariş`}
      eylem={
        <a href={`/api/admin/disa-aktar?tip=makbuzlar&lang=${lang}`} className={DUGME.sade}>
          Dışa aktar (CSV)
        </a>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kart etiket="Toplam belge" deger={sayi(v.toplamAdet)} />
        <Kart etiket="Ödenmiş" deger={sayi(v.odenen)} renk="ok" />
        <Kart etiket="Fatura bekleyen" deger={sayi(v.faturaBekleyen)} renk={v.faturaBekleyen ? "warn" : "navy"} />
        <Kart etiket="Muhasebeye işlenen ciro" deger={para(v.ciro, false)} alt={`KDV ${para(v.kdv, false)}`} renk="navy" />
      </div>

      <div className="mt-4">
        <AramaCubugu
          eylem={kok}
          q={q}
          yerTutucu="Sipariş no, firma, kişi, e-posta, org.nr veya ürün kodu ara…"
        >
          <Secim
            ad="t"
            deger={tur}
            secenekler={[
              { v: "", a: "Tüm belgeler" },
              { v: "makbuz", a: "Makbuz" },
              { v: "fatura", a: "Fatura" },
            ]}
          />
          <Secim
            ad="d"
            deger={durum}
            secenekler={[
              { v: "", a: "Tüm durumlar" },
              { v: "paid", a: "Ödendi" },
              { v: "pending", a: "Ödeme bekleniyor" },
              { v: "new", a: "Yeni / faturalanacak" },
              { v: "packing", a: "Hazırlanıyor" },
              { v: "shipped", a: "Kargoda" },
              { v: "delivered", a: "Teslim edildi" },
              { v: "cancelled", a: "İptal" },
              { v: "refunded", a: "İade" },
            ]}
          />
          <Secim
            ad="y"
            deger={yontem}
            secenekler={[
              { v: "", a: "Tüm ödeme yöntemleri" },
              { v: "card", a: "Kart" },
              { v: "swish", a: "Swish" },
              { v: "invoice", a: "Fatura" },
              { v: "bank", a: "Havale" },
            ]}
          />
          <button type="submit" className={DUGME.koyu}>Filtrele</button>
          {(q || durum || yontem || tur) && (
            <Link href={kok} className="text-[12.6px] font-semibold text-steel-500 hover:text-gold">
              Temizle
            </Link>
          )}
        </AramaCubugu>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* ---------------- liste ---------------- */}
        <div className="min-w-0">
          {v.belgeler.length === 0 ? (
            <Bos metin="Belge yok. Mağazadan sipariş geldikçe makbuz ve faturalar burada birikir." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th w="130px">Belge no</Th>
                  <Th>Müşteri</Th>
                  <Th w="92px" orta>Tür</Th>
                  <Th w="120px" orta>Ödeme</Th>
                  <Th w="110px" sag>Tutar</Th>
                  <Th w="130px" sag>Tarih</Th>
                  <Th w="150px" sag>Belge</Th>
                </tr>
              </thead>
              <tbody>
                {v.belgeler.map((o) => {
                  const d = ODEME_DURUM[o.status] ?? ODEME_DURUM.new;
                  const t = belgeTuru(o.status);
                  return (
                    <tr key={o.id} className={"hover:bg-steel-50" + (acik?.numara === o.number ? " bg-gold-200/20" : "")}>
                      <Td>
                        <Link href={`${kok}?ac=${o.number}${ek}`} className="font-mono font-bold text-navy-600 hover:text-gold">
                          {o.number}
                        </Link>
                      </Td>
                      <Td>
                        <span className="font-semibold text-navy-900">
                          {o.customer?.company || o.customer?.name || "—"}
                        </span>
                        <div className="text-[11.6px] text-steel-500">{o.customer?.email ?? ""}</div>
                      </Td>
                      <Td orta>
                        <Rozet ton={t === "fatura" ? "warn" : "ok"}>{t === "fatura" ? "Fatura" : "Makbuz"}</Rozet>
                      </Td>
                      <Td orta>
                        <Rozet ton={d.ton}>{d.ad.tr ?? d.ad.en}</Rozet>
                        <div className="mt-0.5 text-[11px] text-steel-500">
                          {ODEME_ADI[o.paidMethod || o.payMethod] ?? o.payMethod}
                        </div>
                      </Td>
                      <Td sag className="font-semibold tabular-nums">{para(o.totalCents)}</Td>
                      <Td sag className="text-[12px] text-steel-600">{tarihSaat(o.createdAt)}</Td>
                      <Td sag>
                        <span className="flex flex-wrap justify-end gap-1.5">
                          <Link
                            href={`${kok}?ac=${o.number}${ek}`}
                            className="rounded border border-steel-300 px-2 py-1 text-[11.6px] font-bold text-navy-700 hover:border-gold hover:text-gold"
                          >
                            Aç
                          </Link>
                          <a
                            href={`/api/makbuz/${o.number}/pdf?dil=${lang}&ek=1`}
                            className="rounded border border-steel-300 px-2 py-1 text-[11.6px] font-bold text-navy-700 hover:border-gold hover:text-gold"
                          >
                            PDF
                          </a>
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tablo>
          )}
        </div>

        {/* ---------------- seçili belge ---------------- */}
        <div className="min-w-0">
          {!acik ? (
            <Kutu className="p-5">
              <h2 className="text-[14px] font-extrabold text-navy-900">Belge seçin</h2>
              <p className="mt-2 text-[12.8px] leading-relaxed text-steel-700">
                Soldaki listeden bir belge açın. Müşterinin gördüğü makbuzun aynısı
                burada görünür; yazdırabilir veya PDF olarak indirebilirsiniz.
              </p>
              <p className="mt-2 text-[12.4px] leading-relaxed text-steel-600">
                Ödenmiş siparişler <b>Muhasebe</b> ekranındaki ciro, KDV ve kâr
                hesabına kendiliğinden girer.
              </p>
            </Kutu>
          ) : (
            <>
              <div className="yazdirma-gizle mb-3 flex flex-wrap gap-2">
                <YazdirDugmesi
                  etiket="Yazdır"
                  sinif="cursor-pointer rounded-[8px] bg-gold px-3.5 py-2 text-[12.6px] font-bold text-navy-950 transition hover:bg-gold-400"
                />
                <a
                  href={`/api/makbuz/${acik.numara}/pdf?dil=${lang}&ek=1`}
                  className="rounded-[8px] bg-navy-900 px-3.5 py-2 text-[12.6px] font-bold text-white transition hover:bg-navy-800"
                >
                  PDF indir
                </a>
                <a
                  href={`/api/makbuz/${acik.numara}/pdf?dil=${lang}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[8px] border border-steel-300 px-3.5 py-2 text-[12.6px] font-bold text-navy-900 transition hover:border-gold hover:text-gold"
                >
                  PDF aç
                </a>
                <Link
                  href={`/${lang}/admin/siparisler/${acik.id}`}
                  className="rounded-[8px] border border-steel-300 px-3.5 py-2 text-[12.6px] font-bold text-steel-700 transition hover:border-gold hover:text-gold"
                >
                  Siparişi yönet
                </Link>
              </div>
              <MakbuzBelge m={acik} dil={lang} teknik />
            </>
          )}
        </div>
      </div>
    </Sayfa>
  );
}
