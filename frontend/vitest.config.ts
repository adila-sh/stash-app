import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify("test"),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@git-diff-view/lowlight": path.resolve(__dirname, "./src/lib/lowlight-shim.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/components/ui/**",
        "src/lib/lowlight-shim.ts",
        "src/main.tsx",
        "src/routeTree.gen.ts",
        "src/router.ts",
        "src/test/**",
        "src/vite-env.d.ts",
      ],
      thresholds: {
        statements: 65,
        branches: 55,
        functions: 65,
        lines: 70,
      },
    },
  },
});
