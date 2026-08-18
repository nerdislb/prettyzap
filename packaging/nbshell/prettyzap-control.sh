#!/usr/bin/env bash
set -u

action=${1:-toggle}
command -v prettyzap >/dev/null 2>&1 || exit 127

case "$action" in
    show)          args=(--show) ;;
    hide)          args=(--hide) ;;
    toggle)        args=(--toggle) ;;
    settings)      args=(--settings) ;;
    theme)         args=(--theme=toggle) ;;
    notifications) args=(--notifications=toggle) ;;
    quit)          args=(--quit) ;;
    *)             exit 2 ;;
esac

# PrettyZap is single-instance. A detached second invocation forwards the
# command to the running instance; on first launch it becomes the app process.
nohup prettyzap "${args[@]}" >/dev/null 2>&1 &
