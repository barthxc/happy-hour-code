# Momentum Chat (VS Code Extension)

## Monorepo

- `/src` — Extensión VS Code (backend)
- `/webview` — App React (frontend)

## Instalación y build

1. Instala dependencias raíz y frontend:
   ```sh
   npm install
   cd webview && npm install
   ```
2. Compila el frontend:
   ```sh
   npm run build
   # desde /webview
   ```
3. Compila la extensión:
   ```sh
   cd ..
   npm run compile
   ```
4. Ejecuta en VS Code (F5 o "Run Extension")

## Desarrollo

- El frontend se construye con Vite y se carga como archivos estáticos.
- El backend usa esbuild para bundle.
- El estado del chat se persiste en frontend y backend (no se pierde al cerrar el sidebar).

## Estructura

- `/src/webviewProvider.ts` — Lógica del sidebar y persistencia
- `/src/webviewHtml.ts` — HTML del webview
- `/webview/src` — React app

## Notas

- No uses Webpack ni mezcles frontend/backend.
- El icono del sidebar está en `icon.png` (puedes reemplazarlo).

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

- Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
- Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
- Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
