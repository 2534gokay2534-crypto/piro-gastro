import Link from "next/link";
import { ODEME_ADI, ODEME_DURUM, type Makbuz } from "@/lib/makbuz";
import { om } from "@/lib/odeme-metin";

/**
 * MAKBUZ / FATURA BELGESİ
 *
 * Hem müşteri sayfasında hem Süper Admin'de aynı bileşen kullanılır —
 * iki yerde farklı görünen belge olmasın.
 *
 * Yazdırma: global.css'teki .yazdirilabilir kuralları başlık, altbilgi ve
 * butonları gizler; belge tek başına A4'e çıkar.
 */

const para = (cents: number) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100) + " €";

const tarihSaat = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(d);

export default function MakbuzBelge({ m, dil }: { m: Makbuz; dil: string }) {
  const d = ODEME_DURUM[m.durum] ?? ODEME_DURUM.new;
  const durumMetni = d.ad[dil] ?? d.ad.en;
  const tonSinif =
    d.ton === "ok" ? "bg-ok/12 text-ok border-ok/30"
      : d.ton === "warn" ? "bg-warn/12 text-warn border-warn/30"
        : d.ton === "danger" ? "bg-danger/12 text-danger border-danger/30"
          : "bg-steel-100 text-steel-600 border-steel-300";

  return (
    <article className="rounded-[12px] border border-steel-200 bg-white print:rounded-none print:border-0">
      {/* --- başlık --- */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-t-[12px] bg-navy-950 px-6 py-5 print:rounded-none">
        <div>
          <div className="text-[19px] font-extrabold leading-tight text-white">
            Piro <em className="not-italic text-gold">Gastro</em>
          </div>
          <div lang="en" className="mt-0.5 text-[8.4px] font-[650] uppercase tracking-[.3em] text-gold">
            Professional Kitchen Solutions
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-steel-400">
            Piro Gastro Center AB · Industrigatan 24 · 211 32 Malmö · Sverige
            <br />
            Org.nr 559214-8830 · VAT SE559214883001
          </div>
        </div>
        <div className="text-right">
          <div className="text-[19px] font-extrabold uppercase text-white">
            {m.tur === "fatura" ? om("fatura", dil) : om("makbuz", dil)}
          </div>
          <div className="mt-0.5 font-mono text-[14px] font-bold text-gold">{m.numara}</div>
          <div className="mt-1 text-[11px] text-steel-400">{tarihSaat(m.tarih)}</div>
        </div>
      </header>

      <div className="px-6 py-5">
        {/* --- ödeme durumu --- */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={"inline-flex items-center rounded-full border px-3 py-1 text-[12.4px] font-bold " + tonSinif}>
            {durumMetni}
          </span>
          <span className="text-right text-[12.4px]">
            <b className="text-navy-900">{ODEME_ADI[m.odemeYontemi] ?? m.odemeYontemi}</b>
            {m.odemeTarihi && (
              <span className="block text-[11.4px] text-steel-500">{tarihSaat(m.odemeTarihi)}</span>
            )}
          </span>
        </div>

        {/* --- müşteri / teslimat --- */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[9px] bg-steel-50 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-steel-500">{om("musteri", dil)}</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-navy-900">
              <b>{m.musteri.firma || m.musteri.ad}</b>
              {m.musteri.firma && m.musteri.ad !== m.musteri.firma && <><br />{m.musteri.ad}</>}
              {m.musteri.eposta && <><br />{m.musteri.eposta}</>}
              {m.musteri.telefon && <><br />{m.musteri.telefon}</>}
              {m.musteri.vergiNo && <><br /><span className="text-steel-600">Org.nr {m.musteri.vergiNo}</span></>}
              {m.musteri.kdvNo && <><br /><span className="text-steel-600">VAT {m.musteri.kdvNo}</span></>}
            </div>
          </div>
          <div className="rounded-[9px] bg-steel-50 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-steel-500">{om("teslimatAdresi", dil)}</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-navy-900">
              <b>{m.teslimat.ad}</b>
              <br />{m.teslimat.adres}
              <br />{m.teslimat.postaKodu} {m.teslimat.sehir}
              <br />{m.teslimat.ulke}
            </div>
          </div>
        </div>

        {/* --- kalemler --- */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12.6px]">
            <thead>
              <tr className="border-b border-steel-300 text-[10px] uppercase tracking-wider text-steel-500">
                <th className="py-2 text-left font-bold" colSpan={2}>{om("urunler", dil)}</th>
                <th className="w-[56px] py-2 text-right font-bold">{om("adet", dil)}</th>
                <th className="w-[92px] py-2 text-right font-bold">{om("birimFiyat", dil)}</th>
                <th className="w-[56px] py-2 text-right font-bold">{om("kdv", dil)}</th>
                <th className="w-[100px] py-2 text-right font-bold">{om("tutar", dil)}</th>
              </tr>
            </thead>
            <tbody>
              {m.kalemler.map((k) => (
                <tr key={k.id} className="border-b border-steel-100 align-middle">
                  <td className="w-[52px] py-2.5">
                    <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded border border-steel-200 bg-steel-50">
                      {k.gorsel && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={k.gorsel} alt="" className="h-full w-full object-contain p-0.5" />
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    {k.slug ? (
                      <Link href={`/${dil}/urun/${k.slug}`} className="font-semibold text-navy-900 hover:text-gold print:text-navy-900">
                        {k.ad}
                      </Link>
                    ) : (
                      <span className="font-semibold text-navy-900">{k.ad}</span>
                    )}
                    <span className="block font-mono text-[10.6px] text-steel-500">{k.sku}</span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{k.adet}</td>
                  <td className="py-2.5 text-right tabular-nums">{k.birimCents > 0 ? para(k.birimCents) : "—"}</td>
                  <td className="py-2.5 text-right tabular-nums text-steel-500">%{k.kdvYuzde}</td>
                  <td className="py-2.5 text-right font-bold tabular-nums">{k.satirCents > 0 ? para(k.satirCents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- toplamlar --- */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-[290px]">
            <div className="flex justify-between py-1 text-[12.6px]">
              <span className="text-steel-600">{om("araToplam", dil)}</span>
              <b className="tabular-nums text-navy-900">{para(m.araToplamCents)}</b>
            </div>
            <div className="flex justify-between py-1 text-[12.6px]">
              <span className="text-steel-600">{om("kargo", dil)}</span>
              <b className={m.kargoCents === 0 ? "text-ok" : "tabular-nums text-navy-900"}>
                {m.kargoCents > 0 ? para(m.kargoCents) : om("ucretsizKargo", dil)}
              </b>
            </div>
            {m.indirimCents > 0 && (
              <div className="flex justify-between py-1 text-[12.6px]">
                <span className="text-steel-600">{om("indirim", dil)}</span>
                <b className="tabular-nums text-ok">−{para(m.indirimCents)}</b>
              </div>
            )}
            <div className="flex justify-between border-b border-steel-200 py-1 text-[12.6px]">
              <span className="text-steel-600">{om("kdv", dil)} %{m.kdvYuzde}</span>
              <b className="tabular-nums text-navy-900">{para(m.kdvCents)}</b>
            </div>
            <div className="flex justify-between py-2.5 text-[17px] font-extrabold text-navy-900">
              <span>{om("genelToplam", dil)}</span>
              <span className="tabular-nums">{para(m.toplamCents)}</span>
            </div>
          </div>
        </div>

        {m.not && (
          <div className="mt-3 rounded-[8px] bg-steel-50 p-3 text-[12.2px] leading-relaxed text-steel-700">
            <b className="text-navy-900">{om("belgeNot", dil)}:</b> {m.not}
          </div>
        )}

        {m.odemeReferansi && (
          <p className="mt-3 font-mono text-[10.4px] text-steel-400">Ref: {m.odemeReferansi}</p>
        )}
      </div>
    </article>
  );
}
