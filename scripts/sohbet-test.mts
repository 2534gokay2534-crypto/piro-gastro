/**
 * CANLI SOHBET UÇTAN UCA TESTİ
 *
 * Tarayıcı arayüzünü değil, arayüzün dayandığı SÖZLEŞMEYİ sınar:
 * müşteri mesaj gönderir → yönetici akışında görünür → yönetici yanıtlar →
 * müşteri akışında görünür. Arayüz bu uçları yokladığı için bu zincirin
 * çalışması "sayfa yenilemeden görünür" demektir.
 */
import "dotenv/config";
import { CEREZ, cerezUret } from "../src/lib/admin-kapi";

type Oturum = {
  id: string; ad?: string; eposta?: string; durum?: string;
  okunmamis?: number; olusturma?: string; guncelleme?: string;
  son?: { metin: string; kim: string } | null;
};
type Mesaj = { id: string; kim: string; metin: string };
type Govde = {
  ok?: boolean; hazir?: boolean; oturumId?: string;
  oturumlar?: Oturum[]; mesajlar?: Mesaj[]; okunmamis?: number;
};

const K = process.env.KOK ?? "http://localhost:3000";

// Yönetici uçları proxy tarafından korunuyor; test için geçerli bir
// oturum çerezi üretiyoruz (ADMIN_SIFRE ile imzalanır).
const adminCerez = `${CEREZ}=${await cerezUret(Date.now())}`;
const yaz = (a: string, b: string) => console.log(String(a).padEnd(54), b);
let hata = 0;
const k = (c: boolean, a: string, e = "") => { if (!c) hata++; yaz(a, (c ? "OK" : "HATA") + (e ? "  " + e : "")); };

const j = async (yol: string, secenek?: RequestInit) => {
  const yonetici = yol.startsWith("/api/admin");
  const r = await fetch(K + yol, {
    ...secenek,
    headers: { ...(secenek?.headers ?? {}), ...(yonetici ? { cookie: adminCerez } : {}) },
  });
  let v: Govde | null = null;
  try { v = await r.json(); } catch { /* metin */ }
  return { k: r.status, v };
};

const gonderJson = (govde: Record<string, unknown>): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(govde),
});

const zv = "e2e-" + Date.now();
const AD = "Gökay E2E";
const EPOSTA = `e2e${Date.now()}@test.se`;

console.log("=== A. MÜŞTERİ SOHBETİ BAŞLATIYOR ===");
const b = await j("/api/chat/baslat", gonderJson({
  ziyaretci: zv, ad: AD, eposta: EPOSTA, dil: "tr",
  sayfa: "/tr/urunler", metin: "Merhaba, konveyörlü pizza fırını var mı?",
}));
k(b.k === 200 && !!b.v?.ok, "oturum açıldı", `HTTP ${b.k}`);
const oturum = b.v?.oturumId;
k(!!oturum, "oturum kimliği döndü", oturum ?? "");
if (!oturum) { console.log(`\nHATA: ${hata}`); process.exit(1); }

console.log("\n=== B. YÖNETİCİ AKIŞINDA GÖRÜNÜYOR MU ===");
const a1 = await j("/api/admin/sohbet/akis");
k(a1.k === 200 && !!a1.v?.hazir, "yönetici akışı çalışıyor");
const o1 = a1.v?.oturumlar?.find((o) => o.id === oturum);
k(!!o1, "yeni sohbet listede");
k(o1?.ad === AD, "müşteri adı kaydedildi", o1?.ad ?? "");
k(o1?.eposta === EPOSTA, "e-posta kaydedildi", o1?.eposta ?? "");
k(!!o1?.olusturma && !!o1?.guncelleme, "tarih-saat kaydedildi", o1?.olusturma?.slice(0, 19) ?? "");
k(o1?.okunmamis === 1, "okunmamış sayacı 1", String(o1?.okunmamis));
k(o1?.durum === "open", "durum açık", o1?.durum ?? "");

