import Link from "next/link";
import { notFound } from "next/navigation";
import { db, dbVar } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { ODEME, SIPARIS_DURUM, para, sayi, tarihSaat } from "@/lib/admin-ui";
import { siparisDurum, siparisNot, siparisSil } from "@/app/actions/admin-genel";
import VeritabaniGerekli from "@/components/VeritabaniGerekli";
import { DUGME, Kutu, Rozet, Sayfa, Tablo, Td, Th } from "@/components/admin/UI";

export const dynamic = "force-dynamic";

export default async function SiparisDetay({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  if (!dbVar) return <VeritabaniGerekli lang={lang} sayfa="Sipariş" />;

  const kok = `/${lang}/admin/siparisler`;

  let o;
  try {
    o = await db.order.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });
  } catch (e) {
    return <VeritabaniGerekli lang={lang} sayfa="Sipariş" hata={String(e)} />;
  }
  if (!o) notFound();

  const d = SIPARIS_DURUM[o.status] ?? SIPARIS_DURUM.new;
  const kar = o.totalCents - o.vatCents - o.costCents;

  return (
    <Sayfa
      baslik={o.number}
      ozet={
        <span className="flex flex-wrap items-center gap-2">
          <Rozet ton={d.ton}>{d.ad}</Rozet>
          <span>{tarihSaat(o.createdAt)}</span>
          <span className="text-steel-400">·</span>
          <span>{ODEME[o.payMethod] ?? o.payMethod}</span>
        </span>
      }
      eylem={<Link href={kok} className={DUGME.sade}>← Siparişler</Link>}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_330px]">
        {/* ---- sol ---- */}
        <div className="min-w-0 space-y-4">
          <div>
            <h2 className="mb-2 text-[15px] font-extrabold text-navy-900">Sipariş kalemleri</h2>
            <Tablo>
              <thead>
                <tr>
                  <Th>Ürün</Th>
                  <Th w="70px" orta>Adet</Th>
                  <Th w="110px" sag>Birim</Th>
                  <Th w="70px" orta>KDV</Th>
                  <Th w="120px" sag>Tutar</Th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((k) => (
                  <tr key={k.id}>
                    <Td>
                      {k.productId ? (
                        <Link
                          href={`/${lang}/admin/urunler/${k.productId}`}
                          className="font-semibold text-navy-900 hover:text-gold"
                        >
                          {k.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-navy-900">{k.name}</span>
                      )}
                      <div className="font-mono text-[11.4px] text-steel-500">{k.sku}</div>
                    </Td>
                    <Td orta className="tabular-nums font-semibold">{k.qty}</Td>
                    <Td sag className="tabular-nums text-steel-700">{para(k.unitPriceCents)}</Td>
                    <Td orta className="text-[12.2px] text-steel-600">%{k.vatRate}</Td>
                    <Td sag className="font-bold tabular-nums">{para(k.lineTotalCents)}</Td>
                  </tr>
                ))}
                {o.items.length === 0 && (
                  <tr>
                    <Td className="text-steel-500">Kalem yok.</Td>
                    <Td /><Td /><Td /><Td />
                  </tr>
                )}
              </tbody>
            </Tablo>
          </div>

          <Kutu className="p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Tutarlar</h2>
            <dl className="mt-3 space-y-1.5 text-[13.4px]">
              <div className="flex justify-between">
                <dt className="text-steel-600">Ara toplam</dt>
                <dd className="tabular-nums">{para(o.subtotalCents)}</dd>
              </div>
              {o.discountCents > 0 && (
                <div className="flex justify-between text-danger">
                  <dt>İndirim {o.couponCode ? `(${o.couponCode})` : ""}</dt>
                  <dd className="tabular-nums">−{para(o.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-steel-600">Kargo</dt>
                <dd className="tabular-nums">{para(o.shipCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-steel-600">KDV</dt>
                <dd className="tabular-nums">{para(o.vatCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-steel-200 pt-2 text-[15px] font-extrabold text-navy-900">
                <dt>Genel toplam</dt>
                <dd className="tabular-nums">{para(o.totalCents)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-[12.4px]">
                <dt className="text-steel-500">Maliyet / Kâr</dt>
                <dd className="tabular-nums">
                  {para(o.costCents)} / <b className={kar >= 0 ? "text-ok" : "text-danger"}>{para(kar)}</b>
                </dd>
              </div>
            </dl>
          </Kutu>

          <Kutu className="p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Sipariş notu</h2>
            <form action={siparisNot} className="mt-2 flex gap-2">
              <input type="hidden" name="id" value={o.id} />
              <textarea
                name="not"
                defaultValue={o.note ?? ""}
                rows={2}
                maxLength={1000}
                className="flex-1 resize-y rounded-[8px] border border-steel-300 px-3 py-2 text-[13.4px] outline-none focus:border-navy-500"
              />
              <button type="submit" className={DUGME.koyu + " self-start"}>Kaydet</button>
            </form>
          </Kutu>
        </div>

        {/* ---- sağ ---- */}
        <div className="space-y-4">
          <Kutu className="p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Durum değiştir</h2>
            <form action={siparisDurum} className="mt-3 flex gap-2">
              <input type="hidden" name="id" value={o.id} />
              <select
                name="durum"
                defaultValue={o.status}
                className="flex-1 rounded-[8px] border border-steel-300 px-3 py-2 text-[13.4px] outline-none focus:border-navy-500"
              >
                {Object.entries(SIPARIS_DURUM).map(([v, x]) => (
                  <option key={v} value={v}>{x.ad}</option>
                ))}
              </select>
              <button type="submit" className={DUGME.ana}>Uygula</button>
            </form>
            <dl className="mt-3 space-y-1 text-[12.2px] text-steel-600">
              <div className="flex justify-between"><dt>Oluşturuldu</dt><dd>{tarihSaat(o.createdAt)}</dd></div>
              {o.paidAt && <div className="flex justify-between"><dt>Ödendi</dt><dd>{tarihSaat(o.paidAt)}</dd></div>}
              {o.shippedAt && <div className="flex justify-between"><dt>Kargoya verildi</dt><dd>{tarihSaat(o.shippedAt)}</dd></div>}
              {o.refundedAt && <div className="flex justify-between"><dt>İade</dt><dd>{tarihSaat(o.refundedAt)}</dd></div>}
            </dl>
          </Kutu>

          <Kutu className="p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Müşteri</h2>
            {o.customer ? (
              <div className="mt-2 space-y-0.5 text-[13px]">
                <Link
                  href={`/${lang}/admin/musteriler/${o.customer.id}`}
                  className="block font-bold text-navy-600 hover:text-gold"
                >
                  {o.customer.name}
                </Link>
                {o.customer.company && <div className="text-steel-700">{o.customer.company}</div>}
                {o.customer.email && (
                  <a href={`mailto:${o.customer.email}`} className="block text-navy-600 hover:text-gold">
                    {o.customer.email}
                  </a>
                )}
                {o.customer.phone && <div className="text-steel-600">{o.customer.phone}</div>}
                {o.customer.orgNr && <div className="text-[12px] text-steel-500">Org.nr {o.customer.orgNr}</div>}
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-steel-500">Kayıtlı müşteri yok.</p>
            )}
          </Kutu>

          {(o.shipName || o.shipAddr) && (
            <Kutu className="p-4">
              <h2 className="text-[14px] font-extrabold text-navy-900">Teslimat</h2>
              <address className="mt-2 not-italic text-[13px] leading-relaxed text-steel-700">
                {o.shipName && <div>{o.shipName}</div>}
                {o.shipAddr && <div>{o.shipAddr}</div>}
                {(o.shipZip || o.shipCity) && <div>{o.shipZip} {o.shipCity}</div>}
              </address>
            </Kutu>
          )}

          <Kutu className="p-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">Özet</h2>
            <p className="mt-1.5 text-[12.6px] text-steel-600">
              {sayi(o.items.length)} kalem · {sayi(o.items.reduce((t, k) => t + k.qty, 0))} adet ürün
            </p>
          </Kutu>

          <form action={siparisSil}>
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="geri" value={kok} />
            <button type="submit" className={DUGME.tehlike + " w-full justify-center"}>
              Siparişi sil
            </button>
          </form>
        </div>
      </div>
    </Sayfa>
  );
}
