/**
 * Analysis module — shared types.
 *
 * The analysis pipeline is designed to grow: today it exposes a single
 * "manual DiscDJ" source (the user reads the BPM in DiscDJ and types it in).
 * Tomorrow we'll add automated DiscDJ scraping, resume-from-interruption,
 * smart title matching and a local fallback analyser. Every future source
 * must implement the same shape below so the analysis workspace UI stays
 * unchanged.
 */

export type BpmSourceId =
  | "manual-discdj"
  | "discdj-auto"
  | "essentia"
  | "external-paste"
  | "hybrid-key";

export interface BpmSourceDefinition {
  id: BpmSourceId;
  label: string;
  /** Short one-liner shown in the source picker. */
  description: string;
  /** Longer instructions shown at the top of the analysis workspace. */
  instructions: string;
  /** Whether this source is ready to run today. */
  available: boolean;
}

/** One track's persisted analysis payload, keyed by track.path. */
export interface AnalyzedTrackData {
  bpm: number | null;
  musicalKey: string | null;
  updatedAt: number;
  source: BpmSourceId;
  /** True when the last analysis attempt could not confidently read a BPM
   *  and the user should re-run the analysis on this track only. */
  needsReanalysis?: boolean;
  /** User favorite flag — persisted across sessions. */
  favorite?: boolean;
  /** User-facing display name (rename result). Empty = use originalName. */
  displayName?: string | null;
  /** Chronological rename history. */
  renameHistory?: Array<{ from: string; to: string; at: number }>;
  /** First time we saw this track in the library. */
  addedAt?: number;
  /** Last time file metadata (size/name) changed on disk. */
  modifiedAt?: number;
  /**
   * Hybrid key-analysis descriptors (Essentia + LibKeyFinder).
   * When present, `musicalKey` matches `key.key` — we store both for
   * backwards compatibility with existing UI (musicalKey / camelot) and
   * forward compatibility with the extensible descriptors object.
   */
  key?: import("../key-analysis/types").KeyAnalysisData;
}

export interface AnalysisRunMeta {
  sourceId: BpmSourceId;
  startedAt: number;
  /** Path of the last track the user was on — used to resume in place. */
  lastPath: string | null;
}

export interface AnalysisSnapshot {
  v: 1;
  name: string;
  tracks: Record<string, AnalyzedTrackData>;
  currentRun?: AnalysisRunMeta;
  /**
   * Cache of confirmed matches: normalized DiscDJ title → library track path.
   * Populated whenever the robot (or the user via disambiguation) links a
   * DiscDJ reading to a track. Reused on subsequent runs to skip matching
   * work and to bias future ambiguity toward the previously chosen track.
   */
  aliases?: Record<string, string>;
}
