/**
 * SHOPIFY VİTRİNİNDEN GELEN SOHBET DOĞRULAMASI
 *   npx tsx scripts/shopify-sohbet-dogrula.mts
 *
 * Dış kökenden (deneme vitrini) gönderilen mesajın veritabanına düştüğünü,
 * Süper Admin akışında göründüğünü ve okunmamış sayacını — yani sesli
 * bildirimi tetikleyen değeri — artırdığını kanıtlar.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { CEREZ, cerezUret } from "../src/lib/admin-kapi";

const K = process.env.KOK ?? "http://localhost:3000";
const EPOSTA = process.env.TEST_EPOSTA ?? "shopify@test.se";

let hata = 0;
const k = (c: boolean, ad: string, ek = "") => {
  if (!c) hata++;
  console.log(String(ad).padEnd(46), (c ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

console.log("=== A. VERİTABANI KAYDI ===");
const s = await db.chatSession.findFirst({
  where: { email: EPOSTA },
  orderBy: { createdAt: "desc" },
  include: { messages: { orderBy: { createdAt: "asc" } } },
});

k(!!s, "dış vitrinden açılan oturum kaydedildi", s?.id ?? "bulunamadı");
if (!s) {
  console.log("\nÖnce deneme vitrininden bir mesaj gönderin.");
  process.exit(1);
}

console.log(`  ad      : ${s.name}`);
console.log(`  e-posta : ${s.email}`);
console.log(`  dil     : ${s.lang}`);
console.log(`  tarih   : ${s.createdAt.toLocaleString("sv-SE")}`);
console.log(`  mesaj   : ${s.messages.map((m) => `${m.sender}: ${m.body}`).join(" | ")}`);

k(!!s.name, "isim saklandı");
k(!!s.email, "e-posta saklandı");
k(!!s.createdAt, "tarih ve saat saklandı");
k(s.messages.length > 0, "mesaj gövdesi saklandı", `${s.messages.length} mesaj`);
k(s.status === "open", "görüşme açık durumda", s.status);

console.log("\n=== B. SÜPER ADMIN AKIŞI (bildirim ve ses bunu okur) ===");
const cerez = `${CEREZ}=${await cerezUret(Date.now())}`;
const r = await fetch(`${K}/api/admin/sohbet/akis`, { headers: { cookie: cerez } });
const d = (await r.json()) as {
  okunmamis?: number;
  oturumlar?: Array<{ id: string; ad?: string; okunmamis?: number }>;
};

k(r.status === 200, "akış ucu yanıt veriyor", `HTTP ${r.status}`);
const bizimki = (d.oturumlar ?? []).find((o) => o.id === s.id);
k(!!bizimki, "oturum Süper Admin akışında görünüyor");
k((d.okunmamis ?? 0) > 0, "okunmamış sayacı arttı (sesli uyarı tetiklenir)", String(d.okunmamis));

console.log("\n=== C. DANIŞMAN YANITI VİTRİNE DÖNÜYOR MU ===");
await db.chatMessage.create({
  data: { sessionId: s.id, sender: "agent", body: "Ja, den finns i lager. (Shopify testi)" },
});
const y = await fetch(`${K}/api/chat/mesajlar?o=${encodeURIComponent(s.id)}`, {
  headers: { origin: "http://localhost:4000" },
});
const yd = (await y.json()) as { ok?: boolean; mesajlar?: Array<{ kim: string; metin: string }> };
const danisman = (yd.mesajlar ?? []).filter((m) => m.kim === "agent");

k(y.headers.get("access-control-allow-origin") === "http://localhost:4000",
  "yanıt dış vitrine açık (CORS)", y.headers.get("access-control-allow-origin") ?? "başlık yok");
k(danisman.length > 0, "danışman yanıtı vitrine dönüyor", danisman.map((m) => m.metin).join(" | "));

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
