/**
 * Türkçesi olmayan benzersiz açıklamaları numaralı parçalara böler.
 *
 *   node scripts/ceviri-parcala.mjs [parcaBoyu]
 *
 * Çıktı: ceviri/kaynak-NN.json   -> { "1": "English text", ... }
 * Çeviri  ceviri/tr-NN.json      -> { "1": "Türkçe metin", ... }
 * olarak yazılır, sonra ceviri-uygula.mjs kataloğa işler.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KATALOG = path.resolve(__dirname, "../src/data/catalog.json");
const KLASOR = path.resolve(__dirname, "../ceviri");
const PARCA = Number(process.argv[2]) || 120;

const katalog = JSON.parse(fs.readFileSync(KATALOG, "utf8"));

// Türkçesi olmayan BENZERSIZ İngilizce açıklamalar
const benzersiz = new Map(); // metin -> sıra no
for (const p of katalog.products) {
  const en = p.i18n?.en?.desc?.trim();
  const tr = p.i18n?.tr?.desc?.trim();
  if (!en || tr) continue;
  if (!benzersiz.has(en)) benzersiz.set(en, benzersiz.size + 1);
}

fs.mkdirSync(KLASOR, { recursive: true });
// eski parçaları temizle
for (const f of fs.readdirSync(KLASOR)) {
  if (/^kaynak-\d+\.json$/.test(f)) fs.unlinkSync(path.join(KLASOR, f));
}

const liste = [...benzersiz.entries()];      // [metin, no]
const parcaSayisi = Math.ceil(liste.length / PARCA);

for (let i = 0; i < parcaSayisi; i++) {
  const dilim = liste.slice(i * PARCA, (i + 1) * PARCA);
  const obj = {};
  for (const [metin, no] of dilim) obj[String(no)] = metin;
  const ad = `kaynak-${String(i + 1).padStart(2, "0")}.json`;
  fs.writeFileSync(path.join(KLASOR, ad), JSON.stringify(obj, null, 1));
}

// numara -> metin haritasını sakla (uygulama aşamasında gerekli)
const harita = {};
for (const [metin, no] of liste) harita[String(no)] = metin;
fs.writeFileSync(path.join(KLASOR, "harita.json"), JSON.stringify(harita));

const toplamKarakter = liste.reduce((s, [m]) => s + m.length, 0);
console.log(`Benzersiz çevrilecek açıklama : ${liste.length}`);
console.log(`Toplam karakter               : ${toplamKarakter.toLocaleString("tr-TR")}`);
console.log(`Parça sayısı                  : ${parcaSayisi}  (parça başına ${PARCA})`);
console.log(`Klasör                        : ceviri/`);
