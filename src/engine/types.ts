import type { EntityType, SignalType } from "./adapters/index.js";

export type { EntityType, SignalType };

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  data: Record<string, unknown>;
}

export interface Edge {
  id?: number;
  type: string;
  from_id: string;
  to_id: string;
  evidence: string;
  merge_confidence: number;
  provenance: string;
}

export interface SignalRow {
  id: string;
  type: SignalType;
  source: string;
  source_url: string;
  occurred_at: string; // ISO date
  fetched_at: string;
  raw_ref: string;
  text: string;
  simulated: boolean;
}

export interface PackItem {
  id: string;
  kind: "entity" | "signal" | "graph";
  text: string;
  source: string;
  occurred_at?: string;
  stale?: boolean;
}

export interface EvidencePack {
  subject_id: string;
  subject_type: EntityType;
  rubric_version: string;
  generated_at: string;
  hash: string;
  items: PackItem[];
}

export interface DimensionScore {
  key: string;
  score: number; // 0-4
  evidence: string[]; // pack item ids — must resolve (citation gate)
  counter_evidence: string[]; // pack item ids
  rationale: string;
}

export interface RedTeamChallenge {
  dimension: string;
  challenge: string;
  evidence: string[];
  sustained: boolean;
}

export interface RedTeamReport {
  challenges: RedTeamChallenge[];
  summary: string;
}

export interface ScoreResult {
  subject_id: string;
  subject_name: string;
  subject_type: EntityType;
  rubric_version: string;
  provider: string;
  run_id: string;
  pack_hash: string;
  total: number; // 0-4 weighted
  confidence: number; // 0-1 derived
  dimensions: DimensionScore[];
  bear_case: string;
  why_now: string[];
  evidence_count: number;
  first_seen: string;
  red_team: RedTeamReport;
}

export interface BriefCard {
  rank: number;
  subject_id: string;
  name: string;
  domain: string;
  score: number;
  confidence: number;
  why_now: string[];
  delta: number | null;
  bear_case: string;
  evidence_count: number;
  first_seen: string;
}

export interface DeclinedCard {
  subject_id: string;
  name: string;
  reason: "insufficient_data" | "below_rank_line";
  detail: string;
}

export interface Briefing {
  run_id: string;
  generated_at: string;
  rubric_version: string;
  provider: string;
  cards: BriefCard[];
  declined: DeclinedCard[];
}

export type OverrideReasonCode =
  | "missing_evidence"
  | "wrong_weight"
  | "stale_data"
  | "entity_error"
  | "model_error"
  | "judgment_differs";
