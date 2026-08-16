import QtQuick
import QtQuick.Controls
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

// PrettyZap side widget.
//
// A bar icon (PrettyZap logo, or the WhatsApp glyph) that opens the app and a
// small panel with Open/Hide, Settings, and theme toggle. Left-click toggles
// the app, middle-click opens settings, right-click opens the panel.
//
// The widget is purely additive: enabling it puts one entry in the bar's
// layout section and touches nothing else in the user's configuration.
Panel {
  id: root
  moduleName: "prettyletto.prettyzap"
  ipcTarget: "prettyletto.prettyzap"
  manageIpc: false

  readonly property color foreground: bar ? bar.foreground : Color.foreground
  readonly property color urgent: bar ? bar.urgent : Color.urgent
  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family

  readonly property string iconStyle: String(setting("icon", "brand"))
  readonly property bool brandIcon: iconStyle !== "glyph"

  readonly property string statusText: {
    if (!data.installed) return "PrettyZap is not installed"
    if (!data.ready) return "Starting PrettyZap…"
    if (data.appVisible) return "Visible" + (data.theme !== "" ? " · " + themeLabel() : "")
    if (data.running) return "Hidden" + (data.theme !== "" ? " · " + themeLabel() : "")
    return "Not running"
  }

  function themeLabel() {
    return data.theme === "system" ? "System theme" : "WhatsApp theme"
  }

  function alpha(c, a) { return Qt.rgba(c.r, c.g, c.b, a) }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

  Data {
    id: data
  }

  Component.onCompleted: {
    data.launchCommand = String(setting("launchCommand", "uwsm-app -- prettyzap"))
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  onOpenedChanged: if (opened) {
    data.checkRunning()
    data.checkInstalled()
  }

  IpcHandler {
    target: root.ipcTarget
    function open(): void { root.open() }
    function close(): void { root.close() }
    function toggle(): void { root.toggle() }
    function launch(): string { data.launch(); return "ok" }
    function hide(): string { data.hide(); return "ok" }
    function openSettings(): string { data.openSettings(); return "ok" }
    function toggleTheme(): string { data.toggleTheme(); return "ok" }
    function quit(): string { data.quit(); return "ok" }
    function status(): string { return JSON.stringify({ running: data.running, visible: data.appVisible, ready: data.ready, theme: data.theme }) }
  }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "\uf232"
    iconComponent: root.brandIcon ? iconComp : null
    active: data.appVisible
    tooltipText: data.installed
      ? "PrettyZap — " + (data.appVisible ? "click to hide" : "click to open")
      : "PrettyZap is not installed"
    onPressed: function(buttonCode) {
      if (buttonCode === Qt.RightButton) {
        root.open()
      } else if (buttonCode === Qt.MiddleButton) {
        data.openSettings()
      } else {
        if (data.appVisible) data.hide()
        else data.launch()
      }
    }
  }

  // PrettyZap logo as the bar icon (with the WhatsApp glyph as a fallback if
  // the SVG cannot be loaded).
  Component {
    id: iconComp
    Item {
      width: Style.bar.iconCanvas
      height: Style.bar.iconCanvas

      Image {
        id: mark
        anchors.fill: parent
        source: Qt.resolvedUrl("assets/prettyzap.svg")
        sourceSize.width: Style.bar.iconCanvas * 2
        sourceSize.height: Style.bar.iconCanvas * 2
        fillMode: Image.PreserveAspectFit
      }

      Text {
        anchors.centerIn: parent
        visible: mark.status !== Image.Ready
        text: "\uf232"
        color: root.foreground
        font.family: root.fontFamily
        font.pixelSize: Style.bar.iconFont
      }
    }
  }

  KeyboardPanel {
    id: panel
    anchorItem: button
    owner: root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(300))
    contentHeight: panel.fittedContentHeight(column.implicitHeight, Style.space(440))

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent

      onMoveRequested: function(dx, dy) {
        if (dy !== 0)
          panelFlick.contentY = root.clamp(panelFlick.contentY + dy * Style.space(56), 0,
            Math.max(0, panelFlick.contentHeight - panelFlick.height))
      }
      onActivateRequested: {
        if (data.running) data.toggle()
        else data.launch()
        root.close()
      }
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }

      Flickable {
        id: panelFlick
        anchors.fill: parent
        contentWidth: width
        contentHeight: column.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        flickableDirection: Flickable.VerticalFlick
        interactive: contentHeight > height
        ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }

        Column {
          id: column
          width: panelFlick.width
          spacing: Style.space(12)

          PanelHero {
            width: parent.width
            title: "PrettyZap"
            meta: "WhatsApp Web desktop shell"
            foreground: root.foreground
            fontFamily: root.fontFamily

            iconComponent: Component {
              Item {
                width: Style.font.display
                height: Style.font.display

                Image {
                  id: heroMark
                  anchors.fill: parent
                  source: Qt.resolvedUrl("assets/prettyzap.svg")
                  sourceSize.width: Style.font.display * 2
                  sourceSize.height: Style.font.display * 2
                  fillMode: Image.PreserveAspectFit
                }

                Text {
                  anchors.centerIn: parent
                  visible: heroMark.status !== Image.Ready
                  text: "\uf232"
                  color: root.foreground
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.display
                }
              }
            }
          }

          // Status line
          BorderSurface {
            width: parent.width
            implicitHeight: statusTextItem.implicitHeight + Style.space(14)
            color: data.running ? root.alpha(root.foreground, 0.05) : "transparent"
            borderSpec: Border.flat(root.alpha(root.foreground, data.running ? 0.28 : 0.16), 1)
            radius: Style.cornerRadius

            Text {
              id: statusTextItem
              anchors.left: parent.left
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              anchors.leftMargin: Style.space(12)
              anchors.rightMargin: Style.space(12)
              text: root.statusText
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.body
              elide: Text.ElideRight
            }
          }

          PanelSeparator {
            foreground: root.foreground
          }

          Row {
            id: actionRow
            width: parent.width
            spacing: Style.spacing.md

            readonly property real cellWidth: (width - spacing * 3) / 4

            Button {
              width: actionRow.cellWidth
              text: data.appVisible ? "Hide" : "Open"
              bordered: true
              foreground: root.foreground
              fontFamily: root.fontFamily
              fontSize: Style.font.bodySmall
              onClicked: {
                if (data.appVisible) data.hide()
                else data.launch()
                root.close()
              }
            }

            Button {
              width: actionRow.cellWidth
              text: "Settings"
              bordered: true
              foreground: root.foreground
              fontFamily: root.fontFamily
              fontSize: Style.font.bodySmall
              onClicked: {
                data.openSettings()
                root.close()
              }
            }

            Button {
              width: actionRow.cellWidth
              text: "Quit"
              bordered: true
              foreground: root.foreground
              fontFamily: root.fontFamily
              fontSize: Style.font.bodySmall
              onClicked: {
                data.quit()
                root.close()
              }
            }

            Button {
              width: actionRow.cellWidth
              text: "Theme"
              bordered: true
              foreground: root.foreground
              fontFamily: root.fontFamily
              fontSize: Style.font.bodySmall
              enabled: data.running
              onClicked: {
                data.toggleTheme()
                root.close()
              }
            }
          }
        }
      }
    }
  }
}
