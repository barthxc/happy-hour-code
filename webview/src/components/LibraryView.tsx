import React from "react";
import type { GameEntry } from "../types";

type Props = {
  romsFolder: string | undefined;
  games: GameEntry[];
  onChangeFolder: () => void;
  onPlay: (fileName: string) => void;
};

export default function LibraryView({ romsFolder, games, onChangeFolder, onPlay }: Props) {
  if (!romsFolder) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
          boxSizing: "border-box",
          padding: 24,
          textAlign: "center",
          background: "var(--vscode-sideBar-background)",
          color: "var(--vscode-sideBar-foreground)",
        }}>
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 20 }}>
          Selecciona la carpeta donde están tus ROMs (.gba).
        </div>
        <button
          onClick={onChangeFolder}
          style={{
            background: "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: 4,
            padding: "10px 20px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}>
          Elegir carpeta de ROMs
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        boxSizing: "border-box",
        background: "var(--vscode-sideBar-background)",
        color: "var(--vscode-sideBar-foreground)",
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 10,
          borderBottom: "1px solid var(--vscode-sideBar-border)",
        }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Tus juegos</span>
        <button
          onClick={onChangeFolder}
          title="Cambiar carpeta de ROMs"
          style={{
            background: "none",
            color: "var(--vscode-icon-foreground)",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            padding: 4,
            opacity: 0.75,
          }}>
          ⚙️
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {games.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, opacity: 0.7, textAlign: "center" }}>
            No se encontraron archivos .gba en esta carpeta.
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.fileName}
              onClick={() => onPlay(game.fileName)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 6,
                cursor: "pointer",
                marginBottom: 4,
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "var(--vscode-list-hoverBackground)")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontSize: 18 }}>🕹️</span>
              <span style={{ fontSize: 13 }}>{game.fileName}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
