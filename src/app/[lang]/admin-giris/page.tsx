import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isLang } from "@/lib/i18n";
import { CEREZ, cerezSuanGecerliMi, sifreVar } from "@/lib/admin-kapi";
import { adminGiris } from "@/app/actions/admin-giris";

export const dynamic = "force-dynamic";

/** Giriş ekranı arama motorlarına kapalı. */
export const metadata: Metadata = {
  title: "Süper Admin — Giriş",
  robots: { index: false, follow: false },
};

const girdi =
  "w-full rounded-[10px] border border-steel-300 px-3.5 py-2.5 text-[14px] outline-none focus:border-navy-500";

export default async function AdminGiris({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ hata?: string; devam?: string; kurulum?: string; cikis?: string }>;
}) {
  const { lang } = await params;
  const { hata, devam, kurulum, cikis } = await searchParams;
  if (!isLang(lang)) notFound();

  // Zaten girişliyse panele al
  const kutu = await cookies();
  if (sifreVar() && (await cerezSuanGecerliMi(kutu.get(CEREZ)?.value))) {
    redirect(`/${lang}/admin`);
  }

  const kurulumGerek = !sifreVar();

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-7 w-auto" />
          </span>
          <span className="leading-tight">
            <span className="block text-[19px] font-extrabold text-white">
              Piro <em className="not-italic text-gold">Gastro</em>
            </span>
            <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-steel-500">
              Süper Admin
            </span>
          </span>
        </div>

        <div className="rounded-[14px] bg-white p-6 shadow-c2">
          {kurulumGerek ? (
            <>
              <h1 className="text-[17px] font-extrabold text-navy-900">Kurulum gerekli</h1>
              <p className="mt-2 text-[13.2px] leading-relaxed text-steel-700">
                Yönetici paneli kapalı çünkü <code className="rounded bg-steel-100 px-1 font-mono">ADMIN_SIFRE</code>{" "}
                ortam değişkeni tanımlı değil.
              </p>
              <ol className="mt-3 space-y-1.5 pl-4 text-[12.8px] leading-relaxed text-steel-700 [list-style:decimal]">
                <li>Vercel → proje → Settings → Environment Variables</li>
                <li>
                  <b>ADMIN_SIFRE</b> adıyla güçlü bir şifre ekleyin (Production, Preview, Development)
                </li>
                <li>Deployments → son dağıtım → Redeploy</li>
              </ol>
              <p className="mt-3 text-[12.4px] leading-relaxed text-steel-500">
                Şifre yalnızca sunucuda tutulur, hiçbir sayfaya yazılmaz.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[17px] font-extrabold text-navy-900">Yönetici girişi</h1>
              <p className="mt-1.5 text-[13px] text-steel-600">
                Devam etmek için yönetici şifresini girin.
              </p>

              {hata === "1" && (
                <p className="mt-3.5 rounded-[9px] bg-danger/10 px-3 py-2 text-[12.8px] font-semibold text-danger">
                  Şifre hatalı.
                </p>
              )}
              {hata === "cok" && (
                <p className="mt-3.5 rounded-[9px] bg-danger/10 px-3 py-2 text-[12.8px] font-semibold text-danger">
                  Çok fazla deneme yapıldı. Lütfen 10 dakika sonra tekrar deneyin.
                </p>
              )}
              {cikis === "1" && !hata && (
                <p className="mt-3.5 rounded-[9px] bg-ok/10 px-3 py-2 text-[12.8px] font-semibold text-ok">
                  Çıkış yapıldı.
                </p>
              )}
              {kurulum === "1" && (
                <p className="mt-3.5 rounded-[9px] bg-warn/10 px-3 py-2 text-[12.8px] font-semibold text-warn">
                  Oturum gerekli.
                </p>
              )}

              <form action={adminGiris} className="mt-4 space-y-3">
                <input type="hidden" name="dil" value={lang} />
                <input type="hidden" name="devam" value={devam ?? ""} />
                <label className="block">
                  <span className="block text-[12px] font-bold text-navy-900">Şifre</span>
                  <input
                    type="password"
                    name="sifre"
                    autoComplete="current-password"
                    autoFocus
                    required
                    maxLength={200}
                    className={girdi + " mt-1"}
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-[10px] bg-navy-900 px-4 py-2.5 text-[14px] font-bold text-white transition hover:bg-navy-800"
                >
                  Giriş yap
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-5 text-center">
          <Link href={`/${lang}`} className="text-[12.4px] font-semibold text-steel-500 hover:text-gold">
            ← Mağazaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}
