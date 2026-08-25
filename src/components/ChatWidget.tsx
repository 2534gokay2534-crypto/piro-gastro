"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { st } from "@/lib/sohbet-metin";

/**
 * CANLI SOHBET PENCERESİ
 *
 * Sağ alt köşede sabit. Sayfa akışının dışındadır (position: fixed),
 * bu yüzden hiçbir sayfanın düzenini, SEO'sunu veya mevcut bileşenleri
 * etkilemez. Sunucuda hiçbir şey işlemez — yalnızca tarayıcıda çalışır.
 *
 * Üç kip:
 *   1) Çevrim içi  → canlı yazışma, 4 sn'de bir yoklama
 *   2) Çevrim dışı → mesaj bırakılır, yönetici sonra yanıtlar
 *   3) Veritabanı yok → mesaj e-posta uygulamasında açılır
 */

type Mesaj = { id: string; kim: string; metin: string; zaman: string };

const ANAHTAR_OTURUM = "pg_sohbet_oturum";
const ANAHTAR_ZIYARETCI = "pg_sohbet_ziyaretci";

function yeniKimlik(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "z" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function saat(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatWidget({ lang }: { lang: string }) {
  const yol = usePathname() ?? "";

  const [acik, setAcik] = useState(false);
  const [hazir, setHazir] = useState<boolean | null>(null); // null = henüz bilinmiyor
  const [cevrimIci, setCevrimIci] = useState(false);
  const [sirketEposta, setSirketEposta] = useState("");
  const [karsilama, setKarsilama] = useState("");

  const [oturumId, setOturumId] = useState<string | null>(null);
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [kapali, setKapali] = useState(false);

  const [ad, setAd] = useState("");
  const [eposta, setEposta] = useState("");
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState("");
  const [okunmamis, setOkunmamis] = useState(0);

  const listeRef = useRef<HTMLDivElement>(null);
  const mesajlarRef = useRef<Mesaj[]>([]);

  // Son mesajın damgası yoklama döngüsünde gerekir. Ref kullanılır ki
  // her yeni mesajda döngü baştan kurulmasın.
  useEffect(() => {
    mesajlarRef.current = mesajlar;
  }, [mesajlar]);

  const M = useCallback((k: string) => st(k, lang), [lang]);

  /* --- ilk yükleme: durum + kayıtlı oturum ------------------------- */
  useEffect(() => {
    let iptal = false;

    (async () => {
      let kayitli: string | null = null;
      try {
        kayitli = localStorage.getItem(ANAHTAR_OTURUM);
        if (!localStorage.getItem(ANAHTAR_ZIYARETCI)) {
          localStorage.setItem(ANAHTAR_ZIYARETCI, yeniKimlik());
        }
      } catch {
        /* localStorage kapalıysa sohbet yine açılır, sadece hatırlamaz */
      }

      try {
        const d = await fetch("/api/chat/durum").then((r) => r.json());
        if (iptal) return;
        setHazir(!!d.hazir);
        setCevrimIci(!!d.cevrimIci);
        setSirketEposta(d.eposta ?? "");
        setKarsilama(d.karsilama ?? "");
        if (kayitli && d.hazir) setOturumId(kayitli);
      } catch {
        if (!iptal) setHazir(false);
      }
    })();

    return () => {
      iptal = true;
    };
  }, []);

  /* --- yoklama: yeni yanıt geldi mi? ------------------------------- */
  useEffect(() => {
    if (!oturumId || hazir === false) return;

    let durduruldu = false;
    let zamanlayici: ReturnType<typeof setTimeout> | undefined;

    const cek = async () => {
      try {
        const son = mesajlarRef.current.at(-1)?.zaman ?? "";
        const u = `/api/chat/mesajlar?o=${encodeURIComponent(oturumId)}${son ? `&sonra=${encodeURIComponent(son)}` : ""}`;
        const d = await fetch(u).then((r) => r.json());
        if (durduruldu) return;

        if (d.ok) {
          setCevrimIci(!!d.cevrimIci);
          setKapali(!!d.kapali);
          if (Array.isArray(d.mesajlar) && d.mesajlar.length) {
            setMesajlar((eski) => {
              const varOlan = new Set(eski.map((m) => m.id));
              const yeni = (d.mesajlar as Mesaj[]).filter((m) => !varOlan.has(m.id));
              if (!yeni.length) return eski;
              if (!acik) {
                const danisman = yeni.filter((m) => m.kim === "agent").length;
                if (danisman) setOkunmamis((n) => n + danisman);
              }
              return [...eski, ...yeni];
            });
          }
        } else if (d.hazir === false) {
          setHazir(false);
        }
      } catch {
        /* ağ hatası — bir sonraki turda yeniden denenir */
      }
      if (!durduruldu) zamanlayici = setTimeout(cek, acik ? 4000 : 25000);
    };

    zamanlayici = setTimeout(cek, 600);
    return () => {
      durduruldu = true;
      if (zamanlayici) clearTimeout(zamanlayici);
    };
  }, [oturumId, hazir, acik]);

  /* --- yeni mesajda en alta kaydır -------------------------------- */
  useEffect(() => {
    if (!acik) return;
    const el = listeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mesajlar, acik]);

  /* --- açılınca okunmamışı sıfırla, Esc ile kapat ------------------ */
  useEffect(() => {
    if (!acik) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setAcik(false);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [acik]);

  /* --- eylemler ---------------------------------------------------- */

  const epostaGecerli = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  async function baslat(e: React.FormEvent) {
    e.preventDefault();
    const govde = metin.trim();
    if (!govde || gonderiliyor) return;

    // Veritabanı yok → mesaj e-posta uygulamasında açılır.
    if (hazir === false) {
      const konu = encodeURIComponent(`Web — ${ad.trim() || M("baslik")}`);
      const icerik = encodeURIComponent(
        `${govde}\n\n---\n${ad.trim()}\n${eposta.trim()}\n${typeof location !== "undefined" ? location.href : ""}`,
      );
      window.location.href = `mailto:${sirketEposta}?subject=${konu}&body=${icerik}`;
      setMetin("");
      return;
    }

    if (!cevrimIci && !epostaGecerli(eposta.trim())) return setHata(M("epostaHata"));
    if (!cevrimIci && !eposta.trim()) return setHata(M("epostaHata"));

    setGonderiliyor(true);
    setHata("");
    try {
      let ziyaretci = "";
      try {
        ziyaretci = localStorage.getItem(ANAHTAR_ZIYARETCI) ?? "";
      } catch {
        /* yok sayılır */
      }

      const d = await fetch("/api/chat/baslat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ad: ad.trim(),
          eposta: eposta.trim(),
          metin: govde,
          ziyaretci,
          dil: lang,
          sayfa: typeof location !== "undefined" ? location.pathname : "",
        }),
      }).then((r) => r.json());

      if (d.ok && d.oturumId) {
        setOturumId(d.oturumId);
        setMesajlar(d.mesajlar ?? []);
        setCevrimIci(!!d.cevrimIci);
        setMetin("");
        try {
          localStorage.setItem(ANAHTAR_OTURUM, d.oturumId);
        } catch {
        /* yok sayılır */
      }
      } else if (d.hazir === false) {
        setHazir(false);
      } else {
        setHata(d.hata === "eposta" ? M("epostaHata") : M("hata"));
      }
    } catch {
      setHata(M("hata"));
    } finally {
      setGonderiliyor(false);
    }
  }

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    const govde = metin.trim();
    if (!govde || !oturumId || gonderiliyor) return;

    setGonderiliyor(true);
    setHata("");
    setMetin("");
    try {
      const d = await fetch("/api/chat/gonder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ oturumId, metin: govde }),
      }).then((r) => r.json());

      if (d.ok && d.mesaj) {
        setMesajlar((x) => (x.some((m) => m.id === d.mesaj.id) ? x : [...x, d.mesaj]));
        setKapali(false);
      } else {
        setMetin(govde);
        setHata(M("hata"));
      }
    } catch {
      setMetin(govde);
      setHata(M("hata"));
    } finally {
      setGonderiliyor(false);
    }
  }

  /* --- yönetici ekranlarında gösterme ------------------------------ */
  if (yol.includes("/admin")) return null;

  const gorusmeVar = !!oturumId;
  const nokta = hazir && cevrimIci;

  return (
    <>
      {/* ---------- açma düğmesi ---------- */}
      <button
        type="button"
        onClick={() => {
          setOkunmamis(0);
          setAcik((v) => !v);
        }}
        aria-label={M("ac")}
        aria-expanded={acik}
        className={
          "fixed z-[9998] flex h-14 w-14 items-center justify-center rounded-full " +
          "bg-navy-900 text-white shadow-c4 transition hover:bg-navy-800 " +
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/50 " +
          "right-4 bottom-4 sm:right-6 sm:bottom-6 " +
          (acik ? "scale-95 opacity-0 pointer-events-none sm:scale-100 sm:opacity-100 sm:pointer-events-auto" : "")
        }
        style={{
          marginBottom: "env(safe-area-inset-bottom, 0px)",
          marginRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        {acik ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.7L3 21l1.9-5.1A8.2 8.2 0 0 1 4 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 8.4Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* çevrim içi göstergesi */}
        {!acik && nokta && (
          <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-navy-900 bg-emerald-400" />
        )}
        {/* okunmamış yanıt sayısı */}
        {!acik && okunmamis > 0 && (
          <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy-950">
            {okunmamis > 9 ? "9+" : okunmamis}
          </span>
        )}
      </button>

      {/* ---------- pencere ---------- */}
      {acik && (
        <div
          role="dialog"
          aria-label={M("baslik")}
          className={
            "fixed z-[9999] flex flex-col overflow-hidden bg-white " +
            // mobil: tam ekran · masaüstü: sağ altta kart
            "inset-0 rounded-none " +
            "sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[560px] sm:max-h-[calc(100vh-8rem)] " +
            "sm:w-[380px] sm:rounded-[14px] sm:border sm:border-steel-200 sm:shadow-c4"
          }
        >
          {/* başlık */}
          <div className="flex shrink-0 items-center gap-3 bg-navy-900 px-4 py-3.5 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.7L3 21l1.9-5.1A8.2 8.2 0 0 1 4 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 8.4Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-bold leading-tight">
                Piro <em className="not-italic text-gold">Gastro</em>
                <span className="ml-1.5 font-semibold text-white/80">· {M("baslik")}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-steel-400">
                <span
                  className={"h-2 w-2 rounded-full " + (nokta ? "bg-emerald-400" : "bg-steel-500")}
                  aria-hidden="true"
                />
                {nokta ? M("cevrimIci") : M("cevrimDisi")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAcik(false)}
              aria-label={M("kapat")}
              className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-steel-300 transition hover:bg-white/10 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* gövde */}
          {!gorusmeVar ? (
            /* ---- ilk form ---- */
            <form onSubmit={baslat} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
              <p className="text-[13.2px] leading-relaxed text-steel-700">
                {hazir === false
                  ? M("epostaAcikla")
                  : karsilama || (cevrimIci ? M("giris") : M("girisKapali"))}
              </p>

              <label className="mt-4 block text-[12px] font-semibold text-navy-900">
                {M("ad")} <span className="font-normal text-steel-500">({M("istegeBagli")})</span>
              </label>
              <input
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                maxLength={80}
                autoComplete="name"
                className="mt-1 w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[14px] outline-none focus:border-navy-500"
              />

              <label className="mt-3 block text-[12px] font-semibold text-navy-900">
                {cevrimIci && hazir ? (
                  <>
                    {M("eposta")}{" "}
                    <span className="font-normal text-steel-500">({M("istegeBagli")})</span>
                  </>
                ) : (
                  M("epostaZorunlu")
                )}
              </label>
              <input
                value={eposta}
                onChange={(e) => setEposta(e.target.value)}
                type="email"
                maxLength={120}
                autoComplete="email"
                required={hazir !== false && !cevrimIci}
                className="mt-1 w-full rounded-[8px] border border-steel-300 px-3 py-2 text-[14px] outline-none focus:border-navy-500"
              />

              <label className="mt-3 block text-[12px] font-semibold text-navy-900">{M("mesaj")}</label>
              <textarea
                value={metin}
                onChange={(e) => setMetin(e.target.value)}
                rows={4}
                maxLength={2000}
                required
                className="mt-1 w-full resize-none rounded-[8px] border border-steel-300 px-3 py-2 text-[14px] outline-none focus:border-navy-500"
              />

              {hata && <p className="mt-2 text-[12.4px] font-semibold text-danger">{hata}</p>}

              <button
                type="submit"
                disabled={gonderiliyor || !metin.trim()}
                className="mt-4 w-full rounded-[8px] bg-gold px-4 py-2.5 text-[14px] font-bold text-navy-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {gonderiliyor
                  ? M("gonderiliyor")
                  : hazir === false
                    ? M("epostaIleYaz")
                    : cevrimIci
                      ? M("basla")
                      : M("birak")}
              </button>
            </form>
          ) : (
            /* ---- yazışma ---- */
            <>
              <div ref={listeRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-steel-50 px-4 py-4">
                {!cevrimIci && (
                  <p className="rounded-[8px] bg-gold-200/60 px-3 py-2 text-[12.4px] leading-relaxed text-gold-800">
                    {M("alindi")}
                  </p>
                )}

                {mesajlar.map((m) => {
                  const benim = m.kim === "visitor";
                  if (m.kim === "system") {
                    return (
                      <p key={m.id} className="py-1 text-center text-[11.8px] text-steel-500">
                        {m.metin}
                      </p>
                    );
                  }
                  return (
                    <div key={m.id} className={"flex " + (benim ? "justify-end" : "justify-start")}>
                      <div className="max-w-[85%]">
                        <div
                          className={
                            "whitespace-pre-wrap break-words rounded-[12px] px-3 py-2 text-[13.6px] leading-relaxed " +
                            (benim
                              ? "rounded-br-[4px] bg-navy-600 text-white"
                              : "rounded-bl-[4px] border border-steel-200 bg-white text-steel-900")
                          }
                        >
                          {m.metin}
                        </div>
                        <div
                          className={
                            "mt-0.5 px-1 text-[10.8px] text-steel-500 " + (benim ? "text-right" : "")
                          }
                        >
                          {benim ? M("siz") : M("destek")} · {saat(m.zaman)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {kapali && (
                  <p className="pt-2 text-center text-[11.8px] text-steel-500">{M("gorusmeKapandi")}</p>
                )}
              </div>

              <form
                onSubmit={gonder}
                className="flex shrink-0 items-end gap-2 border-t border-steel-200 bg-white px-3 py-3"
                style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
              >
                <textarea
                  value={metin}
                  onChange={(e) => setMetin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      gonder(e as unknown as React.FormEvent);
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder={M("yaz")}
                  aria-label={M("mesaj")}
                  className="max-h-28 min-h-[42px] flex-1 resize-none rounded-[8px] border border-steel-300 px-3 py-2.5 text-[14px] outline-none focus:border-navy-500"
                />
                <button
                  type="submit"
                  disabled={gonderiliyor || !metin.trim()}
                  aria-label={M("gonder")}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[8px] bg-gold text-navy-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 12l16-8-6 16-2.5-6.5L4 12Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
              {hata && (
                <p className="shrink-0 bg-white px-4 pb-3 text-[12.2px] font-semibold text-danger">{hata}</p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
