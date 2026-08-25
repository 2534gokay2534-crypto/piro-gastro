import Link from "next/link";

/**
 * Yönetim panelinin ortak arayüz parçaları.
 * Tüm ekranlar bunları kullanır — görünüm her yerde aynı olsun diye.
 */

/* ---------- sayfa çerçevesi ---------- */

export function Sayfa({
  baslik,
  ozet,
  eylem,
  children,
}: {
  baslik: string;
  ozet?: React.ReactNode;
  eylem?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-6 lg:px-8 lg:py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-tight text-navy-900">{baslik}</h1>
          {ozet && <div className="mt-1 text-[13.2px] text-steel-700">{ozet}</div>}
        </div>
        {eylem && <div className="flex flex-wrap items-center gap-2">{eylem}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/* ---------- kutular ---------- */

export function Kutu({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"rounded-[10px] border border-steel-200 bg-white shadow-c1 " + className}>
      {children}
    </div>
  );
}

export function Kart({
  etiket,
  deger,
  alt,
  renk = "navy",
}: {
  etiket: string;
  deger: React.ReactNode;
  alt?: React.ReactNode;
  renk?: "navy" | "ok" | "warn" | "danger" | "gold";
}) {
  const renkler: Record<string, string> = {
    navy: "text-navy-900",
    ok: "text-ok",
    warn: "text-warn",
    danger: "text-danger",
    gold: "text-gold-700",
  };
  return (
    <Kutu className="p-4">
      <div className="text-[11.5px] font-bold uppercase tracking-wider text-steel-500">
        {etiket}
      </div>
      <div className={"mt-1.5 text-[24px] font-extrabold tabular-nums " + renkler[renk]}>
        {deger}
      </div>
      {alt && <div className="mt-0.5 text-[12px] text-steel-600">{alt}</div>}
    </Kutu>
  );
}

/* ---------- rozet ---------- */

const ROZET: Record<string, string> = {
  ok: "bg-emerald-50 text-ok",
  warn: "bg-amber-50 text-warn",
  danger: "bg-red-50 text-danger",
  gri: "bg-steel-100 text-steel-700",
  navy: "bg-navy-900 text-white",
  gold: "bg-gold-200 text-gold-800",
};

export function Rozet({
  children,
  ton = "gri",
}: {
  children: React.ReactNode;
  ton?: keyof typeof ROZET;
}) {
  return (
    <span
      className={
        "inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10.8px] font-bold " +
        (ROZET[ton] ?? ROZET.gri)
      }
    >
      {children}
    </span>
  );
}

/* ---------- düğmeler ---------- */

const DUGME_TEMEL =
  "inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

export const DUGME = {
  ana: DUGME_TEMEL + " bg-gold text-navy-950 hover:bg-gold-400",
  koyu: DUGME_TEMEL + " bg-navy-900 text-white hover:bg-navy-800",
  sade: DUGME_TEMEL + " border border-steel-300 bg-white text-steel-900 hover:bg-steel-50",
  tehlike: DUGME_TEMEL + " border border-red-200 bg-white text-danger hover:bg-red-50",
};

/* ---------- arama + süzgeç çubuğu ---------- */

export function AramaCubugu({
  eylem,
  q,
  yerTutucu = "Ara…",
  gizli = {},
  children,
}: {
  eylem: string;
  q?: string;
  yerTutucu?: string;
  gizli?: Record<string, string>;
  children?: React.ReactNode;
}) {
  return (
    <form
      action={eylem}
      method="get"
      className="flex flex-wrap items-center gap-2 rounded-[10px] border border-steel-200 bg-white p-3 shadow-c1"
    >
      {Object.entries(gizli).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <div className="relative min-w-[200px] flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={yerTutucu}
          className="w-full rounded-[8px] border border-steel-300 py-2 pl-9 pr-3 text-[13.5px] outline-none focus:border-navy-500"
        />
      </div>
      {children}
      <button type="submit" className={DUGME.koyu}>
        Ara
      </button>
    </form>
  );
}

export function Secim({
  ad,
  deger,
  secenekler,
  etiket,
}: {
  ad: string;
  deger?: string;
  secenekler: Array<{ v: string; a: string }>;
  etiket?: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[12.5px] text-steel-600">
      {etiket && <span className="whitespace-nowrap font-semibold">{etiket}</span>}
      <select
        name={ad}
        defaultValue={deger ?? ""}
        className="rounded-[8px] border border-steel-300 bg-white px-2.5 py-2 text-[13px] text-steel-900 outline-none focus:border-navy-500"
      >
        {secenekler.map((s) => (
          <option key={s.v} value={s.v}>
            {s.a}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------- tablo ---------- */

export function Tablo({ children }: { children: React.ReactNode }) {
  return (
    <Kutu className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13.2px]">{children}</table>
      </div>
    </Kutu>
  );
}

export function Th({
  children,
  sag,
  orta,
  w,
}: {
  children?: React.ReactNode;
  sag?: boolean;
  orta?: boolean;
  w?: string;
}) {
  return (
    <th
      style={w ? { width: w } : undefined}
      className={
        "whitespace-nowrap border-b border-steel-200 bg-steel-50 px-3 py-2.5 text-[11.4px] font-bold uppercase tracking-wider text-steel-600 " +
        (sag ? "text-right" : orta ? "text-center" : "text-left")
      }
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  sag,
  orta,
  className = "",
}: {
  children?: React.ReactNode;
  sag?: boolean;
  orta?: boolean;
  className?: string;
}) {
  return (
    <td
      className={
        "border-b border-steel-100 px-3 py-2.5 align-middle " +
        (sag ? "text-right " : orta ? "text-center " : "") +
        className
      }
    >
      {children}
    </td>
  );
}

/* ---------- boş durum ---------- */

export function Bos({ metin }: { metin: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-steel-300 bg-white px-5 py-12 text-center text-[13.6px] text-steel-600">
      {metin}
    </div>
  );
}

/* ---------- sayfalama ---------- */

export function Sayfalama({
  sayfa,
  sonSayfa,
  url,
  toplam,
}: {
  sayfa: number;
  sonSayfa: number;
  url: (s: number) => string;
  toplam: number;
}) {
  if (sonSayfa <= 1) {
    return (
      <p className="mt-3 text-[12.4px] text-steel-500">
        {toplam.toLocaleString("tr-TR")} kayıt
      </p>
    );
  }
  const g = Math.max(1, sayfa - 1);
  const i = Math.min(sonSayfa, sayfa + 1);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12.4px] text-steel-500">
        {toplam.toLocaleString("tr-TR")} kayıt · sayfa {sayfa}/{sonSayfa}
      </p>
      <div className="flex items-center gap-1.5">
        {sayfa > 1 && (
          <Link href={url(g)} className={DUGME.sade}>
            ← Önceki
          </Link>
        )}
        {sayfa < sonSayfa && (
          <Link href={url(i)} className={DUGME.sade}>
            Sonraki →
          </Link>
        )}
      </div>
    </div>
  );
}
