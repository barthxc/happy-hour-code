export type AppView = "loading" | "installGate" | "library" | "player";

export type GameEntry = {
  fileName: string;
};

export type ExtensionMessage =
  | { type: "init"; emulatorInstalled: boolean; romsFolder?: string; games: string[] }
  | { type: "installed" }
  | { type: "romsFolderChosen"; folder: string; games: string[] }
  | { type: "romsFolderCancelled" }
  | { type: "gamesList"; games: string[] }
  | { type: "gameData"; fileName: string; data: number[] }
  | { type: "error"; message: string };
