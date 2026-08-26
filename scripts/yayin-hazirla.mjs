/**
 * YAYIN ÖNCESİ HAZIRLIK — Vercel derlemesi bunu çağırır
 *   node scripts/yayin-hazirla.mjs
 *
 * 1) prisma generate  — istemciyi üretir (her zaman gerekir)
 * 2) prisma migrate deploy — tabloları hedef veritabanında oluşturur
 *
 * NEDEN BURADA
 * Neon bağlantı dizesi yalnızca Vercel'in ortamında var. Migration'ı
 * derleme sırasında çalıştırmak, bağlantı adresini kimseye göstermeden
 * tabloların oluşmasını sağlar.
 *
 * NEDEN KOŞULLU
 * DATABASE_URL tanımlı olmayan bir ortamda (ör. ortam değişkeni verilmemiş
 * bir önizleme dağıtımı) migrate deploy hata verir ve derlemeyi düşürürdü.
 * Site veritabanısız da ayakta kalabildiği için, adres yoksa bu adım
 * atlanır ve derleme sürer.
 *
 * Adres HİÇBİR ZAMAN yazdırılmaz; yalnızca türü bildirilir.
 */
import { execFileSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
const postgresMi = /^(postgres|postgresql|prisma\+postgres):/.test(url);

/**
 * Migration icin dogrudan (havuzlanmamis) adres.
 *
 * Neon'un "-pooler" adresi PgBouncer uzerinden gecer ve islem kipinde
 * oturum duzeyi advisory lock desteklemez; prisma migrate deploy bu kilidi
 * kullandigi icin havuzlanmis adreste takilir ya da hata verir. Vercel'de
 * DIRECT_DATABASE_URL tanimliysa migration onun uzerinden calisir,
 * uygulama sorgulari yine havuzlanmis adresi kullanmaya devam eder.
 */
const migrationAdresi = process.env.DIRECT_DATABASE_URL || url;
const havuzlanmis = /-pooler\./.test(url);

/** npx üzerinden prisma çağırır; çıktıyı olduğu gibi geçirir. */
function prisma(argumanlar, ortam = {}) {
  execFileSync("npx", ["prisma", ...argumanlar], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...ortam },
  });
}

console.log("[yayin-hazirla] prisma generate");
prisma(["generate"]);

if (!url) {
  console.log("[yayin-hazirla] DATABASE_URL yok — migration atlandı, derleme sürüyor.");
  console.log("[yayin-hazirla] (Site katalog dosyasından okuduğu için vitrin çalışır,");
  console.log("[yayin-hazirla]  yönetici panelleri 'kurulum gerekli' gösterir.)");
} else if (!postgresMi) {
  // Sessizce geçmek yanlış olur: adres var ama şemayla uyuşmuyor.
  console.error("[yayin-hazirla] HATA: DATABASE_URL bir PostgreSQL adresi değil.");
  console.error("[yayin-hazirla] Şema PostgreSQL için üretiliyor; adres postgresql:// ile başlamalı.");
  process.exit(1);
} else {
  console.log("[yayin-hazirla] PostgreSQL bulundu — prisma migrate deploy");
  if (havuzlanmis && !process.env.DIRECT_DATABASE_URL) {
    console.log("[yayin-hazirla] UYARI: adres havuzlanmis (-pooler) ve DIRECT_DATABASE_URL yok.");
    console.log("[yayin-hazirla] Migration takilirsa Neon'un havuzlanmamis adresini");
    console.log("[yayin-hazirla] DIRECT_DATABASE_URL olarak ekleyin.");
  }
  prisma(["migrate", "deploy"], { DATABASE_URL: migrationAdresi });
  console.log("[yayin-hazirla] migration tamam.");
}
