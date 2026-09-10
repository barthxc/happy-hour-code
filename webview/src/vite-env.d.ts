/// <reference types="vite/client" />

declare interface Window {
  acquireVsCodeApi?: () => {
    postMessage: (msg: any) => void;
    setState: (state: any) => void;
    getState: () => any;
  };
}
