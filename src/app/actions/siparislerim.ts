"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MUSTERI_CEREZ, MUSTERI_SURE_MS, oturumUret } from "@/lib/musteri-oturum";
import { erisimDogrula } from "@/lib/makbuz";

/**
 * "Siparişlerim" erişimi
 *
 * Parola yok: müşteri SİPARİŞ NUMARASI + E-POSTA girer. İkisi birbirini
 * doğruluyorsa imzalı oturum çerezi yazılır ve o e-postaya ait tüm
 * siparişler açılır. Yanlış eşleşmede hiçbir bilgi sızdırılmaz.
 */

const DENEMELER = new Map<string, { adet: number; sifirla: number }>();
const PENCERE_MS = 10 * 60 * 1000;
const AZAMI = 12;

function engelliMi(ip: string, simdi: number): boolean {
  const k = DENEMELER.get(ip || "?");
  if (!k) return false;
  if (k.sifirla < simdi) {
    DENEMELER.delete(ip || "?");
    return false;
  }
  return k.adet >= AZAMI;
}

function say(ip: string, simdi: number) {
  const a = ip || "?";
  const k = DENEMELER.get(a);
  if (!k || k.sifirla < simdi) DENEMELER.set(a, { adet: 1, sifirla: simdi + PENCERE_MS });
  else k.adet++;
}

export async function siparisAra(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const numara = String(veri.get("numara") ?? "").trim();
  const eposta = String(veri.get("eposta") ?? "").trim();

  const bas = await headersAl();
  const ip = (bas.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const simdi = Date.now();

  if (engelliMi(ip, simdi)) redirect(`/${dil}/siparislerim?hata=cok`);

  const dogru = await erisimDogrula(numara, eposta);
  if (!dogru) {
    say(ip, simdi);
    redirect(`/${dil}/siparislerim?hata=1`);
  }

  DENEMELER.delete(ip || "?");
  const kutu = await cookies();
  kutu.set(MUSTERI_CEREZ, await oturumUret(dogru, simdi), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(MUSTERI_SURE_MS / 1000),
  });

  redirect(`/${dil}/siparislerim`);
}

export async function siparisCikis(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const kutu = await cookies();
  kutu.delete(MUSTERI_CEREZ);
  redirect(`/${dil}/siparislerim?cikis=1`);
}

/** next/headers dinamik içe aktarımı — server action gövdesini sade tutar. */
async function headersAl() {
  const { headers } = await import("next/headers");
  return headers();
}
