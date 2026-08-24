import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proje kökünü açıkça belirt — üst dizindeki package-lock.json ile karışmasın
  turbopack: { root: __dirname },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "unninoxeurope.com" },
    ],
  },
};

export default nextConfig;
