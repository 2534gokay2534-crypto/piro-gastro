/**
 * GİZLİ DEĞER TEMİZLEME TESTİ
 *   npx tsx scripts/gizli-temizle-test.mts
 *
 * Yönetici ekranlarına basılan hata metinlerinin parola/anahtar
 * sızdırmadığını doğrular. Gerçek bir gizli değer kullanılmaz.
 */
process.env.DATABASE_URL = "postgresql://piro:S3cretParola@ep-test-pooler.eu-central-1.aws.neon.tech/pirogastro?sslmode=require";
process.env.ADMIN_SIFRE = "cok-gizli-yonetici-sifresi";

const { gizliTemizle } = await import("../src/lib/gizli-temizle");

let hata = 0;
const k = (c: boolean, ad: string, ek = "") => {
  if (!c) hata++;
  console.log(String(ad).padEnd(52), (c ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

/** Çıktıda hiçbir gizli parça kalmamalı. */
const SIZINTILAR = ["S3cretParola", "cok-gizli-yonetici-sifresi", "npg_", "sk_test_", "whsec_"];
const temizMi = (s: string) => !SIZINTILAR.some((x) => s.includes(x));

const ornekler: Array<[string, string]> = [
  [
    "Prisma bağlantı hatası (adres gömülü)",
    "Can't reach database server at `postgresql://piro:S3cretParola@ep-test-pooler.eu-central-1.aws.neon.tech/pirogastro`",
  ],
  [
    "Ortam değişkeni birebir metinde",
    "Invalid datasource: postgresql://piro:S3cretParola@ep-test-pooler.eu-central-1.aws.neon.tech/pirogastro?sslmode=require",
  ],
  ["Yönetici şifresi metne karışmış", "Auth failed for cok-gizli-yonetici-sifresi"],
  ["Neon anahtarı", "authentication failed for token npg_AbCdEf123456789"],
  ["Stripe anahtarı", "Invalid API Key provided: sk_test_51ABCdefGHIjkl"],
  ["Webhook imzası", "signature mismatch whsec_ABCdef123456789"],
  ["password= parametresi", "connect error: host=ep-x password=SuperGizli123 dbname=piro"],
];

for (const [ad, girdi] of ornekler) {
  const cikti = gizliTemizle(girdi);
  const ok = temizMi(cikti) && !/SuperGizli123/.test(cikti);
  k(ok, ad, ok ? "" : cikti);
}

console.log("\nörnek çıktı:");
console.log("  ", gizliTemizle(ornekler[0][1]));

// Zararsız metin bozulmamalı — teşhis değerini yitirmesin
const zararsiz = "relation \"ChatSession\" does not exist in the current database.";
k(gizliTemizle(zararsiz) === zararsiz, "zararsız hata metni değiştirilmiyor");

// Uzunluk sınırı
k(gizliTemizle("x".repeat(1000)).length === 300, "metin 300 karaktere kırpılıyor");

console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
