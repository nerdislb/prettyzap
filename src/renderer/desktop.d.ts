interface DesktopApi {
  setSidebarWidth(width: number): void;
}

declare global {
  interface Window {
    desktop: DesktopApi;
  }
}

export {};
