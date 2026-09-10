import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "node_modules", "react-gbajs", "dist", "react-gbajs.js");
const destDir = path.join(here, "..", "public", "vendor");

if (!existsSync(src)) {
  console.warn(`[copy-vendor] ${src} not found, skipping (run npm install first)`);
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, path.join(destDir, "react-gbajs.js"));
console.log("[copy-vendor] synced react-gbajs.js into webview/public/vendor");
