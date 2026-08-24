import crypto from "node:crypto";
import { db } from "./db";

/**
 * OTOMATİK ÇEVİRİ SERVİSİ
 *
 * Kurallar:
 *  1. Aynı metin İKİ KEZ çevrilmez — TranslationCache'te tutulur.
 *     Katalogda "Material", "Voltage" gibi etiketler binlerce kez geçer;
 *     hepsi tek çeviriyle karşılanır.
 *  2. Sayfa açılışında ÇEVİRİ YAPILMAZ. Çeviri toplu iş olarak çalışır,
 *     sonuç veritabanına yazılır, site yalnızca kayıtlıyı okur.
 *  3. Süper Admin bir metni elle düzeltirse (locked) otomatik çeviri
 *     onun üzerine yazmaz.
 *
 * Sağlayıcı, ortam değişkeninden seçilir:
 *   DEEPL_API_KEY              -> DeepL
 *   GOOGLE_TRANSLATE_API_KEY   -> Google Cloud Translation v2
 *   (hiçbiri yoksa)            -> prova kipi, çağrı yapılmaz
 */

export type Saglayici = "deepl" | "google" | "yok";

export function saglayiciSec(): Saglayici {
  if (process.env.DEEPL_API_KEY) return "deepl";
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return "google";
  return "yok";
}

const ozet = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** Çevrilmemeli: salt sayı/birim, norm kodu, model adı. */
const SAYISAL = /^[\d\s.,:;+°/x×"'()-]+$/;
const KOD = /^(EN|DIN|ISO|NSF|CE|UL)\s*\d|^IPX?\d|^R\d{2,4}|^\d+\/\d+"|^Ø/i;

export function cevrilmeliMi(s: string): boolean {
  const t = (s ?? "").trim();
  if (!t) return false;
  if (t.length < 2) return false;
  if (SAYISAL.test(t)) return false;                       // salt sayı/birim
  if (KOD.test(t)) return false;                          // norm/kod
  return true;
}

/* ---------------- sağlayıcılar ---------------- */

async function deeplCevir(metinler: string[], from: string, to: string): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY!;
  const ucretsiz = key.endsWith(":fx");
  const url = ucretsiz
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: metinler,
      source_lang: from.toUpperCase(),
      target_lang: to.toUpperCase(),
      preserve_formatting: true,
    }),
  });
  if (!r.ok) throw new Error(`DeepL ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { translations: { text: string }[] };
  return j.translations.map((t) => t.text);
}

async function googleCevir(metinler: string[], from: string, to: string): Promise<string[]> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY!;
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: metinler, source: from, target: to, format: "text" }),
  });
  if (!r.ok) throw new Error(`Google ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { data: { translations: { translatedText: string }[] } };
  return j.data.translations.map((t) => t.translatedText);
}

/** Prova kipi — API anahtarı yokken boru hattını sınamak için. */
function provaCevir(metinler: string[], _from: string, to: string): string[] {
  return metinler.map((m) => `[${to}] ${m}`);
}

/* ---------------- ana giriş ---------------- */

export type CeviriSonuc = {
  ceviriler: Map<string, string>;
  yeniCagri: number;
  onbellekIsabet: number;
  karakter: number;
  saglayici: Saglayici;
};

/**
 * Metinleri çevirir. Önbellekte olanlar için API'ye gitmez.
 * @param prova true ise API çağrısı yapılmaz (anahtar olsa bile).
 */
export async function cevir(
  metinler: string[],
  from: string,
  to: string,
  opts: { prova?: boolean; parcaBoyu?: number } = {},
): Promise<CeviriSonuc> {
  const saglayici = opts.prova ? "yok" : saglayiciSec();
  const parcaBoyu = opts.parcaBoyu ?? 45;

  const benzersiz = [...new Set(metinler.filter(cevrilmeliMi).map((m) => m.trim()))];
  const ceviriler = new Map<string, string>();
  if (!benzersiz.length) {
    return { ceviriler, yeniCagri: 0, onbellekIsabet: 0, karakter: 0, saglayici };
  }

  // 1) önbellek
  const hashler = benzersiz.map(ozet);
  const kayitli = await db.translationCache.findMany({
    where: { hash: { in: hashler }, fromCode: from, toCode: to },
    select: { hash: true, source: true, target: true },
  });
  const hashToTarget = new Map(kayitli.map((k) => [k.hash, k.target]));

  const eksik: string[] = [];
  for (const m of benzersiz) {
    const t = hashToTarget.get(ozet(m));
    if (t !== undefined) ceviriler.set(m, t);
    else eksik.push(m);
  }
  const onbellekIsabet = benzersiz.length - eksik.length;
  if (!eksik.length) {
    return { ceviriler, yeniCagri: 0, onbellekIsabet, karakter: 0, saglayici };
  }

  // 2) eksikleri çevir
  let yeniCagri = 0, karakter = 0;
  for (let i = 0; i < eksik.length; i += parcaBoyu) {
    const parca = eksik.slice(i, i + parcaBoyu);
    let cikti: string[];
    if (saglayici === "deepl") cikti = await deeplCevir(parca, from, to);
    else if (saglayici === "google") cikti = await googleCevir(parca, from, to);
    else cikti = provaCevir(parca, from, to);

    yeniCagri += parca.length;
    karakter += parca.reduce((s, x) => s + x.length, 0);

    for (let k = 0; k < parca.length; k++) {
      const kaynak = parca[k];
      const hedef = cikti[k] ?? kaynak;
      ceviriler.set(kaynak, hedef);
      // prova kipinde önbelleğe YAZMA — sahte metin kalıcı olmasın
      if (saglayici !== "yok") {
        await db.translationCache.upsert({
          where: { hash_fromCode_toCode: { hash: ozet(kaynak), fromCode: from, toCode: to } },
          create: { hash: ozet(kaynak), fromCode: from, toCode: to, source: kaynak, target: hedef, provider: saglayici },
          update: { target: hedef, provider: saglayici },
        });
      }
    }
  }

  return { ceviriler, yeniCagri, onbellekIsabet, karakter, saglayici };
}
