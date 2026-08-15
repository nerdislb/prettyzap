import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";

type IconName = "tab" | "pin" | "workspace" | "search" | "storage" | "settings";

interface IconProps {
  name: IconName;
}

interface SidebarItem {
  label: string;
  detail?: string;
  tone?: "blue" | "violet" | "green" | "amber";
}

const pinnedChats: SidebarItem[] = [
  { label: "Design review", detail: "Yesterday", tone: "blue" },
  { label: "Launch notes", detail: "Mon", tone: "violet" },
  { label: "Family", detail: "Sun", tone: "green" },
];

const workspaces: SidebarItem[] = [
  { label: "Personal", tone: "blue" },
  { label: "Work", tone: "amber" },
];

const bottomNavigation: Array<{ label: string; icon: IconName }> = [
  { label: "Search", icon: "search" },
  { label: "Storage", icon: "storage" },
  { label: "Settings", icon: "settings" },
];

function Icon({ name }: IconProps): ReactElement {
  const paths: Record<IconName, string> = {
    tab: "M3.5 4.5h9v7h-9z M5.5 2.5h5",
    pin: "m8 2 3 3-1.5 1.5v3L8 11l-1.5-1.5v-3L5 5z M8 11v3",
    workspace: "M3 4.5h10v8H3z M5 2.5h6v2H5z",
    search: "m11.5 11.5-2.8-2.8 M6.8 10.2a3.4 3.4 0 1 1 0-6.8 3.4 3.4 0 0 1 0 6.8Z",
    storage: "M3 4.5h10v8H3z M5 7h6 M5 9.5h3",
    settings: "M8 2.5v2 M8 11.5v2 M2.5 8h2 M11.5 8h2 M4.1 4.1l1.4 1.4 M10.5 10.5l1.4 1.4 M11.9 4.1l-1.4 1.4 M5.5 10.5l-1.4 1.4 M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
  };

  return (
    <svg aria-hidden="true" className="sidebar-icon" viewBox="0 0 16 16">
      <path d={paths[name]} />
    </svg>
  );
}

function SidebarItemRow({ item, pinned = false }: { item: SidebarItem; pinned?: boolean }): ReactElement {
  return (
    <button className={`sidebar-row${pinned ? " pinned-row" : ""}`} type="button">
      <span className={`item-mark ${item.tone ?? "blue"}`} aria-hidden="true" />
      <span className="row-copy">
        <span className="row-label">{item.label}</span>
        {item.detail ? <span className="row-detail">{item.detail}</span> : null}
      </span>
      {pinned ? <span className="row-more" aria-hidden="true">···</span> : null}
    </button>
  );
}

export function App(): ReactElement {
  const resizing = useRef(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const stopResizing = (): void => {
      resizing.current = false;
      setIsResizing(false);
    };

    const resizeSidebar = (event: PointerEvent): void => {
      if (resizing.current) {
        window.desktop.setSidebarWidth(event.clientX);
      }
    };

    window.addEventListener("pointermove", resizeSidebar);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      window.removeEventListener("pointermove", resizeSidebar);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, []);

  const startResizing = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    resizing.current = true;
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <aside className={`sidebar${isResizing ? " is-resizing" : ""}`}>
      <header className="sidebar-header">
        <div>
          <span className="eyebrow">PJZAP</span>
          <h1>Workspace</h1>
        </div>
        <button className="header-action" type="button" aria-label="Open command menu">⌘K</button>
      </header>

      <div className="sidebar-content">
        <section className="sidebar-section" aria-labelledby="tabs-heading">
          <div className="section-heading" id="tabs-heading">
            <span>TABS</span>
            <span className="section-count">1</span>
          </div>
          <button className="sidebar-row active-row" type="button">
            <span className="row-icon-wrap active-icon"><Icon name="tab" /></span>
            <span className="row-copy">
              <span className="row-label">Daniel</span>
              <span className="row-detail">Current tab</span>
            </span>
            <span className="active-indicator" aria-hidden="true" />
          </button>
        </section>

        <section className="sidebar-section" aria-labelledby="pinned-heading">
          <div className="section-heading" id="pinned-heading">
            <span>PINNED</span>
            <Icon name="pin" />
          </div>
          <div className="section-list">
            {pinnedChats.map((item) => <SidebarItemRow key={item.label} item={item} pinned />)}
          </div>
        </section>

        <section className="sidebar-section" aria-labelledby="workspaces-heading">
          <div className="section-heading" id="workspaces-heading">
            <span>WORKSPACES</span>
            <Icon name="workspace" />
          </div>
          <div className="section-list workspace-list">
            {workspaces.map((item) => <SidebarItemRow key={item.label} item={item} />)}
          </div>
        </section>
      </div>

      <nav className="sidebar-bottom" aria-label="Application settings">
        {bottomNavigation.map((item) => (
          <button className="bottom-row" key={item.label} type="button">
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div
        className="sidebar-resize-grip"
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        onPointerDown={startResizing}
        onDoubleClick={() => window.desktop.setSidebarWidth(320)}
      />
    </aside>
  );
}
