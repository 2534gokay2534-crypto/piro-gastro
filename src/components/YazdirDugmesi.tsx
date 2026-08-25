"use client";

/**
 * Belgeyi yazdırır.
 * Tarayıcının yazdırma penceresi "PDF olarak kaydet" seçeneğini de sunar;
 * ayrıca sunucuda üretilen gerçek PDF için indirme bağlantısı vardır.
 */
export default function YazdirDugmesi({
  etiket,
  sinif,
}: {
  etiket: string;
  sinif?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        sinif ??
        "cursor-pointer rounded-[8px] bg-gold px-4 py-2.5 text-[13px] font-bold text-navy-950 transition hover:bg-gold-400"
      }
    >
      {etiket}
    </button>
  );
}
