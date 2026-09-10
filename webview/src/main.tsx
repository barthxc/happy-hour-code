import React from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./ErrorBoundary";

function showFatalError(err: unknown) {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  const el = document.createElement("pre");
  el.style.cssText =
    "position:fixed;inset:0;background:#1e1e1e;color:#f48771;padding:16px;" +
    "white-space:pre-wrap;overflow:auto;font-size:12px;z-index:9999;margin:0;" +
    "box-sizing:border-box;";
  el.textContent = "⚠️ Error al iniciar Happy Hour Code:\n\n" + message;
  document.body.appendChild(el);
}

// Red de seguridad para errores que ocurren fuera del árbol de React
// (por ejemplo, si una dependencia falla al importarse), para no quedarnos
// con una pantalla en negro sin ninguna pista de qué pasó.
window.addEventListener("error", (e) => showFatalError(e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => showFatalError(e.reason));

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  // Import dinámico: si App (o algo que importa, como react-gbajs) falla al
  // cargarse, cae en el .catch() en vez de tirar abajo todo el módulo de arranque.
  import("./App")
    .then(({ default: App }) => {
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      );
    })
    .catch(showFatalError);
}
