import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
const root = path.resolve(__dirname, "..");
const env = loadEnv("production", root, "VITE_");
export default defineConfig({
  root: __dirname, base: "./", envDir: root,
  plugins: [react(), tailwindcss()],
  resolve: { alias: [
    { find: "@/lib/ai/hint.functions", replacement: path.resolve(__dirname, "hint-stub.ts") },
    { find: "@", replacement: path.resolve(root, "src") },
  ] },
  define: Object.fromEntries(Object.entries(env).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)])),
  build: { outDir: "/tmp/tuhk-static/tuhk", emptyOutDir: true, assetsInlineLimit: 0 },
});
