"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ÜRÜN GÖRSEL GALERİSİ
 *
 * - Küçük görsele tıkla/dokun → büyük görsel değişir
 * - Büyük görsele tıkla → tam ekran büyütme
 * - Tam ekranda ileri/geri okları, klavye (← → Esc) ve mobilde kaydırma
 *
 * Ölçü şeması `children` olarak geçirilir; böylece mevcut yerleşim
 * (görselin sağında şema, altında küçük görseller) birebir korunur.
 */

type Gorsel = { url: string };

const METIN: Record<string, Record<string, string>> = {
  buyut: { sv: "Förstora bilden", en: "Enlarge image", tr: "Görseli büyüt", de: "Bild vergrößern" },
  kapat: { sv: "Stäng", en: "Close", tr: "Kapat", de: "Schließen" },
  onceki: { sv: "Föregående bild", en: "Previous image", tr: "Önceki görsel", de: "Vorheriges Bild" },
  sonraki: { sv: "Nästa bild", en: "Next image", tr: "Sonraki görsel", de: "Nächstes Bild" },
  gorsel: { sv: "Bild", en: "Image", tr: "Görsel", de: "Bild" },
};

const m = (k: string, lang: string) => METIN[k]?.[lang] ?? METIN[k]?.en ?? k;

/** Büyük görselin üstündeki ileri/geri oku. */
function Ok({
  yon,
  etiket,
  bas,
}: {
  yon: -1 | 1;
  etiket: string;
  bas: (yon: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        bas(yon);
      }}
      aria-label={etiket}
      className={
        "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full " +
        "border border-steel-200 bg-white/90 text-navy-800 shadow-c2 transition " +
        "hover:bg-white hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
        (yon < 0 ? "left-2" : "right-2")
      }
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={yon < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Tam ekrandaki büyük ileri/geri oku. */
function BuyukOk({
  yon,
  etiket,
  bas,
}: {
  yon: -1 | 1;
  etiket: string;
  bas: (yon: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        bas(yon);
      }}
      aria-label={etiket}
      className={
        "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full " +
        "bg-white/10 text-white transition hover:bg-white/20 " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
        (yon < 0 ? "left-2 sm:left-5" : "right-2 sm:right-5")
      }
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={yon < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function UrunGaleri({
  images,
  alt,
  sku,
  lang,
  children,
}: {
  images: Gorsel[];
  alt: string;
  sku: string;
  lang: string;
  children?: React.ReactNode;
}) {
  const liste = images?.filter((g) => g?.url) ?? [];
  const adet = liste.length;

  const [aktif, setAktif] = useState(0);
  const [buyuk, setBuyuk] = useState(false);
  const kapatRef = useRef<HTMLButtonElement>(null);
  const dokunX = useRef<number | null>(null);

  const git = useCallback(
    (yon: number) => {
      if (adet < 2) return;
      setAktif((n) => (n + yon + adet) % adet);
    },
    [adet],
  );

  /* --- klavye: yalnızca büyütme açıkken --- */
  useEffect(() => {
    if (!buyuk) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuyuk(false);
      else if (e.key === "ArrowRight") git(1);
      else if (e.key === "ArrowLeft") git(-1);
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [buyuk, git]);

  /* --- büyütme açıkken arka plan kaymasın --- */
  useEffect(() => {
    if (!buyuk) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    kapatRef.current?.focus();
    return () => {
      document.body.style.overflow = onceki;
    };
  }, [buyuk]);

  /* --- mobilde parmakla kaydırma --- */
  const dokunBasla = (e: React.TouchEvent) => {
    dokunX.current = e.touches[0]?.clientX ?? null;
  };
  const dokunBitir = (e: React.TouchEvent) => {
    if (dokunX.current === null) return;
    const fark = (e.changedTouches[0]?.clientX ?? 0) - dokunX.current;
    dokunX.current = null;
    if (Math.abs(fark) > 45) git(fark < 0 ? 1 : -1);
  };

  const suan = liste[aktif] ?? liste[0];

  /* --- görselsiz ürün: mevcut davranış korunur --- */
  if (adet === 0) {
    return (
      <div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
          <div className="flex aspect-[4/3] flex-1 items-center justify-center rounded-[10px] border border-steel-200 bg-steel-50 text-steel-500">
            {sku}
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ---------- büyük görsel + ölçü şeması ---------- */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        <div className="group relative flex-1">
          <button
            type="button"
            onClick={() => setBuyuk(true)}
            aria-label={m("buyut", lang)}
            onTouchStart={dokunBasla}
            onTouchEnd={dokunBitir}
            className="block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-[10px] border border-steel-200 bg-steel-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={suan.url}
              alt={alt}
              className="h-full w-full object-contain p-6 transition duration-200 group-hover:scale-[1.02]"
            />
          </button>

          {adet > 1 && (
            <>
              <Ok yon={-1} etiket={m("onceki", lang)} bas={git} />
              <Ok yon={1} etiket={m("sonraki", lang)} bas={git} />
              <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-navy-950/75 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-white">
                {aktif + 1} / {adet}
              </span>
            </>
          )}

          {/* büyüteç ipucu */}
          <span className="pointer-events-none absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy-950/70 text-white opacity-0 transition group-hover:opacity-100 sm:opacity-70">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-4-4M11 8.5v5M8.5 11h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        {children}
      </div>

      {/* ---------- küçük görseller ---------- */}
      {adet > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
          {liste.map((g, i) => (
            <button
              key={g.url + i}
              type="button"
              onClick={() => setAktif(i)}
              onDoubleClick={() => setBuyuk(true)}
              aria-label={`${m("gorsel", lang)} ${i + 1}`}
              aria-current={i === aktif ? "true" : undefined}
              className={
                "aspect-square overflow-hidden rounded border bg-steel-50 transition " +
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
                (i === aktif
                  ? "border-gold ring-1 ring-gold"
                  : "border-steel-200 hover:border-steel-400")
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}

      {/* ---------- tam ekran büyütme ---------- */}
      {buyuk && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[9999] flex flex-col bg-navy-950/95"
          onClick={() => setBuyuk(false)}
        >
          {/* üst çubuk */}
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
            <span className="min-w-0 truncate text-[13.5px] font-semibold">{alt}</span>
            <span className="flex items-center gap-3">
              {adet > 1 && (
                <span className="text-[12.5px] tabular-nums text-steel-300">
                  {aktif + 1} / {adet}
                </span>
              )}
              <button
                ref={kapatRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBuyuk(false);
                }}
                aria-label={m("kapat", lang)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-steel-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          </div>

          {/* görsel */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-3"
            onTouchStart={dokunBasla}
            onTouchEnd={dokunBitir}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={suan.url}
              alt={alt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain"
            />

            {adet > 1 && (
              <>
                <BuyukOk yon={-1} etiket={m("onceki", lang)} bas={git} />
                <BuyukOk yon={1} etiket={m("sonraki", lang)} bas={git} />
              </>
            )}
          </div>

          {/* alt küçük görseller */}
          {adet > 1 && (
            <div
              className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-4"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
            >
              {liste.map((g, i) => (
                <button
                  key={g.url + i}
                  type="button"
                  onClick={() => setAktif(i)}
                  aria-label={`${m("gorsel", lang)} ${i + 1}`}
                  aria-current={i === aktif ? "true" : undefined}
                  className={
                    "h-14 w-14 shrink-0 overflow-hidden rounded border bg-white/90 transition " +
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
                    (i === aktif ? "border-gold opacity-100" : "border-transparent opacity-55 hover:opacity-90")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
