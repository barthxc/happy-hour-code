# Happy Hour Code Webview (Frontend)

## Scripts principales

- `npm install` — Instala dependencias
- `npm run dev` — Modo desarrollo (Vite)
- `npm run build` — Compila a `/dist` para ser usado por la extensión

## Estructura

- `src/` — Código fuente React (InstallGate, LibraryView, PlayerView con `react-gbajs`)
- `dist/` — Build final (cargado por la extensión)

## Notas

- No uses el dev server en VS Code, solo archivos estáticos (`dist`).
- El estado de la UI se persiste usando `acquireVsCodeApi()` y se sincroniza con la extensión.
- `react-gbajs` es JavaScript puro (sin WASM/Workers), así que no necesita ningún paso de build especial.
