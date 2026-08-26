/** Test sohbetlerini siler. npx tsx scripts/sohbet-temizle.mts */
import "dotenv/config";
import { db } from "../src/lib/db";

const s = await db.chatSession.deleteMany({
  where: {
    OR: [
      { visitorId: { startsWith: "e2e-" } },
      { visitorId: { startsWith: "test-ziyaretci-" } },
      { email: { contains: "@test.se" } },
    ],
  },
});
console.log("silinen test sohbeti :", s.count);
console.log("kalan sohbet         :", await db.chatSession.count());
process.exit(0);
