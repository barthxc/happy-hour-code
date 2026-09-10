import React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

const boxStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#1e1e1e",
  color: "#f48771",
  padding: 16,
  fontFamily: "var(--vscode-editor-font-family, monospace)",
  fontSize: 12,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  zIndex: 9999,
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={boxStyle}>
          ⚠️ Error al iniciar Happy Hour Code:{"\n\n"}
          {this.state.error.stack || this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
