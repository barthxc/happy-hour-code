import React from "react";

const KEYS: Array<[string, string]> = [
  ["↑ ↓ ← →", "D-pad"],
  ["X", "A"],
  ["Z", "B"],
  ["Enter", "Start"],
  ["\\", "Select"],
  ["A", "L"],
  ["S", "R"],
  ["Esc", "Pausar / reanudar"],
];

export default function ControlsLegend() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 6,
        padding: "8px 10px",
        background: "var(--vscode-editorWidget-background)",
        borderTop: "1px solid var(--vscode-sideBar-border)",
      }}>
      {KEYS.map(([key, label]) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            opacity: 0.85,
          }}>
          <kbd
            style={{
              background: "var(--vscode-keybindingLabel-background, #333)",
              color: "var(--vscode-keybindingLabel-foreground, #fff)",
              border: "1px solid var(--vscode-keybindingLabel-border, #555)",
              borderRadius: 3,
              padding: "1px 5px",
              fontFamily: "inherit",
              fontSize: 11,
            }}>
            {key}
          </kbd>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
