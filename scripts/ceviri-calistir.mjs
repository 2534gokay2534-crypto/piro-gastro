/**
 * TOPLU ÇEVİRİ İŞİ
 *
 *   node scripts/ceviri-calistir.mjs tr --prova        # ne olacağını gösterir, çağrı yapmaz
 *   node scripts/ceviri-calistir.mjs tr                # gerçekten çevirir (API anahtarı gerekir)
 *   node scripts/ceviri-calistir.mjs tr --limit 50     # ilk 50 ürün
 *   node scripts/ceviri-calistir.mjs tr --sadece ad    # ad | aciklama | ozellik
 *
 * Kurallar:
 *  - Elle düzeltilmiş (locked / origin=manual) kayıtların ÜZERİNE YAZMAZ
 *  - Kaynakta zaten çeviri varsa (origin=source) dokunmaz
 *  - Aynı metni iki kez çevirmez (TranslationCache)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import crypto from "node:crypto";
import "dotenv/config";

const hedefDil = process.argv[2];
if (!hedefDil) {
  console.error("Kullanım: node scripts/ceviri-calistir.mjs <dil> [--prova] [--limit N] [--sadece ad|aciklama|ozellik]");
  process.exit(1);
}
const PROVA = process.argv.includes("--prova");
// --sahte: API çağırmaz ama veritabanına ve önbelleğe YAZAR.
// Amaç: anahtar olmadan boru hattını ve önbelleği uçtan uca sınamak.
const SAHTE = process.argv.includes("--sahte");
const li = process.argv.indexOf("--limit");
const LIMIT = li > -1 ? Number(process.argv[li + 1]) : 0;
const si = process.argv.indexOf("--sadece");
const SADECE = si > -1 ? process.argv[si + 1] : null;

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = url.startsWith("file:")
  ? new PrismaBetterSqlite3({ url })
  : new PrismaPg({ connectionString: url });
const db = new PrismaClient({ adapter });

const ozet = (s) => crypto.createHash("sha256").update(s).digest("hex");
const SAYISAL = /^[\d\s.,:;+°/x×"'()-]+$/;
const KOD = /^(EN|DIN|ISO|NSF|CE|UL)\s*\d|^IPX?\d|^R\d{2,4}|^\d+\/\d+"|^Ø/i;
const cevrilmeliMi = (s) => {
  const t = (s ?? "").trim();
  return !!t && t.length >= 2 && !SAYISAL.test(t) && !KOD.test(t);
};

function saglayiciSec() {
  if (PROVA) return "yok";
  if (SAHTE) return "sahte";
  if (process.env.DEEPL_API_KEY) return "deepl";
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return "google";
  return "yok";
}

async function apiCevir(metinler, from, to, saglayici) {
  if (saglayici === "deepl") {
    const key = process.env.DEEPL_API_KEY;
    const u = key.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
    const r = await fetch(u, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: metinler, source_lang: from.toUpperCase(), target_lang: to.toUpperCase(), preserve_formatting: true }),
    });
    if (!r.ok) throw new Error(`DeepL ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()).translations.map((t) => t.text);
  }
  if (saglayici === "google") {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: metinler, source: from, target: to, format: "text" }),
    });
    if (!r.ok) throw new Error(`Google ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()).data.translations.map((t) => t.translatedText);
  }
  return metinler.map((m) => `[${to}] ${m}`);   // prova / sahte
}

/** Toplu çevir: önbelleği kullanır, eksikleri API'ye sorar, önbelleğe yazar. */
async function cevirToplu(metinler, from, to, saglayici, durum) {
  const benzersiz = [...new Set(metinler.filter(cevrilmeliMi).map((m) => m.trim()))];
  const harita = new Map();
  if (!benzersiz.length) return harita;

  const kayitli = await db.translationCache.findMany({
    where: { hash: { in: benzersiz.map(ozet) }, fromCode: from, toCode: to },
    select: { hash: true, target: true },
  });
  const bulunan = new Map(kayitli.map((k) => [k.hash, k.target]));

  const eksik = [];
  for (const m of benzersiz) {
    const t = bulunan.get(ozet(m));
    if (t !== undefined) { harita.set(m, t); durum.onbellek++; }
    else eksik.push(m);
  }

  for (let i = 0; i < eksik.length; i += 45) {
    const parca = eksik.slice(i, i + 45);
    const cikti = await apiCevir(parca, from, to, saglayici);
    durum.cagri += parca.length;
    durum.karakter += parca.reduce((s, x) => s + x.length, 0);
    for (let k = 0; k < parca.length; k++) {
      harita.set(parca[k], cikti[k] ?? parca[k]);
      if (saglayici !== "yok") {
        await db.translationCache.upsert({
          where: { hash_fromCode_toCode: { hash: ozet(parca[k]), fromCode: from, toCode: to } },
          create: { hash: ozet(parca[k]), fromCode: from, toCode: to, source: parca[k], target: cikti[k] ?? parca[k], provider: saglayici },
          update: { target: cikti[k] ?? parca[k] },
        });
      }
    }
    process.stdout.write(`\r  çeviri: ${durum.cagri} çağrı, ${durum.onbellek} önbellek`);
  }
  return harita;
}

