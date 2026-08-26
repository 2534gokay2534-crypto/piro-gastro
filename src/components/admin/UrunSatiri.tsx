import Link from "next/link";
import { fiyatDegistir, indirimTanimla, kategoriyeTasi, stokGuncelle, urunSil, yayinDegistir } from "@/app/actions/admin-urun";
import { para } from "@/lib/admin-ui";
import { Rozet } from "@/components/admin/UI";

/**
 * ÜRÜN SATIRI — Süper Admin
 *
 * Bütün hızlı işlemler satırın içinde yapılır; fiyat, stok ve indirim için
 * ayrı sayfaya gitmek gerekmez. Her form kendi server action'ını çağırır,
 * değişiklik mağazaya anında yansır.
 *
 * Müşteri ekranının kopyası değildir: burada maliyet, kâr marjı, satış
 * adedi, eşik stok ve durum rozetleri gibi yalnızca yöneticiyi ilgilendiren
 * bilgiler öndedir.
 */

type Urun = {
  id: string; sku: string; slug: string;
  priceCents: number; costCents: number;
  stock: number; threshold: number;
  hidden: boolean; featured: boolean; onRequest: boolean;
  campaignOn: boolean; campaignPercent: number; sold: number;
  categoryId: string; subId: string | null;
  ad: string;
  gorsel: string | null;
  gorselSayisi: number;
};

type Kategori = { id: string; ad: string; alt: Array<{ id: string; ad: string }> };

const mini =
  "w-full rounded border border-steel-300 px-2 py-1 text-[12.4px] tabular-nums outline-none focus:border-navy-500";
const minDugme =
  "shrink-0 cursor-pointer rounded border border-steel-300 px-2 py-1 text-[11.6px] font-bold text-navy-700 transition hover:border-gold hover:text-gold";

