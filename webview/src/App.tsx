import React, { useEffect, useState } from "react";
import { loadReactGbajs } from "./gbaVendor";
import { vscode } from "./vscodeApi";
import {
  getConsoleType,
  type AppView,
  type ExtensionMessage,
  type GameEntry,
  type GameSource,
  type PendingGame,
  type QuickState,
} from "./types";
import OnboardingWizard from "./components/OnboardingWizard";
import LibraryView from "./components/LibraryView";
import PlayerView from "./components/PlayerView";
import GbPlayerView from "./components/GbPlayerView";

type GbaVendor = Awaited<ReturnType<typeof loadReactGbajs>>;

function mergeGames(bundledGames: string[], userGames: string[]): GameEntry[] {
  return [
    ...bundledGames.map((fileName): GameEntry => ({ fileName, source: "bundled" })),
    ...userGames.map((fileName): GameEntry => ({ fileName, source: "user" })),
  ];
}

export default function App() {
  const [view, setView] = useState<AppView>("loading");
  const [onboarded, setOnboarded] = useState(false);
  const [romsFolder, setRomsFolder] = useState<string | undefined>(undefined);
  const [pickingFolder, setPickingFolder] = useState(false);
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
        setOnboarded(data.onboarded);
        setRomsFolder(data.romsFolder);
        setGames(mergeGames(data.bundledGames, data.userGames));

        if (!data.onboarded || !data.romsFolder) {
          setView("wizard");
          return;
        }

        const saved = vscode.getState() as
          | { lastGameFileName?: string; lastGameSource?: GameSource }
          | undefined;
        const allFileNames = [...data.bundledGames, ...data.userGames];
        if (
          !restoredRef.current &&
          saved?.lastGameFileName &&
          saved.lastGameSource &&
          allFileNames.includes(saved.lastGameFileName)
        ) {
          restoredRef.current = true;
          setView("player");
          setLoadingGame(saved.lastGameFileName);
          vscode.postMessage({
            type: "loadGame",
            fileName: saved.lastGameFileName,
            source: saved.lastGameSource,
          });
        } else {
          setView("library");
        }
      } else if (data.type === "romsFolderChosen") {
        setRomsFolder(data.folder);
        setGames(mergeGames(data.bundledGames, data.userGames));
        setPickingFolder(false);
        setOnboarded(true);
        setView("library");
      } else if (data.type === "romsFolderCancelled") {
        setPickingFolder(false);
      } else if (data.type === "gamesList") {
        setGames(mergeGames(data.bundledGames, data.userGames));
      } else if (data.type === "gameData") {
        setPendingGame({ fileName: data.fileName, source: data.source, data: new Uint8Array(data.data) });
        setView("player");
        setLoadingGame(null);
      } else if (data.type === "error") {
        setErrorMessage(data.message);
        setLoadingGame(null);
      } else if (data.type === "quickStateSaved") {
        setQuickStateNotice("Guardado rápido creado.");
      } else if (data.type === "quickStateData") {
        setQuickState({ fileName: data.fileName, source: data.source, state: JSON.parse(data.stateJson) });
        setQuickStateNotice(null);
      } else if (data.type === "quickStateNotFound") {
        setQuickStateNotice("No hay guardado rápido para este juego todavía.");
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    vscode.setState({
      view,
      lastGameFileName: pendingGame?.fileName,
      lastGameSource: pendingGame?.source,
    });
  }, [view, pendingGame]);

  const handlePlay = (fileName: string, source: GameSource) => {
    setErrorMessage(null);
    setLoadingGame(fileName);
    vscode.postMessage({ type: "loadGame", fileName, source });
  };

  const handlePickFolder = () => {
    setPickingFolder(true);
    vscode.postMessage({ type: "requestRomsFolder" });
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
  const activeConsoleType = pendingGame ? getConsoleType(pendingGame.fileName) : null;
  const bundledGamesCount = games.filter((g) => g.source === "bundled").length;

  return (
    <GbaProvider>
      <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
        {view === "wizard" && (
          <OnboardingWizard
            bundledGamesCount={bundledGamesCount}
            onPickFolder={handlePickFolder}
            pickingFolder={pickingFolder}
          />
        )}

        {onboarded && romsFolder && view === "library" && (
          <LibraryView
            romsFolder={romsFolder}
            games={games}
            onChangeFolder={handlePickFolder}
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

        {onboarded && romsFolder && activeConsoleType === "gba" && (
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

        {onboarded && romsFolder && activeConsoleType === "gb" && (
          <GbPlayerView
            visible={view === "player"}
            pendingGame={pendingGame}
            onBack={() => setView("library")}
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
