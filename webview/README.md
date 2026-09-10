# Momentum Chat Webview (Frontend)

## Scripts principales

- `npm install` — Instala dependencias
- `npm run dev` — Modo desarrollo (Vite)
- `npm run build` — Compila a `/dist` para ser usado por la extensión

## Estructura

- `src/` — Código fuente React
- `dist/` — Build final (cargado por la extensión)

## Notas

- No uses el dev server en VS Code, solo archivos estáticos (`dist`).
- El estado del chat se persiste usando `acquireVsCodeApi()` y se sincroniza con la extensión.
- Puedes escalar la UI y lógica aquí como una app React normal.
