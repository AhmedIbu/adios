import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const isSalah = mode === "salah";
  return {
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: isSalah ? "Salah Tracker" : "Adios",
        short_name: isSalah ? "Salah" : "Adios",
        description: isSalah
          ? "Prayer, qada, and reflection tracker."
          : "Personal audio library — upload anywhere, listen anywhere.",
        display: "standalone",
        orientation: "portrait",
        background_color: isSalah ? "#121412" : "#12151a",
        theme_color: isSalah ? "#121412" : "#12151a",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        // App shell only. Audio blobs are handled in IndexedDB, not the SW cache.
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/index.html"
      }
    })
  ]
  };
});
