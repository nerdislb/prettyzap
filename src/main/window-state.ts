export interface WindowVisibilityState {
  isDestroyed(): boolean;
  isMinimized(): boolean;
  isVisible(): boolean;
}

/**
 * Whether the application window is actually presented to the user.
 *
 * Electron can keep a native window alive while it is hidden or minimized.
 * The bar status must describe presentation, not process/window existence.
 */
export function isWindowPresented(
  window: WindowVisibilityState | null | undefined,
): boolean {
  if (!window || window.isDestroyed()) return false;
  return !window.isMinimized() && window.isVisible();
}

/**
 * A toggle sent while starting a new process must open it. A toggle sent to
 * an existing process is allowed to invert the existing native window state.
 */
export function resolveToggleAction(hasExistingInstance: boolean): "show" | "toggle" {
  return hasExistingInstance ? "toggle" : "show";
}
