#!/usr/bin/env bash
set -u

config_root=${XDG_CONFIG_HOME:-"$HOME/.config"}
status_file="$config_root/prettyzap/status.json"

installed=false
command -v prettyzap >/dev/null 2>&1 && installed=true

if [[ -r "$status_file" ]] && jq -e 'type == "object"' "$status_file" >/dev/null 2>&1; then
    pid=$(jq -r '.pid // 0' "$status_file")
    running=false
    if [[ "$pid" =~ ^[0-9]+$ ]] && (( pid > 0 )) && kill -0 "$pid" 2>/dev/null; then
        running=true
    fi

    jq -c \
        --argjson installed "$installed" \
        --argjson running "$running" \
        '. + {
            installed: $installed,
            running: $running,
            visible: ($running and (.visible == true)),
            ready: ($running and (.ready == true)),
            unreadCount: ((.unreadCount // 0) | tonumber? // 0),
            notificationsEnabled: (.notificationsEnabled != false),
            theme: (if .theme == "system" then "system" else "whatsapp" end)
        }' "$status_file"
else
    jq -cn --argjson installed "$installed" '{
        installed: $installed,
        running: false,
        visible: false,
        ready: false,
        unreadCount: 0,
        notificationsEnabled: true,
        theme: "whatsapp"
    }'
fi
