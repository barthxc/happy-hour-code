import React, { useEffect, useState } from "react";
import { loadReactGbajs } from "./gbaVendor";
import { vscode } from "./vscodeApi";
import type { AppView, ExtensionMessage, GameEntry } from "./types";
import InstallGate from "./components/InstallGate";
import LibraryView from "./components/LibraryView";
import PlayerView from "./components/PlayerView";

type PendingGame = { fileName: string; data: Uint8Array } | null;
type QuickState = { fileName: string; state: unknown } | null;
type GbaVendor = Awaited<ReturnType<typeof loadReactGbajs>>;

export default function App() {
  const [view, setView] = useState<AppView>("loading");
  const [emulatorInstalled, setEmulatorInstalled] = useState(false);
  const [romsFolder, setRomsFolder] = useState<string | undefined>(undefined);
  const [games, setGames] = useState<GameEntry[]>([]);
  const [pendingGame, setPendingGame] = useState<PendingGame>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gbaVendor, setGbaVendor] = useState<GbaVendor | null>(null);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [quickState, setQuickState] = useState<QuickState>(null);
  const [quickStateNotice, setQuickStateNotice] = useState<string | null>(null);
  const [loadingGame, setLoadingGame] = useState<string | null>(null);

  // Recordar qué se estaba jugando para relanzarlo si el webview se recrea por completo
  // (recarga de ventana / reinicio de VS Code). El ocultar/mostrar el panel NO pasa por
  // aquí: retainContextWhenHidden mantiene vivo el webview y el núcleo del emulador.
  const restoredRef = React.useRef(false);

  useEffect(() => {
    loadReactGbajs().then(setGbaVendor).catch((e) => setVendorError(String(e)));
  }, []);

  useEffect(() => {
    vscode.postMessage({ type: "ready" });
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "init") {
        setEmulatorInstalled(data.emulatorInstalled);
        setRomsFolder(data.romsFolder);
        setGames(data.games.map((fileName) => ({ fileName })));

        if (!data.emulatorInstalled) {
          setView("installGate");
          return;
        }

        const saved = vscode.getState() as
          | { lastGameFileName?: string }
          | undefined;
        if (
          !restoredRef.current &&
          saved?.lastGameFileName &&
          data.games.includes(saved.lastGameFileName)
        ) {
          restoredRef.current = true;
          setView("player");
          setLoadingGame(saved.lastGameFileName);
          vscode.postMessage({ type: "loadGame", fileName: saved.lastGameFileName });
        } else {
          setView("library");
        }
      } else if (data.type === "installed") {
        setEmulatorInstalled(true);
        setView("library");
      } else if (data.type === "romsFolderChosen") {
        setRomsFolder(data.folder);
        setGames(data.games.map((fileName) => ({ fileName })));
        setView("library");
      } else if (data.type === "romsFolderCancelled") {
        // sin cambios
      } else if (data.type === "gamesList") {
        setGames(data.games.map((fileName) => ({ fileName })));
      } else if (data.type === "gameData") {
        setPendingGame({ fileName: data.fileName, data: new Uint8Array(data.data) });
        setView("player");
        setLoadingGame(null);
      } else if (data.type === "error") {
        setErrorMessage(data.message);
        setLoadingGame(null);
      } else if (data.type === "quickStateSaved") {
        setQuickStateNotice("Guardado rápido creado.");
      } else if (data.type === "quickStateData") {
        setQuickState({ fileName: data.fileName, state: JSON.parse(data.stateJson) });
        setQuickStateNotice(null);
      } else if (data.type === "quickStateNotFound") {
        setQuickStateNotice("No hay guardado rápido para este juego todavía.");
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    vscode.setState({ view, lastGameFileName: pendingGame?.fileName });
  }, [view, pendingGame]);

  const handlePlay = (fileName: string) => {
    setErrorMessage(null);
    setLoadingGame(fileName);
    vscode.postMessage({ type: "loadGame", fileName });
  };

  if (vendorError) {
    return (
      <div style={{ padding: 16, color: "#f48771", fontSize: 12, whiteSpace: "pre-wrap" }}>
        ⚠️ No se pudo cargar el emulador:{"\n"}
        {vendorError}
      </div>
    );
  }

  if (!gbaVendor) {
    return null;
  }

  const { GbaProvider, GbaContext, ReactGbaJs } = gbaVendor;

  return (
    <GbaProvider>
      <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
        {view === "installGate" && (
          <InstallGate onAccept={() => vscode.postMessage({ type: "requestInstall" })} />
        )}

        {emulatorInstalled && view === "library" && (
          <LibraryView
            romsFolder={romsFolder}
            games={games}
            onChangeFolder={() => vscode.postMessage({ type: "requestRomsFolder" })}
            onPlay={handlePlay}
            loadingGame={loadingGame}
          />
        )}

        {errorMessage && view === "library" && (
          <div
            style={{
              position: "fixed",
              bottom: 8,
              left: 8,
              right: 8,
              color: "var(--vscode-errorForeground, #f48771)",
              background: "rgba(244, 135, 113, 0.1)",
              border: "1px solid rgba(244, 135, 113, 0.2)",
              borderRadius: 4,
              padding: 8,
              fontSize: 12,
              textAlign: "center",
            }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {emulatorInstalled && (
          <PlayerView
            visible={view === "player"}
            pendingGame={pendingGame}
            onBack={() => setView("library")}
            GbaContext={GbaContext}
            ReactGbaJs={ReactGbaJs}
            quickState={quickState}
            onQuickStateConsumed={() => setQuickState(null)}
            quickStateNotice={quickStateNotice}
            onDismissNotice={() => setQuickStateNotice(null)}
          />
        )}
      </div>
    </GbaProvider>
  );
}
