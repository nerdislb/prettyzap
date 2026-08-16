import * as fs from "node:fs";
import * as path from "node:path";
import { app } from "electron";

export type PrettyZapTheme = "whatsapp" | "system";

export interface AppStatus {
  pid: number;
  running: boolean;
  theme: PrettyZapTheme;
  visible: boolean;
  ready: boolean;
  unreadCount: number;
  notificationsEnabled: boolean;
  revision: number;
}

function statusPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(app.getPath("home"), ".config");
  return path.join(configHome, "prettyzap", "status.json");
}

/**
 * Write the app's current status for the Omarchy/Quickshell widget to read.
 * The shell widget watches this file (via FileView) for the theme, and treats
 * a missing file or a dead pid as "not running". Kept 0600 because it is
 * machine-local state, not a secret — matching shell-state.json.
 */
let revision = 0;

export function writeStatus(
  theme: PrettyZapTheme,
  visible: boolean,
  ready: boolean,
  unreadCount: number,
  notificationsEnabled: boolean,
): AppStatus {
  const file = statusPath();
  const status: AppStatus = {
    pid: process.pid,
    running: true,
    theme,
    visible,
    ready,
    unreadCount,
    notificationsEnabled,
    revision: ++revision,
  };
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporaryFile = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(status, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.renameSync(temporaryFile, file);
  } catch (error: unknown) {
    console.warn("Unable to write PrettyZap status", error);
  }
  return status;
}

/**
 * Remove the status file. Called on quit so the widget does not see a stale
 * "running" entry; a crash is handled by the widget's pid check.
 */
export function clearStatus(): void {
  try {
    fs.rmSync(statusPath(), { force: true });
  } catch (error: unknown) {
    console.warn("Unable to remove PrettyZap status", error);
  }
}
