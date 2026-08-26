/**
 * SAHTE SHOPIFY VİTRİNİ — canlı desteğin dış siteden çalıştığını kanıtlar
 *   node scripts/shopify-vitrin-denemesi.mjs        (http://localhost:4000)
 *
 * NEDEN
 * Shopify mağazası açılmadan da "sohbet başka bir alan adından çalışıyor mu"
 * sorusu yanıtlanabilmeli. Bu sunucu 4000 portunda ayrı bir KÖKEN oluşturur;
 * tarayıcı için bu, gerçek bir Shopify alan adından farksızdır. Widget 3000
 * portundaki sunucuyu çağırır ve CORS gerçekten sınanmış olur.
 *
 * Sayfa, Tinker temasının yapısını taklit eder (üst bar, ürün, sepet düğmesi)
 * ve marka CSS katmanını yükler — böylece renklerin de oturduğu görülür.
 *
 * ÖN KOŞUL: .env içinde SOHBET_KAYNAKLARI="http://localhost:4000"
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 4000);
const SUNUCU = process.env.PIRO_SUNUCU ?? "http://localhost:3000";

const MARKA_CSS = fs.readFileSync(path.join(KOK, "shopify/tema/assets/piro-tasarim.css"), "utf8");

const SAYFA = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Piro Gastro Center AB — Tinker (deneme vitrini)</title>
<style>${MARKA_CSS}</style>
<style>
  body{margin:0}
  .site-header{display:flex;align-items:center;gap:24px;padding:16px 24px}
  .site-header strong{color:var(--piro-navy-900);font-size:18px}
  nav a{margin-right:16px;text-decoration:none;font-size:14px}
  main{max-width:1080px;margin:0 auto;padding:32px 24px}
  .urun{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}
  @media (max-width:749px){.urun{grid-template-columns:1fr}}
  .gorsel{background:var(--piro-steel-100);border-radius:14px;aspect-ratio:1;display:flex;
    align-items:center;justify-content:center;color:var(--piro-steel-500)}
  .price{font-size:28px;display:block;margin:12px 0}
  .button{padding:13px 22px;font-size:15px;cursor:pointer}
  .uyari{background:var(--piro-gold-200);border-left:4px solid var(--piro-gold);
    padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:24px}
  .site-footer{margin-top:64px;padding:32px 24px;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
  td{border-bottom:1px solid var(--piro-steel-200);padding:8px 0}
</style>
</head>
<body>
  <header class="site-header">
    <strong>PIRO GASTRO</strong>
    <nav>
      <a href="#">Pizzautrustning</a>
      <a href="#">Kylning</a>
      <a href="#">Matlagning</a>
      <a href="#">Diskning</a>
    </nav>
  </header>

  <main>
    <p class="uyari">
      Bu sayfa <strong>gerçek Shopify değildir</strong>. Tinker temasının yapısını taklit eden bir
      deneme vitrinidir. Amacı tek şey: canlı destek penceresinin <strong>başka bir alan adından</strong>
      (${"localhost:4000"}) Piro sunucusunu (${SUNUCU}) çağırabildiğini kanıtlamak.
    </p>

    <div class="urun">
      <div class="gorsel">produktbild</div>
      <div>
        <h1>Soppkastrull Gourmet 10L</h1>
        <span class="price">1 550,00 kr</span>
        <button class="button" name="add" type="button">Lägg i varukorg</button>
        <table>
          <tr><td>Artikelnummer</td><td>100047</td></tr>
          <tr><td>Mått</td><td>390 × 390 × 380 mm</td></tr>
          <tr><td>Vikt</td><td>5,2 kg</td></tr>
          <tr><td>Garanti</td><td>24 månader</td></tr>
        </table>
      </div>
    </div>
  </main>

  <footer class="site-footer">
    Piro Gastro Center AB · <a href="#">Kontakt</a> · <a href="#">Villkor</a>
  </footer>

  <!-- Shopify'da bu satırı snippets/piro-canli-destek.liquid üretir -->
  <script src="${SUNUCU}/sohbet-gomulu.js" data-dil="sv" defer></script>
</body>
</html>`;

http
  .createServer((istek, yanit) => {
    yanit.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    yanit.end(SAYFA);
  })
  .listen(PORT, () => {
    console.log(`Deneme vitrini  : http://localhost:${PORT}`);
    console.log(`Piro sunucusu   : ${SUNUCU}`);
    console.log(`Gereken ayar    : SOHBET_KAYNAKLARI="http://localhost:${PORT}"`);
  });
