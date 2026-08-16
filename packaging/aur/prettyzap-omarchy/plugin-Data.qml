import QtQuick
import Quickshell
import Quickshell.Io

// PrettyZap status + driver for the Omarchy bar widget.
//
// Watches the app's status file (~/.config/prettyzap/status.json, written by
// the Electron app) for the theme and pid, verifies the pid is alive with
// `kill -0`, and launches the app with fire-and-forget driver flags. The app
// owns single-instance behavior: a second `prettyzap ...` invocation becomes
// a command for the already-running instance.
//
// Credentials never reach QML — this file only reads a theme string, a pid,
// and an on-disk liveness check.
Item {
  id: root
  visible: false

  // Override with the PRETTYZAP_LAUNCH_COMMAND environment variable; the
  // host widget overrides this from its `launchCommand` setting.
  property string launchCommand: Quickshell.env("PRETTYZAP_LAUNCH_COMMAND") || "uwsm-app -- prettyzap"
  property bool running: false
  property bool installed: true
  property string theme: "" // "whatsapp" | "system" | "" while unknown
  property int pid: 0
  property bool appVisible: false
  property bool ready: false
  property int revision: 0
  property var pendingActions: []

  readonly property string home: Quickshell.env("HOME") || ""
  readonly property string statusPath:
    (Quickshell.env("XDG_CONFIG_HOME") || home + "/.config") + "/prettyzap/status.json"

  // The configured launch command, split into argv. The default goes through
  // uwsm-app (the Omarchy-recommended launcher); users on plain Hyprland can
  // set `launchCommand` to `prettyzap`.
  readonly property var launchArgs: {
    var s = String(root.launchCommand || "").trim()
    return s === "" ? ["prettyzap"] : s.split(/\s+/)
  }

  FileView {
    id: statusView
    path: root.statusPath
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.parseStatus(text())
    onLoadFailed: {
      root.theme = ""
      root.pid = 0
    }
  }

  function parseStatus(content) {
    try {
      var parsed = JSON.parse(String(content || ""))
      if (parsed && typeof parsed === "object") {
        var t = String(parsed.theme || "")
        root.theme = (t === "whatsapp" || t === "system") ? t : ""
        var p = parseInt(parsed.pid, 10)
        root.pid = isFinite(p) && p > 0 ? p : 0
        root.appVisible = parsed.visible === true
        root.ready = parsed.ready === true
        var r = parseInt(parsed.revision, 10)
        root.revision = isFinite(r) && r >= 0 ? r : 0
      } else {
        root.theme = ""
        root.pid = 0
        root.appVisible = false
        root.ready = false
        root.revision = 0
      }
    } catch (e) {
      root.theme = ""
      root.pid = 0
      root.appVisible = false
      root.ready = false
      root.revision = 0
    }
  }

  // Crash recovery check. Normal state comes from the atomic status file;
  // this runs infrequently so a crashed process cannot leave a stale icon.
  Process {
    id: liveness
    running: false
    command: ["sh", "-c", "kill -0 " + root.pid + " 2>/dev/null"]
    // The exit code arrives as a signal parameter, not a property.
    onExited: (code) => root.running = code === 0
  }

  function checkRunning() {
    if (root.pid <= 0) {
      root.running = false
      return
    }
    liveness.running = true
  }

  Timer {
    interval: 15000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.checkRunning()
  }

  // The installed check re-runs so installing PrettyZap later flips the
  // widget's hint without a shell reload.
  Timer {
    interval: 15000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.checkInstalled()
  }

  // Installed check: is `prettyzap` on PATH? Lets the widget show a hint
  // instead of silently doing nothing.
  Process {
    id: whichProc
    running: false
    command: ["sh", "-c", "command -v prettyzap >/dev/null 2>&1"]
    onExited: (code) => root.installed = code === 0
  }

  function checkInstalled() { whichProc.running = true }

  readonly property string busName: "org.prettyzap.Desktop"
  readonly property string objectPath: "/org/prettyzap/Desktop"
  readonly property string interfaceName: "org.prettyzap.Desktop"

  Process {
    id: dbusProc
    running: false
    command: []
    onExited: (code) => root.finishAction(code === 0)
  }

  Process {
    id: launcher
    running: false
    command: []

    onExited: root.finishAction(true)
    stderr: StdioCollector {
      waitForEnd: true
      onStreamFinished: if (text.trim() !== "") console.warn("prettyletto.prettyzap", text.trim())
    }
  }

  function fallbackArgs(action) {
    if (action === "launch") return root.launchArgs
    if (action === "show") return root.launchArgs.concat(["--show"])
    if (action === "hide") return root.launchArgs.concat(["--hide"])
    if (action === "toggle") return root.launchArgs.concat(["--toggle"])
    if (action === "settings") return root.launchArgs.concat(["--settings"])
    if (action === "quit") return root.launchArgs.concat(["--quit"])
    if (action === "theme") return root.launchArgs.concat(["--theme=toggle"])
    return root.launchArgs
  }

  function dbusArgs(action) {
    var method = action === "launch" ? "Show"
      : action === "show" ? "Show"
      : action === "hide" ? "Hide"
      : action === "toggle" ? "Toggle"
      : action === "settings" ? "OpenSettings"
      : action === "quit" ? "Quit"
      : action === "theme" ? "ToggleTheme" : "Show"
    var command = ["gdbus", "call", "--session", "--dest", root.busName,
      "--object-path", root.objectPath, "--method", root.interfaceName + "." + method]
    if (action === "set-whatsapp" || action === "set-system")
      command.push(action === "set-system" ? "system" : "whatsapp")
    return command
  }

  function enqueue(action) {
    root.pendingActions = root.pendingActions.concat([action])
    pump()
  }

  function pump() {
    if (dbusProc.running || launcher.running || root.pendingActions.length === 0) return
    var action = root.pendingActions[0]
    if (action === "launch" || root.pid <= 0) {
      launcher.command = root.fallbackArgs(action)
      launcher.running = true
    } else {
      dbusProc.command = root.dbusArgs(action)
      dbusProc.running = true
    }
  }

  function finishAction(dbusSucceeded) {
    var action = root.pendingActions.length > 0 ? root.pendingActions[0] : "launch"
    root.pendingActions = root.pendingActions.slice(1)
    if (!dbusSucceeded && action !== "launch") {
      launcher.command = root.fallbackArgs(action)
      launcher.running = true
      return
    }
    pump()
  }

  function launch() { enqueue("launch") }                      // open / focus
  function toggle() { enqueue("toggle") }                       // hide or show
  function hide() { enqueue("hide") }
  function openSettings() { enqueue("settings") }
  function quit() { enqueue("quit") }
  function setTheme(mode) { enqueue(mode === "system" ? "set-system" : "set-whatsapp") }
  function toggleTheme() {
    enqueue("theme")
  }

  Component.onCompleted: {
    root.checkInstalled()
    root.checkRunning()
  }
}
