import React, { useContext, useEffect, useRef, useState } from "react";
import type { GbaContextValue, ReactGbaJsProps } from "../gbaVendor";
import { vscode } from "../vscodeApi";
import ControlsLegend from "./ControlsLegend";
import Spinner from "./Spinner";

type PendingGame = { fileName: string; data: Uint8Array } | null;
type QuickState = { fileName: string; state: unknown } | null;

type Props = {
  visible: boolean;
  pendingGame: PendingGame;
  onBack: () => void;
  GbaContext: React.Context<GbaContextValue>;
  ReactGbaJs: React.ComponentType<ReactGbaJsProps>;
  quickState: QuickState;
  onQuickStateConsumed: () => void;
  quickStateNotice: string | null;
  onDismissNotice: () => void;
};

// Resolución nativa del canvas interno de ReactGbaJs con scale=2 (240x160 * 2).
const NATIVE_WIDTH = 480;
const NATIVE_HEIGHT = 320;

export default function PlayerView({
  visible,
  pendingGame,
  onBack,
  GbaContext,
  ReactGbaJs,
  quickState,
  onQuickStateConsumed,
  quickStateNotice,
  onDismissNotice,
}: Props) {
  const { gba, play, saveState } = useContext(GbaContext);
  const loadedFileRef = useRef<string | null>(null);
  const manuallyPausedRef = useRef(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [cssScale, setCssScale] = useState(1);

  // Cargar el juego pedido (nuevo o el mismo con un guardado rápido pendiente)
  useEffect(() => {
    if (!pendingGame) return;
    const isNewGame = loadedFileRef.current !== pendingGame.fileName;
    const hasQuickState = quickState && quickState.fileName === pendingGame.fileName;
    if (!isNewGame && !hasQuickState) return;

    loadedFileRef.current = pendingGame.fileName;
    setLoading(true);
    play({
      newRomBuffer: pendingGame.data,
      restoreState: hasQuickState ? quickState!.state : undefined,
    });
    if (hasQuickState) onQuickStateConsumed();
  }, [pendingGame, quickState, play, onQuickStateConsumed]);

  // Reescalado responsive: el canvas interno tiene tamaño fijo, así que se
  // reescala visualmente por CSS para llenar el contenedor disponible.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      setCssScale(Math.min(width / NATIVE_WIDTH, height / NATIVE_HEIGHT));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Esc pausa/reanuda manualmente.
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!gba) return;
        if (gba.paused) {
          manuallyPausedRef.current = false;
          gba.runStable();
        } else {
          manuallyPausedRef.current = true;
          gba.pause();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, gba]);

  // Congelar automáticamente cuando el panel deja de estar visible (cambio de
  // vista en la barra de actividad, etc.) y reanudar al volver — salvo que la
  // pausa la hayas puesto tú mismo con Esc, en cuyo caso se respeta.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!gba) return;
      if (document.hidden) {
        if (!gba.paused) {
          gba.pause();
        }
      } else if (gba.paused && !manuallyPausedRef.current) {
        gba.runStable();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [gba]);

  const handleQuickSave = () => {
    if (!pendingGame) return;
    // Se serializa a JSON aquí (y no se manda el objeto tal cual) porque
    // saveState() incluye referencias a funciones en algún punto de su
    // estructura (audio/video), y postMessage usa structured clone, que no
    // puede transportar funciones — JSON.stringify las descarta sin más.
    const stateJson = JSON.stringify(saveState());
    vscode.postMessage({ type: "saveQuickState", fileName: pendingGame.fileName, stateJson });
  };

  const handleQuickLoad = () => {
    if (!pendingGame) return;
    vscode.postMessage({ type: "loadQuickState", fileName: pendingGame.fileName });
  };

  return (
    <div
      style={{
        display: visible ? "flex" : "none",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        boxSizing: "border-box",
        background: "#000",
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 8,
          gap: 8,
          background: "var(--vscode-editorWidget-background)",
          borderBottom: "1px solid var(--vscode-sideBar-border)",
        }}>
        <button
          onClick={() => {
            gba?.pause();
            onBack();
          }}
          style={{
            background: "none",
            color: "var(--vscode-icon-foreground)",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
          }}>
          ← Juegos
        </button>
        <span
          style={{
            fontSize: 12,
            opacity: 0.75,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
          {pendingGame?.fileName ?? ""}
        </span>
        <button
          onClick={handleQuickLoad}
          title="Cargar guardado rápido"
          style={{
            background: "none",
            color: "var(--vscode-icon-foreground)",
            border: "1px solid var(--vscode-sideBar-border)",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            padding: "3px 8px",
          }}>
          📂 Cargar
        </button>
        <button
          onClick={handleQuickSave}
          title="Guardado rápido"
          style={{
            background: "var(--vscode-button-secondaryBackground)",
            color: "var(--vscode-button-secondaryForeground)",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            padding: "3px 8px",
          }}>
          💾 Guardar
        </button>
      </div>

      {quickStateNotice && (
        <div
          onClick={onDismissNotice}
          style={{
            fontSize: 11,
            textAlign: "center",
            padding: 4,
            background: "var(--vscode-editorWidget-background)",
            color: "var(--vscode-foreground)",
            opacity: 0.85,
            cursor: "pointer",
          }}>
          {quickStateNotice}
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
        <div
          style={{
            position: "relative",
            width: NATIVE_WIDTH,
            height: NATIVE_HEIGHT,
            flexShrink: 0,
            transform: `scale(${cssScale || 1})`,
            transformOrigin: "center center",
          }}>
          <ReactGbaJs scale={2} volume={0.5} onFpsReported={() => setLoading(false)} />
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                background: "#000",
                color: "#fff",
              }}>
              <Spinner />
              <span style={{ fontSize: 13 }}>Cargando juego…</span>
            </div>
          )}
        </div>
      </div>

      <ControlsLegend />
    </div>
  );
}
