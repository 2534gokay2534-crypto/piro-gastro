import type { Lang } from "@/lib/i18n";

/**
 * Ölçü katmanı — ürünün gerçek en/derinlik/yükseklik değerlerini
 * oklarla gösteren teknik şema.
 *
 *  - Kutu, ürünün GERÇEK oranlarına göre çizilir (kübik izdüşüm).
 *  - Uzunluk  : sağdan sola  (alt kenar)
 *  - Derinlik : önden arkaya (sağ alt köşeden içeri)
 *  - Yükseklik: aşağıdan yukarı (sol kenar)
 *  - Değerler veritabanındaki dims alanından gelir; uydurma yoktur.
 */

export type Dims = { w: number; d: number; h: number; unit?: string };

const METIN = {
  sv: { baslik: "Mått", w: "Bredd", d: "Djup", h: "Höjd", agirlik: "Vikt" },
  en: { baslik: "Dimensions", w: "Width", d: "Depth", h: "Height", agirlik: "Weight" },
  tr: { baslik: "Ölçüler", w: "Genişlik", d: "Derinlik", h: "Yükseklik", agirlik: "Ağırlık" },
} as Record<string, { baslik: string; w: string; d: string; h: string; agirlik: string }>;

/** mm -> okunabilir metin (1000 mm ve üzeri cm olarak da yazılır) */
function olcuMetni(mm: number): string {
  if (mm >= 1000) return `${mm} mm`;
  return `${mm} mm`;
}

