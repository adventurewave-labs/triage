import type { SourceAdapter, RawSignal } from "./index.js";

interface FdaRecord {
  k_number?: string;
  applicant?: string;
  device_name?: string;
  decision_date?: string;
  decision?: string;
}

const BASE = "https://api.fda.gov/device/510k.json";

/**
 * openFDA 510(k) clearances — device regulatory events. Free, public (PRD §7.1).
 * Signals carry the openFDA URL for click-through provenance.
 */
export class OpenFdaAdapter implements SourceAdapter {
  readonly id = "openfda-510k";

  describe(): string {
    return "Device 510(k) clearances per applicant → regulatory signals (public domain)";
  }

  async fetchLatest(since: string, opts?: { limit?: number }): Promise<RawSignal[]> {
    const params = new URLSearchParams({
      "search": `decision_date:[${since} TO ${new Date().toISOString().slice(0, 10)}]`,
      "limit": String(opts?.limit ?? 40),
      "sort": "decision_date:desc",
    });
    const res = await fetch(`${BASE}?${params.toString()}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`openfda api ${res.status}`);
    const json = (await res.json()) as { results?: FdaRecord[] };
    const out: RawSignal[] = [];
    for (const r of json.results ?? []) {
      const kNumber = r.k_number;
      const applicant = r.applicant;
      const date = r.decision_date;
      if (!kNumber || !applicant || !date) continue;
      out.push({
        id: `fda:${kNumber}`,
        type: "regulatory",
        source: "openFDA 510(k)",
        source_url: `https://accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${kNumber}`,
        occurred_at: date.slice(0, 10),
        text: `510(k) ${r.decision ?? "decision"} for ${applicant}: ${r.device_name ?? "device"} (K${kNumber}).`,
        entity_names: [applicant],
      });
    }
    return out;
  }
}
