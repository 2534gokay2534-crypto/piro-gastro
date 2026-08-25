import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { LANG_DEFS, isLang } from "@/lib/i18n";
import { ayarKaydet } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { DUGME, Kutu, Rozet, Sayfa } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

const girdi =
  "w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[13.6px] outline-none focus:border-navy-500";

const Alan = ({
  etiket,
  ipucu,
  children,
}: {
  etiket: string;
  ipucu?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="block text-[12px] font-bold text-navy-900">
      {etiket}
      {ipucu && <span className="ml-1 font-normal text-steel-500">({ipucu})</span>}
    </span>
    <span className="mt-1 block">{children}</span>
  </label>
);

export default async function Ayarlar({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Ayarlar" />;

  let ayarlar;
  try {
    ayarlar = await db.setting.findMany();
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Ayarlar" hata={String(e)} />;
  }

  const a = new Map(ayarlar.map((x) => [x.key, x.value]));
  const v = (k: string, y = "") => a.get(k) ?? y;

  return (
    <Sayfa baslik="Ayarlar" ozet="Mağaza ve panel genel ayarları">
      <form action={ayarKaydet} className="grid max-w-[1000px] gap-4 xl:grid-cols-2">
        {/* --- firma --- */}
        <Kutu className="space-y-3.5 p-4">
          <h2 className="text-[14px] font-extrabold text-navy-900">Firma bilgileri</h2>
          <Alan etiket="Ticari unvan">
            <input name="ayar.firma.unvan" defaultValue={v("firma.unvan", "Piro Gastro Center AB")} className={girdi} />
          </Alan>
          <Alan etiket="Org.nr">
            <input name="ayar.firma.orgnr" defaultValue={v("firma.orgnr", "559214-8830")} className={girdi} />
          </Alan>
          <Alan etiket="VAT no">
            <input name="ayar.firma.vat" defaultValue={v("firma.vat", "SE559214883001")} className={girdi} />
          </Alan>
          <Alan etiket="Adres">
            <input name="ayar.firma.adres" defaultValue={v("firma.adres", "Industrigatan 24, 211 32 Malmö, Sverige")} className={girdi} />
          </Alan>
          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="E-posta">
              <input name="ayar.firma.eposta" type="email" defaultValue={v("firma.eposta")} className={girdi} />
            </Alan>
            <Alan etiket="Telefon">
              <input name="ayar.firma.telefon" defaultValue={v("firma.telefon")} className={girdi} />
            </Alan>
          </div>
        </Kutu>

        {/* --- satış --- */}
        <Kutu className="space-y-3.5 p-4">
          <h2 className="text-[14px] font-extrabold text-navy-900">Satış ve kargo</h2>
          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="KDV oranı" ipucu="%">
              <input name="ayar.satis.kdv" defaultValue={v("satis.kdv", "25")} className={girdi} inputMode="numeric" />
            </Alan>
            <Alan etiket="Kargo ücreti" ipucu="€">
              <input name="ayar.satis.kargo" defaultValue={v("satis.kargo", "0")} className={girdi} inputMode="decimal" />
            </Alan>
          </div>
          <Alan etiket="Ücretsiz kargo alt sınırı" ipucu="€">
            <input name="ayar.satis.ucretsizKargo" defaultValue={v("satis.ucretsizKargo", "2500")} className={girdi} inputMode="decimal" />
          </Alan>
          <Alan etiket="Sipariş numarası ön eki">
            <input name="ayar.satis.siparisOnEk" defaultValue={v("satis.siparisOnEk", "PG")} maxLength={8} className={girdi} />
          </Alan>
          <Alan etiket="Az stok uyarı eşiği" ipucu="adet">
            <input name="ayar.satis.stokEsik" defaultValue={v("satis.stokEsik", "5")} className={girdi} inputMode="numeric" />
          </Alan>
        </Kutu>

        {/* --- mağaza --- */}
        <Kutu className="space-y-3.5 p-4">
          <h2 className="text-[14px] font-extrabold text-navy-900">Mağaza</h2>
          <Alan etiket="Üst şerit mesajı">
            <input name="ayar.magaza.serit" defaultValue={v("magaza.serit")} maxLength={200} className={girdi} />
          </Alan>
          <Alan etiket="Varsayılan dil">
            <select name="ayar.magaza.dil" defaultValue={v("magaza.dil", LANG_DEFS[0]?.code ?? "sv")} className={girdi}>
              {LANG_DEFS.map((l) => (
                <option key={l.code} value={l.code}>{l.name} ({l.code})</option>
              ))}
            </select>
          </Alan>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {LANG_DEFS.map((l) => (
              <Rozet key={l.code} ton={l.code === lang ? "navy" : "gri"}>
                {l.code.toUpperCase()} · {l.currency}
              </Rozet>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed text-steel-600">
            Dil eklemek/kaldırmak için{" "}
            <Link href={`/${lang}/admin/ceviriler`} className="font-bold text-navy-600 hover:text-gold">
              Diller ve Çeviriler
            </Link>{" "}
            ekranını kullanın.
          </p>
        </Kutu>

        {/* --- sohbet --- */}
        <Kutu className="space-y-3.5 p-4">
          <h2 className="text-[14px] font-extrabold text-navy-900">Canlı sohbet</h2>
          <Alan etiket="Karşılama metni">
            <input name="ayar.chat.greeting" defaultValue={v("chat.greeting")} maxLength={400} className={girdi} />
          </Alan>
          <div className="flex items-center gap-2 text-[13px]">
            <span className={"h-2.5 w-2.5 rounded-full " + (v("chat.online") === "1" ? "bg-emerald-500" : "bg-steel-400")} />
            <span className="font-semibold text-steel-700">
              Şu an {v("chat.online") === "1" ? "çevrim içi" : "çevrim dışı"}
            </span>
            <Link href={`/${lang}/admin/sohbet`} className="ml-auto text-[12.4px] font-bold text-navy-600 hover:text-gold">
              Sohbet ekranı →
            </Link>
          </div>
          <p className="text-[12px] leading-relaxed text-steel-600">
            Çevrim içi/dışı anahtarı Canlı Sohbet ekranındadır — orada tek tıkla değişir.
          </p>
        </Kutu>

        <div className="xl:col-span-2">
          <button type="submit" className={DUGME.ana}>Ayarları kaydet</button>
        </div>
      </form>

      <Kutu className="mt-5 max-w-[1000px] p-4">
        <h3 className="text-[13px] font-extrabold text-navy-900">Ortam değişkenleri</h3>
        <p className="mt-1.5 text-[12.6px] leading-relaxed text-steel-700">
          Bu ekrandaki ayarlar veritabanında tutulur. Gizli değerler (veritabanı adresi, şifreler,
          API anahtarları) burada değil, Vercel → Settings → Environment Variables altında tanımlanır:
        </p>
        <ul className="mt-2 space-y-1 text-[12.4px] text-steel-700">
          <li>
            <code className="rounded bg-steel-100 px-1.5 py-0.5 font-mono text-[11.8px]">DATABASE_URL</code>
            {" "}— veritabanı bağlantısı{" "}
            <Rozet ton={dbVar ? "ok" : "danger"}>{dbVar ? "tanımlı" : "tanımsız"}</Rozet>
          </li>
          <li>
            <code className="rounded bg-steel-100 px-1.5 py-0.5 font-mono text-[11.8px]">ADMIN_SIFRE</code>
            {" "}— panel giriş şifresi{" "}
            <Rozet ton={process.env.ADMIN_SIFRE ? "ok" : "warn"}>
              {process.env.ADMIN_SIFRE ? "tanımlı" : "tanımsız — panel açık"}
            </Rozet>
          </li>
          <li>
            <code className="rounded bg-steel-100 px-1.5 py-0.5 font-mono text-[11.8px]">DEEPL_API_KEY</code>
            {" "}— otomatik çeviri (isteğe bağlı)
          </li>
        </ul>
      </Kutu>
    </Sayfa>
  );
}
