/**
 * MODEL SIRASI TESTİ
 *   npx tsx scripts/db-modeller-test.mts
 *
 * Yedek geri yüklenirken satırlar yabancı anahtar sırasına göre yazılmalı.
 * Sıra yanlışsa PostgreSQL yazmayı reddeder ve veri eksik kalır. Bu test
 * sırayı şemaya karşı doğrular — Neon bağlantısı gerektirmez.
 */
import { readFileSync } from "node:fs";
import { istemciAdi, kendineBagliAlan, modelBagimliliklari, modelSirasi } from "../src/lib/db-modeller";

const sema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

let hata = 0;
const k = (c: boolean, ad: string, ek = "") => {
  if (!c) hata++;
  console.log(String(ad).padEnd(52), (c ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

const bagimliliklar = modelBagimliliklari(sema);
const sirali = modelSirasi(sema);

k(bagimliliklar.size > 0, "şemadan model okunuyor", `${bagimliliklar.size} model`);
k(sirali.length === bagimliliklar.size, "her model sıraya girdi",
  `${sirali.length} / ${bagimliliklar.size}`);
k(new Set(sirali).size === sirali.length, "sırada tekrar yok");

// Asıl kural: her model, bağlı olduğu modellerden SONRA gelmeli.
const yer = new Map(sirali.map((m, i) => [m, i]));
const ihlaller: string[] = [];
for (const [model, baglar] of bagimliliklar) {
  for (const b of baglar) {
    const a = yer.get(istemciAdi(model))!;
    const c = yer.get(istemciAdi(b))!;
    if (c > a) ihlaller.push(`${model} (${a}) < ${b} (${c})`);
  }
}
k(ihlaller.length === 0, "bağımlılıklar önce yazılıyor", ihlaller.slice(0, 3).join(" · "));

// Bilinen örnekler — sıra mantığı gerçekten çalışıyor mu
const once = (a: string, b: string) => yer.get(a)! < yer.get(b)!;
k(once("category", "categoryText"), "category, categoryText'ten önce");
k(once("product", "productImage"), "product, productImage'dan önce");
k(once("product", "spec"), "product, spec'ten önce");
k(once("spec", "specText"), "spec, specText'ten önce");
k(once("customer", "order"), "customer, order'dan önce");
k(once("order", "orderItem"), "order, orderItem'dan önce");
k(once("chatSession", "chatMessage"), "chatSession, chatMessage'dan önce");
k(once("role", "adminUser"), "role, adminUser'dan önce");
k(once("brand", "product"), "brand, product'tan önce");
k(once("language", "productText"), "language, productText'ten önce");

// Kendine bağlı alan (Category.parentId) bulunabiliyor mu
k(kendineBagliAlan(sema, "Category") === "parentId",
  "Category kendine bağlı alanı bulundu", String(kendineBagliAlan(sema, "Category")));
k(kendineBagliAlan(sema, "Product") === null, "Product'ta kendine bağ yok");

console.log("\nyazma sırası:");
console.log("  " + sirali.join(", "));

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
