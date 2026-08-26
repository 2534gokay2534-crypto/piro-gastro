/**
 * SÜPER ADMIN DENETİMİ
 *   npx tsx scripts/admin-denetim.mts
 *
 * Her yönetici sayfasını yönetici oturumuyla açar ve şunları raporlar:
 *   • sayfa hatasız geliyor mu (HTTP 200, hata ekranı yok)
 *   • sayfadaki form ve bağlantı sayısı
 *   • formların bağlı olduğu server action var mı (ACTION kimliği)
 *   • sayfa içindeki bağlantıların hedefleri açılıyor mu
 *
 * Böylece "düğmeler çalışıyor mu" sorusu ölçülebilir hale gelir:
 * bağlı olmayan (action'sız) bir form ya da kırık bir bağlantı varsa çıkar.
 */
import "dotenv/config";
import { CEREZ, cerezUret } from "../src/lib/admin-kapi";

const K = process.env.KOK ?? "http://localhost:3000";
const DIL = "tr";

const cerez = `${CEREZ}=${await cerezUret(Date.now())}`;

let hata = 0;
const satirlar: string[] = [];

async function al(yol: string) {
  const r = await fetch(K + yol, { headers: { cookie: cerez }, redirect: "manual" });
  const g = r.status === 200 ? await r.text() : "";
  return { k: r.status, g };
}

