import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: false,
    exclude: [...configDefaults.exclude, "ref/**"],
    server: {
      deps: {
        inline: ["@material/material-color-utilities"],
      },
    },
  },
});
