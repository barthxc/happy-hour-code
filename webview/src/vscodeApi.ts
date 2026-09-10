export type VsCodeApi = {
  postMessage: (msg: unknown) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
};

export const vscode: VsCodeApi = window.acquireVsCodeApi
  ? window.acquireVsCodeApi()
  : { postMessage: () => {}, setState: () => {}, getState: () => undefined };
