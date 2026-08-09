import { useMemo, useState } from "react";
import { ClipboardPaste, X, CircleCheck, TriangleAlert } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import {
  parseExternalAnalysisPaste,
  type ParsedAnalysisBlock,
} from "@/lib/analysis/paste-import";

/**
 * Panel to import BPM + key data pasted from an external analysis site.
 * Association is strictly positional: block N → track N.
 */
export function ExternalAnalysisImport({
  initialText = "",
  onClose,
}: {
  initialText?: string;
  onClose: () => void;
}) {
  const { project, applyExternalAnalysis } = useWorkspace();
  const [text, setText] = useState(initialText);
  const [done, setDone] = useState<number | null>(null);

  const parsed = useMemo(
    () => (text.trim() ? parseExternalAnalysisPaste(text) : null),
    [text],
  );
  const tracks = project?.tracks ?? [];
  const blocks: ParsedAnalysisBlock[] = parsed?.blocks ?? [];
  const countMismatch = parsed ? blocks.length !== tracks.length : false;
  const invalid = blocks.filter((b) => b.error);
  const canApply =
    !!parsed && blocks.length > 0 && !countMismatch && invalid.length === 0;

  const apply = () => {
    const n = applyExternalAnalysis(
      blocks.map((b) => ({
        bpm: b.bpm,
        musicalKey: b.musicalKey,
        camelot: b.camelot,
      })),
    );
    setDone(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <ClipboardPaste className="h-4 w-4 text-primary" />
        <h2 className="flex-1 font-display text-[15px] font-semibold text-foreground">
          Importer BPM + tonalités
        </h2>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-lg p-2 text-muted-foreground hover:bg-surface"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {done !== null ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CircleCheck className="h-10 w-10 text-success" />
            <p className="text-[15px] font-semibold text-foreground">
              {done} morceau{done > 1 ? "x" : ""} mis à jour
            </p>
            <p className="text-[12.5px] text-muted-foreground">
              Aucun fichier n'a été déplacé ni ré-analysé.
            </p>
            <button
              onClick={onClose}
              className="mt-3 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground"
            >
              Terminer
            </button>
          </div>
        ) : (
          <>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Collez le tableau copié depuis votre site d'analyse. Les données
              sont associées <strong>dans l'ordre exact</strong> des morceaux du
              dossier : le nombre de lignes détectées doit être identique au
              nombre de fichiers ({tracks.length}).
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"File NameKeyAlt KeyBPM\nMorceau 1.mp3\nA major\n11B\n81\n…"}
              className="mt-3 w-full rounded-xl border border-border bg-surface p-3 font-mono text-[12px] text-foreground outline-none focus:border-border-strong"
            />

            {parsed && (
              <div className="mt-3 space-y-2">
                <div
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] ${
                    countMismatch || invalid.length
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-success/40 bg-success/10 text-success"
                  }`}
                >
                  {countMismatch || invalid.length ? (
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {blocks.length} bloc{blocks.length > 1 ? "s" : ""} détecté
                    {blocks.length > 1 ? "s" : ""} · {tracks.length} morceau
                    {tracks.length > 1 ? "x" : ""} dans le dossier
                    {countMismatch
                      ? " — les nombres ne correspondent pas, rien ne sera modifié."
                      : invalid.length
                        ? ` — ${invalid.length} bloc(s) incomplet(s).`
                        : " — prêt à appliquer."}
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                  {blocks.map((b, i) => {
                    const track = tracks[i];
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 border-b border-border/60 px-3 py-2 last:border-b-0"
                      >
                        <span className="w-6 shrink-0 text-[11px] text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] text-foreground">
                            {track ? track.originalName : "— aucun fichier —"}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            collé : {b.pastedName}
                          </p>
                          {b.error && (
                            <p className="text-[11px] text-destructive">{b.error}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[12px] font-semibold text-foreground">
                            {b.musicalKey ?? "—"}
                            {b.camelot ? ` · ${b.camelot}` : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {b.bpm ?? "—"} BPM
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {tracks.length > blocks.length &&
                    tracks.slice(blocks.length).map((t, i) => (
                      <div
                        key={`extra-${i}`}
                        className="flex items-center gap-3 border-b border-border/60 px-3 py-2 last:border-b-0 opacity-60"
                      >
                        <span className="w-6 shrink-0 text-[11px] text-muted-foreground">
                          {blocks.length + i + 1}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                          {t.originalName}
                        </p>
                        <p className="text-[11px] text-destructive">aucune donnée</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {done === null && (
        <footer
          className="border-t border-border px-4 py-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <button
            onClick={apply}
            disabled={!canApply}
            className="h-12 w-full rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-40"
          >
            Confirmer et appliquer
          </button>
        </footer>
      )}
    </div>
  );
}
