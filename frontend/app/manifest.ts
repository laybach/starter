import type { MetadataRoute } from "next";

// "Add to Home Screen" launches the app standalone, without browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Starter",
    short_name: "Starter",
    description: "Reference structure for Next.js + FastAPI + Postgres projects.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
