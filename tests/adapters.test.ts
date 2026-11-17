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

  it("clinicaltrials adapter issues a v2-shaped request (no v1-era params)", async () => {
    const captured: string[] = [];
    globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
      captured.push(String(args[0]));
      return new Response(JSON.stringify(ctFixture), { status: 200 });
    }) as typeof fetch;
    const adapter = new ClinicalTrialsAdapter();
    await adapter.fetchLatest("2026-06-01");
    const url = new URL(captured[0]!);
    expect(url.origin + url.pathname).toBe("https://clinicaltrials.gov/api/v2/studies");
    expect(url.searchParams.get("filter.advanced")).toBe(
      "AREA[StudyFirstPostDate]RANGE[2026-06-01,MAX]",
    );
    expect(url.searchParams.get("sort")).toBe("StudyFirstPostDate:desc");
    expect(url.searchParams.get("fields")).toContain(
      "protocolSection.statusModule.studyFirstPostDateStruct.date",
    );
    expect(url.searchParams.has("sortField")).toBe(false);
    expect(url.searchParams.has("sortType")).toBe(false);
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
