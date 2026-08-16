import QtQuick
import Quickshell
import qs.Commons
import qs.Ui

// PrettyZap's native Quattro bar widget. The bar owns the trigger and the
// PopupCard owns the detail surface; there is no second panel/window here.
BarWidget {
  id: root
  moduleName: "prettyletto.prettyzap"
  property bool popupOpen: false
  readonly property color foreground: bar ? bar.foreground : Color.foreground

  function open() { popupOpen = true }
  function close() { popupOpen = false }
  function toggle() { popupOpen = !popupOpen }
  function statusText() {
    if (!data.installed) return "Not installed"
    if (data.running && !data.ready) return "Starting…"
    if (data.appVisible) return "Open · " + themeLabel()
    if (data.running) return "Hidden · " + themeLabel()
    return "Closed"
  }
  function themeLabel() {
    return data.theme === "system" ? "System theme" : "WhatsApp theme"
  }
  function toggleApp() { data.toggle() }
  function handleBarClick(buttonCode) {
    console.warn("PRETTYZAP_CLICK", buttonCode)
    if (buttonCode === Qt.RightButton) root.toggle()
    else if (buttonCode === Qt.MiddleButton) data.openSettings()
    else data.toggle()
  }
  // Quattro's bar host and keyboard panel dispatch module clicks through this
  // contract. The app owns the authoritative visibility decision; the status
  // file is only a presentation hint for this widget.
  function triggerPress(buttonCode) { handleBarClick(buttonCode) }
  Data { id: data }

  Component.onCompleted: {
    console.warn("PRETTYZAP_WIDGET_READY", moduleName)
    data.launchCommand = String(setting("launchCommand", "uwsm-app -- prettyzap"))
  }

  // This follows Quattro's documented third-party bar-widget pattern: the
  // entry point is a BarWidget with explicit geometry and a plain MouseArea.
  implicitWidth: Style.bar.statusSlot
  implicitHeight: barSize

  Text {
    anchors.centerIn: parent
    text: "\uf075"
    color: root.foreground
    font.family: root.bar ? root.bar.fontFamily : Style.font.family
    font.pixelSize: Style.bar.iconFont
    horizontalAlignment: Text.AlignHCenter
    verticalAlignment: Text.AlignVCenter
  }

  MouseArea {
    anchors.fill: parent
    acceptedButtons: Qt.LeftButton | Qt.RightButton | Qt.MiddleButton
    cursorShape: Qt.PointingHandCursor
    onClicked: function(mouse) { root.handleBarClick(mouse.button) }
  }

  PopupCard {
    id: popup
    anchorItem: root
    bar: root.bar
    owner: root
    open: root.popupOpen
    contentWidth: popup.fittedContentWidth(Style.space(280))
    contentHeight: popup.fittedContentHeight(contentColumn.implicitHeight)

    Column {
      id: contentColumn
      width: parent.width
      spacing: Style.space(10)

      Row {
        width: parent.width
        spacing: Style.space(10)

        Text {
          width: Style.space(36)
          height: Style.space(36)
          text: "\uf075"
          color: root.foreground
          font.family: root.bar.fontFamily
          font.pixelSize: Style.font.title
          horizontalAlignment: Text.AlignHCenter
          verticalAlignment: Text.AlignVCenter
        }

        Column {
          anchors.verticalCenter: parent.verticalCenter
          spacing: Style.space(2)

          Text {
            text: "PrettyZap"
            color: root.foreground
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.body
            font.bold: true
          }

          Text {
            text: root.statusText()
            color: Qt.darker(root.foreground, 1.45)
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.bodySmall
          }
        }
      }

      PanelSeparator { foreground: root.foreground }

      Button {
        width: parent.width
        text: data.appVisible ? "Hide PrettyZap" : "Open PrettyZap"
        iconText: data.appVisible ? "󰍃" : "󰖰"
        leftAlign: true
        foreground: root.foreground
        onClicked: { root.toggleApp(); root.close() }
      }

      Button {
        width: parent.width
        text: "Settings"
        iconText: "󰒓"
        leftAlign: true
        foreground: root.foreground
        onClicked: { data.openSettings(); root.close() }
      }

      Button {
        width: parent.width
        text: data.theme === "system" ? "Use WhatsApp theme" : "Use System theme"
        iconText: "󰔎"
        leftAlign: true
        foreground: root.foreground
        enabled: data.running
        onClicked: { data.toggleTheme(); root.close() }
      }

      Button {
        width: parent.width
        text: "Quit PrettyZap"
        iconText: "󰗼"
        leftAlign: true
        foreground: root.foreground
        enabled: data.running
        onClicked: { data.quit(); root.close() }
      }
    }
  }
}
