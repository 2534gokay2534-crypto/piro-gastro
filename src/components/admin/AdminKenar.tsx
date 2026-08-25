"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MENU } from "@/lib/admin-menu";

/**
 * Süper Admin sol menüsü.
 *
 * Masaüstünde sabit sütun, mobilde üstten açılan çekmece.
 * Yalnızca /admin altında görünür — mağaza tarafına dokunmaz.
 */

export default function AdminKenar({
  lang,
  sayac,
}: {
  lang: string;
  sayac: { siparis: number; sohbet: number; stok: number };
}) {
  const yol = usePathname() ?? "";
  const kok = `/${lang}/admin`;
  const [acik, setAcik] = useState(false);

  const aktifMi = (altYol: string) => {
    const tam = kok + altYol;
    if (altYol === "") return yol === kok || yol === `${kok}/`;
    return yol === tam || yol.startsWith(tam + "/");
  };

  const govde = (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {MENU.map((g) => (
        <div key={g.grup}>
          <div className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-steel-500">
            {g.grup}
          </div>
          <ul className="space-y-0.5">
            {g.ogeler.map((o) => {
              const aktif = aktifMi(o.yol);
              const n = o.rozet ? sayac[o.rozet] : 0;
              return (
                <li key={o.yol}>
                  <Link
                    href={kok + o.yol}
                    onClick={() => setAcik(false)}
                    aria-current={aktif ? "page" : undefined}
                    className={
                      "flex items-center justify-between gap-2 rounded-[7px] border-l-[3px] py-2 pl-3 pr-2.5 text-[13.4px] transition " +
                      (aktif
                        ? "border-gold bg-white/[0.07] font-bold text-white"
                        : "border-transparent font-medium text-steel-400 hover:bg-white/[0.04] hover:text-white")
                    }
                  >
                    <span className="truncate">{o.ad}</span>
                    {n > 0 && (
                      <span
                        className={
                          "shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-bold tabular-nums " +
                          (o.rozet === "stok"
                            ? "bg-danger text-white"
                            : "bg-gold text-navy-950")
                        }
                      >
                        {n > 999 ? "999+" : n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* mobil başlık çubuğu */}
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-navy-950 px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setAcik((v) => !v)}
          aria-label="Menü"
          aria-expanded={acik}
          className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-white/10 text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <Link href={`${kok}`} className="text-[15px] font-extrabold text-white">
          Piro <em className="not-italic text-gold">Gastro</em>
          <span className="ml-1.5 text-[12px] font-semibold text-steel-400">Süper Admin</span>
        </Link>
      </div>

      {acik && (
        <div className="border-b border-white/10 bg-navy-950 lg:hidden">{govde}</div>
      )}

      {/* masaüstü sabit sütun */}
      <aside className="hidden w-[248px] shrink-0 bg-navy-950 lg:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto">
          <Link
            href={kok}
            className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="" className="h-6 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold text-white">
                Piro <em className="not-italic text-gold">Gastro</em>
              </span>
              <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-steel-500">
                Süper Admin
              </span>
            </span>
          </Link>

          {govde}

          <div className="px-5 pb-6 pt-2">
            <Link
              href={`/${lang}`}
              className="text-[12px] font-semibold text-steel-500 hover:text-gold"
            >
              ← Mağazaya dön
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
