/**
 * TANI — "Veritabanı bağlı değil" uyarısının GERÇEK sebebi
 *   npx tsx scripts/db-tani.mts
 *
 * PostgreSQL adresi verildiğinde istemcinin ne yaptığını gösterir.
 * Sahte bir adres kullanır; gerçek bağlantı adresine ihtiyaç duymaz ve
 * hiçbir gizli değeri okumaz/yazmaz.
 */
import { PrismaClient } from "../src/generated/prisma/client";

const SEMA_SAGLAYICI = (await import("node:fs"))
  .readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8")
  .match(/datasource\s+db\s*\{[^}]*provider\s*=\s*"([^"]+)"/)?.[1];

console.log("schema.prisma provider :", SEMA_SAGLAYICI);
console.log("migration_lock provider:", (await import("node:fs"))
  .readFileSync(new URL("../prisma/migrations/migration_lock.toml", import.meta.url), "utf8")
  .match(/provider\s*=\s*"([^"]+)"/)?.[1]);

// Gerçek Neon adresi gerekmez: istemci daha bağlanmadan sağlayıcıyı denetler.
const SAHTE = "postgresql://kullanici:parola@localhost:5432/deneme";

console.log("\nPostgreSQL adaptörüyle istemci kurulmaya çalışılıyor…\n");
try {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const c = new PrismaClient({ adapter: new PrismaPg({ connectionString: SAHTE }) });
  await c.setting.count();
  console.log("SONUÇ: istemci kuruldu ve sorgu çalıştı (beklenmedik).");
} catch (e) {
  const m = e instanceof Error ? e.message : String(e);
  console.log("SONUÇ: hata alındı —\n");
  console.log(m.split("\n").slice(0, 12).map((s) => "  " + s).join("\n"));
}
process.exit(0);
