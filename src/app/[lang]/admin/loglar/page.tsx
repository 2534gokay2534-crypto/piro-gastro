import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { sayi, tarihSaat } from "@/lib/admin-ui";
import { loglariTemizle } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import {
  AramaCubugu, Bos, DUGME, Kart, Kutu, Rozet, Sayfa, Sayfalama, Tablo, Td, Th,
} from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const SAYFA = 60;

function gunBasi(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function gunOnce(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function ton(action: string): "ok" | "warn" | "danger" | "gri" | "navy" {
  if (action.includes(".sil")) return "danger";
  if (action.includes(".ekle")) return "ok";
  if (action.includes(".toplu")) return "warn";
  if (action.startsWith("sohbet")) return "navy";
  return "gri";
}

export default async function Loglar({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; s?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Sistem Logları" />;

  const kok = `/${lang}/admin/loglar`;
  const q = (sp.q ?? "").trim();
  const sayfa = Math.max(1, Number(sp.s) || 1);

  const kosul = q ? { OR: [{ action: { contains: q } }, { detail: { contains: q } }] } : {};

  let toplam = 0, liste, bugun, hafta;
  try {
    [toplam, liste, bugun, hafta] = await Promise.all([
      db.auditLog.count({ where: kosul }),
      db.auditLog.findMany({
        where: kosul,
        orderBy: { createdAt: "desc" },
        skip: (sayfa - 1) * SAYFA,
        take: SAYFA,
      }),
      db.auditLog.count({
        where: { createdAt: { gte: gunBasi() } },
      }),
      db.auditLog.count({ where: { createdAt: { gte: gunOnce(7) } } }),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Sistem Logları" hata={gizliTemizle(e)} />;
  }

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA));

  return (
    <Sayfa
      baslik="Sistem Logları"
      ozet="Panelde yapılan her değişiklik burada iz bırakır."
      eylem={
        <a href={`/api/admin/disa-aktar?tip=loglar&lang=${lang}`} className={DUGME.sade}>
          Dışa aktar (CSV)
        </a>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Kart etiket="Toplam kayıt" deger={sayi(toplam)} />
        <Kart etiket="Bugün" deger={sayi(bugun)} renk="navy" />
        <Kart etiket="Son 7 gün" deger={sayi(hafta)} />
      </div>

      <div className="mt-4">
        <AramaCubugu eylem={kok} q={q} yerTutucu="İşlem veya ayrıntı…" />
      </div>

      <div className="mt-4">
        {liste.length === 0 ? (
          <Bos metin="Kayıt yok." />
        ) : (
          <Tablo>
            <thead>
              <tr>
                <Th w="160px">Zaman</Th>
                <Th w="130px">Kullanıcı</Th>
                <Th w="180px">İşlem</Th>
                <Th>Ayrıntı</Th>
              </tr>
            </thead>
            <tbody>
              {liste.map((l) => (
                <tr key={l.id} className="hover:bg-steel-50">
                  <Td className="whitespace-nowrap text-[12.2px] text-steel-600">{tarihSaat(l.createdAt)}</Td>
                  <Td className="text-[12.4px] text-steel-700">{l.actor}</Td>
                  <Td><Rozet ton={ton(l.action)}>{l.action}</Rozet></Td>
                  <Td className="text-[12.6px] text-steel-800">{l.detail ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Tablo>
        )}
      </div>

      <Sayfalama
        sayfa={sayfa}
        sonSayfa={sonSayfa}
        toplam={toplam}
        url={(x) => `${kok}?${new URLSearchParams({ ...(q ? { q } : {}), s: String(x) })}`}
      />

      <Kutu className="mt-5 max-w-[560px] p-4">
        <h3 className="text-[13px] font-extrabold text-navy-900">Eski kayıtları temizle</h3>
        <p className="mt-1.5 text-[12.4px] text-steel-700">
          Belirtilen günden eski log kayıtları silinir. Ürün, sipariş ve müşteri verileri etkilenmez.
        </p>
        <form action={loglariTemizle} className="mt-3 flex items-center gap-2">
          <select
            name="gun"
            defaultValue="90"
            className="rounded-[8px] border border-steel-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-navy-500"
          >
            <option value="30">30 günden eski</option>
            <option value="90">90 günden eski</option>
            <option value="180">180 günden eski</option>
            <option value="365">1 yıldan eski</option>
          </select>
          <button type="submit" className={DUGME.tehlike}>Temizle</button>
        </form>
      </Kutu>
    </Sayfa>
  );
}
