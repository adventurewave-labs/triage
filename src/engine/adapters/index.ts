export type EntityType = "company" | "person" | "investor" | "care_area";
export type SignalType = "regulatory" | "trial" | "funding" | "hire" | "publication" | "crm";

export const SIGNAL_TYPES: SignalType[] = ["regulatory", "trial", "funding", "hire", "publication", "crm"];

export interface SourceAdapter {
  id: string;
  /** Human-readable description of what this adapter yields. */
  describe(): string;
  /**
   * Fetch latest raw signals. Returns normalized rows with REAL source URLs
   * (citable in an IC memo). `since` filters by occurred_at.
   */
  fetchLatest(since: string): Promise<RawSignal[]>;
}

export interface RawSignal {
  id: string;
  type: SignalType;
  source: string;
  source_url: string;
  occurred_at: string;
  text: string;
  /** Company names this signal concerns (resolved on ingest). */
  entity_names: string[];
}

export const SIM_PREFIX = "sim:";

export function isSyntheticId(id: string): boolean {
  return id.startsWith(SIM_PREFIX);
}
