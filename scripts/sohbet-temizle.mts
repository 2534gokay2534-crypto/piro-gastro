/**
 * TEST SOHBETLERİNİ SİLER
 *   npx tsx scripts/sohbet-temizle.mts            -> yalnızca listeler (siler DEĞİL)
 *   npx tsx scripts/sohbet-temizle.mts --onayla   -> siler
 *
 * NEDEN İKİ ADIM
 * Bu betik önce doğrudan siliyordu ve deseni fazla genişti: gerçek veriler
 * arasında da "@test.se" adresli bir görüşme vardı ve Neon'a aktarımdan
 * sonra onu da sildi (yedekten geri yüklendi). Silme artık varsayılan
 * değil — önce ne silineceği gösterilir, onay ayrı verilir.
 */
import "dotenv/config";
import { db, dbVar } from "../src/lib/db";

const ONAY = process.argv.includes("--onayla");

if (!dbVar) {
  console.error("DATABASE_URL tanımlı değil ya da PostgreSQL değil.");
  process.exit(1);
}

/** Yalnızca betiklerin ürettiği görüşmeler. E-posta desenine GÜVENİLMEZ. */
const DESEN = {
  OR: [
    { visitorId: { startsWith: "e2e-" } },
    { visitorId: { startsWith: "test-ziyaretci-" } },
    { visitorId: { startsWith: "canli-test-" } },
  ],
};

const adaylar = await db.chatSession.findMany({
  where: DESEN,
  select: {
    id: true, visitorId: true, name: true, email: true, createdAt: true,
    _count: { select: { messages: true } },
  },
  orderBy: { createdAt: "asc" },
});

console.log(`silinecek görüşme : ${adaylar.length}`);
for (const a of adaylar) {
  console.log(
    "  " + a.createdAt.toISOString().slice(0, 16).replace("T", " "),
    (a.visitorId ?? "").padEnd(26),
    `${a._count.messages} mesaj`,
    a.name ?? "",
  );
}

const toplam = await db.chatSession.count();
console.log(`toplam görüşme    : ${toplam}`);

if (!ONAY) {
  console.log("\n(deneme modu — silmek için --onayla ekleyin)");
  process.exit(0);
}

if (!adaylar.length) {
  console.log("\nsilinecek bir şey yok.");
  process.exit(0);
}

const s = await db.chatSession.deleteMany({ where: DESEN });
console.log(`\nsilinen           : ${s.count}`);
console.log(`kalan             : ${await db.chatSession.count()}`);
process.exit(0);
