/**
 * PANEL DURUMU — nerede açılıyor, nerede kapalı
 *   npx tsx scripts/panel-durum.mts
 *
 * Süper Admin panelinin hangi adreste gerçekten açıldığını gösterir.
 * "Link ver" denince tahmin yürütmemek için ölçüyoruz.
 */
import "dotenv/config";
import { CEREZ, cerezUret, sifreVar } from "../src/lib/admin-kapi";

const YEREL = process.env.KOK ?? "http://localhost:3000";
const CANLI = "https://piro-gastro.vercel.app";

const SAYFALAR = [
  ["Dashboard", "/tr/admin"],
  ["Canlı Sohbet", "/tr/admin/sohbet"],
  ["Ürünler", "/tr/admin/urunler"],
  ["Muhasebe", "/tr/admin/muhasebe"],
  ["Sipariş Makbuzları", "/tr/admin/makbuzlar"],
  ["Kullanıcılar", "/tr/admin/kullanicilar"],
] as const;

console.log("ADMIN_SIFRE yerelde tanımlı mı :", sifreVar() ? "EVET" : "HAYIR");

const cerez = `${CEREZ}=${await cerezUret(Date.now())}`;

console.log("\n=== YEREL (oturum açılmış) ===");
for (const [ad, yol] of SAYFALAR) {
  try {
    const r = await fetch(YEREL + yol, { headers: { cookie: cerez }, redirect: "manual" });
    console.log("  " + ad.padEnd(22), `HTTP ${r.status}`, r.status === 200 ? "açılıyor" : "KAPALI");
  } catch {
    console.log("  " + ad.padEnd(22), "sunucu kapalı");
  }
}

console.log("\n=== CANLI (Vercel) ===");
const r = await fetch(CANLI + "/tr/admin", { redirect: "manual" });
const hedef = r.headers.get("location") ?? "";
console.log("  /tr/admin".padEnd(24), `HTTP ${r.status}`);
if (hedef.includes("kurulum=1")) {
  console.log("  -> Kurulum gerekli: Vercel'de ADMIN_SIFRE tanımlı değil.");
  console.log("     Settings > Environment Variables > ADMIN_SIFRE, sonra Redeploy.");
} else if (hedef) {
  console.log("  ->", hedef, "(giriş ekranı — şifreyle açılır)");
}

process.exit(0);
