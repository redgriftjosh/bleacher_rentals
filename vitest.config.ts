import { defineConfig } from "vitest/config";
import path from "node:path";

// Provide a dummy PostCSS config bypass so vite/next plugins aren't loaded in unit tests.
const emptyPostCss = {
  plugins: [],
};

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: { postcss: emptyPostCss as any },
});
