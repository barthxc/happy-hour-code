import React, { type ComponentType, type Context, type ReactNode } from "react";

// react-gbajs es un bundle estilo webpack/CommonJS de 2012-2013 que:
//  1) asigna globales SIN declarar (ej. "ARMCoreArm=function(){...}"), algo que solo
//     funciona en modo "sloppy" — los módulos ES de Vite/Rollup son siempre estrictos,
//     así que no se puede `import` como dependencia npm normal.
//  2) hace un `require("react")` real dentro del propio bundle.
// Por eso se carga como <script> clásico (no type="module"), inyectado dinámicamente
// DESPUÉS de que nuestro propio React ya está disponible, con un `window.require` que
// le devuelve exactamente esa misma instancia de React (para no tener dos copias de
// React en la página, que rompería los hooks).

export type Gba = {
  paused: boolean;
  pause(): void;
  runStable(): void;
};

export type PlayArgs = {
  // A pesar del nombre, react-gbajs espera algo con una propiedad `.buffer`
  // (hace `t.buffer` internamente), es decir un TypedArray como Uint8Array —
  // no un ArrayBuffer crudo.
  newRomBuffer?: Uint8Array;
  restoreState?: unknown;
};

export type GbaContextValue = {
  gba: Gba | undefined;
  play: (args: PlayArgs) => boolean;
  saveState: () => unknown;
};

export type ReactGbaJsProps = {
  scale?: number;
  volume?: number;
  onFpsReported?: (fps: number) => void;
};

type ReactGbajsExports = {
  ReactGbaJs: ComponentType<ReactGbaJsProps>;
  GbaContext: Context<GbaContextValue>;
  GbaProvider: ComponentType<{ children?: ReactNode }>;
};

// Nota: se usa `(window as any)` para require/module/exports a propósito, en vez de
// aumentar la interfaz global Window — esos nombres chocan con los tipos ambient de
// @types/node (Require/Module reales de Node.js), que no aplican aquí: esto es un
// shim mínimo en tiempo de ejecución, no el sistema de módulos real de Node.
const win = window as unknown as {
  require?: (name: string) => unknown;
  module?: { exports: any };
  exports?: any;
  MemoryView?: { new (buffer: ArrayBuffer, offset?: number): unknown; prototype: object };
  SRAMSavedata?: unknown;
};

// El bundle de react-gbajs define y expone globalmente `EEPROMSavedata` y
// `FlashSavedata` (tipos de guardado especiales, con protocolo propio), y también
// `MemoryView` (la clase base de acceso a memoria plano que ambos extienden), pero
// se olvidó de definir `SRAMSavedata` — el tipo de guardado MÁS COMÚN en juegos
// comerciales de GBA — a pesar de que el código SÍ hace `new SRAMSavedata(...)`.
// SRAM no necesita protocolo especial (es memoria plana), así que basta con que sea
// literalmente `MemoryView` con el constructor de tamaño-de-buffer que se usa en el
// resto de tipos de guardado.
function definePolyfills() {
  if (win.SRAMSavedata || !win.MemoryView) return;
  const MemoryView = win.MemoryView;
  function SRAMSavedata(this: unknown, size: number) {
    MemoryView.call(this, new ArrayBuffer(size));
  }
  SRAMSavedata.prototype = Object.create(MemoryView.prototype);
  SRAMSavedata.prototype.constructor = SRAMSavedata;
  win.SRAMSavedata = SRAMSavedata;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar el script: ${src}`));
    document.head.appendChild(script);
  });
}

let cachedPromise: Promise<ReactGbajsExports> | null = null;

export function loadReactGbajs(): Promise<ReactGbajsExports> {
  if (cachedPromise) return cachedPromise;

  cachedPromise = (async () => {
    const vendorUrl = document
      .getElementById("react-gbajs-vendor-url")
      ?.getAttribute("href");
    if (!vendorUrl) {
      throw new Error("Falta la URL del vendor script react-gbajs (link#react-gbajs-vendor-url).");
    }

    win.require = (name: string) => {
      if (name === "react") return React;
      throw new Error(`react-gbajs pidió un módulo no soportado por el shim: ${name}`);
    };
    win.module = { exports: {} };
    win.exports = win.module.exports;

    await loadScript(vendorUrl);
    definePolyfills();

    const exp = win.module?.exports;
    if (!exp || !exp.default || !exp.GbaContext || !exp.GbaProvider) {
      throw new Error("react-gbajs se cargó pero no exportó lo esperado.");
    }
    return {
      ReactGbaJs: exp.default,
      GbaContext: exp.GbaContext,
      GbaProvider: exp.GbaProvider,
    };
  })();

  return cachedPromise;
}
