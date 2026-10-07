// Builds the self-hosted (PHP server) download: bunx vite build -c selfhost/vite.selfhost.mjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const shim = here("./client/supabase-shim.ts");

export default defineConfig({
  root: here("./client"),
  base: "./",
  plugins: [react(), tailwind()],
  define: { "import.meta.env.VITE_SELFHOST": JSON.stringify("1") },
  resolve: {
    alias: [
      { find: "@/integrations/supabase/client", replacement: shim },
      { find: "@/integrations/lovable", replacement: shim },
      { find: "@", replacement: here("../src") },
    ],
  },
  build: {
    outDir: here("../dist-selfhost"), emptyOutDir: true, cssCodeSplit: false, modulePreload: false,
    rollupOptions: { input: here("./client/main.tsx"), output: { format: "iife", inlineDynamicImports: true, entryFileNames: "assets/game.js", assetFileNames: "assets/[name][extname]" } },
  },
});
