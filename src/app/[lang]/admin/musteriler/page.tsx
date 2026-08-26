import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { CIRO_DURUMLARI, nezaman, para, sayi } from "@/lib/admin-ui";
import { musteriKaydet } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import {
  AramaCubugu, Bos, DUGME, Kart, Kutu, Rozet, Sayfa, Sayfalama, Secim, Tablo, Td, Th,
} from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const SAYFA = 40;
const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

export default async function Musteriler({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; t?: string; s?: string; yeni?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Müşteriler" />;

  const kok = `/${lang}/admin/musteriler`;
  const q = (sp.q ?? "").trim();
  const tur = sp.t ?? "";
  const sayfa = Math.max(1, Number(sp.s) || 1);
  const formAcik = sp.yeni === "1";

  const kosul: Record<string, unknown> = {};
  if (tur) kosul.type = tur;
  if (q) {
    kosul.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { company: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  let toplam = 0, liste, ozet;
  try {
    [toplam, liste, ozet] = await Promise.all([
      db.customer.count({ where: kosul }),
      db.customer.findMany({
        where: kosul,
        orderBy: { createdAt: "desc" },
        skip: (sayfa - 1) * SAYFA,
        take: SAYFA,
        select: {
          id: true, name: true, company: true, email: true, phone: true,
          city: true, country: true, type: true, createdAt: true,
          orders: {
            where: { status: { in: CIRO_DURUMLARI } },
            select: { totalCents: true, createdAt: true },
          },
        },
      }),
      (async () => {
        const [hepsi, kurumsal, ay] = await Promise.all([
          db.customer.count(),
          db.customer.count({ where: { type: "business" } }),
          db.customer.count({
            where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
          }),
        ]);
        return { hepsi, kurumsal, ay };
      })(),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Müşteriler" hata={gizliTemizle(e)} />;
  }

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));
  const url = (ek: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (tur) p.set("t", tur);
    for (const [a, b] of Object.entries(ek)) p.set(a, String(b));
    return `${kok}?${p}`;
  };

  return (
    <Sayfa
      baslik="Müşteriler"
      ozet={`${sayi(ozet.hepsi)} müşteri · ${sayi(ozet.kurumsal)} kurumsal · bu ay ${sayi(ozet.ay)} yeni`}
      eylem={
        <>
          <Link href={formAcik ? kok : `${kok}?yeni=1`} className={DUGME.ana}>
            {formAcik ? "Formu kapat" : "+ Yeni müşteri"}
          </Link>
          <a href={`/api/admin/disa-aktar?tip=musteriler&lang=${lang}`} className={DUGME.sade}>
            Dışa aktar (CSV)
          </a>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Kart etiket="Toplam müşteri" deger={sayi(ozet.hepsi)} />
        <Kart etiket="Kurumsal" deger={sayi(ozet.kurumsal)} renk="navy" />
        <Kart etiket="Bu ay yeni" deger={sayi(ozet.ay)} renk="ok" />
      </div>

      {formAcik && (
        <Kutu className="mt-4 p-4">
          <h2 className="text-[14px] font-extrabold text-navy-900">Yeni müşteri</h2>
          <form action={musteriKaydet} className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="block text-[12px] font-bold text-navy-900">Ad soyad / Firma</span>
              <input name="ad" className={girdi + " mt-1"} required />
            </label>
            <label className="block">
              <span className="block text-[12px] font-bold text-navy-900">Firma</span>
              <input name="firma" className={girdi + " mt-1"} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-bold text-navy-900">E-posta</span>
              <input name="eposta" type="email" className={girdi + " mt-1"} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-bold text-navy-900">Telefon</span>
              <input name="telefon" className={girdi + " mt-1"} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-bold text-navy-900">Org.nr</span>
              <input name="orgNr" className={girdi + " mt-1"} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-bold text-navy-900">Şehir</span>
              <input name="sehir" className={girdi + " mt-1"} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-bold text-navy-900">Ülke</span>
              <input name="ulke" defaultValue="SE" maxLength={4} className={girdi + " mt-1"} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-bold text-navy-900">Tür</span>
              <select name="tur" defaultValue="business" className={girdi + " mt-1"}>
                <option value="business">Kurumsal</option>
                <option value="retail">Bireysel</option>
              </select>
            </label>
            <div className="sm:col-span-2 xl:col-span-4">
              <button type="submit" className={DUGME.ana}>Müşteriyi kaydet</button>
            </div>
          </form>
        </Kutu>
      )}

      <div className="mt-4">
        <AramaCubugu eylem={kok} q={q} yerTutucu="Ad, firma, e-posta veya telefon…">
          <Secim
            ad="t"
            deger={tur}
            etiket="Tür"
            secenekler={[
              { v: "", a: "Tümü" },
              { v: "business", a: "Kurumsal" },
              { v: "retail", a: "Bireysel" },
            ]}
          />
        </AramaCubugu>
      </div>

      <div className="mt-4">
        {liste.length === 0 ? (
          <Bos
            metin={
              toplam === 0 && !q
                ? "Henüz müşteri yok. Yukarıdaki “Yeni müşteri” ile ekleyebilirsiniz."
                : "Bu süzgeçle müşteri bulunamadı."
            }
          />
        ) : (
          <Tablo>
            <thead>
              <tr>
                <Th>Müşteri</Th>
                <Th w="200px">İletişim</Th>
                <Th w="110px" orta>Tür</Th>
                <Th w="90px" orta>Sipariş</Th>
                <Th w="130px" sag>Toplam</Th>
                <Th w="120px" sag>Kayıt</Th>
              </tr>
            </thead>
            <tbody>
              {liste.map((m) => {
                const ciro = m.orders.reduce((t, o) => t + o.totalCents, 0);
                return (
                  <tr key={m.id} className="hover:bg-steel-50">
                    <Td>
                      <Link href={`${kok}/${m.id}`} className="font-semibold text-navy-900 hover:text-gold">
                        {m.name}
                      </Link>
                      {m.company && <div className="text-[11.8px] text-steel-500">{m.company}</div>}
                      {(m.city || m.country) && (
                        <div className="text-[11.4px] text-steel-400">{m.city} {m.country}</div>
                      )}
                    </Td>
                    <Td className="text-[12.4px]">
                      {m.email && (
                        <a href={`mailto:${m.email}`} className="block text-navy-600 hover:text-gold">{m.email}</a>
                      )}
                      {m.phone && <div className="text-steel-600">{m.phone}</div>}
                    </Td>
                    <Td orta>
                      <Rozet ton={m.type === "business" ? "navy" : "gri"}>
                        {m.type === "business" ? "Kurumsal" : "Bireysel"}
                      </Rozet>
                    </Td>
                    <Td orta className="tabular-nums font-semibold">{m.orders.length}</Td>
                    <Td sag className="tabular-nums font-bold text-navy-900">{para(ciro)}</Td>
                    <Td sag className="text-[12.2px] text-steel-500">{nezaman(m.createdAt)}</Td>
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
