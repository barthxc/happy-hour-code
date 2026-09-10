// Variable para desactivar mensajes informativos
const mock = false;

import * as vscode from "vscode";
import WebSocket from "ws";
import { getWebviewHtml } from "./webviewHtml";

let ws: WebSocket | null = null;
let webviewPanel: vscode.WebviewView | null = null;
let sidebarVisible = false;

// Contador de mensajes no leídos
let unreadCount = 0;

// Resetea el contador visual (Anti-bug de VS Code)
function resetUnreadCount() {
  unreadCount = 0;
  if (webviewPanel) {
    webviewPanel.title = "Momentum Chat";
    // Forzamos el 0 visual primero para que VS Code reaccione y limpie el globo
    webviewPanel.badge = { value: 0, tooltip: "" };

    setTimeout(() => {
      if (webviewPanel) webviewPanel.badge = undefined;
    }, 100);
  }
}

let chatState: any = {
  room: null,
  username: null,
  messages: [],
  users: [],
};

function connectWebSocket() {
  if (ws) return;

  ws = new WebSocket("wss://momentum-chat-server.onrender.com");

  ws.on("open", () => {
    console.log("[EXT] WebSocket conectado");
    if (chatState.room && chatState.username) {
      ws?.send(
        JSON.stringify({
          type: "join",
          room: chatState.room,
          name: chatState.username,
        }),
      );
    }
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "chat") {
        const messageObj = {
          role: msg.name === chatState.username ? "user" : "bot",
          content: msg.message,
          name: msg.name,
        };
        chatState.messages.push(messageObj);

        // Si el panel NO está visible en pantalla, subimos contador y notificamos
        if (!sidebarVisible) {
          unreadCount++;
          if (webviewPanel) {
            webviewPanel.title = `Momentum Chat (${unreadCount})`;
            webviewPanel.badge = { value: unreadCount, tooltip: "Mensajes no leídos" };
          }
          const sender = msg.name || "Otro";
          vscode.window.showInformationMessage(`${sender}: ${msg.message}`);
        }

        // Enviamos siempre a React en segundo plano
        if (webviewPanel) {
          postToWebview({
            type: "chat",
            name: msg.name,
            message: msg.message,
            role: messageObj.role,
            playSound: !sidebarVisible // 🔔 Solo sonará si el panel estaba oculto
          });
        }
      }
      else if (msg.type === "joined") {
        chatState.room = msg.room;
        chatState.username = msg.name;
        chatState.messages = [];
        resetUnreadCount();
        postToWebview({ type: "joined", room: msg.room, username: msg.name });
      }
      else if (msg.type === "room-users") {
        chatState.users = msg.users;
        postToWebview({ type: "room-users", payload: msg });
      }
      else if (msg.type === "room-closed") {
        chatState.room = null;
        resetUnreadCount();
        postToWebview({ type: "room-closed", payload: msg });
      }
      else if (msg.type === "error") {
        const errorText = msg.message || msg.error || "";
        if (typeof errorText === "string" && errorText.toLowerCase().includes("exist")) {
          chatState.room = null;
          chatState.username = null;
          chatState.messages = [];
          chatState.users = [];
          resetUnreadCount();
        }
        postToWebview({ type: "error", payload: msg });
      }
    } catch (e) {
      console.log("[EXT] Error parseando mensaje WS", e);
    }
  });

  ws.on("close", () => {
    ws = null;
    postToWebview({ type: "ws-closed" });
  });
}

function postToWebview(msg: any) {
  if (webviewPanel) {
    webviewPanel.webview.postMessage(msg);
  }
}

export function activate(context: vscode.ExtensionContext) {
  if (mock) {
    console.log("🔥 ACTIVATE EJECUTADO!");
    vscode.window.showInformationMessage("🔥 Extension activada!");
  }

  const provider = {
    resolveWebviewView(
      webviewView: vscode.WebviewView,
      _context: vscode.WebviewViewResolveContext,
      _token: vscode.CancellationToken,
    ) {
      webviewPanel = webviewView;
      sidebarVisible = webviewView.visible;

      if (sidebarVisible) {
        resetUnreadCount();
      }

      // ✅ MODIFICACIÓN AQUÍ: Al cambiar la visibilidad, ya NO disparamos tryRestoreState()
      // porque React se mantiene vivo de fondo y ya tiene todos los mensajes al día.
      webviewView.onDidChangeVisibility(() => {
        sidebarVisible = webviewView.visible;
        if (sidebarVisible) {
          resetUnreadCount(); // Solo limpiamos el globo rojo de VS Code
        }
      });

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "webview", "dist"),
        ],
      };

      webviewView.webview.html = getWebviewHtml(context, webviewView.webview);
      connectWebSocket();

      webviewView.webview.onDidReceiveMessage((msg) => {
        if (msg.type === "reset") {
          if (ws) {
            ws.close();
            ws = null;
          }
          chatState = { room: null, username: null, messages: [], users: [] };
          resetUnreadCount();
          postToWebview({ type: "reset" });
        }
        // El evento 'ready' ocurre solo en el arranque inicial o recarga total de la extensión
        else if (msg.type === "ready") {
          if (chatState.room && chatState.username) {
            postToWebview({ type: "restoreState", payload: chatState });
          } else {
            postToWebview({ type: "clearStaleState" });
          }
        }
        else if (msg.type === "join" || msg.type === "create") {
          chatState = { room: null, username: null, messages: [], users: [] };
          resetUnreadCount();

          if (!ws || ws.readyState !== 1) {
            connectWebSocket();
            if (ws) {
              ws.once("open", () => {
                ws?.send(JSON.stringify({ type: msg.type, room: msg.room, name: msg.username }));
              });
            }
          } else {
            ws?.send(JSON.stringify({ type: msg.type, room: msg.room, name: msg.username }));
          }
        } else if (msg.type === "chat") {
          if (ws && ws.readyState === 1 && chatState.room) {
            ws.send(JSON.stringify({ type: "chat", message: msg.message }));
          }
        } else if (msg.type === "leave") {
          if (ws) ws.close();
          chatState.room = null;
          chatState.messages = [];
          resetUnreadCount();
        }
        else if (msg.type === "clearBadge") {
          resetUnreadCount();
        }
      });
    },
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "momentumChat.sidebar",
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true // Mantiene React latiendo en segundo plano
        }
      }
    ),
  );
}

export function deactivate() {
  if (ws) ws.close();
}