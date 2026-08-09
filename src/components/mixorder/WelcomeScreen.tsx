import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  MoveUpRight,
  BotMessageSquare,
  FolderSearch,
  Wand2,
  Blocks,
  ChevronRight,
  ClipboardPaste,
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "./Logo";
import { MotionButton } from "./motion-primitives";
import { useWorkspace } from "@/lib/workspace-context";
import { isNativePlatform, pickFolderNative } from "@/lib/folder-import";
import {
  clearPendingPaste,
  getPendingPaste,
  setPendingPaste,
} from "@/lib/analysis/pending-paste";
import { parseExternalAnalysisPaste } from "@/lib/analysis/paste-import";

/**
 * WelcomeScreen — native Android-style home for MixOrder.
 *
 * Structure (TempoKey-inspired):
 *   1. Logo + brand
 *   2. Short description of what MixOrder does (with DiscDJ robot highlight)
 *   3. Primary "select folder" button
 *   4. Recent library card — one tap reopens the existing library instantly
 *   5. Small 3-step "How it works" workflow
 *
 * No header, no marketing hero, no gradient text.
 */
export function WelcomeScreen() {
  const {
    openProject,
    openImportedProject,
    recentLibraries,
    reopenLibrary,
  } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [native, setNative] = useState(false);
  const [picking, setPicking] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOn, setPasteOn] = useState(false);
  const [pasteText, setPasteText] = useState("");

  useEffect(() => {
    setNative(isNativePlatform());
    const pending = getPendingPaste();
    if (pending) {
      setPasteOn(true);
      setPasteText(pending);
    }
  }, []);

  const pastedBlocks = pasteText.trim()
    ? parseExternalAnalysisPaste(pasteText).blocks.length
    : 0;

  const syncPaste = (value: string) => {
    setPasteText(value);
    if (value.trim()) setPendingPaste(value);
    else clearPendingPaste();
  };


  const handlePick = async () => {
    setError(null);
    if (!native) {
      inputRef.current?.click();
      return;
    }
    try {
      setPicking(true);
      const project = await pickFolderNative();
      if (project) openImportedProject(project);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/cancel/i.test(msg)) setError("Import impossible : " + msg);
    } finally {
      setPicking(false);
    }
  };

  const handleReopenRecent = async (fingerprint: string) => {
    setError(null);
    setReopening(true);
    try {
      const ok = reopenLibrary(fingerprint);
      if (!ok) {
        // Web fallback — no persistent file handle available.
        await handlePick();
      }
    } finally {
      setReopening(false);
    }
  };

  const mostRecent = recentLibraries[0] ?? null;

  return (
    <div className="min-h-[100dvh] bg-background">
      <div
        className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 3rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
            <Logo size={120} className="animate-fade-up" />
          </div>

          <h1 className="mt-6 font-display text-[26px] font-bold leading-tight tracking-tight text-foreground">
            Organisez votre bibliothèque
            <br />
            en un dossier.
          </h1>

          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
            Sélectionnez un dossier contenant votre musique — MixOrder analyse
            automatiquement les BPM, tonalités et notation Camelot, détecte les
            doublons et prépare vos mixes harmoniques.
          </p>

          <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground/80">
            100% local · hors connexion · zéro cloud.
          </p>
        </div>

        {/* Primary action */}
        <MotionButton
          onClick={handlePick}
          disabled={picking}
          whileHover={{ y: -3, scale: 1.015, boxShadow: "0 20px 40px -12px rgba(93,214,44,0.45)" }}
          whileTap={{ scale: 0.97 }}
          className="group relative mt-8 inline-flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
        >
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
          />
          {picking ? (
            <Loader2 className="relative h-[18px] w-[18px] animate-spin" />
          ) : (
            <FolderSearch className="relative h-[18px] w-[18px]" strokeWidth={2.25} />
          )}
          <span className="relative">Sélectionner un dossier à analyser</span>
        </MotionButton>

        {!native && (
          <input
            ref={inputRef}
            type="file"
            multiple
            // @ts-expect-error non-standard
            webkitdirectory=""
            directory=""
            accept="audio/*"
            className="hidden"
            onChange={(e) => e.target.files && openProject(e.target.files)}
          />
        )}
        {error && (
          <p className="mt-3 text-center text-[12px] text-destructive">{error}</p>
        )}

        {/* Recent library — one-tap reopen */}
        {mostRecent && (
          <button
            onClick={() => handleReopenRecent(mostRecent.fingerprint)}
            disabled={reopening}
            className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong active:scale-[0.99] disabled:opacity-60"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Blocks className="h-6 w-6" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                Bibliothèque récente
              </p>
              <p className="mt-0.5 truncate font-display text-[15px] font-semibold text-foreground">
                {mostRecent.name}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {mostRecent.trackCount} morceau{mostRecent.trackCount > 1 ? "x" : ""}
              </p>
            </div>
            {reopening ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <MoveUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        )}

        {/* DiscDJ Robot — exclusive highlight (single subtle line, not a big card) */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <BotMessageSquare className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground">
              Robot DiscDJ — exclusif
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
              Lit directement les BPM affichés par DiscDJ pour utiliser
              exactement les mêmes valeurs — aucune réanalyse.
            </p>
          </div>
        </div>

        {/* How it works — 3 connected steps */}
        <section className="mt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Comment ça fonctionne
          </h2>
          <ol className="mt-4 space-y-3">
            <WorkflowStep
              index={1}
              icon={FolderSearch}
              title="Sélection du dossier"
              desc="Choisissez le dossier contenant votre musique."
            />
            <WorkflowConnector />
            <WorkflowStep
              index={2}
              icon={Wand2}
              title="Analyse automatique"
              desc="BPM, tonalités, notation Camelot — robot DiscDJ si activé."
            />
            <WorkflowConnector />
            <WorkflowStep
              index={3}
              icon={Blocks}
              title="Organisation du mix"
              desc="AutoMix, Harmonic Mixing, doublons et renommage intelligent."
            />
          </ol>
        </section>

        <div className="mt-auto pt-10 text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground/50">
          MixOrder · v0.1
        </div>
      </div>
    </div>
  );
}

/* -------------------- Workflow bits -------------------- */

function WorkflowStep({
  index,
  icon: Icon,
  title,
  desc,
}: {
  index: number;
  icon: typeof FolderSearch;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3.5">
      <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-primary ring-1 ring-inset ring-border">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {index}
        </span>
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
      <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground/40" />
    </li>
  );
}

function WorkflowConnector() {
  return (
    <li aria-hidden className="ml-[22px] flex h-4 items-center">
      <span className="block h-full w-px bg-gradient-to-b from-primary/50 via-primary/25 to-primary/50" />
    </li>
  );
}
