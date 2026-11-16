import { defineRailway, project, service } from "railway/iac";

// Last resort for a per-service CaC repo. Prefer one .railway file for the
// project and drop this if you later combine services into that file.
export const partial = "triage";

export default defineRailway(() => {
  const triage = service("triage", {
    build: "pnpm install --frozen-lockfile && pnpm typecheck",
    start: "pnpm run deploy:start",
    healthcheck: "/",
    // The port only opens after seed + brief finish (sequential: PGlite is
    // single-process per store), and a cold brief can run ~420 s on shared
    // CPU (scripts/deploy-check.sh budget) — leave headroom past that.
    healthcheckTimeout: 600,
    env: {
      // server.ts binds loopback unless HOST is set; Railway injects PORT
      // but not HOST, so without this the proxy and healthcheck never reach it.
      HOST: "0.0.0.0",
    },
    // builder from CaC: "NIXPACKS"
  });
  return project("triage", {
    resources: [triage],
  });
});
