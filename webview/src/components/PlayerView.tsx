import React, { useContext, useEffect, useRef } from "react";
import type { GbaContextValue, ReactGbaJsProps } from "../gbaVendor";

type PendingGame = { fileName: string; data: Uint8Array } | null;

type Props = {
  visible: boolean;
  pendingGame: PendingGame;
  onBack: () => void;
  GbaContext: React.Context<GbaContextValue>;
  ReactGbaJs: React.ComponentType<ReactGbaJsProps>;
};

export default function PlayerView({
  visible,
  pendingGame,
  onBack,
  GbaContext,
  ReactGbaJs,
}: Props) {
  const { gba, play } = useContext(GbaContext);
  const loadedFileRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingGame) return;
    if (loadedFileRef.current === pendingGame.fileName) return;
    loadedFileRef.current = pendingGame.fileName;
    play({ newRomBuffer: pendingGame.data });
  }, [pendingGame, play]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!gba) return;
        if (gba.paused) {
          gba.runStable();
        } else {
          gba.pause();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, gba]);

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
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          {pendingGame?.fileName ?? ""}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
        <ReactGbaJs scale={2} volume={0.5} />
      </div>
    </div>
  );
}
