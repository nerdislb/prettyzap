import * as fs from "node:fs";
import * as path from "node:path";
import { app } from "electron";

export interface ShellState {
  width: number;
  height: number;
  maximized: boolean;
  drawerCollapsed: boolean;
  whatsappTheme: "whatsapp" | "system";
}

export const DEFAULT_SHELL_STATE: ShellState = {
  width: 1280,
  height: 800,
  maximized: false,
  drawerCollapsed: true,
  whatsappTheme: "whatsapp",
};

const MIN_WIDTH = 720;
const MIN_HEIGHT = 520;
const MAX_DIMENSION = 10_000;

function statePath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(app.getPath("home"), ".config");
  return path.join(configHome, "prettyzap", "shell-state.json");
}

function validDimension(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= MAX_DIMENSION;
}

export function normalizeShellState(value: unknown): ShellState {
  if (!value || typeof value !== "object") return { ...DEFAULT_SHELL_STATE };
  const candidate = value as Partial<ShellState>;
  if (!validDimension(candidate.width, MIN_WIDTH) || !validDimension(candidate.height, MIN_HEIGHT)) {
    return { ...DEFAULT_SHELL_STATE };
  }
  return {
    width: candidate.width,
    height: candidate.height,
    maximized: candidate.maximized === true,
    drawerCollapsed: candidate.drawerCollapsed !== false,
    whatsappTheme: candidate.whatsappTheme === "system" ? "system" : "whatsapp",
  };
}

export function loadShellState(): ShellState {
  try {
    return normalizeShellState(JSON.parse(fs.readFileSync(statePath(), "utf8")));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Unable to load PrettyZap shell state", error);
    }
    return { ...DEFAULT_SHELL_STATE };
  }
}

export function saveShellState(state: ShellState): void {
  const file = statePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, `${JSON.stringify(normalizeShellState(state), null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (error: unknown) {
    console.warn("Unable to save PrettyZap shell state", error);
  }
}
