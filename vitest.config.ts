import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Engine tests must run offline and deterministically (mock provider only).
    testTimeout: 60_000,
    // Serialized on purpose: every test boots an in-memory Postgres (PGlite
    // WASM). Ten parallel instantiations contend for CPU and flake timeouts —
    // determinism beats wall-clock here (PRD §14: CI green is the claim).
    pool: "threads",
    poolOptions: {
      threads: { singleThread: true, minThreads: 1, maxThreads: 1 },
    },
    fileParallelism: false,
  },
});
