/**
 * CANLI VERİTABANI TESTİ — dışarıdan, gizli değer görmeden
 *   npx tsx scripts/canli-veritabani-test.mts
 *   KOK=https://baska-adres npx tsx scripts/canli-veritabani-test.mts
 *
 * NEDEN BÖYLE
 * Neon bağlantı dizesi yalnızca Vercel'de. Bu test bağlantıya hiç
 * dokunmadan, sitenin kendi uçlarını kullanarak veritabanının gerçekten
 * OKUNUP YAZILDIĞINI kanıtlar:
 *
 *   /api/chat/durum     -> chatSession tablosunu sayar (okuma)
 *   /api/chat/baslat    -> oturum + mesaj yazar        (yazma)
 *   /api/chat/mesajlar  -> yazılanı geri okur          (okuma)
 *   /api/chat/gonder    -> aynı oturuma ikinci mesaj   (güncelleme)
 *
 * Bu uçlar yönetici panelinin kullandığı Prisma istemcisinin ta kendisini
 * kullanır; "hazir: true" dönmesi panelin de bağlı olduğu anlamına gelir.
 *
 * Bıraktığı test kaydı visitorId "canli-test-" ile başlar;
 * scripts/sohbet-temizle.mts bunu siler.
 */
const KOK = process.env.KOK ?? "https://piro-gastro.vercel.app";

let hata = 0;
const k = (c: boolean, ad: string, ek = "") => {
  if (!c) hata++;
  console.log(String(ad).padEnd(50), (c ? "OK" : "HATA") + (ek ? "  " + ek : ""));
};

const damga = Date.now().toString(36);
const ZIYARETCI = `canli-test-${damga}`;
const METIN = `Canlı veritabanı testi ${damga}`;

console.log("hedef :", KOK, "\n");

console.log("=== A. OKUMA: veritabanı bağlı mı ===");
const durumY = await fetch(`${KOK}/api/chat/durum`, { cache: "no-store" });
const durum = (await durumY.json()) as { hazir?: boolean; cevrimIci?: boolean; neden?: string };
k(durumY.status === 200, "durum ucu yanıt veriyor", `HTTP ${durumY.status}`);
k(durum.hazir === true, "veritabanı bağlı (hazir: true)",
  durum.hazir ? "" : `neden=${durum.neden ?? "bilinmiyor"}`);

if (!durum.hazir) {
  console.log("\nVeritabanı bağlı değil — yazma testleri atlandı.");
  console.log("Vercel'de DATABASE_URL tanımlı mı ve derleme migration'ı çalıştırdı mı, bakın.");
  process.exit(1);
}

console.log("\n=== B. YAZMA: yeni sohbet oturumu ===");
const baslatY = await fetch(`${KOK}/api/chat/baslat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    ad: "Canlı Test",
    eposta: `canli-${damga}@test.se`,
    metin: METIN,
    ziyaretci: ZIYARETCI,
    dil: "sv",
    sayfa: "/sv",
  }),
});
const baslat = (await baslatY.json()) as {
  ok?: boolean;
  oturumId?: string;
  mesajlar?: Array<{ id: string; kim: string; metin: string }>;
};
k(baslatY.status === 200, "başlat ucu yanıt veriyor", `HTTP ${baslatY.status}`);
k(baslat.ok === true, "oturum yazıldı");
k(!!baslat.oturumId, "oturum kimliği döndü", baslat.oturumId ?? "-");
k(baslat.mesajlar?.[0]?.metin === METIN, "ilk mesaj kaydedildi");

const oturum = baslat.oturumId;
if (!oturum) {
  console.log("\nOturum açılamadı — devam edilemiyor.");
  process.exit(1);
}

console.log("\n=== C. GERİ OKUMA: yazılan gerçekten orada mı ===");
const okuY = await fetch(`${KOK}/api/chat/mesajlar?o=${encodeURIComponent(oturum)}`, { cache: "no-store" });
const oku = (await okuY.json()) as { ok?: boolean; mesajlar?: Array<{ kim: string; metin: string }> };
k(okuY.status === 200, "mesajlar ucu yanıt veriyor", `HTTP ${okuY.status}`);
k(oku.ok === true, "okuma başarılı");
k(oku.mesajlar?.some((m) => m.metin === METIN) === true,
  "yazılan mesaj geri okundu", `${oku.mesajlar?.length ?? 0} mesaj`);

console.log("\n=== D. GÜNCELLEME: aynı oturuma ikinci mesaj ===");
const IKINCI = `İkinci mesaj ${damga}`;
const gonderY = await fetch(`${KOK}/api/chat/gonder`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ oturumId: oturum, metin: IKINCI }),
});
const gonder = (await gonderY.json()) as { ok?: boolean; mesaj?: { metin: string } };
k(gonderY.status === 200 && gonder.ok === true, "ikinci mesaj yazıldı");
k(gonder.mesaj?.metin === IKINCI, "yazılan içerik doğru");

const sonY = await fetch(`${KOK}/api/chat/mesajlar?o=${encodeURIComponent(oturum)}`, { cache: "no-store" });
const son = (await sonY.json()) as { mesajlar?: Array<{ metin: string }> };
k((son.mesajlar?.length ?? 0) >= 2, "oturumda iki mesaj var", `${son.mesajlar?.length ?? 0} mesaj`);

console.log("\n=== E. KALICILIK: kayıt sonraki istekte de duruyor mu ===");
const tekrarY = await fetch(`${KOK}/api/chat/mesajlar?o=${encodeURIComponent(oturum)}`, { cache: "no-store" });
const tekrar = (await tekrarY.json()) as { ok?: boolean; mesajlar?: unknown[] };
k(tekrar.ok === true && (tekrar.mesajlar?.length ?? 0) >= 2,
  "kayıt kalıcı (geçici bellek değil)", `${tekrar.mesajlar?.length ?? 0} mesaj`);

console.log(`\nbırakılan test oturumu : ${oturum} (ziyaretçi ${ZIYARETCI})`);
console.log(`\n================ TOPLAM HATA: ${hata} ================`);
process.exit(hata > 0 ? 1 : 0);
