import { defineConfig } from "vitest/config";

// Opt-in oracle capture. Normal tests never rewrite committed Rust fixtures.
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts", "./tests/file-core/capture.ts"],
    include: [
      "src/utils/actone.test.ts", "src/utils/canvasAssets.test.ts",
      "src/utils/fountainExport.test.ts", "src/utils/fadeinParser.test.ts",
      "src/utils/perScriptSettings.test.ts", "src/utils/savedFile.test.ts",
    ],
    maxWorkers: 1,
  },
});
