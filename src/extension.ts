import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWebviewHtml } from "./webviewHtml";

const EMULATOR_INSTALLED_KEY = "happyHourCode.emulatorInstalled";
const ROMS_FOLDER_KEY = "happyHourCode.romsFolder";

let webviewPanel: vscode.WebviewView | null = null;

function listGames(romsFolder: string | undefined): string[] {
  if (!romsFolder) {
    return [];
  }
  try {
    return fs
      .readdirSync(romsFolder)
      .filter((f) => f.toLowerCase().endsWith(".gba"));
  } catch {
    return [];
  }
}

function postToWebview(msg: any) {
  if (webviewPanel) {
    webviewPanel.webview.postMessage(msg);
  }
}

function quickStatePath(romsFolder: string, fileName: string): string {
  return path.join(romsFolder, ".happy-hour-code-saves", `${fileName}.state.json`);
}

function pickRomsFolder(context: vscode.ExtensionContext) {
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
        games: listGames(folder),
      });
    });
}

export function activate(context: vscode.ExtensionContext) {
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
          const emulatorInstalled = context.globalState.get<boolean>(
            EMULATOR_INSTALLED_KEY,
            false,
          );
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          postToWebview({
            type: "init",
            emulatorInstalled,
            romsFolder,
            games: listGames(romsFolder),
          });
        } else if (msg.type === "requestInstall") {
          context.globalState.update(EMULATOR_INSTALLED_KEY, true);
          postToWebview({ type: "installed" });
        } else if (msg.type === "requestRomsFolder") {
          pickRomsFolder(context);
        } else if (msg.type === "listGames") {
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          postToWebview({ type: "gamesList", games: listGames(romsFolder) });
        } else if (msg.type === "loadGame") {
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          if (!romsFolder) {
            postToWebview({ type: "error", message: "No hay carpeta de ROMs configurada." });
            return;
          }
          try {
            const filePath = path.join(romsFolder, msg.fileName);
            const bytes = fs.readFileSync(filePath);
            postToWebview({
              type: "gameData",
              fileName: msg.fileName,
              data: Array.from(bytes),
            });
          } catch (e) {
            postToWebview({
              type: "error",
              message: `No se pudo leer el juego: ${msg.fileName}`,
            });
          }
        } else if (msg.type === "saveQuickState") {
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          if (!romsFolder) {
            postToWebview({ type: "error", message: "No hay carpeta de ROMs configurada." });
            return;
          }
          try {
            const statePath = quickStatePath(romsFolder, msg.fileName);
            fs.mkdirSync(path.dirname(statePath), { recursive: true });
            fs.writeFileSync(statePath, msg.stateJson);
            postToWebview({ type: "quickStateSaved", fileName: msg.fileName });
          } catch (e) {
            postToWebview({
              type: "error",
              message: `No se pudo guardar el estado: ${msg.fileName}`,
            });
          }
        } else if (msg.type === "loadQuickState") {
          const romsFolder = context.globalState.get<string>(ROMS_FOLDER_KEY);
          if (!romsFolder) {
            postToWebview({ type: "error", message: "No hay carpeta de ROMs configurada." });
            return;
          }
          const statePath = quickStatePath(romsFolder, msg.fileName);
          if (!fs.existsSync(statePath)) {
            postToWebview({ type: "quickStateNotFound", fileName: msg.fileName });
            return;
          }
          try {
            const stateJson = fs.readFileSync(statePath, "utf-8");
            postToWebview({ type: "quickStateData", fileName: msg.fileName, stateJson });
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
      pickRomsFolder(context);
    }),
  );
}

export function deactivate() {}
