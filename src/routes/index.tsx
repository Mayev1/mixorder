import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace-context";
import { LibraryViewProvider } from "@/lib/library/view-context";
import { SetBuilderProvider } from "@/lib/setbuilder/context";
import { PlayerProvider } from "@/lib/player/player-context";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { WelcomeScreen } from "@/components/mixorder/WelcomeScreen";
import { Workspace } from "@/components/mixorder/Workspace";
import { ExternalAnalysisImport } from "@/components/mixorder/ExternalAnalysisImport";
import { clearPendingPaste, getPendingPaste } from "@/lib/analysis/pending-paste";

export const Route = createFileRoute("/")({
  component: Index,
});

function AppShell() {
  const { project } = useWorkspace();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (project) setPending(getPendingPaste());
  }, [project?.name, project?.tracks.length]);

  if (!project) return <WelcomeScreen />;
  return (
    <>
      <Workspace />
      {pending && (
        <ExternalAnalysisImport
          initialText={pending}
          onClose={() => {
            clearPendingPaste();
            setPending(null);
          }}
        />
      )}
    </>
  );
}

function Index() {
  return (
    <WorkspaceProvider>
      <LibraryViewProvider>
        <SetBuilderProvider>
          <PlayerProvider>
            <SettingsProvider>
              <AppShell />
            </SettingsProvider>
          </PlayerProvider>
        </SetBuilderProvider>
      </LibraryViewProvider>
    </WorkspaceProvider>
  );
}


