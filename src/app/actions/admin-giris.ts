"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CEREZ, GIRIS_YOLU, SURE_MS, cerezUret, sifreDogruMu, sifreVar } from "@/lib/admin-kapi";

/**
 * Kaba kuvvet denemelerini yavaşlatan basit sayaç.
 * Sunucu örneği başına çalışır; kalıcı depo gerektirmez.
 */
const DENEMELER = new Map<string, { adet: number; sifirla: number }>();
const PENCERE_MS = 10 * 60 * 1000;
const AZAMI_DENEME = 10;

function anahtar(ip: string) {
  return ip || "bilinmeyen";
}

function engelliMi(ip: string, simdi: number): boolean {
  const k = DENEMELER.get(anahtar(ip));
  if (!k) return false;
  if (k.sifirla < simdi) {
    DENEMELER.delete(anahtar(ip));
    return false;
  }
  return k.adet >= AZAMI_DENEME;
}

function basarisizSay(ip: string, simdi: number) {
  const a = anahtar(ip);
  const k = DENEMELER.get(a);
  if (!k || k.sifirla < simdi) DENEMELER.set(a, { adet: 1, sifirla: simdi + PENCERE_MS });
  else k.adet++;
}

/** Güvenli iç yönlendirme: yalnızca kendi sitemizdeki /{dil}/admin yolları. */
function guvenliDevam(devam: string, dil: string): string {
  if (!/^\/[^/]+\/admin(\/|$)/.test(devam)) return `/${dil}/admin`;
  if (devam.includes("//") || devam.includes("\\")) return `/${dil}/admin`;
  return devam;
}

export async function adminGiris(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const sifre = String(veri.get("sifre") ?? "");
  const devam = String(veri.get("devam") ?? "");

  const kutu = await cookies();
  const { headers } = await import("next/headers");
  const bas = await headers();
  const ip = (bas.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const simdi = Date.now();

  if (!sifreVar()) redirect(`/${dil}/${GIRIS_YOLU}?kurulum=1`);
  if (engelliMi(ip, simdi)) redirect(`/${dil}/${GIRIS_YOLU}?hata=cok`);

  if (!(await sifreDogruMu(sifre))) {
    basarisizSay(ip, simdi);
    redirect(`/${dil}/${GIRIS_YOLU}?hata=1${devam ? `&devam=${encodeURIComponent(devam)}` : ""}`);
  }

  DENEMELER.delete(anahtar(ip));
  kutu.set(CEREZ, await cerezUret(simdi), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SURE_MS / 1000),
  });

  redirect(guvenliDevam(devam, dil));
}

export async function adminCikis(veri: FormData): Promise<void> {
  const dil = String(veri.get("dil") ?? "sv");
  const kutu = await cookies();
  kutu.delete(CEREZ);
  redirect(`/${dil}/${GIRIS_YOLU}?cikis=1`);
}
