import React, { useState } from "react";

type Props = {
  bundledGamesCount: number;
  onPickFolder: () => void;
  pickingFolder: boolean;
};

const TOTAL_STEPS = 3;

export default function OnboardingWizard({
  bundledGamesCount,
  onPickFolder,
  pickingFolder,
}: Props) {
  const [step, setStep] = useState(1);

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
          justifyContent: "center",
          gap: 6,
          padding: "16px 0 0",
        }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                n === step
                  ? "var(--vscode-button-background)"
                  : "var(--vscode-sideBar-border)",
            }}
          />
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
          gap: 16,
        }}>
        {step === 1 && (
          <>
            <div style={{ fontSize: 40 }}>🎮</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>¡Bienvenido a Happy Hour Code!</div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, maxWidth: 280 }}>
              Juega tus ROMs de Game Boy, Game Boy Color y Game Boy Advance directamente
              desde el sidebar de VS Code.
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: 40 }}>🕹️</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Juegos incluidos</div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, maxWidth: 280 }}>
              La extensión ya trae{" "}
              {bundledGamesCount > 0
                ? `${bundledGamesCount} juego${bundledGamesCount === 1 ? "" : "s"} de prueba`
                : "juegos de prueba"}{" "}
              listos para jugar sin tener que buscar ni descargar nada. Siempre aparecerán
              marcados como <strong>incluidos</strong> en tu librería.
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ fontSize: 40 }}>📁</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Elige tu carpeta de ROMs</div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, maxWidth: 280 }}>
              Es un paso obligatorio: ahí podrás añadir tus propios juegos, y ahí mismo
              guardaremos siempre tus partidas rápidas (también las de los juegos
              incluidos), para que no se pierdan al actualizar la extensión.
            </div>
            <button
              onClick={onPickFolder}
              disabled={pickingFolder}
              style={{
                marginTop: 8,
                background: "var(--vscode-button-background)",
                color: "var(--vscode-button-foreground)",
                border: "none",
                borderRadius: 4,
                padding: "10px 20px",
                fontWeight: 600,
                fontSize: 14,
                cursor: pickingFolder ? "not-allowed" : "pointer",
                opacity: pickingFolder ? 0.7 : 1,
              }}>
              {pickingFolder ? "Selecciona una carpeta…" : "Elegir carpeta de ROMs"}
            </button>
          </>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: step > 1 ? "space-between" : "flex-end",
          padding: 16,
          borderTop: "1px solid var(--vscode-sideBar-border)",
        }}>
        {step > 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{
              background: "none",
              color: "var(--vscode-icon-foreground)",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
            }}>
            ← Atrás
          </button>
        )}
        {step < TOTAL_STEPS && (
          <button
            onClick={() => setStep((s) => s + 1)}
            style={{
              background: "var(--vscode-button-secondaryBackground)",
              color: "var(--vscode-button-secondaryForeground)",
              border: "none",
              borderRadius: 4,
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}>
            Siguiente →
          </button>
        )}
      </div>
    </div>
  );
}