console.log("\n=== C. MÜŞTERİ İKİNCİ MESAJI GÖNDERİYOR ===");
await j("/api/chat/gonder", gonderJson({ ziyaretci: zv, oturumId: oturum, metin: "Fiyat listesi alabilir miyim?" }));
const a2 = await j("/api/admin/sohbet/akis");
const o2 = a2.v?.oturumlar?.find((o) => o.id === oturum);
k(o2?.okunmamis === 2, "okunmamış sayacı 2'ye çıktı", String(o2?.okunmamis));
k(o2?.son?.metin === "Fiyat listesi alabilir miyim?", "son mesaj akışta görünüyor");

console.log("\n=== D. YÖNETİCİ SOHBETİ AÇIYOR (okundu) ===");
const m1 = await j(`/api/admin/sohbet/akis?oturum=${encodeURIComponent(oturum)}`);
k(m1.v?.mesajlar?.length === 2, "iki mesaj geldi", String(m1.v?.mesajlar?.length));
await j("/api/admin/sohbet/yanit", gonderJson({ is: "okundu", oturum }));
const a3 = await j("/api/admin/sohbet/akis");
const o3 = a3.v?.oturumlar?.find((o) => o.id === oturum);
k(o3?.okunmamis === 0, "okundu işaretlendi, sayaç sıfırlandı", String(o3?.okunmamis));

console.log("\n=== E. YÖNETİCİ YANITLIYOR ===");
const y = await j("/api/admin/sohbet/yanit", gonderJson({
  is: "yanit", oturum, metin: "Merhaba! Evet, konveyörlü fırınlarımız var. Fiyat listesini gönderiyorum.",
}));
k(y.k === 200 && !!y.v?.ok, "yanıt kaydedildi");

console.log("\n=== F. MÜŞTERİ YANITI ANINDA GÖRÜYOR MU ===");
const mm = await j(`/api/chat/mesajlar?o=${encodeURIComponent(oturum)}`);
const musteriMesajlari = mm.v?.mesajlar ?? [];
k(mm.k === 200, "müşteri mesaj akışı çalışıyor", `HTTP ${mm.k}`);
k(musteriMesajlari.length === 3, "müşteri 3 mesaj görüyor", String(musteriMesajlari.length));
const ajanMesaji = musteriMesajlari.find((m) => m.kim === "agent");
k(!!ajanMesaji, "yönetici yanıtı müşteri tarafında görünüyor");
k(!!ajanMesaji?.metin?.startsWith("Merhaba! Evet"), "yanıt metni doğru", ajanMesaji?.metin?.slice(0, 34) ?? "");

console.log("\n=== G. DURUM YÖNETİMİ ===");
for (const [d, ad] of [["waiting", "beklemede"], ["closed", "kapatıldı"], ["open", "açık"]]) {
  const r = await j("/api/admin/sohbet/yanit", gonderJson({ is: "durum", oturum, durum: d }));
  const kontrolAkis = await j("/api/admin/sohbet/akis");
  const o = kontrolAkis.v?.oturumlar?.find((x) => x.id === oturum);
  // closed olanlar akıştan düşer — bu beklenen davranış
  const dogru = d === "closed" ? !o : o?.durum === d;
  k(!!r.v?.ok && !!dogru, `durum → ${ad}`, d === "closed" ? "akıştan düştü" : (o?.durum ?? ""));
}

console.log("\n=== H. GEÇERSİZ İSTEKLER REDDEDİLİYOR MU ===");
const g1 = await j("/api/admin/sohbet/yanit", gonderJson({ is: "durum", oturum, durum: "uydurma" }));
k(g1.k === 400, "geçersiz durum reddedildi", String(g1.k));
const g2 = await j("/api/admin/sohbet/yanit", gonderJson({ is: "yanit", oturum, metin: "   " }));
k(g2.k === 400, "boş yanıt reddedildi", String(g2.k));
const g3 = await j("/api/admin/sohbet/yanit", gonderJson({ is: "bilinmeyen", oturum }));
k(g3.k === 400, "bilinmeyen işlem reddedildi", String(g3.k));

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
