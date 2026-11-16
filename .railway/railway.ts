import { defineRailway, project, service } from "railway/iac";

// Last resort for a per-service CaC repo. Prefer one .railway file for the
// project and drop this if you later combine services into that file.
export const partial = "triage";

export default defineRailway(() => {
  const triage = service("triage", {
    build: "pnpm install --frozen-lockfile && pnpm typecheck",
    start: "pnpm run deploy:start",
    healthcheck: "/",
    healthcheckTimeout: 300,
    // builder from CaC: "NIXPACKS"
  });
  return project("triage", {
    resources: [triage],
  });
});
