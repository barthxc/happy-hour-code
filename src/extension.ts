import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWebviewHtml } from "./webviewHtml";

const ONBOARDED_KEY = "happyHourCode.onboarded";
const ROMS_FOLDER_KEY = "happyHourCode.romsFolder";

let webviewPanel: vscode.WebviewView | null = null;

const ROM_EXTENSIONS = [".gba", ".gb", ".gbc"];

type GameSource = "bundled" | "user";

function listGamesIn(folder: string): string[] {
  try {
    return fs
      .readdirSync(folder)
      .filter((f) => ROM_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext)));
  } catch {
    return [];
  }
}

function postToWebview(msg: any) {
  if (webviewPanel) {
    webviewPanel.webview.postMessage(msg);
  }
}

// Todas las partidas guardadas (también las de los juegos incluidos con la
// extensión) viven en la carpeta del usuario, nunca dentro de la propia
// extensión: ese directorio no es un buen sitio para escribir (puede
// reinstalarse/actualizarse y perder los datos).
function quickStatePath(romsFolder: string, source: GameSource, fileName: string): string {
  return path.join(romsFolder, ".happy-hour-code-saves", source, `${fileName}.state.json`);
}

function pickRomsFolder(context: vscode.ExtensionContext, bundledGamesFolder: string) {
  return vscode.window
    .showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Seleccionar carpeta de ROMs",
    })
    .then((uris) => {
      if (!uris || uris.length === 0) {
        postToWebview({ type: "romsFolderCancelled" });
        return;
      }
      const folder = uris[0].fsPath;
      context.globalState.update(ROMS_FOLDER_KEY, folder);
      postToWebview({
        type: "romsFolderChosen",
        folder,
        bundledGames: listGamesIn(bundledGamesFolder),
        userGames: listGamesIn(folder),
      });
    });
}

export function activate(context: vscode.ExtensionContext) {
  const bundledGamesFolder = path.join(context.extensionPath, "games");

  const provider = {
    resolveWebviewView(
      webviewView: vscode.WebviewView,
      _context: vscode.WebviewViewResolveContext,
      _token: vscode.CancellationToken,
    ) {
      webviewPanel = webviewView;

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "webview", "dist"),
        ],
      };

      webviewView.webview.html = getWebviewHtml(context, webviewView.webview);

      webviewView.webview.onDidReceiveMessage((msg) => {
        if (msg.type === "ready") {
          const onboarded = context.globalState.get<boolean>(ONBOARDED_KEY, false);
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          postToWebview({
            type: "init",
            onboarded,
            romsFolder,
            bundledGames: listGamesIn(bundledGamesFolder),
            userGames: romsFolder ? listGamesIn(romsFolder) : [],
          });
        } else if (msg.type === "requestRomsFolder") {
          pickRomsFolder(context, bundledGamesFolder).then(() => {
            // La carpeta es obligatoria: en cuanto se elige una por primera vez,
            // el asistente de bienvenida se da por completado.
            if (context.globalState.get<string>(ROMS_FOLDER_KEY)) {
              context.globalState.update(ONBOARDED_KEY, true);
            }
          });
        } else if (msg.type === "listGames") {
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          postToWebview({
            type: "gamesList",
            bundledGames: listGamesIn(bundledGamesFolder),
            userGames: romsFolder ? listGamesIn(romsFolder) : [],
          });
        } else if (msg.type === "loadGame") {
          const source: GameSource = msg.source === "bundled" ? "bundled" : "user";
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          const baseFolder = source === "bundled" ? bundledGamesFolder : romsFolder;
          if (!baseFolder) {
            postToWebview({ type: "error", message: "No hay carpeta de ROMs configurada." });
            return;
          }
          try {
            const filePath = path.join(baseFolder, msg.fileName);
            const bytes = fs.readFileSync(filePath);
            postToWebview({
              type: "gameData",
              fileName: msg.fileName,
              source,
              data: Array.from(bytes),
            });
          } catch (e) {
            postToWebview({
              type: "error",
              message: `No se pudo leer el juego: ${msg.fileName}`,
            });
          }
        } else if (msg.type === "saveQuickState") {
          const source: GameSource = msg.source === "bundled" ? "bundled" : "user";
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          if (!romsFolder) {
            postToWebview({ type: "error", message: "No hay carpeta de ROMs configurada." });
            return;
          }
          try {
            const statePath = quickStatePath(romsFolder, source, msg.fileName);
            fs.mkdirSync(path.dirname(statePath), { recursive: true });
            fs.writeFileSync(statePath, msg.stateJson);
            postToWebview({ type: "quickStateSaved", fileName: msg.fileName, source });
          } catch (e) {
            postToWebview({
              type: "error",
              message: `No se pudo guardar el estado: ${msg.fileName}`,
            });
          }
        } else if (msg.type === "loadQuickState") {
          const source: GameSource = msg.source === "bundled" ? "bundled" : "user";
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          if (!romsFolder) {
            postToWebview({ type: "error", message: "No hay carpeta de ROMs configurada." });
            return;
          }
          const statePath = quickStatePath(romsFolder, source, msg.fileName);
          if (!fs.existsSync(statePath)) {
            postToWebview({ type: "quickStateNotFound", fileName: msg.fileName, source });
            return;
          }
          try {
            const stateJson = fs.readFileSync(statePath, "utf-8");
            postToWebview({ type: "quickStateData", fileName: msg.fileName, source, stateJson });
          } catch (e) {
            postToWebview({
              type: "error",
              message: `No se pudo cargar el estado: ${msg.fileName}`,
            });
          }
        }
      });
    },
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "happyHourCode.sidebar",
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true, // Mantiene el emulador corriendo en segundo plano
        },
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("happy-hour-code.changeRomsFolder", () => {
      pickRomsFolder(context, bundledGamesFolder);
    }),
  );
}

export function deactivate() {}
