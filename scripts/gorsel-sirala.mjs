/**
 * ÜRÜN GÖRSELLERİNİ SIRALAR VE TEKRARLARI TEMİZLER.
 *
 *   node scripts/gorsel-sirala.mjs           -> rapor (yazmaz)
 *   node scripts/gorsel-sirala.mjs --yaz     -> catalog.json'a yaz
 *   node scripts/gorsel-sirala.mjs --yaz --db-> veritabanına da yaz
 *
 * Kural:
 *   Bartscher  → dosya adı ".../SKU/SKU" (eksiz) olan ANA görseldir, öne alınır.
 *                Sonra "SKU_1, SKU_2 …" sayısal artan sırayla gelir.
 *   Unninox    → kaynak sırası korunur; sayı adları rastgeledir, sıralamak
 *                tedarikçinin dizilişini bozardı.
 *   Hepsi      → aynı URL iki kez varsa ilki kalır.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KATALOG = path.resolve(__dirname, "../src/data/catalog.json");
const YAZ = process.argv.includes("--yaz");
const DB = process.argv.includes("--db");

/** URL'in son parçası: ".../100048/100048_4" -> "100048_4" */
const dosyaAdi = (u) => String(u ?? "").split("/").pop() ?? "";

/** Bartscher görseli mi? */
const bartscherMi = (u) => /api\.bartscher\.com/.test(String(u ?? ""));

/**
 * Bartscher sıra anahtarı:
 *   eksiz (ana görsel)  -> -1  (en başa)
 *   "_7"                ->  7
 *   çözülemezse         -> 999
 */
function bartscherSira(u) {
  const ad = dosyaAdi(u);
  const m = ad.match(/_(\d+)$/);
  if (m) return Number(m[1]);
  return -1;
}

function duzenle(images) {
  const liste = (images ?? []).filter((im) => im && typeof im.url === "string" && im.url.trim());

  // 1) tekrarları at (ilk görülen kalır)
  const gorulen = new Set();
  const tekil = [];
  for (const im of liste) {
    if (gorulen.has(im.url)) continue;
    gorulen.add(im.url);
    tekil.push(im);
  }

  // 2) yalnızca Bartscher setlerini sırala
  const hepsiBartscher = tekil.length > 0 && tekil.every((im) => bartscherMi(im.url));
  if (!hepsiBartscher) return { liste: tekil, tekrar: liste.length - tekil.length, siralandi: false };

  const once = tekil.map((im) => im.url).join("|");
  const sirali = [...tekil].sort((a, b) => bartscherSira(a.url) - bartscherSira(b.url));
  const sonra = sirali.map((im) => im.url).join("|");

  return { liste: sirali, tekrar: liste.length - tekil.length, siralandi: once !== sonra };
}

/* ---------------- katalog ---------------- */

const katalog = JSON.parse(fs.readFileSync(KATALOG, "utf8"));

let tekrarliUrun = 0;
let tekrarliGorsel = 0;
let siralananUrun = 0;
let anaOneAlinan = 0;

for (const p of katalog.products) {
  const oncekiIlk = p.images?.[0]?.url ?? "";
  const { liste, tekrar, siralandi } = duzenle(p.images);

  if (tekrar > 0) {
    tekrarliUrun++;
    tekrarliGorsel += tekrar;
  }
  if (siralandi) siralananUrun++;
  if (liste[0]?.url && liste[0].url !== oncekiIlk) anaOneAlinan++;

  if (YAZ) p.images = liste;
}

console.log("Ürün                       :", katalog.products.length);
console.log("Tekrarlı görseli olan ürün :", tekrarliUrun, `(${tekrarliGorsel} görsel atıldı)`);
console.log("Sırası düzeltilen ürün     :", siralananUrun);
console.log("Ana görseli değişen ürün   :", anaOneAlinan);

if (YAZ) {
  fs.writeFileSync(KATALOG, JSON.stringify(katalog));
  console.log("\ncatalog.json güncellendi");
}

/* ---------------- veritabanı ---------------- */

if (YAZ && DB) {
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

  let dbUrun = 0;
  for (const p of katalog.products) {
    const mevcut = await db.productImage.findMany({
      where: { productId: p.id },
      orderBy: { sort: "asc" },
      select: { id: true, url: true },
    });
    if (!mevcut.length) continue;

    // katalogdaki sırayı veritabanına uygula
    const hedef = p.images.map((im) => im.url);
    const kalan = new Map(mevcut.map((m) => [m.url, m.id]));

    let s = 0;
    for (const u of hedef) {
      const id = kalan.get(u);
      if (!id) continue;
      await db.productImage.update({ where: { id }, data: { sort: s++ } });
      kalan.delete(u);
    }
    // katalogda olmayan (tekrar) satırları sil
    for (const id of kalan.values()) {
      await db.productImage.delete({ where: { id } }).catch(() => null);
    }
    dbUrun++;
  }

  console.log("veritabanında güncellenen ürün :", dbUrun);
  await db.$disconnect();
}
