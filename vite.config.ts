import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        // Without these, a new deploy's service worker installs but waits for
        // every open tab of the OLD version to fully close before it takes
        // over — a plain reload (or even closing just this tab) keeps serving
        // the previous build. skipWaiting + clientsClaim make a new deploy
        // take effect on the very next reload instead.
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: "여행 앱",
        short_name: "여행",
        start_url: "/",
        display: "standalone",
        background_color: "#FFFCF7",
        theme_color: "#FF6B00",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
});
