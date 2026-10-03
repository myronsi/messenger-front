import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { readFileSync } from "node:fs";

const { version: packageVersion } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string };

// The Capacitor build ("--mode mobile") is served from https://localhost / capacitor://localhost,
// so the API and WebSocket URLs must be absolute and point at the real backend.
const assertAbsoluteMobileUrls = (env: Record<string, string>) => {
  const errors: string[] = [];
  const baseUrl = env.VITE_BASE_URL?.trim();
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    errors.push("VITE_BASE_URL must be an absolute http(s) URL (for example https://chat.example.com/api)");
  }
  const wsUrl = env.VITE_WS_URL?.trim();
  if (wsUrl && !/^wss?:\/\//i.test(wsUrl)) {
    errors.push("VITE_WS_URL must be an absolute ws(s) URL when set (for example wss://chat.example.com/api)");
  }
  if (errors.length) {
    throw new Error(`Invalid mobile build configuration (see .env.mobile.example):\n- ${errors.join("\n- ")}`);
  }
};

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isMobile = mode === "mobile";
  if (isMobile && command === "build") {
    assertAbsoluteMobileUrls(loadEnv(mode, process.cwd(), "VITE_"));
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? packageVersion),
      __APP_COMMIT__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'),
    },
    plugins: [
      react(),
      VitePWA({
        // The native shell already bundles the assets, a service worker would only serve stale builds there.
        disable: isMobile || Boolean(process.env.VITEST),
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
        manifest: {
          id: "/",
          name: "Messenger",
          short_name: "Messenger",
          description: "Messenger",
          lang: "en",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#ffffff",
          theme_color: "#ffffff",
          icons: [
            { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // Only the app shell is precached; API, WebSocket and media requests always go to the network.
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          globIgnores: ["static/**"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api(\/|$)/, /^\/static\//],
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
