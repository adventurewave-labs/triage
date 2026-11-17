import type { SourceAdapter, RawSignal } from "./index.js";

interface CtStudy {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string };
    statusModule?: { studyFirstPostDateStruct?: { date?: string } };
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
    conditionsModule?: { conditions?: string[] };
    designModule?: { phases?: string[] };
  };
}

const BASE = "https://clinicaltrials.gov/api/v2/studies";

/**
 * ClinicalTrials.gov API v2 — trial registrations by sponsor. Free, public
 * domain (PRD §7.1). Signals carry the real NCT URL so every claim is
 * citable in an IC memo.
 */
export class ClinicalTrialsAdapter implements SourceAdapter {
  readonly id = "clinicaltrials";

  describe(): string {
    return "Trial registrations per sponsor → activity signals (public domain)";
  }

  async fetchLatest(since: string, opts?: { area?: string; maxStudies?: number }): Promise<RawSignal[]> {
    const params = new URLSearchParams({
      "filter.advanced": `AREA[StudyFirstPostDate]RANGE[${since},MAX]`,
      "fields": [
        "protocolSection.identificationModule.nctId",
        "protocolSection.identificationModule.briefTitle",
        "protocolSection.sponsorCollaboratorsModule.leadSponsor.name",
        "protocolSection.statusModule.studyFirstPostDateStruct.date",
        "protocolSection.conditionsModule.conditions",
        "protocolSection.designModule.phases",
      ].join(","),
      "pageSize": String(opts?.maxStudies ?? 40),
      "sort": "StudyFirstPostDate:desc",
    });
    if (opts?.area) params.set("query.cond", opts.area);
    const res = await fetch(`${BASE}?${params.toString()}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`clinicaltrials api ${res.status}`);
    const json = (await res.json()) as { studies?: CtStudy[] };
    const out: RawSignal[] = [];
    for (const study of json.studies ?? []) {
      const p = study.protocolSection;
      const nctId = p?.identificationModule?.nctId;
      const sponsor = p?.sponsorCollaboratorsModule?.leadSponsor?.name;
      const date = p?.statusModule?.studyFirstPostDateStruct?.date;
      if (!nctId || !sponsor || !date) continue;
      out.push({
        id: `nct:${nctId}`,
        type: "trial",
        source: "ClinicalTrials.gov",
        source_url: `https://clinicaltrials.gov/study/${nctId}`,
        occurred_at: date.slice(0, 10),
        text: `Trial registered by ${sponsor}: ${p?.identificationModule?.briefTitle ?? "untitled"}${
          p?.designModule?.phases?.length ? ` (${p.designModule.phases.join("/")})` : ""
        }${p?.conditionsModule?.conditions?.length ? ` — ${p.conditionsModule.conditions.join(", ")}` : ""}`,
        entity_names: [sponsor],
      });
    }
    return out;
  }
}
