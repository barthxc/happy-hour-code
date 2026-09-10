import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function getWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
): string {
  const distUri = vscode.Uri.joinPath(context.extensionUri, "webview", "dist");
  const htmlPath = path.join(
    context.extensionPath,
    "webview",
    "dist",
    "index.html",
  );
  let html = fs.readFileSync(htmlPath, "utf-8");

  // Reemplazar rutas de recursos (src/href) por asWebviewUri
  html = html.replace(/(src|href)="(.*?)"/g, (match, attr, src) => {
    // Ignorar rutas absolutas externas
    if (/^(https?:|data:|\/)/.test(src)) return match;
    const uri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, src));
    return `${attr}="${uri}"`;
  });

  // Mejorar CSP para VS Code webview
  const csp = `default-src 'none'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; connect-src *;`;
  html = html.replace(
    /<meta http-equiv="Content-Security-Policy" content="[^"]*"\s*\/>/,
    `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
  );

  return html;
}
