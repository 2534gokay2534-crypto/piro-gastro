import Link from "next/link";

/**
 * Veritabanı bağlı değilken gösterilir.
 * Sayfanın çökmesi yerine ne yapılması gerektiğini anlatır —
 * mağaza tarafı bundan etkilenmez, o JSON katalogdan okur.
 */
export default function VeritabaniGerekli({
  lang,
  sayfa,
  hata,
}: {
  lang: string;
  sayfa: string;
  hata?: string;
}) {
  return (
    <div className="mx-auto max-w-[820px] px-[30px] py-14">
      <nav className="text-[12.6px] text-steel-500">
        <Link href={`/${lang}`} className="hover:text-gold">Piro Gastro</Link>
        <span className="px-2">/</span>
        <b className="text-navy-900">{sayfa}</b>
      </nav>

      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-navy-900">
        Veritabanı bağlı değil
      </h1>
      <p className="mt-2 leading-relaxed text-steel-700">
        Bu ekran ürün metinlerini veritabanından okur ve oraya yazar.
        Mağaza tarafı etkilenmez — o, yayınlanmış katalog dosyasından okuduğu
        için veritabanı olmadan da çalışır.
      </p>

      <ol className="mt-6 space-y-4 text-[14px] leading-relaxed text-steel-900">
        <li>
          <b className="text-navy-900">1. Ücretsiz PostgreSQL açın</b>
          <p className="mt-1 text-steel-700">
            <a href="https://neon.tech" className="text-navy-600 underline">neon.tech</a>{" "}
            → yeni proje → “Connection string” kopyalayın.
          </p>
        </li>
        <li>
          <b className="text-navy-900">2. Vercel’e ekleyin</b>
          <p className="mt-1 text-steel-700">
            Settings → Environment Variables →{" "}
            <code className="rounded bg-steel-100 px-1.5 py-0.5 font-mono text-[12.6px]">DATABASE_URL</code>
            {" "}(Production, Preview, Development)
          </p>
        </li>
        <li>
          <b className="text-navy-900">3. Şemayı PostgreSQL’e çevirin</b>
          <p className="mt-1 text-steel-700">
            <code className="rounded bg-steel-100 px-1.5 py-0.5 font-mono text-[12.6px]">
              prisma/schema.prisma
            </code>{" "}
            içinde <code className="font-mono text-[12.6px]">provider = &quot;postgresql&quot;</code>
          </p>
        </li>
        <li>
          <b className="text-navy-900">4. Tabloları oluşturup veriyi aktarın</b>
          <pre className="mt-2 overflow-x-auto rounded-md bg-navy-950 px-4 py-3 font-mono text-[12.4px] text-steel-200">
{`npx prisma migrate deploy
npm run db:aktar`}
          </pre>
        </li>
      </ol>

      <div className="mt-8 rounded-[10px] border border-steel-200 bg-steel-50 p-5">
        <b className="text-[14px] text-navy-900">Otomatik çeviri için (isteğe bağlı)</b>
        <p className="mt-2 text-[13.2px] leading-relaxed text-steel-700">
          DeepL veya Google anahtarını da ortam değişkeni olarak ekleyin:
          <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-[12.4px]">DEEPL_API_KEY</code>
          veya
          <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-[12.4px]">GOOGLE_TRANSLATE_API_KEY</code>.
          Sonra:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-white px-4 py-3 font-mono text-[12.4px] text-navy-900">
{`npm run ceviri tr -- --prova    # ne kadar tutacağını gösterir
npm run ceviri tr               # çevirir ve veritabanına yazar
npm run db:yayinla              # siteye yayınlar`}
        </pre>
      </div>

      {hata && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[12.6px] text-steel-500">Teknik ayrıntı</summary>
          <pre className="mt-2 overflow-x-auto rounded bg-steel-50 p-3 font-mono text-[11.6px] text-steel-700">
            {hata}
          </pre>
        </details>
      )}

      <p className="mt-8 text-[13px]">
        <Link href={`/${lang}/admin/ceviriler`} className="font-semibold text-navy-600 hover:text-gold">
          ← Çeviri durumu ekranı
        </Link>
        <span className="ml-2 text-steel-500">(veritabanı gerektirmez, şimdi çalışıyor)</span>
      </p>
    </div>
  );
}
