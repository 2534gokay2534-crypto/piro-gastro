import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proje kökünü açıkça belirt — üst dizindeki package-lock.json ile karışmasın
  turbopack: { root: __dirname },

  // Makbuz PDF'i icin yazi tipleri sunucu paketine dahil edilsin (Vercel izleme)
  outputFileTracingIncludes: {
    "/api/makbuz/**": ["./src/assets/fonts/**"],
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "unninoxeurope.com" },
    ],
  },
};

export default nextConfig;