export default function DimensionDiagram({
  dims,
  lang,
  weightKg,
}: {
  dims: Dims;
  lang: Lang;
  weightKg?: number | null;
}) {
  const t = METIN[lang] ?? METIN.en;
  const { w, d, h } = dims;

  // --- SABİT TUVAL ---
  // Tuval boyutu ürüne göre değişmez; böylece yazı boyutu her üründe aynı
  // kalır. Kutu, gerçek oranları korunarak bu alana sığdırılıp ortalanır.
  const VW = 340;
  const VH = 250;
  const ALAN_W = 150;                    // kutunun kaplayabileceği en fazla genişlik
  const ALAN_H = 132;

  // derinlik açılı çizilir; izdüşümde yatay ve dikey yer kaplar
  const DERINLIK_ORAN = 0.55;
  const olcekW = ALAN_W / (w + d * DERINLIK_ORAN);
  const olcekH = ALAN_H / (h + d * DERINLIK_ORAN);
  const OLCEK = Math.min(olcekW, olcekH);

  const bw = Math.max(24, w * OLCEK);
  const bh = Math.max(24, h * OLCEK);
  const bd = Math.max(20, d * OLCEK * DERINLIK_ORAN); // ok görünür kalsın

  // çizimi tuvalde ortala
  const toplamW = bw + bd;
  const toplamH = bh + bd;
  const X0 = Math.round((VW - toplamW) / 2 + bd / 2);
  const Y0 = Math.round((VH - toplamH) / 2 + bd);

  const on = { x: X0, y: Y0 - bh, w: bw, h: bh };
  const dx = bd, dy = -bd;               // derinlik yönü (sağ-yukarı)

  const ok = "url(#pgOk)";
  const CIZGI = "#8794a3";
  const OLCU = "#0a1b2e";

  return (
    <figure className="rounded-[10px] border border-steel-200 bg-steel-50/60 p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[11.4px] font-bold tracking-[.12em] text-steel-700 uppercase">
          {t.baslik}
        </span>
        <span className="font-mono text-[12.4px] font-semibold text-navy-900">
          {w} × {d} × {h} mm
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full max-w-[420px]"
        role="img"
        aria-label={`${t.w} ${w} mm, ${t.d} ${d} mm, ${t.h} ${h} mm`}
      >
        <defs>
          <marker id="pgOk" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={OLCU} />
          </marker>
        </defs>

        {/* ---- gövde: ön yüz + üst yüz + yan yüz ---- */}
        <g fill="#ffffff" stroke={CIZGI} strokeWidth="1.1" strokeLinejoin="round">
          {/* üst */}
          <polygon
            points={`${on.x},${on.y} ${on.x + dx},${on.y + dy} ${on.x + on.w + dx},${on.y + dy} ${on.x + on.w},${on.y}`}
            fill="#f2f5f8"
          />
          {/* sağ yan */}
          <polygon
            points={`${on.x + on.w},${on.y} ${on.x + on.w + dx},${on.y + dy} ${on.x + on.w + dx},${on.y + on.h + dy} ${on.x + on.w},${on.y + on.h}`}
            fill="#e7ecf1"
          />
          {/* ön */}
          <rect x={on.x} y={on.y} width={on.w} height={on.h} />
        </g>

        {/* ---- GENİŞLİK: sağdan sola, alt kenarda ---- */}
        <g stroke={OLCU} strokeWidth="1" fill="none">
          <line x1={on.x} y1={on.y + on.h + 10} x2={on.x} y2={on.y + on.h + 26} stroke={CIZGI} />
          <line x1={on.x + on.w} y1={on.y + on.h + 10} x2={on.x + on.w} y2={on.y + on.h + 26} stroke={CIZGI} />
          <line
            x1={on.x + 1} y1={on.y + on.h + 20}
            x2={on.x + on.w - 1} y2={on.y + on.h + 20}
            markerStart={ok} markerEnd={ok}
          />
        </g>
        <text
          x={on.x + on.w / 2} y={on.y + on.h + 38}
          textAnchor="middle" fontSize="11.5" fontWeight="700" fill={OLCU}
        >
          {olcuMetni(w)}
        </text>

        {/* ---- YÜKSEKLİK: aşağıdan yukarı, sol kenarda ---- */}
        <g stroke={OLCU} strokeWidth="1" fill="none">
          <line x1={on.x - 10} y1={on.y} x2={on.x - 26} y2={on.y} stroke={CIZGI} />
          <line x1={on.x - 10} y1={on.y + on.h} x2={on.x - 26} y2={on.y + on.h} stroke={CIZGI} />
          <line
            x1={on.x - 20} y1={on.y + on.h - 1}
            x2={on.x - 20} y2={on.y + 1}
            markerStart={ok} markerEnd={ok}
          />
        </g>
        <text
          x={on.x - 26} y={on.y + on.h / 2}
          textAnchor="middle" fontSize="11.5" fontWeight="700" fill={OLCU}
          transform={`rotate(-90 ${on.x - 26} ${on.y + on.h / 2})`}
        >
          {olcuMetni(h)}
        </text>

        {/* ---- DERİNLİK: önden arkaya, sağ alt köşeden ---- */}
        <g stroke={OLCU} strokeWidth="1" fill="none">
          <line
            x1={on.x + on.w + 6} y1={on.y + on.h + 4}
            x2={on.x + on.w + 14} y2={on.y + on.h + 10}
            stroke={CIZGI}
          />
          <line
            x1={on.x + on.w + dx + 6} y1={on.y + on.h + dy + 4}
            x2={on.x + on.w + dx + 14} y2={on.y + on.h + dy + 10}
            stroke={CIZGI}
          />
          <line
            x1={on.x + on.w + 11} y1={on.y + on.h + 8}
            x2={on.x + on.w + dx + 11} y2={on.y + on.h + dy + 8}
            markerStart={ok} markerEnd={ok}
          />
        </g>
        <text
          x={on.x + on.w + dx / 2 + 26} y={on.y + on.h + dy / 2 + 24}
          textAnchor="start" fontSize="11" fontWeight="700" fill={OLCU}
        >
          {olcuMetni(d)}
        </text>
      </svg>

      {/* ---- değer listesi (ekran okuyucu ve mobil için net) ---- */}
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-steel-200 pt-3 text-center">
        {[
          [t.w, w],
          [t.d, d],
          [t.h, h],
        ].map(([etiket, deger]) => (
          <div key={etiket as string}>
            <dt className="text-[10.6px] tracking-wide text-steel-700 uppercase">{etiket}</dt>
            <dd className="font-mono text-[13px] font-bold text-navy-900">{deger} mm</dd>
          </div>
        ))}
      </dl>

      {weightKg ? (
        <p className="mt-2 text-center text-[11.6px] text-steel-700">
          {t.agirlik}: <b className="text-navy-900">{weightKg} kg</b>
        </p>
      ) : null}
    </figure>
  );
}
