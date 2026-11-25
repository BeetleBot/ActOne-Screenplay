import { spawnSync } from "node:child_process";
const phase = process.argv[2] || "current";
if (!/^[a-z0-9-]+$/.test(phase)) throw new Error("Use a phase containing lowercase letters, numbers, and hyphens.");
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "tests/performance"], {
  stdio: "inherit",
  env: { ...process.env, DOCUMENT_BENCHMARK: phase },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
