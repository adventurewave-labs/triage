import { describe, expect, it, afterEach } from "vitest";
import { ClinicalTrialsAdapter } from "../src/engine/adapters/clinicaltrials.js";
import { OpenFdaAdapter } from "../src/engine/adapters/openfda.js";

const ctFixture = {
  studies: [
    {
      protocolSection: {
        identificationModule: { nctId: "NCT12345678", briefTitle: "Study of Remote Monitoring" },
        statusModule: { studyFirstPostDateStruct: { date: "2026-10-20" } },
        sponsorCollaboratorsModule: { leadSponsor: { name: "Example Health Inc" } },
        conditionsModule: { conditions: ["Heart Failure"] },
        designModule: { phases: ["PHASE2"] },
      },
    },
  ],
};

const fdaFixture = {
  results: [
    {
      k_number: "K123456",
      applicant: "Example Devices LLC",
      device_name: "Remote Cardiac Monitor",
      decision_date: "2026-10-14",
      decision: "Substantially Equivalent",
    },
  ],
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("source adapters (fixture-tested; live fetch is opt-in)", () => {
  it("clinicaltrials adapter normalizes registry rows into citable signals", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(ctFixture), { status: 200 })) as typeof fetch;
    const adapter = new ClinicalTrialsAdapter();
    const signals = await adapter.fetchLatest("2026-06-01");
    expect(signals.length).toBe(1);
    const s = signals[0]!;
    expect(s.id).toBe("nct:NCT12345678");
    expect(s.type).toBe("trial");
    expect(s.entity_names).toEqual(["Example Health Inc"]);
    expect(s.source_url).toContain("clinicaltrials.gov/study/NCT12345678");
  });

  it("openfda adapter normalizes 510(k) rows into citable signals", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(fdaFixture), { status: 200 })) as typeof fetch;
    const adapter = new OpenFdaAdapter();
    const signals = await adapter.fetchLatest("2026-06-01");
    expect(signals.length).toBe(1);
    const s = signals[0]!;
    expect(s.type).toBe("regulatory");
    expect(s.source_url).toContain("K123456");
    expect(s.text).toContain("Example Devices LLC");
  });
});
