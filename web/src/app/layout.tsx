import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Piro Gastro — Professional Kitchen Solutions",
  description: "Piro Gastro Center AB — professionell köksutrustning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