/** Sayfadaki formları ve bağlantıları çıkarır. */
function coz(html: string) {
  const temiz = html.replace(/<!--.*?-->/g, "");
  const formlar = temiz.match(/<form[^>]*>/g) ?? [];
  const actionli = (temiz.match(/\$ACTION_ID_[a-f0-9]+/g) ?? []).length;
  const dugmeler = (temiz.match(/<button[^>]*>/g) ?? []).length;
  const baglantilar = [...temiz.matchAll(/href="(\/tr\/admin[^"#?]*)"/g)].map((m) => m[1]);
  const apiBaglantilari = [...temiz.matchAll(/href="(\/api\/admin[^"]*)"/g)].map((m) => m[1]);
  const hataEkrani = /Veritaban[ıi] gerekli|Bir hata olu|Application error|Unhandled/i.test(
    temiz.replace(/<[^>]+>/g, " "),
  );
  return {
    form: formlar.length,
    action: actionli,
    dugme: dugmeler,
    baglanti: [...new Set(baglantilar)],
    api: [...new Set(apiBaglantilari)],
    hataEkrani,
  };
}

const SAYFALAR: Array<[string, string]> = [
  ["Dashboard", ""],
  ["Siparişler", "/siparisler"],
  ["Müşteriler", "/musteriler"],
  ["Sipariş Makbuzları", "/makbuzlar"],
  ["Kurumsal Fatura Başvuruları", "/fatura-basvurulari"],
  ["Kampanyalar ve Kuponlar", "/kampanyalar"],
  ["Ürünler (kategori kartları)", "/urunler"],
  ["Ürünler (kategori seçili)", "/urunler?k=cooking"],
  ["Ürünler (arama)", "/urunler?q=100374"],
  ["Yeni ürün", "/urunler/yeni"],
  ["Kategoriler", "/kategoriler"],
  ["Stok Yönetimi", "/stok"],
  ["Tedarikçiler", "/tedarikciler"],
  ["Muhasebe", "/muhasebe"],
  ["Muhasebe Raporları", "/muhasebe-raporlari"],
  ["Gelir-Gider", "/gelir-gider"],
  ["Satış Raporları", "/raporlar"],
  ["Canlı Sohbet", "/sohbet"],
  ["Diller ve Çeviriler", "/ceviriler"],
  ["Kullanıcılar", "/kullanicilar"],
  ["Roller ve Yetkiler", "/roller"],
  ["Ayarlar", "/ayarlar"],
  ["Sistem Logları", "/loglar"],
  ["Yedekleme", "/yedekleme"],
];

console.log("=== A. YÖNETİCİ SAYFALARI ===\n");
console.log(
  "sayfa".padEnd(34) + "HTTP".padEnd(6) + "form".padEnd(6) + "action".padEnd(8) + "düğme".padEnd(7) + "durum",
);
console.log("-".repeat(76));

const tumBaglantilar = new Set<string>();
const tumApi = new Set<string>();

for (const [ad, yol] of SAYFALAR) {
  const tam = `/${DIL}/admin${yol}`;
  const r = await al(tam);
  const c = r.k === 200 ? coz(r.g) : null;

  let durum = "OK";
  if (r.k !== 200) { durum = `HATA ${r.k}`; hata++; }
  else if (c?.hataEkrani) { durum = "HATA ekranı"; hata++; }
  else if (c && c.form > 0 && c.action === 0) { durum = "form var, action YOK"; hata++; }

  for (const b of c?.baglanti ?? []) tumBaglantilar.add(b);
  for (const a of c?.api ?? []) tumApi.add(a);

  console.log(
    ad.padEnd(34) +
      String(r.k).padEnd(6) +
      String(c?.form ?? "-").padEnd(6) +
      String(c?.action ?? "-").padEnd(8) +
      String(c?.dugme ?? "-").padEnd(7) +
      durum,
  );
}

console.log("\n=== B. SAYFA İÇİ BAĞLANTILAR ===");
const kirikBaglanti: string[] = [];
let sayilan = 0;
for (const b of [...tumBaglantilar].sort()) {
  // kimlik içeren dinamik yolları atla (örnek kayıt gerekir)
  if (/\/(cm[a-z0-9]{20,}|bt-|u-)/.test(b)) continue;
  const r = await al(b);
  sayilan++;
  if (r.k !== 200) { kirikBaglanti.push(`${b} → ${r.k}`); hata++; }
}
console.log(`${sayilan} bağlantı denendi · kırık: ${kirikBaglanti.length}`);
for (const k of kirikBaglanti) console.log("   ✗", k);

console.log("\n=== C. DIŞA AKTARMA (CSV) BAĞLANTILARI ===");
const csvTipleri = [
  "urunler", "stok", "siparisler", "musteriler", "kuponlar",
  "tedarikciler", "kullanicilar", "loglar", "makbuzlar", "faturaBasvuru", "rapor",
];
let csvHata = 0;
for (const t of csvTipleri) {
  const r = await fetch(`${K}/api/admin/disa-aktar?tip=${t}&lang=${DIL}`, { headers: { cookie: cerez } });
  const metin = r.status === 200 ? await r.text() : "";
  const satirSayisi = metin ? metin.split("\n").length : 0;
  const ok = r.status === 200 && satirSayisi > 0;
  if (!ok) { csvHata++; hata++; }
  console.log(`  ${t.padEnd(16)} HTTP ${r.status}  ${ok ? `${satirSayisi} satır  OK` : "HATA"}`);
}

console.log("\n=== D. SOHBET API'LERİ ===");
const sohbetUclari: Array<[string, RequestInit, number]> = [
  ["/api/admin/sohbet/akis", {}, 200],
  ["/api/admin/sohbet/yanit", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, 400],
];
for (const [yol, secenek, beklenen] of sohbetUclari) {
  const r = await fetch(K + yol, { ...secenek, headers: { ...(secenek.headers ?? {}), cookie: cerez } });
  const ok = r.status === beklenen;
  if (!ok) hata++;
  console.log(`  ${yol.padEnd(30)} HTTP ${r.status} (beklenen ${beklenen})  ${ok ? "OK" : "HATA"}`);
}

console.log("\n=== E. KORUMA: OTURUMSUZ ERİŞİM ===");
let korumaHata = 0;
for (const yol of ["/tr/admin", "/tr/admin/urunler", "/api/admin/sohbet/akis", "/api/admin/disa-aktar?tip=urunler"]) {
  const r = await fetch(K + yol, { redirect: "manual" });
  const kapali = [301, 302, 307, 308, 401, 503].includes(r.status);
  if (!kapali) { korumaHata++; hata++; }
  console.log(`  ${yol.padEnd(40)} ${r.status}  ${kapali ? "kapalı OK" : "AÇIK — HATA"}`);
}

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
if (satirlar.length) console.log(satirlar.join("\n"));
process.exit(hata > 0 ? 1 : 0);
