// GameBoy-Online (Grant Galitz, MIT-equivalente) — núcleo puro JS para Game Boy /
// Game Boy Color. A diferencia de react-gbajs (webpack/CJS empaquetado), estos
// archivos son scripts clásicos "use strict" sueltos que declaran funciones globales
// (GameBoyCore, start, pause, GameBoyKeyDown, ...) — se cargan tal cual, sin necesitar
// ningún shim de module/require. Solo hace falta stubear un puñado de funciones de
// persistencia (cout/findValue/setValue/deleteValue) que GameBoyIO.js espera del
// demo original (localStorage), ya que nuestro guardado rápido llama directamente a
// gameboy.saveState()/returnFromState(), igual que con el núcleo de GBA.

export type GbInstance = {
  stopEmulator: number;
  saveState(): unknown;
  returnFromState(state: unknown): void;
};

type GbWindow = {
  cout?: (message: string, level: number) => void;
  findValue?: (key: string) => unknown;
  setValue?: (key: string, value: unknown) => void;
  deleteValue?: (key: string) => void;
  settings?: unknown[];
  gameboy?: GbInstance | null;
  start?: (canvas: HTMLCanvasElement, rom: string) => void;
  run?: () => void;
  pause?: () => void;
  GameBoyKeyDown?: (key: string) => void;
  GameBoyKeyUp?: (key: string) => void;
  GameBoyEmulatorInitialized?: () => boolean;
};

const win = window as unknown as GbWindow;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar el script: ${src}`));
    document.head.appendChild(script);
  });
}

function vendorUrl(elementId: string): string {
  const url = document.getElementById(elementId)?.getAttribute("href");
  if (!url) {
    throw new Error(`Falta la URL del vendor script (link#${elementId}).`);
  }
  return url;
}

export type GbApi = {
  start: (canvas: HTMLCanvasElement, romBytes: Uint8Array) => void;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
  keyDown: (key: string) => void;
  keyUp: (key: string) => void;
  getInstance: () => GbInstance | null | undefined;
};

let cachedPromise: Promise<GbApi> | null = null;

export function loadGameBoyCore(): Promise<GbApi> {
  if (cachedPromise) return cachedPromise;

  cachedPromise = (async () => {
    // Stubs mínimos: GameBoyIO.js los usa para guardar SRAM/estado en localStorage
    // en el demo original. Nosotros llevamos nuestro propio guardado rápido llamando
    // a gameboy.saveState()/returnFromState() directamente, así que basta con que
    // existan y no rompan nada (findValue -> null = "no hay guardado previo").
    win.cout = (message, level) => {
      if (level >= 2) console.error("[GameBoyCore]", message);
    };
    win.findValue = () => null;
    win.setValue = () => {};
    win.deleteValue = () => {};

    await loadScript(vendorUrl("gb-resampler-url"));
    await loadScript(vendorUrl("gb-xaudioserver-url"));
    await loadScript(vendorUrl("gb-core-url"));
    await loadScript(vendorUrl("gb-io-url"));

    if (!win.start || !win.pause || !win.GameBoyKeyDown || !win.GameBoyKeyUp) {
      throw new Error("GameBoyCore se cargó pero no expuso la API esperada.");
    }

    return {
      start(canvas: HTMLCanvasElement, romBytes: Uint8Array) {
        // GameBoyCore espera el ROM como "binary string" (un char = un byte),
        // formato clásico pre-typed-arrays.
        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < romBytes.length; i += chunkSize) {
          binary += String.fromCharCode(...romBytes.subarray(i, i + chunkSize));
        }
        win.start!(canvas, binary);
      },
      pause() {
        win.pause!();
      },
      resume() {
        win.run!();
      },
      isPaused() {
        // Mismo criterio que GameBoyEmulatorPlaying() en GameBoyIO.js, invertido.
        return !win.gameboy || (win.gameboy.stopEmulator & 2) !== 0;
      },
      keyDown(key: string) {
        win.GameBoyKeyDown!(key);
      },
      keyUp(key: string) {
        win.GameBoyKeyUp!(key);
      },
      getInstance() {
        return win.gameboy;
      },
    };
  })();

  return cachedPromise;
}
