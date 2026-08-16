import { interface as dbusInterface, sessionBus } from "dbus-next";
import type { AppStatus } from "./status";

export const DESKTOP_BUS_NAME = "org.prettyzap.Desktop";
export const DESKTOP_OBJECT_PATH = "/org/prettyzap/Desktop";
export const DESKTOP_INTERFACE = "org.prettyzap.Desktop";

export interface DesktopControlCallbacks {
  show(): void;
  hide(): void;
  toggle(): void;
  openSettings(): void;
  setTheme(theme: "whatsapp" | "system" | "toggle"): void;
  toggleNotifications(): void;
  quit(): void;
  getStatus(): AppStatus;
}

class PrettyZapDesktopInterface extends dbusInterface.Interface {
  constructor(private readonly callbacks: DesktopControlCallbacks) {
    super(DESKTOP_INTERFACE);
  }

  Show(): void { this.callbacks.show(); }
  Hide(): void { this.callbacks.hide(); }
  Toggle(): void { this.callbacks.toggle(); }
  OpenSettings(): void { this.callbacks.openSettings(); }
  SetTheme(theme: string): void {
    if (theme === "whatsapp" || theme === "system" || theme === "toggle") {
      this.callbacks.setTheme(theme);
    }
  }
  ToggleTheme(): void { this.callbacks.setTheme("toggle"); }
  ToggleNotifications(): void { this.callbacks.toggleNotifications(); }
  Quit(): void { this.callbacks.quit(); }
  GetStatus(): string { return JSON.stringify(this.callbacks.getStatus()); }
  StatusChanged(status: string): string { return status; }
}

PrettyZapDesktopInterface.configureMembers({
  methods: {
    Show: { inSignature: "", outSignature: "" },
    Hide: { inSignature: "", outSignature: "" },
    Toggle: { inSignature: "", outSignature: "" },
    OpenSettings: { inSignature: "", outSignature: "" },
    SetTheme: { inSignature: "s", outSignature: "" },
    ToggleTheme: { inSignature: "", outSignature: "" },
    ToggleNotifications: { inSignature: "", outSignature: "" },
    Quit: { inSignature: "", outSignature: "" },
    GetStatus: { inSignature: "", outSignature: "s" },
  },
  signals: {
    StatusChanged: { signature: "s" },
  },
});

export interface DesktopControl {
  publish(status: AppStatus): void;
  close(): void;
}

export async function startDesktopControl(
  callbacks: DesktopControlCallbacks,
): Promise<DesktopControl | undefined> {
  try {
    const bus = sessionBus();
    bus.on("error", (error: unknown) => {
      console.warn("PrettyZap D-Bus session bus error", error);
    });
    await bus.requestName(DESKTOP_BUS_NAME, 0);
    const iface = new PrettyZapDesktopInterface(callbacks);
    bus.export(DESKTOP_OBJECT_PATH, iface);
    return {
      publish(status) {
        iface.StatusChanged(JSON.stringify(status));
      },
      close() {
        bus.unexport(DESKTOP_OBJECT_PATH, iface);
        bus.disconnect();
      },
    };
  } catch (error: unknown) {
    console.warn("PrettyZap D-Bus control is unavailable", error);
    return undefined;
  }
}
