"use client";

import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { LANGS, LANG_NAME, type Lang } from "@/lib/i18n";

/** Dil seçici — bulunulan sayfada kalarak dil değiştirir. */
export default function LangSwitch({ lang }: { lang: Lang }) {
  const router = useRouter();
  const pathname = usePathname();

  function degistir(yeni: string) {
    const parcalar = pathname.split("/");
    parcalar[1] = yeni; // /sv/kategori/... -> /tr/kategori/...
    router.push(parcalar.join("/") || `/${yeni}`);
  }

  return (
    <span className="flex items-center gap-1.5 text-[12.4px] font-semibold">
      <Icon name="globe" className="h-[15px] w-[15px]" />
      <select
        value={lang}
        onChange={(e) => degistir(e.target.value)}
        aria-label="Language"
        className="cursor-pointer border-0 bg-transparent px-1 py-0.5 text-[12.4px] font-[650] text-navy-950 outline-none"
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANG_NAME[l]}
          </option>
        ))}
      </select>
    </span>
  );
}
