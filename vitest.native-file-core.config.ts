import { defineConfig } from "vitest/config";
export default defineConfig({ test: {
  environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.ts"],
  include: ["tests/file-core/native.parity.ts"], maxWorkers: 1,
} });
