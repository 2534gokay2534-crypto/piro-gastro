import Link from "next/link";
import Icon from "@/components/Icon";
import { t, type Lang } from "@/lib/i18n";

/** Hero — onaylı prototipin metinleri ve yerleşimi birebir. */
const COPY = {
  sv: {
    kicker: "Professionell Köksteknik",
    title: "Professionella Lösningar",
    gold: "Som Får Er Att Växa",
    lead: "Kvalitativa, pålitliga och teknologiska lösningar inom industriell köksutrustning för restauranger, caféer, konditorier och hotell.",
    btn: "Se sortimentet",
  },
  en: {
    kicker: "Professional Kitchen Technologies",
    title: "Professional Solutions",
    gold: "That Grow Your Business",
    lead: "Quality, reliable and technological solutions in industrial kitchen equipment for restaurants, cafés, patisseries and hotels.",
    btn: "Browse the range",
  },
  tr: {
    kicker: "Profesyonel Mutfak Teknolojileri",
    title: "İşinizi Büyüten",
    gold: "Profesyonel Çözümler",
    lead: "Restoran, kafe, pastane ve oteller için endüstriyel mutfak ekipmanlarında kaliteli, güvenilir ve teknolojik çözümler.",
    btn: "Ürünleri incele",
  },
} as const;

export default function Hero({ lang }: { lang: Lang }) {
  const c = COPY[lang];
  return (
    <section className="relative flex min-h-[520px] items-end overflow-hidden bg-navy-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-kitchen.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            "linear-gradient(0deg,rgba(5,13,24,.94) 0%,rgba(5,13,24,.6) 45%,rgba(5,13,24,.25) 100%)",
        }}
      />
      <div className="relative z-[3] mx-auto w-full max-w-[1320px] px-[30px] pt-[60px] pb-16">
        <span className="text-[11.4px] font-bold tracking-[.18em] text-gold uppercase">
          {c.kicker}
        </span>
        <h1 className="mt-3 mb-4 max-w-[820px] text-[clamp(30px,4.4vw,52px)] leading-[1.06] font-extrabold tracking-[-.03em] text-white uppercase">
          {c.title} <span className="text-gold">{c.gold}</span>
        </h1>
        <p className="mb-7 max-w-[600px] text-[clamp(14.5px,1.25vw,17.5px)] text-[#C2D2E1]">
          {c.lead}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${lang}/urunler`}
            className="inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3.5 text-[14px] font-bold text-navy-950 transition hover:bg-gold-400"
          >
            {c.btn}
            <Icon name="arrow" className="h-[18px] w-[18px]" />
          </Link>
          <Link
            href={`/${lang}/urunler`}
            className="inline-flex items-center gap-2 rounded-md border border-white/30 px-6 py-3.5 text-[14px] font-bold text-white transition hover:border-gold hover:text-gold"
          >
            {t("categories", lang)}
          </Link>
        </div>
      </div>
    </section>
  );
}
