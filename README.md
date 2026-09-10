# Happy Hour Code (VS Code Extension)

Juega tus ROMs de Game Boy Advance desde el sidebar de VS Code, emulado en JavaScript puro dentro del propio panel (vía [`react-gbajs`](https://github.com/macabeus/react-gbajs), que envuelve el emulador GBA.js de Endrift — el mismo autor de mGBA).

## Monorepo

- `/src` — Extensión VS Code (backend)
- `/webview` — App React (frontend), incluye el núcleo del emulador (`react-gbajs`)

## Instalación y build

1. Instala dependencias raíz y frontend:
   ```sh
   npm install
   cd webview && npm install
   ```
2. Compila todo (frontend + extensión):
   ```sh
   npm run build
   ```
3. Ejecuta en VS Code (F5 o "Run Extension")

## Uso

1. Al abrir el panel "Happy Hour Code" por primera vez, se pide instalar el emulador (aceptar una vez).
2. Se pide seleccionar la carpeta donde están tus archivos `.gba`. Queda guardada como carpeta por defecto.
3. Se listan los juegos encontrados; haz clic en uno para jugarlo, embebido en el propio panel.
4. `Esc` pausa/reanuda el juego (pulsar una vez congela, pulsar otra vez continúa). Cerrar u ocultar el panel no pierde el estado (el webview sigue vivo en segundo plano).

### Controles (por defecto, sin configuración)

| Tecla | Botón GBA |
|---|---|
| Flechas | D-pad |
| `X` | A |
| `Z` | B |
| `Enter` | Start |
| `\` | Select |
| `A` | L |
| `S` | R |
| `Esc` | Pausar / reanudar (no es un botón del juego) |

## Desarrollo

- El frontend se construye con Vite y se carga como archivos estáticos dentro del webview.
- El backend usa esbuild para el bundle.
- `react-gbajs` es JavaScript puro (sin WebAssembly ni Web Workers), así que se integra como cualquier dependencia npm normal — sin pasos de build especiales ni requisitos de aislamiento de origen cruzado. (Se evaluó primero `@thenick775/mgba-wasm`, el núcleo real de mGBA compilado a WASM con hilos, pero requiere `SharedArrayBuffer`/`crossOriginIsolated`, algo que los webviews de extensiones de VS Code no exponen — no hay forma de activarlo desde la extensión.)
- Trae su propia BIOS de reemplazo integrada (sin BIOS oficial de Nintendo).

## Estructura

- `/src/extension.ts` — Lógica del sidebar, instalación, carpeta de ROMs y persistencia
- `/src/webviewHtml.ts` — HTML del webview y CSP
- `/webview/src` — React app (InstallGate, LibraryView, PlayerView con `react-gbajs`)

## Notas

- No uses Webpack ni mezcles frontend/backend.
- El icono del sidebar está en `icon.svg`.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [mGBA](https://mgba.io/)

**Enjoy!**
