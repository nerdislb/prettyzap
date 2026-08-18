import QtQuick
import Quickshell
import Quickshell.Io
import qs.Common
import qs.Widgets

Cell {
    id: root

    property var data: ({})
    property bool loading: false

    readonly property bool installed: data.installed === true
    readonly property bool running: data.running === true
    readonly property bool appVisible: data.visible === true
    readonly property bool ready: data.ready === true
    readonly property int unread: Math.max(0, Number(data.unreadCount || 0))

    shown: true
    label: "ZAP"
    icon: "󰖣"
    text: root.unread > 0 ? (root.unread > 99 ? "99+" : String(root.unread)) : ""
    color: !root.installed ? Theme.red : (root.running ? Theme.green : Theme.text)
    interactive: true
    slotChars: root.unread > 0 ? 3 : 0

    onClicked: root.action("toggle")
    Component.onCompleted: root.refresh()

    function refresh() {
        if (root.loading)
            return;
        root.loading = true;
        statusProc.command = ["bash", Qt.resolvedUrl("prettyzap-status.sh").toString().replace("file://", "")];
        statusProc.running = true;
    }

    function action(name) {
        if (!root.installed)
            return;
        actionProc.command = ["bash", Qt.resolvedUrl("prettyzap-control.sh").toString().replace("file://", ""), name];
        actionProc.running = true;
    }

    Process {
        id: statusProc
        stdout: StdioCollector {
            onStreamFinished: {
                try {
                    root.data = JSON.parse(text);
                } catch (e) {
                    console.warn("nbshell/prettyzap: status unreadable", e);
                    root.data = ({ "installed": false, "running": false });
                }
                root.loading = false;
            }
        }
    }

    Process {
        id: actionProc
        onExited: root.refresh()
    }

    Timer {
        interval: 3000
        running: true
        repeat: true
        onTriggered: root.refresh()
    }

    popout: Component {
        Column {
            id: panel

            property var closePopout: null
            readonly property real rowWidth: Theme.cellW * 32
            spacing: Theme.cellH * 0.35

            component ActionRow: Text {
                required property string actionName
                enabled: root.installed
                width: panel.rowWidth
                color: !enabled ? Theme.muted : (hover.hovered ? Theme.readable(Theme.accent, Theme.bg) : Theme.fg)
                font.family: Theme.fontFamily
                font.pixelSize: Theme.fontSize
                renderType: Text.NativeRendering

                HoverHandler {
                    id: hover
                    enabled: parent.enabled
                    cursorShape: Qt.PointingHandCursor
                }
                TapHandler {
                    enabled: parent.enabled
                    onTapped: {
                        root.action(parent.actionName);
                        if (panel.closePopout)
                            panel.closePopout();
                    }
                }
            }

            Text {
                text: "PRETTYZAP // WHATSAPP"
                color: Theme.readable(Theme.accent, Theme.bg)
                font.family: Theme.fontFamily
                font.pixelSize: Theme.fontSize
                font.bold: true
                renderType: Text.NativeRendering
            }

            Text {
                width: panel.rowWidth
                text: !root.installed ? "nicht installiert" :
                    (root.appVisible ? "● sichtbar" : (root.running ? "● verborgen" : "○ beendet")) +
                    "  //  " + (root.data.theme === "system" ? "Systemfarben" : "WhatsApp-Farben")
                color: !root.installed ? Theme.red : (root.running ? Theme.green : Theme.fgDim)
                font.family: Theme.fontFamily
                font.pixelSize: Theme.fontSize
                renderType: Text.NativeRendering
            }

            Text {
                visible: !root.installed
                width: panel.rowWidth
                text: "Installieren: paru -S prettyzap-bin"
                color: Theme.fgDim
                font.family: Theme.fontFamily
                font.pixelSize: Theme.fontSize
                renderType: Text.NativeRendering
            }

            Rule { rowWidth: panel.rowWidth; label: "STEUERUNG" }

            ActionRow { text: root.appVisible ? "[ ausblenden ]" : "[ öffnen ]"; actionName: root.appVisible ? "hide" : "show" }
            ActionRow { text: "[ einstellungen ]"; actionName: "settings" }
            ActionRow { text: "[ theme wechseln ]"; actionName: "theme" }
            ActionRow {
                text: root.data.notificationsEnabled === false ? "[ benachrichtigungen an ]" : "[ benachrichtigungen aus ]"
                actionName: "notifications"
                enabled: root.ready
            }
            ActionRow { text: "[ beenden ]"; actionName: "quit" }
        }
    }
}
