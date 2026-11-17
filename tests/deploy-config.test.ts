import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// .railway/railway.ts is not typechecked (no railway/iac dependency), so its
// load-bearing settings are asserted as text here.
const config = readFileSync(new URL("../.railway/railway.ts", import.meta.url), "utf8");
const deployCheck = readFileSync(new URL("../scripts/deploy-check.sh", import.meta.url), "utf8");

describe("railway service config", () => {
  it("exposes the server: sets HOST=0.0.0.0 (server.ts binds loopback otherwise)", () => {
    expect(config).toMatch(/env:\s*\{[^}]*\bHOST:\s*"0\.0\.0\.0"/s);
  });

  it("gives the healthcheck more time than a cold seed + brief needs", () => {
    const timeout = Number(config.match(/healthcheckTimeout:\s*(\d+)/)?.[1]);
    const briefBudget = Number(deployCheck.match(/--max-time (\d+) -X POST "\$BASE\/run\/brief"/)?.[1]);
    expect(briefBudget).toBeGreaterThan(0);
    expect(timeout).toBeGreaterThan(briefBudget);
  });
});
