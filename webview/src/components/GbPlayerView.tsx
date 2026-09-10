import React, { useEffect, useRef, useState } from "react";
import { loadGameBoyCore, type GbApi } from "../gbVendor";
import { vscode } from "../vscodeApi";
import type { PendingGame, QuickState } from "../types";
import ControlsLegend from "./ControlsLegend";
import Spinner from "./Spinner";

type Props = {
  visible: boolean;
  pendingGame: PendingGame;
  onBack: () => void;
  quickState: QuickState;
  onQuickStateConsumed: () => void;
  quickStateNotice: string | null;
  onDismissNotice: () => void;
};

// Resolución nativa de GB/GBC (160x144) x2.
const NATIVE_WIDTH = 320;
const NATIVE_HEIGHT = 288;

const KEY_MAP: Record<string, string> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  x: "a",
  X: "a",
  z: "b",
  Z: "b",
  Enter: "start",
  "\\": "select",
};

export default function GbPlayerView({
  visible,
  pendingGame,
  onBack,
  quickState,
  onQuickStateConsumed,
  quickStateNotice,
  onDismissNotice,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<GbApi | null>(null);
  const loadedFileRef = useRef<string | null>(null);
  const manuallyPausedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [cssScale, setCssScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    loadGameBoyCore()
      .then((api) => {
        if (!cancelled) apiRef.current = api;
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  // Cargar el juego pedido (nuevo o el mismo con un guardado rápido pendiente)
  useEffect(() => {
    if (!pendingGame || !canvasRef.current) return;
    const api = apiRef.current;
    if (!api) return;
    const isNewGame = loadedFileRef.current !== pendingGame.fileName;
    const hasQuickState =
      quickState &&
      quickState.fileName === pendingGame.fileName &&
      quickState.source === pendingGame.source;
    if (!isNewGame && !hasQuickState) return;

    loadedFileRef.current = pendingGame.fileName;
    setLoading(true);
    setError(null);
    try {
      api.start(canvasRef.current, pendingGame.data);
      if (hasQuickState) {
        const instance = api.getInstance();
        instance?.returnFromState(quickState!.state);
      }
    } catch (e) {
      setError(String(e));
    }
    if (hasQuickState) onQuickStateConsumed();
    window.setTimeout(() => setLoading(false), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGame, quickState, apiRef.current]);

  // Teclado: pulsar/soltar se traduce directamente a estado del mando (no hay
  // mapeo automático como en react-gbajs, hay que hacerlo a mano aquí).
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        const api = apiRef.current;
        if (!api) return;
        if (api.isPaused()) {
          manuallyPausedRef.current = false;
          api.resume();
        } else {
          manuallyPausedRef.current = true;
          api.pause();
        }
        return;
      }
      const mapped = KEY_MAP[e.key];
      if (mapped) {
        e.preventDefault();
        apiRef.current?.keyDown(mapped);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = KEY_MAP[e.key];
      if (mapped) {
        e.preventDefault();
        apiRef.current?.keyUp(mapped);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [visible]);

  // Congelar automáticamente al ocultar el panel, reanudar al volver (salvo
  // pausa manual con Esc) — mismo criterio que PlayerView (GBA).
  useEffect(() => {
    const onVisibilityChange = () => {
      const api = apiRef.current;
      if (!api) return;
      if (document.hidden) {
        if (!api.isPaused()) api.pause();
      } else if (api.isPaused() && !manuallyPausedRef.current) {
        api.resume();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Reescalado responsive (igual que PlayerView).
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

  const handleQuickSave = () => {
    if (!pendingGame) return;
    const instance = apiRef.current?.getInstance();
    if (!instance) return;
    const stateJson = JSON.stringify(instance.saveState());
    vscode.postMessage({
      type: "saveQuickState",
      fileName: pendingGame.fileName,
      source: pendingGame.source,
      stateJson,
    });
  };

  const handleQuickLoad = () => {
    if (!pendingGame) return;
    vscode.postMessage({
      type: "loadQuickState",
      fileName: pendingGame.fileName,
      source: pendingGame.source,
    });
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
            apiRef.current?.pause();
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
          <canvas
            ref={canvasRef}
            width={NATIVE_WIDTH}
            height={NATIVE_HEIGHT}
            style={{ width: NATIVE_WIDTH, height: NATIVE_HEIGHT, imageRendering: "pixelated" }}
          />
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
          {error && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
                background: "#000",
                color: "#f48771",
                fontSize: 12,
                textAlign: "center",
              }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

      <ControlsLegend includeShoulders={false} />
    </div>
  );
}
