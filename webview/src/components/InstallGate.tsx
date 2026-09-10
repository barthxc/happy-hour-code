import React from "react";

type Props = {
  onAccept: () => void;
};

export default function InstallGate({ onAccept }: Props) {
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
      <div style={{ fontSize: 40, marginBottom: 16 }}>🎮</div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 18,
          marginBottom: 8,
          color: "var(--vscode-sideBarTitle-foreground)",
        }}>
        Happy Hour Code
      </div>
      <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 24, lineHeight: 1.5 }}>
        Hay que instalar el emulador para continuar.
      </div>
      <button
        onClick={onAccept}
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
        Instalar emulador
      </button>
    </div>
  );
}
