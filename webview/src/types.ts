export type AppView = "loading" | "wizard" | "library" | "player";

export type ConsoleType = "gba" | "gb";

export type GameSource = "bundled" | "user";

export type GameEntry = {
  fileName: string;
  source: GameSource;
};

export function getConsoleType(fileName: string): ConsoleType {
  return fileName.toLowerCase().endsWith(".gba") ? "gba" : "gb";
}

export type PendingGame = { fileName: string; source: GameSource; data: Uint8Array } | null;
export type QuickState = { fileName: string; source: GameSource; state: unknown } | null;

export type ExtensionMessage =
  | {
      type: "init";
      onboarded: boolean;
      romsFolder?: string;
      bundledGames: string[];
      userGames: string[];
    }
  | { type: "romsFolderChosen"; folder: string; bundledGames: string[]; userGames: string[] }
  | { type: "romsFolderCancelled" }
  | { type: "gamesList"; bundledGames: string[]; userGames: string[] }
  | { type: "gameData"; fileName: string; source: GameSource; data: number[] }
  | { type: "quickStateSaved"; fileName: string; source: GameSource }
  | { type: "quickStateData"; fileName: string; source: GameSource; stateJson: string }
  | { type: "quickStateNotFound"; fileName: string; source: GameSource }
  | { type: "error"; message: string };
