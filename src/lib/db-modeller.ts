/**
 * ŞEMADAKİ MODELLERİ VE YAZMA SIRASINI ÇIKARIR
 *
 * Yedek alma / geri yükleme betikleri elle tutulan bir model listesine
 * bağlı olmasın diye sıra doğrudan schema.prisma'dan hesaplanır. Şemaya
 * yeni bir model eklendiğinde betikleri güncellemek gerekmez.
 *
 * PostgreSQL yabancı anahtarları yazma sırasında zorlar: bir satır,
 * bağlı olduğu satırdan sonra yazılmalıdır. Bu yüzden modeller topolojik
 * sıraya dizilir (önce bağımsızlar, sonra onlara bağlı olanlar).
 */

/** Prisma modeli -> istemci alanı (Product -> product, AdminUser -> adminUser) */
export function istemciAdi(model: string): string {
  return model[0].toLowerCase() + model.slice(1);
}

/** schema.prisma metninden model adlarını ve bağımlılıklarını okur. */
export function modelBagimliliklari(sema: string): Map<string, Set<string>> {
  const harita = new Map<string, Set<string>>();
  for (const m of sema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const ad = m[1];
    const govde = m[2];
    const baglar = new Set<string>();
    // Yalnızca "fields:" içeren @relation gerçek yabancı anahtardır;
    // diğer yön (ters ilişki) sütun oluşturmaz, sıralamayı etkilemez.
    for (const r of govde.matchAll(/^\s*\w+\s+(\w+)(?:\?|\[\])?\s+@relation\([^)]*fields:/gm)) {
      if (r[1] !== ad) baglar.add(r[1]); // kendine bağ (Category.parent) sırayı değiştirmez
    }
    harita.set(ad, baglar);
  }
  return harita;
}

/**
 * Yazma sırası: bağımlılıkları önce gelecek biçimde.
 * Döngü olursa (şemada olmamalı) kalanlar sona eklenir, sessizce düşmez.
 */
export function modelSirasi(sema: string): string[] {
  const bagimliliklar = modelBagimliliklari(sema);
  const bekleyen = new Set(bagimliliklar.keys());
  const sirali: string[] = [];

  while (bekleyen.size) {
    const hazir = [...bekleyen].filter((m) =>
      [...(bagimliliklar.get(m) ?? [])].every((b) => !bekleyen.has(b)),
    );
    if (!hazir.length) {
      // Çözülemeyen döngü — kalanları olduğu gibi ekle ki veri kaybolmasın.
      sirali.push(...[...bekleyen].map(istemciAdi));
      break;
    }
    hazir.sort();
    for (const m of hazir) {
      sirali.push(istemciAdi(m));
      bekleyen.delete(m);
    }
  }
  return sirali;
}

/**
 * Kendine bağlı modeller (Category.parentId gibi): satırlar da kendi
 * içinde sıralanmalı — üst kayıt alt kayıttan önce yazılmalı.
 */
export function kendineBagliAlan(sema: string, model: string): string | null {
  const m = sema.match(new RegExp(`^model\\s+${model}\\s*\\{(.*?)^\\}`, "ms"));
  if (!m) return null;
  const r = m[1].match(
    new RegExp(`^\\s*\\w+\\s+${model}\\??\\s+@relation\\([^)]*fields:\\s*\\[(\\w+)\\]`, "m"),
  );
  return r ? r[1] : null;
}