async function main() {
  const dil = await db.language.findUnique({ where: { code: hedefDil } });
  if (!dil) { console.error(`Dil bulunamadı: ${hedefDil}. Önce admin panelinden ekleyin.`); process.exit(1); }
  const kaynak = dil.sourceCode || "en";
  const saglayici = saglayiciSec();

  console.log(`Hedef dil : ${dil.code} (${dil.name})`);
  console.log(`Kaynak    : ${kaynak}`);
  console.log(`Sağlayıcı : ${saglayici === "yok" ? "PROVA (API çağrısı yapılmaz)" : saglayici}`);
  console.log("");

  const durum = { cagri: 0, onbellek: 0, karakter: 0 };
  const run = await db.translationRun.create({
    data: { langCode: hedefDil, provider: saglayici, note: PROVA ? "prova" : null },
  });

  /* ---------------- 1) ÜRÜN AD + AÇIKLAMA ---------------- */
  let adYazilan = 0, acYazilan = 0;
  if (!SADECE || SADECE === "ad" || SADECE === "aciklama") {
    const urunler = await db.product.findMany({
      take: LIMIT || undefined,
      select: {
        id: true,
        texts: { select: { langCode: true, name: true, desc: true, origin: true, locked: true } },
      },
    });

    const eksikAd = [], eksikAc = [], hedefler = [];
    for (const p of urunler) {
      const src = p.texts.find((t) => t.langCode === kaynak);
      const dst = p.texts.find((t) => t.langCode === hedefDil);
      if (!src) continue;
      if (dst?.locked || dst?.origin === "manual" || dst?.origin === "source") continue;

      const adGerek = !dst?.name || dst.name === src.name;
      const acGerek = !dst?.desc && !!src.desc;
      if (!adGerek && !acGerek) continue;

      hedefler.push({ id: p.id, src, adGerek, acGerek });
      if (adGerek && src.name) eksikAd.push(src.name);
      if (acGerek && src.desc) eksikAc.push(src.desc);
    }

    console.log(`Ürün: çevrilecek ad ${eksikAd.length}, açıklama ${eksikAc.length}`);
    const adHarita = (!SADECE || SADECE === "ad") ? await cevirToplu(eksikAd, kaynak, hedefDil, saglayici, durum) : new Map();
    const acHarita = (!SADECE || SADECE === "aciklama") ? await cevirToplu(eksikAc, kaynak, hedefDil, saglayici, durum) : new Map();

    for (const h of hedefler) {
      const yeniAd = h.adGerek ? adHarita.get((h.src.name ?? "").trim()) : undefined;
      const yeniAc = h.acGerek ? acHarita.get((h.src.desc ?? "").trim()) : undefined;
      if (!yeniAd && !yeniAc) continue;
      if (PROVA) { if (yeniAd) adYazilan++; if (yeniAc) acYazilan++; continue; }
      await db.productText.upsert({
        where: { productId_langCode: { productId: h.id, langCode: hedefDil } },
        create: {
          productId: h.id, langCode: hedefDil,
          name: yeniAd ?? h.src.name, desc: yeniAc ?? null,
          origin: "machine", translatedAt: new Date(),
        },
        update: {
          ...(yeniAd ? { name: yeniAd } : {}),
          ...(yeniAc ? { desc: yeniAc } : {}),
          origin: "machine", translatedAt: new Date(),
        },
      });
      if (yeniAd) adYazilan++;
      if (yeniAc) acYazilan++;
    }
    console.log(`\n  yazılan ad ${adYazilan}, açıklama ${acYazilan}`);
  }

  /* ---------------- 2) TEKNİK ÖZELLİKLER ---------------- */
  let ozYazilan = 0;
  if (!SADECE || SADECE === "ozellik") {
    const specler = await db.spec.findMany({
      take: LIMIT ? LIMIT * 15 : undefined,
      select: { id: true, texts: { select: { langCode: true, label: true, value: true, origin: true, locked: true } } },
    });

    const hedefler = [], metinler = [];
    for (const s of specler) {
      const src = s.texts.find((t) => t.langCode === kaynak);
      const dst = s.texts.find((t) => t.langCode === hedefDil);
      if (!src) continue;
      if (dst?.locked || dst?.origin === "manual" || dst?.origin === "source") continue;
      if (dst?.label) continue;
      hedefler.push({ id: s.id, src });
      metinler.push(src.label, src.value);
    }

    console.log(`Teknik özellik: çevrilecek ${hedefler.length} satır`);
    const harita = await cevirToplu(metinler, kaynak, hedefDil, saglayici, durum);

    for (const h of hedefler) {
      const l = harita.get((h.src.label ?? "").trim()) ?? (cevrilmeliMi(h.src.label) ? null : h.src.label);
      const v = harita.get((h.src.value ?? "").trim()) ?? (cevrilmeliMi(h.src.value) ? null : h.src.value);
      if (!l || v === null) continue;      // biri çevrilemediyse satırı yazma
      if (PROVA) { ozYazilan++; continue; }
      await db.specText.upsert({
        where: { specId_langCode: { specId: h.id, langCode: hedefDil } },
        create: { specId: h.id, langCode: hedefDil, label: l, value: v, origin: "machine", translatedAt: new Date() },
        update: { label: l, value: v, origin: "machine", translatedAt: new Date() },
      });
      ozYazilan++;
    }
    console.log(`\n  yazılan özellik satırı ${ozYazilan}`);
  }

  await db.translationRun.update({
    where: { id: run.id },
    data: { items: adYazilan + acYazilan + ozYazilan, chars: durum.karakter, cacheHits: durum.onbellek, finishedAt: new Date() },
  });

  console.log("");
  console.log("ÖZET");
  console.log(`  API çağrısı (metin) : ${durum.cagri}`);
  console.log(`  önbellekten karşılanan: ${durum.onbellek}`);
  console.log(`  karakter            : ${durum.karakter}`);
  console.log(`  yazılan kayıt       : ${adYazilan + acYazilan + ozYazilan}`);
  if (PROVA) console.log("\n  (PROVA — veritabanına yazılmadı, API çağrılmadı)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
