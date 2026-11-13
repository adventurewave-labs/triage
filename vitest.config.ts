import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Engine tests must run offline and deterministically (mock provider only).
    testTimeout: 30_000,
  },
});
