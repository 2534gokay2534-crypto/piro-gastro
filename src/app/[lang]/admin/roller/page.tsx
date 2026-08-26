import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { sayi } from "@/lib/admin-ui";
import { YETKILER } from "@/lib/admin-menu";
import { rolKaydet, rolSil } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import { Bos, DUGME, Kutu, Rozet, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

export default async function Roller({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { lang } = await params;
  const { d } = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Roller ve Yetkiler" />;

  const kok = `/${lang}/admin/roller`;

  let roller;
  try {
    roller = await db.role.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Roller ve Yetkiler" hata={gizliTemizle(e)} />;
  }

  const duzenlenen = d ? roller.find((r) => r.id === d) : null;
  const secili = new Set((duzenlenen?.perms ?? "").split(",").filter(Boolean));

  return (
    <Sayfa
      baslik="Roller ve Yetkiler"
      ozet={`${sayi(roller.length)} rol tanımlı · ${YETKILER.length} yetki anahtarı`}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {roller.length === 0 ? (
            <Bos metin="Rol tanımlı değil. Sağdaki formdan “Yönetici”, “Satış”, “Depo” gibi roller oluşturabilirsiniz." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th w="180px">Rol</Th>
                  <Th>Yetkiler</Th>
                  <Th w="90px" orta>Kişi</Th>
                  <Th w="80px" sag>İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {roller.map((r) => {
                  const p = r.perms.split(",").filter(Boolean);
                  return (
                    <tr key={r.id} className="hover:bg-steel-50">
                      <Td>
                        <div className="font-bold text-navy-900">{r.name}</div>
                        {r.note && <div className="text-[11.8px] text-steel-500">{r.note}</div>}
                      </Td>
                      <Td>
                        {p.length === 0 ? (
                          <span className="text-[12.2px] text-steel-500">yetki yok</span>
                        ) : p.length === YETKILER.length ? (
                          <Rozet ton="ok">tam yetki</Rozet>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {p.slice(0, 8).map((x) => (
                              <Rozet key={x}>{YETKILER.find((y) => y.anahtar === x)?.ad ?? x}</Rozet>
                            ))}
                            {p.length > 8 && <Rozet ton="navy">+{p.length - 8}</Rozet>}
                          </div>
                        )}
                      </Td>
                      <Td orta className="tabular-nums font-semibold">{r._count.users}</Td>
                      <Td sag>
                        <Link href={`${kok}?d=${r.id}`} className="text-[12.4px] font-bold text-navy-600 hover:text-gold">
                          Düzenle
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tablo>
          )}

          <Kutu className="mt-4 p-4">
            <h3 className="text-[13px] font-extrabold text-navy-900">Yetkiler ne işe yarar?</h3>
            <p className="mt-1.5 text-[12.6px] leading-relaxed text-steel-700">
              Roller, hangi kişinin hangi bölümü göreceğini tanımlar. Şu an panel tek şifreyle
              korunuyor; roller kayıt ve planlama amaçlı tutuluyor. Kişi bazlı oturum açıldığında
              bu yetkiler doğrudan menüyü ve sayfa erişimini süzecek —{" "}
              <code className="rounded bg-steel-100 px-1 font-mono text-[11.6px]">admin-menu.ts</code>{" "}
              içindeki her bölüm zaten bir yetki anahtarına bağlı.
            </p>
          </Kutu>
        </div>

        <div>
          <Kutu className="space-y-3.5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-navy-900">
                {duzenlenen ? "Rolü düzenle" : "Yeni rol"}
              </h2>
              {duzenlenen && (
                <Link href={kok} className="text-[12px] font-bold text-steel-500 hover:text-gold">Vazgeç</Link>
              )}
            </div>

            <form action={rolKaydet} className="space-y-3">
              {duzenlenen && <input type="hidden" name="id" value={duzenlenen.id} />}

              <label className="block">
                <span className="block text-[12px] font-bold text-navy-900">Rol adı</span>
                <input
                  name="ad"
                  defaultValue={duzenlenen?.name ?? ""}
                  placeholder="Satış sorumlusu"
                  maxLength={60}
                  className={girdi + " mt-1"}
                  required
                />
              </label>

              <label className="block">
                <span className="block text-[12px] font-bold text-navy-900">Açıklama</span>
                <input name="not" defaultValue={duzenlenen?.note ?? ""} maxLength={300} className={girdi + " mt-1"} />
              </label>

              <fieldset className="rounded-[8px] border border-steel-200 p-3">
                <legend className="px-1 text-[12px] font-bold text-navy-900">Yetkiler</legend>
                <div className="mt-1 max-h-[320px] space-y-1.5 overflow-y-auto">
                  {YETKILER.map((y) => (
                    <label key={y.anahtar} className="flex items-center gap-2 text-[12.8px] text-steel-800">
                      <input
                        type="checkbox"
                        name="yetki"
                        value={y.anahtar}
                        defaultChecked={secili.has(y.anahtar)}
                        className="h-4 w-4 accent-navy-600"
                      />
                      {y.ad}
                    </label>
                  ))}
                </div>
              </fieldset>

              <button type="submit" className={DUGME.ana + " w-full justify-center"}>
                {duzenlenen ? "Kaydet" : "Rol oluştur"}
              </button>
            </form>

            {duzenlenen && (
              <form action={rolSil} className="border-t border-steel-200 pt-3">
                <input type="hidden" name="id" value={duzenlenen.id} />
                <button type="submit" className={DUGME.tehlike + " w-full justify-center"}>Rolü sil</button>
                <p className="mt-1.5 text-[11.6px] text-steel-500">
                  Bu roldeki kullanıcılar silinmez, rolleri boşalır.
                </p>
              </form>
            )}
          </Kutu>
        </div>
      </div>
    </Sayfa>
  );
}
