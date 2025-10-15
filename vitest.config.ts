import { defineConfig } from "vitest/config";

// Provide a dummy PostCSS config bypass so vite/next plugins aren't loaded in unit tests.
const emptyPostCss = {
  plugins: [],
};

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  css: { postcss: emptyPostCss as any },
});