export default function UrunSatiri({
  u,
  lang,
  kategoriler,
  geriDon,
}: {
  u: Urun;
  lang: string;
  kategoriler: Kategori[];
  /** İşlem sonrası dönülecek adres (süzgeçler korunsun). */
  geriDon: string;
}) {
  const net = u.campaignOn && u.campaignPercent
    ? Math.round(u.priceCents * (1 - u.campaignPercent / 100))
    : u.priceCents;
  const marj = net > 0 && u.costCents > 0 ? Math.round(((net - u.costCents) / net) * 100) : null;
  const stokDurum = u.onRequest ? "istek" : u.stock <= 0 ? "yok" : u.stock <= u.threshold ? "az" : "ok";

  return (
    <div className={"rounded-[10px] border p-3 transition " + (u.hidden ? "border-steel-200 bg-steel-50/60" : "border-steel-200 bg-white hover:border-steel-300")}>
      <div className="flex flex-wrap items-start gap-3">
        {/* --- görsel --- */}
        <Link
          href={`/${lang}/admin/urunler/${u.id}/gorseller`}
          title="Görselleri yönet"
          className="relative flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded border border-steel-200 bg-steel-50 transition hover:border-gold"
        >
          {u.gorsel ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.gorsel} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="text-[10px] font-bold text-steel-400">görsel yok</span>
          )}
          <span className="absolute bottom-0 right-0 rounded-tl bg-navy-950/75 px-1 text-[9.6px] font-bold text-white">
            {u.gorselSayisi}
          </span>
        </Link>

        {/* --- ad ve durum --- */}
        <div className="min-w-[190px] flex-1">
          <Link
            href={`/${lang}/admin/urunler/${u.id}`}
            className="text-[13.6px] font-bold leading-snug text-navy-900 hover:text-gold"
          >
            {u.ad}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11.4px] text-steel-500">{u.sku}</span>
            {u.hidden && <Rozet ton="gri">Gizli</Rozet>}
            {u.featured && <Rozet ton="gold">Öne çıkan</Rozet>}
            {u.campaignOn && u.campaignPercent > 0 && <Rozet ton="danger">−%{u.campaignPercent}</Rozet>}
            {stokDurum === "yok" && <Rozet ton="danger">Stok yok</Rozet>}
            {stokDurum === "az" && <Rozet ton="warn">Az stok</Rozet>}
            {stokDurum === "istek" && <Rozet ton="gri">Sipariş üzerine</Rozet>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.4px] text-steel-500">
            <span>{u.sold} satıldı</span>
            {marj !== null && <span>marj %{marj}</span>}
            {u.costCents > 0 && <span>maliyet {para(u.costCents)}</span>}
          </div>
        </div>

        {/* --- fiyat --- */}
        <form action={fiyatDegistir} className="w-[128px] shrink-0">
          <input type="hidden" name="id" value={u.id} />
          <input type="hidden" name="geri" value={geriDon} />
          <label className="block text-[10px] font-bold uppercase tracking-wider text-steel-500">Fiyat €</label>
          <div className="mt-0.5 flex gap-1">
            <input name="fiyat" defaultValue={(u.priceCents / 100).toFixed(2)} inputMode="decimal" className={mini} />
            <button type="submit" className={minDugme} title="Fiyatı kaydet">✓</button>
          </div>
          {u.campaignOn && u.campaignPercent > 0 && (
            <span className="mt-0.5 block text-[10.8px] font-bold text-ok">→ {para(net)}</span>
          )}
        </form>

        {/* --- indirim --- */}
        <form action={indirimTanimla} className="w-[104px] shrink-0">
          <input type="hidden" name="id" value={u.id} />
          <input type="hidden" name="geri" value={geriDon} />
          <label className="block text-[10px] font-bold uppercase tracking-wider text-steel-500">İndirim %</label>
          <div className="mt-0.5 flex gap-1">
            <input
              name="yuzde"
              defaultValue={u.campaignOn ? u.campaignPercent : 0}
              inputMode="numeric"
              className={mini}
            />
            <button type="submit" className={minDugme} title="İndirimi uygula (0 = kaldır)">✓</button>
          </div>
        </form>

        {/* --- stok --- */}
        <form action={stokGuncelle} className="w-[116px] shrink-0">
          <input type="hidden" name="id" value={u.id} />
          <input type="hidden" name="geri" value={geriDon} />
          <label className="block text-[10px] font-bold uppercase tracking-wider text-steel-500">Stok</label>
          <div className="mt-0.5 flex gap-1">
            <input name="stok" defaultValue={u.stock} inputMode="numeric" className={mini} />
            <button type="submit" className={minDugme} title="Stoğu kaydet">✓</button>
          </div>
          <span className="mt-0.5 block text-[10.4px] text-steel-500">eşik {u.threshold}</span>
        </form>

        {/* --- işlemler --- */}
        <div className="flex shrink-0 flex-col gap-1">
          <form action={yayinDegistir}>
            <input type="hidden" name="id" value={u.id} />
            <input type="hidden" name="geri" value={geriDon} />
            <input type="hidden" name="yayinda" value={u.hidden ? "1" : "0"} />
            <button
              type="submit"
              className={
                "w-full cursor-pointer rounded px-2.5 py-1 text-[11.6px] font-bold transition " +
                (u.hidden
                  ? "bg-ok/12 text-ok hover:bg-ok/20"
                  : "bg-steel-100 text-steel-600 hover:bg-steel-200")
              }
            >
              {u.hidden ? "Yayına al" : "Yayından kaldır"}
            </button>
          </form>

          <Link
            href={`/${lang}/admin/urunler/${u.id}`}
            className="rounded px-2.5 py-1 text-center text-[11.6px] font-bold text-navy-700 transition hover:bg-steel-100"
          >
            Düzenle
          </Link>
          <Link
            href={`/${lang}/admin/urunler/${u.id}/gorseller`}
            className="rounded px-2.5 py-1 text-center text-[11.6px] font-bold text-navy-700 transition hover:bg-steel-100"
          >
            Görseller
          </Link>
        </div>
      </div>

      {/* --- taşı / sil --- */}
      <details className="mt-2 border-t border-steel-100 pt-2">
        <summary className="cursor-pointer list-none text-[11.6px] font-semibold text-steel-500 hover:text-navy-900">
          Kategoriye taşı · Sil ▾
        </summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <form action={kategoriyeTasi} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={u.id} />
            <input type="hidden" name="geri" value={geriDon} />
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-steel-500">Kategori</span>
              <select name="kategori" defaultValue={u.categoryId} className={mini + " mt-0.5 w-[178px]"}>
                {kategoriler.map((c) => (
                  <option key={c.id} value={c.id}>{c.ad}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-steel-500">Alt kategori</span>
              <select name="alt" defaultValue={u.subId ?? ""} className={mini + " mt-0.5 w-[178px]"}>
                <option value="">— yok —</option>
                {kategoriler.flatMap((c) => c.alt).map((a) => (
                  <option key={a.id} value={a.id}>{a.ad}</option>
                ))}
              </select>
            </label>
            <button type="submit" className={minDugme + " py-1.5"}>Taşı</button>
          </form>

          <form action={urunSil} className="ml-auto">
            <input type="hidden" name="id" value={u.id} />
            <input type="hidden" name="geri" value={geriDon} />
            <button
              type="submit"
              className="cursor-pointer rounded border border-danger/40 px-2.5 py-1.5 text-[11.6px] font-bold text-danger transition hover:bg-danger/10"
            >
              Ürünü sil
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
