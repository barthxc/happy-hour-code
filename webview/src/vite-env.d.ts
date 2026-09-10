/// <reference types="vite/client" />

declare interface Window {
  acquireVsCodeApi?: () => {
    postMessage: (msg: unknown) => void;
    setState: (state: unknown) => void;
    getState: () => unknown;
  };
}
