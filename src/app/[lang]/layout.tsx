import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import ChatWidget from "@/components/ChatWidget";
import StorefrontChrome from "@/components/StorefrontChrome";
import { LANGS, isLang, t, type Lang } from "@/lib/i18n";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  return (
    <html lang={l}>
      <body>
        {/* Mağaza başlığı — /admin altında gizlenir */}
        <StorefrontChrome>
          <SiteHeader lang={l} />
        </StorefrontChrome>

        <main className="min-h-[60vh]">{children}</main>

        <StorefrontChrome>
        <footer className="mt-20 bg-navy-950 text-steel-400">
          <div className="mx-auto max-w-[1320px] px-5 py-12">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-mark.png" alt="Piro Gastro" className="h-7 w-auto" />
              </span>
              <span className="text-[22px] font-extrabold text-white">
                Piro <em className="not-italic text-gold">Gastro</em>
              </span>
            </div>
            <p className="mt-4 text-[12.6px] leading-relaxed">
              {t("legalName", l)} · Industrigatan 24 · 211 32 Malmö · Sverige
              <br />
              Org.nr 559214-8830 · VAT SE559214883001
            </p>
          </div>
        </footer>
        </StorefrontChrome>

        {/* Canlı sohbet — sayfa akışının dışında (position: fixed),
            mevcut düzeni ve SEO'yu etkilemez. */}
        <ChatWidget lang={l} />
      </body>
    </html>
  );
}
