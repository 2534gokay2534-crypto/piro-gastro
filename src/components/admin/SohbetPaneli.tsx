"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * CANLI SOHBET PANELİ — Süper Admin
 *
 * Mesajlar 3 saniyede bir yoklanır; müşteri yazdığında sayfa yenilemeden
 * görünür. Yönetici yanıtı gönderdiğinde de aynı şekilde anında listeye
 * düşer ve müşteri tarafındaki widget 4 saniye içinde alır.
 *
 * Ekran açıldığında oturum "okundu" işaretlenir; bildirim çubuğundaki
 * sayaç sıfırlanır.
 */

type Mesaj = { id: string; kim: string; metin: string; zaman: string };

const ARALIK_MS = 3000;

const saat = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm",
  }).format(new Date(iso));

const tarihSaat = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm",
  }).format(new Date(iso));

export default function SohbetPaneli({
  oturumId,
  ilkMesajlar,
  ilkDurum,
}: {
  oturumId: string;
  ilkMesajlar: Mesaj[];
  ilkDurum: string;
}) {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>(ilkMesajlar);
  const [durum, setDurum] = useState(ilkDurum);
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState("");

  const dip = useRef<HTMLDivElement>(null);
  const sonId = useRef<string>(ilkMesajlar[ilkMesajlar.length - 1]?.id ?? "");
  // Yoklama efekti durum değişiminde yeniden kurulmasın diye ref tutulur.
  const durumRef = useRef(ilkDurum);

  const dibeKay = useCallback(() => {
    dip.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  /* --- açılışta okundu işaretle --- */
  useEffect(() => {
    fetch("/api/admin/sohbet/yanit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is: "okundu", oturum: oturumId }),
    }).catch(() => null);
  }, [oturumId]);

  /* --- mesajları yokla --- */
  useEffect(() => {
    let durduruldu = false;
    let zamanlayici: ReturnType<typeof setTimeout> | null = null;

    const cek = async () => {
      try {
        const r = await fetch(`/api/admin/sohbet/akis?oturum=${encodeURIComponent(oturumId)}`, {
          cache: "no-store",
        });
        if (r.ok) {
          const v = (await r.json()) as { mesajlar?: Mesaj[]; oturumlar?: Array<{ id: string; durum: string }> };
          if (!durduruldu && v.mesajlar) {
            const yeniSon = v.mesajlar[v.mesajlar.length - 1]?.id ?? "";
            if (yeniSon !== sonId.current) {
              sonId.current = yeniSon;
              setMesajlar(v.mesajlar);
              // Yeni müşteri mesajı geldiyse okundu işaretle (ekran açık)
              fetch("/api/admin/sohbet/yanit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is: "okundu", oturum: oturumId }),
              }).catch(() => null);
            }
            const bu = v.oturumlar?.find((o) => o.id === oturumId);
            if (bu && bu.durum !== durumRef.current) {
              durumRef.current = bu.durum;
              setDurum(bu.durum);
            }
          }
        }
      } catch {
        /* ağ hatası — sonraki yoklamada düzelir */
      }
      if (!durduruldu) zamanlayici = setTimeout(cek, ARALIK_MS);
    };

    // Hemen bir kez yokla, sonra aralıklarla sürdür.
    cek();

    // Sekme arka plandayken tarayıcı zamanlayıcıları kısar; sekme öne
    // geldiğinde beklemeden tazeleyelim ki mesajlar geç görünmesin.
    const gorunurluk = () => {
      if (document.visibilityState === "visible") {
        if (zamanlayici) clearTimeout(zamanlayici);
        cek();
      }
    };
    document.addEventListener("visibilitychange", gorunurluk);
    window.addEventListener("focus", gorunurluk);

    return () => {
      durduruldu = true;
      if (zamanlayici) clearTimeout(zamanlayici);
      document.removeEventListener("visibilitychange", gorunurluk);
      window.removeEventListener("focus", gorunurluk);
    };
  }, [oturumId]);

  useEffect(() => {
    dibeKay();
  }, [mesajlar.length, dibeKay]);

  /* --- yanıt gönder --- */
  const gonder = async () => {
    const t = metin.trim();
    if (!t || gonderiliyor) return;
    setGonderiliyor(true);
    setHata("");
    try {
      const r = await fetch("/api/admin/sohbet/yanit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is: "yanit", oturum: oturumId, metin: t }),
      });
      const v = (await r.json()) as { ok?: boolean; id?: string; zaman?: string; hata?: string };
      if (v.ok && v.id) {
        setMesajlar((m) => [...m, { id: v.id!, kim: "agent", metin: t, zaman: v.zaman ?? new Date().toISOString() }]);
        sonId.current = v.id;
        setMetin("");
        durumRef.current = "open";
        setDurum("open");
      } else {
        setHata(v.hata ?? "Mesaj gönderilemedi.");
      }
    } catch {
      setHata("Bağlantı kurulamadı.");
    } finally {
      setGonderiliyor(false);
    }
  };

  /* --- durum değiştir --- */
  const durumDegistir = async (d: string) => {
    const onceki = durum;
    durumRef.current = d;
    setDurum(d);
    try {
      const r = await fetch("/api/admin/sohbet/yanit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is: "durum", oturum: oturumId, durum: d }),
      });
      const v = (await r.json()) as { ok?: boolean };
      if (!v.ok) { durumRef.current = onceki; setDurum(onceki); }
    } catch {
      durumRef.current = onceki;
      setDurum(onceki);
    }
  };

  const DURUMLAR: Array<{ kod: string; ad: string; sinif: string }> = [
    { kod: "open", ad: "Açık", sinif: "bg-ok text-white" },
    { kod: "waiting", ad: "Beklemede", sinif: "bg-warn text-navy-950" },
    { kod: "closed", ad: "Kapatıldı", sinif: "bg-steel-300 text-navy-900" },
  ];

  return (
    <div className="rounded-[12px] border border-steel-200 bg-white">
      {/* --- durum çubuğu --- */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-200 px-4 py-2.5">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
          </span>
          <span className="text-[12.4px] font-semibold text-steel-600">
            Canlı · {mesajlar.length} mesaj
          </span>
        </span>

        <span className="flex gap-1.5">
          {DURUMLAR.map((d) => (
            <button
              key={d.kod}
              type="button"
              onClick={() => durumDegistir(d.kod)}
              className={
                "cursor-pointer rounded-full px-3 py-1 text-[12px] font-bold transition " +
                (durum === d.kod ? d.sinif : "bg-steel-100 text-steel-600 hover:bg-steel-200")
              }
            >
              {d.ad}
            </button>
          ))}
        </span>
      </div>

      {/* --- mesajlar --- */}
      <div className="max-h-[52vh] min-h-[240px] space-y-2.5 overflow-y-auto px-4 py-4">
        {mesajlar.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-steel-500">Henüz mesaj yok.</p>
        ) : (
          mesajlar.map((m, i) => {
            const gun = new Date(m.zaman).toDateString();
            const oncekiGun = i > 0 ? new Date(mesajlar[i - 1].zaman).toDateString() : "";
            const sistem = m.kim === "system";
            const ajan = m.kim === "agent";
            return (
              <div key={m.id}>
                {gun !== oncekiGun && (
                  <p className="my-3 text-center text-[11.4px] font-semibold text-steel-400">
                    {tarihSaat(m.zaman).slice(0, 10)}
                  </p>
                )}
                {sistem ? (
                  <p className="text-center text-[11.6px] italic text-steel-500">{m.metin}</p>
                ) : (
                  <div className={"flex " + (ajan ? "justify-end" : "justify-start")}>
                    <div
                      className={
                        "max-w-[76%] rounded-[12px] px-3.5 py-2 " +
                        (ajan ? "bg-navy-900 text-white" : "bg-steel-100 text-navy-900")
                      }
                    >
                      <p className="whitespace-pre-wrap break-words text-[13.2px] leading-relaxed">{m.metin}</p>
                      <p className={"mt-0.5 text-[10.6px] " + (ajan ? "text-steel-400" : "text-steel-500")}>
                        {ajan ? "Siz" : "Müşteri"} · {saat(m.zaman)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={dip} />
      </div>

      {/* --- yanıt --- */}
      <div className="border-t border-steel-200 p-3">
        {hata && (
          <p className="mb-2 rounded bg-danger/10 px-3 py-1.5 text-[12.2px] font-semibold text-danger">{hata}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                gonder();
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Yanıtınızı yazın… (Enter gönderir, Shift+Enter alt satır)"
            className="min-h-[46px] flex-1 resize-y rounded-[8px] border border-steel-300 px-3 py-2 text-[13.4px] outline-none focus:border-navy-500"
          />
          <button
            type="button"
            onClick={gonder}
            disabled={!metin.trim() || gonderiliyor}
            className="shrink-0 cursor-pointer rounded-[8px] bg-gold px-5 text-[13.4px] font-bold text-navy-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {gonderiliyor ? "…" : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}
