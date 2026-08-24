"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import Icon from "@/components/Icon";
import { t, type Lang } from "@/lib/i18n";

export default function AddToCart({
  productId,
  lang,
  disabled,
}: {
  productId: string;
  lang: Lang;
  disabled?: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [eklendi, setEklendi] = useState(false);
  const [bekle, basla] = useTransition();
  const router = useRouter();

  function ekle() {
    basla(async () => {
      const r = await addToCart(productId, qty);
      if (r.ok) {
        setEklendi(true);
        router.refresh();
        setTimeout(() => setEklendi(false), 2500);
      }
    });
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <div className="flex h-[52px] items-stretch overflow-hidden rounded-md border border-steel-300">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="w-11 cursor-pointer text-[18px] text-steel-700 hover:bg-steel-50"
          aria-label="-"
        >
          −
        </button>
        <input
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
          inputMode="numeric"
          className="w-14 border-x border-steel-200 text-center text-[15px] font-semibold outline-none"
          aria-label="qty"
        />
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(999, q + 1))}
          className="w-11 cursor-pointer text-[18px] text-steel-700 hover:bg-steel-50"
          aria-label="+"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={ekle}
        disabled={disabled || bekle}
        className="flex h-[52px] cursor-pointer items-center gap-2.5 rounded-md bg-navy-900 px-7 text-[15px] font-bold text-white transition hover:bg-navy-800 disabled:cursor-default disabled:opacity-40"
      >
        <Icon name={eklendi ? "arrow" : "cart"} className="h-5 w-5" />
        {eklendi
          ? { sv: "Tillagd", en: "Added", tr: "Sepete eklendi" }[lang]
          : t("addToCart", lang)}
      </button>
    </div>
  );
}
