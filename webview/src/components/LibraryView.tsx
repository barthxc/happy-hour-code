import React from "react";
import { getConsoleType, type GameEntry, type GameSource } from "../types";
import Spinner from "./Spinner";

type Props = {
  romsFolder: string | undefined;
  games: GameEntry[];
  onChangeFolder: () => void;
  onPlay: (fileName: string, source: GameSource) => void;
  loadingGame: string | null;
};

function GameRow({
  game,
  isLoadingThis,
  disabled,
  onPlay,
}: {
  game: GameEntry;
  isLoadingThis: boolean;
  disabled: boolean;
  onPlay: () => void;
}) {
  return (
    <div
      onClick={() => !disabled && !isLoadingThis && onPlay()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
        marginBottom: 4,
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--vscode-list-hoverBackground)";
        }
      }}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
      {isLoadingThis ? (
        <span style={{ width: 18, height: 18, display: "flex" }}>
          <Spinner size={16} />
        </span>
      ) : (
        <span style={{ fontSize: 18 }}>{getConsoleType(game.fileName) === "gba" ? "🕹️" : "🟩"}</span>
      )}
      <span style={{ fontSize: 13 }}>{game.fileName}</span>
      {isLoadingThis && (
        <span style={{ fontSize: 11, opacity: 0.75, marginLeft: "auto" }}>Cargando…</span>
      )}
    </div>
  );
}

export default function LibraryView({
  romsFolder,
  games,
  onChangeFolder,
  onPlay,
  loadingGame,
}: Props) {
  const bundled = games.filter((g) => g.source === "bundled");
  const user = games.filter((g) => g.source === "user");

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
        {bundled.length > 0 && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                opacity: 0.6,
                padding: "6px 8px 4px",
              }}>
              Incluidos con la extensión
            </div>
            {bundled.map((game) => (
              <GameRow
                key={`bundled:${game.fileName}`}
                game={game}
                isLoadingThis={loadingGame === game.fileName}
                disabled={loadingGame !== null && loadingGame !== game.fileName}
                onPlay={() => onPlay(game.fileName, "bundled")}
              />
            ))}
          </>
        )}

        {user.length > 0 && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                opacity: 0.6,
                padding: "10px 8px 4px",
              }}>
              Tu carpeta
            </div>
            {user.map((game) => (
              <GameRow
                key={`user:${game.fileName}`}
                game={game}
                isLoadingThis={loadingGame === game.fileName}
                disabled={loadingGame !== null && loadingGame !== game.fileName}
                onPlay={() => onPlay(game.fileName, "user")}
              />
            ))}
          </>
        )}

        {bundled.length === 0 && user.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, opacity: 0.7, textAlign: "center" }}>
            No se encontraron archivos .gba, .gb ni .gbc en tu carpeta ({romsFolder}).
          </div>
        )}

        {user.length === 0 && bundled.length > 0 && (
          <div
            style={{
              padding: "12px 8px",
              fontSize: 12,
              opacity: 0.65,
              textAlign: "center",
            }}>
            Añade tus propios .gba/.gb/.gbc a tu carpeta de ROMs para verlos aquí.
          </div>
        )}
      </div>
    </div>
  );
}
