"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * CANLI SOHBET BİLDİRİMİ — Süper Admin
 *
 * Yönetici panelinin her sayfasında çalışır. Müşteri mesaj gönderdiği anda:
 *   • ekranın sağ altında belirgin bir bildirim çıkar
 *   • kısa bir uyarı sesi çalar
 *   • bildirim OKUNANA kadar durur (kendiliğinden kapanmaz)
 *   • sekme başlığına okunmamış sayısı yazılır
 *
 * Ses, tarayıcının Web Audio API'siyle üretilir — ses dosyası taşımaya gerek
 * yok. Tarayıcılar kullanıcı etkileşimi olmadan ses çalmayı engellediği için
 * ilk tıklamada ses açılır; o ana kadar bildirim yine görünür.
 */

type Oturum = {
  id: string;
  ad: string;
  eposta: string;
  durum: string;
  okunmamis: number;
  guncelleme: string;
  son: { metin: string; kim: string; zaman: string } | null;
};

const ARALIK_MS = 5000;

export default function SohbetBildirim({ lang }: { lang: string }) {
  const yol = usePathname() ?? "";
  const [oturumlar, setOturumlar] = useState<Oturum[]>([]);
  const [okunmamis, setOkunmamis] = useState(0);
  const [sesHazir, setSesHazir] = useState(false);
  const [kapatilan, setKapatilan] = useState<string[]>([]);

  const sonToplam = useRef<number | null>(null);
  const sesCtx = useRef<AudioContext | null>(null);
  const ilkBaslik = useRef<string>("");

  /* --- uyarı sesi (Web Audio; dosya gerektirmez) --- */
  const sesCal = useCallback(() => {
    try {
      const C = sesCtx.current;
      if (!C) return;
      const simdi = C.currentTime;
      // İki kısa "ding" — dikkat çeker, rahatsız etmez
      for (const [gecikme, frekans] of [[0, 880], [0.18, 1175]] as const) {
        const osc = C.createOscillator();
        const kazanc = C.createGain();
        osc.type = "sine";
        osc.frequency.value = frekans;
        kazanc.gain.setValueAtTime(0.0001, simdi + gecikme);
        kazanc.gain.exponentialRampToValueAtTime(0.22, simdi + gecikme + 0.02);
        kazanc.gain.exponentialRampToValueAtTime(0.0001, simdi + gecikme + 0.16);
        osc.connect(kazanc).connect(C.destination);
        osc.start(simdi + gecikme);
        osc.stop(simdi + gecikme + 0.18);
      }
    } catch {
      /* ses çalınamazsa bildirim yine görünür */
    }
  }, []);

  /* --- ilk kullanıcı etkileşiminde ses iznini al --- */
  useEffect(() => {
    const ac = () => {
      if (sesCtx.current) return;
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        sesCtx.current = new AC();
        setSesHazir(true);
      } catch {
        /* Web Audio yoksa sessiz devam */
      }
    };
    window.addEventListener("pointerdown", ac, { once: true });
    window.addEventListener("keydown", ac, { once: true });
    return () => {
      window.removeEventListener("pointerdown", ac);
      window.removeEventListener("keydown", ac);
    };
  }, []);

  /* --- akışı yokla --- */
  useEffect(() => {
    let durduruldu = false;
    let zamanlayici: ReturnType<typeof setTimeout> | null = null;

    const cek = async () => {
      try {
        const r = await fetch("/api/admin/sohbet/akis", { cache: "no-store" });
        if (r.ok) {
          const v = (await r.json()) as { oturumlar?: Oturum[]; okunmamis?: number };
          if (!durduruldu) {
            const liste = v.oturumlar ?? [];
            const toplam = v.okunmamis ?? 0;
            setOturumlar(liste);
            setOkunmamis(toplam);

            // Sayı ARTTIYSA yeni mesaj gelmiş demektir
            if (sonToplam.current !== null && toplam > sonToplam.current) {
              sesCal();
              setKapatilan([]); // yeni mesajda kapatılmış bildirimler geri gelsin
            }
            sonToplam.current = toplam;
          }
        }
      } catch {
        /* ağ hatası — sonraki yoklamada düzelir */
      }
      if (!durduruldu) zamanlayici = setTimeout(cek, ARALIK_MS);
    };

    cek();

    // Sekme arka plandayken zamanlayıcılar kısılır; öne gelince hemen tazele.
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
  }, [sesCal]);

  /* --- sekme başlığında okunmamış sayısı --- */
  useEffect(() => {
    if (!ilkBaslik.current) ilkBaslik.current = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = okunmamis > 0 ? `(${okunmamis}) ${ilkBaslik.current}` : ilkBaslik.current;
  }, [okunmamis]);

  // Sohbet ekranındayken bildirim gösterme — zaten oradasınız
  const sohbetteMi = yol.includes("/admin/sohbet");

  const gosterilecek = oturumlar
    .filter((o) => o.okunmamis > 0 && !kapatilan.includes(o.id))
    .slice(0, 4);

  if (sohbetteMi || gosterilecek.length === 0) {
    return okunmamis > 0 && sohbetteMi ? null : null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9998] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {!sesHazir && (
        <p className="rounded-[8px] bg-navy-950/90 px-3 py-1.5 text-[11px] font-semibold text-steel-300">
          Sesli uyarı için sayfada bir yere tıklayın
        </p>
      )}

      {gosterilecek.map((o) => (
        <div
          key={o.id}
          className="animate-[pulse_2s_ease-in-out_3] rounded-[12px] border-2 border-gold bg-white p-3.5 shadow-c2"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
              </span>
              <b className="text-[13px] font-extrabold text-navy-900">Yeni müşteri mesajı</b>
            </span>
            <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10.6px] font-bold text-white">
              {o.okunmamis}
            </span>
          </div>

          <p className="mt-1.5 text-[12.4px] font-semibold text-navy-900">
            {o.ad || "İsimsiz ziyaretçi"}
            {o.eposta && <span className="font-normal text-steel-500"> · {o.eposta}</span>}
          </p>
          {o.son && (
            <p className="mt-0.5 line-clamp-2 text-[12.2px] leading-snug text-steel-700">
              {o.son.metin}
            </p>
          )}

          <div className="mt-2.5 flex gap-2">
            <Link
              href={`/${lang}/admin/sohbet/${o.id}`}
              className="flex-1 rounded-[8px] bg-navy-900 px-3 py-1.5 text-center text-[12.4px] font-bold text-white transition hover:bg-navy-800"
            >
              Yanıtla
            </Link>
            <button
              type="button"
              onClick={() => setKapatilan((k) => [...k, o.id])}
              className="cursor-pointer rounded-[8px] border border-steel-300 px-3 py-1.5 text-[12.4px] font-bold text-steel-600 transition hover:border-steel-400"
            >
              Sonra
            </button>
          </div>
        </div>
      ))}

      {oturumlar.filter((o) => o.okunmamis > 0).length > gosterilecek.length && (
        <Link
          href={`/${lang}/admin/sohbet`}
          className="rounded-[8px] bg-navy-950 px-3 py-2 text-center text-[12.4px] font-bold text-white transition hover:bg-navy-900"
        >
          Tüm sohbetleri gör ({okunmamis} okunmamış)
        </Link>
      )}
    </div>
  );
}
