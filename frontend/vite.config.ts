import path from "node:path";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wails from "@wailsio/runtime/plugins/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8")) as {
  version: string;
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    wails("./bindings"),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@git-diff-view/lowlight": path.resolve(__dirname, "./src/lib/lowlight-shim.ts"),
    },
  },
  optimizeDeps: {
    include: ["@git-diff-view/react", "@git-diff-view/file"],
  },
});
