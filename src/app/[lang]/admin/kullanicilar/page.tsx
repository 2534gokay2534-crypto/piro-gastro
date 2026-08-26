import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { sayi, tarih, tarihSaat } from "@/lib/admin-ui";
import { kullaniciKaydet, kullaniciSil } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { gizliTemizle } from "@/lib/gizli-temizle";
import { Bos, DUGME, Kutu, Rozet, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

const Alan = ({ etiket, children }: { etiket: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-[12px] font-bold text-navy-900">{etiket}</span>
    <span className="mt-1 block">{children}</span>
  </label>
);

export default async function Kullanicilar({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { lang } = await params;
  const { d } = await searchParams;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Kullanıcılar" />;

  const kok = `/${lang}/admin/kullanicilar`;
  const kapiAcik = !process.env.ADMIN_SIFRE;

  let liste, roller;
  try {
    [liste, roller] = await Promise.all([
      db.adminUser.findMany({
        orderBy: [{ active: "desc" }, { createdAt: "desc" }],
        include: { role: { select: { id: true, name: true } } },
        take: 200,
      }),
      db.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Kullanıcılar" hata={gizliTemizle(e)} />;
  }

  const duzenlenen = d ? liste.find((k) => k.id === d) : null;

  return (
    <Sayfa
      baslik="Kullanıcılar"
      ozet={`${sayi(liste.length)} yönetici hesabı`}
      eylem={
        <a href={`/api/admin/disa-aktar?tip=kullanicilar&lang=${lang}`} className={DUGME.sade}>
          Dışa aktar (CSV)
        </a>
      }
    >
      {kapiAcik && (
        <div className="mb-4 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-gold-800">
          <b>Panel şu an şifresiz.</b> Adresi bilen herkes girebilir. Kapatmak için Vercel’de{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">ADMIN_SIFRE</code>{" "}
          ortam değişkenini tanımlayın; panel açılışta şifre sorar.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {liste.length === 0 ? (
            <Bos metin="Henüz yönetici hesabı tanımlı değil. Sağdaki formdan ekleyin." />
          ) : (
            <Tablo>
              <thead>
                <tr>
                  <Th>Kullanıcı</Th>
                  <Th w="160px">Rol</Th>
                  <Th w="100px" orta>Durum</Th>
                  <Th w="140px">Son giriş</Th>
                  <Th w="80px" sag>İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {liste.map((k) => (
                  <tr key={k.id} className="hover:bg-steel-50">
                    <Td>
                      <div className="font-semibold text-navy-900">{k.name}</div>
                      <a href={`mailto:${k.email}`} className="text-[12.2px] text-navy-600 hover:text-gold">
                        {k.email}
                      </a>
                      {k.phone && <div className="text-[11.8px] text-steel-500">{k.phone}</div>}
                    </Td>
                    <Td>
                      {k.role ? (
                        <Rozet ton="navy">{k.role.name}</Rozet>
                      ) : (
                        <span className="text-[12.2px] text-steel-500">rol atanmamış</span>
                      )}
                    </Td>
                    <Td orta>
                      <Rozet ton={k.active ? "ok" : "gri"}>{k.active ? "Aktif" : "Pasif"}</Rozet>
                    </Td>
                    <Td className="text-[12.2px] text-steel-600">
                      {k.lastLoginAt ? tarihSaat(k.lastLoginAt) : "—"}
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

          <Kutu className="mt-4 p-4">
            <h3 className="text-[13px] font-extrabold text-navy-900">Nasıl çalışır?</h3>
            <p className="mt-1.5 text-[12.6px] leading-relaxed text-steel-700">
              Buradaki kayıtlar <b>kim yetkili</b> sorusunun cevabıdır: kişiler, rolleri ve
              erişim durumları. Panele giriş tek bir yönetici şifresiyle (
              <code className="rounded bg-steel-100 px-1 font-mono text-[11.6px]">ADMIN_SIFRE</code>
              ) korunur. Kişi bazlı ayrı şifreli oturum sistemi bir sonraki adımda eklenebilir —
              veri modeli buna hazır.
            </p>
          </Kutu>
        </div>

        <div>
          <Kutu className="space-y-3.5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-navy-900">
                {duzenlenen ? "Kullanıcıyı düzenle" : "Yeni kullanıcı"}
              </h2>
              {duzenlenen && (
                <Link href={kok} className="text-[12px] font-bold text-steel-500 hover:text-gold">Vazgeç</Link>
              )}
            </div>

            <form action={kullaniciKaydet} className="space-y-3">
              {duzenlenen && <input type="hidden" name="id" value={duzenlenen.id} />}

              <Alan etiket="Ad soyad">
                <input name="ad" defaultValue={duzenlenen?.name ?? ""} maxLength={120} className={girdi} required />
              </Alan>
              <Alan etiket="E-posta">
                <input name="eposta" type="email" defaultValue={duzenlenen?.email ?? ""} className={girdi} required />
              </Alan>
              <Alan etiket="Telefon">
                <input name="telefon" defaultValue={duzenlenen?.phone ?? ""} className={girdi} />
              </Alan>
              <Alan etiket="Rol">
                <select name="rol" defaultValue={duzenlenen?.roleId ?? ""} className={girdi}>
                  <option value="">— rol yok —</option>
                  {roller.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </Alan>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
                <input type="checkbox" name="aktif" value="1" defaultChecked={duzenlenen?.active ?? true} className="h-4 w-4 accent-navy-600" />
                Hesap aktif
              </label>

              <button type="submit" className={DUGME.ana + " w-full justify-center"}>
                {duzenlenen ? "Kaydet" : "Kullanıcı ekle"}
              </button>
            </form>

            {duzenlenen && (
              <form action={kullaniciSil} className="border-t border-steel-200 pt-3">
                <input type="hidden" name="id" value={duzenlenen.id} />
                <button type="submit" className={DUGME.tehlike + " w-full justify-center"}>Sil</button>
              </form>
            )}

            {duzenlenen && (
              <p className="text-[11.6px] text-steel-500">Kayıt tarihi: {tarih(duzenlenen.createdAt)}</p>
            )}
          </Kutu>

          {roller.length === 0 && (
            <Kutu className="mt-3 p-4">
              <p className="text-[12.6px] leading-relaxed text-steel-700">
                Henüz rol tanımlı değil.{" "}
                <Link href={`/${lang}/admin/roller`} className="font-bold text-navy-600 hover:text-gold">
                  Roller ve Yetkiler
                </Link>{" "}
                ekranından oluşturabilirsiniz.
              </p>
            </Kutu>
          )}
        </div>
      </div>
    </Sayfa>
  );
}
