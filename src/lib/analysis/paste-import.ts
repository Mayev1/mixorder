/**
 * External BPM + key import.
 *
 * Parses text copied from an online music-analysis table. The site may
 * flatten the table into a VERTICAL list when copied, e.g.:
 *
 *   File NameKeyAlt KeyBPM
 *   01 - Track.mp3
 *   A major
 *   11B
 *   81
 *   ...
 *
 * Horizontal (tab separated) rows are supported too. Matching with the
 * local library is STRICTLY positional — no fuzzy matching, no name
 * normalisation, no reordering.
 */

export interface ParsedAnalysisBlock {
  /** Raw name line as pasted (kept verbatim, never normalised). */
  pastedName: string;
  /** Normalised musical key, e.g. "A", "G#m". */
  musicalKey: string | null;
  /** Raw key text as pasted, e.g. "G♯ minor". */
  rawKey: string;
  /** Camelot code when provided, e.g. "11B". */
  camelot: string | null;
  bpm: number | null;
  /** Human readable problem when the block can't be applied. */
  error: string | null;
}

export interface ParseResult {
  blocks: ParsedAnalysisBlock[];
  /** Blocks with a valid name + key + bpm. */
  validCount: number;
}

const HEADER_RE = /^file\s*name/i;

function isBpmToken(s: string): boolean {
  const m = /^(\d{2,3})(?:[.,]\d+)?$/.exec(s);
  if (!m) return false;
  const n = Number(m[1]);
  return n >= 40 && n <= 240;
}

function isCamelotToken(s: string): boolean {
  return /^(1[0-2]|[1-9])\s*[ABab]$/.test(s.trim());
}

const KEY_RE =
  /^([A-Ga-g])\s*([#♯b♭]?)\s*(major|maj|minor|min|m|M)?$/;

function isKeyToken(s: string): boolean {
  return KEY_RE.test(s.trim());
}

/** "G♯ minor" → "G#m", "A major" → "A". */
export function normalizeKey(raw: string): string | null {
  const m = KEY_RE.exec(raw.trim());
  if (!m) return null;
  const root = m[1].toUpperCase();
  const acc = m[2] === "♯" ? "#" : m[2] === "♭" ? "b" : m[2] ?? "";
  const q = (m[3] ?? "").toLowerCase();
  const minor = q === "minor" || q === "min" || q === "m";
  return `${root}${acc}${minor ? "m" : ""}`;
}

function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (HEADER_RE.test(line)) continue;
    const parts = line.includes("\t")
      ? line.split("\t")
      : /\s{2,}/.test(line) && !isKeyToken(line)
        ? line.split(/\s{2,}/)
        : [line];
    for (const p of parts) {
      const t = p.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

export function parseExternalAnalysisPaste(text: string): ParseResult {
  const tokens = tokenize(text);
  const blocks: ParsedAnalysisBlock[] = [];

  let current: ParsedAnalysisBlock | null = null;

  const push = () => {
    if (!current) return;
    if (!current.musicalKey && !current.rawKey) {
      current.error = "Tonalité manquante";
    } else if (current.bpm == null) {
      current.error = "BPM manquant ou hors plage (40–240)";
    } else if (!current.musicalKey) {
      current.error = `Tonalité non reconnue : « ${current.rawKey} »`;
    }
    blocks.push(current);
    current = null;
  };

  for (const tok of tokens) {
    if (!current) {
      current = {
        pastedName: tok,
        musicalKey: null,
        rawKey: "",
        camelot: null,
        bpm: null,
        error: null,
      };
      continue;
    }

    if (isBpmToken(tok)) {
      current.bpm = Math.round(Number(tok.replace(",", ".")));
      push();
      continue;
    }
    if (isCamelotToken(tok) && !current.camelot) {
      current.camelot = tok.replace(/\s+/g, "").toUpperCase();
      continue;
    }
    if (isKeyToken(tok) && !current.rawKey) {
      current.rawKey = tok;
      current.musicalKey = normalizeKey(tok);
      continue;
    }
    // Unexpected token before a BPM → previous block is incomplete.
    push();
    current = {
      pastedName: tok,
      musicalKey: null,
      rawKey: "",
      camelot: null,
      bpm: null,
      error: null,
    };
  }
  push();

  return {
    blocks,
    validCount: blocks.filter((b) => !b.error).length,
  };
}
