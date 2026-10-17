import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Fonts load through next/font (self-hosted at build time) and reach Tailwind as CSS variables.
// Pick a pair that fits the project; keep the variable names.
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Starter",
  description: "Reference structure for Next.js + FastAPI + Postgres projects.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Starter" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
