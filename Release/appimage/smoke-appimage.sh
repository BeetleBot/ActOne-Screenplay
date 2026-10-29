#!/usr/bin/env bash
# Run under xvfb-run: require a visible window and a surviving main process.
set -euo pipefail
APPDIR="$(realpath "${1:?Usage: smoke-appimage.sh EXTRACTED_APPDIR}")"
PROFILE="$(mktemp -d)"
APP_PID=""
cleanup() {
    if [ -n "$APP_PID" ]; then
        kill "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi
    rm -rf "$PROFILE"
}
trap cleanup EXIT
mkdir -p "$PROFILE/config" "$PROFILE/data" "$PROFILE/cache"
export XDG_CONFIG_HOME="$PROFILE/config"
export XDG_DATA_HOME="$PROFILE/data"
export XDG_CACHE_HOME="$PROFILE/cache"
export GDK_BACKEND=x11
# Xvfb has no GPU. Keep WebKit sandboxing enabled.
export WEBKIT_DISABLE_DMABUF_RENDERER=1
"$APPDIR/AppRun" > "$PROFILE/startup.log" 2>&1 &
APP_PID=$!
for attempt in {1..30}; do
    if ! kill -0 "$APP_PID" 2>/dev/null; then
        cat "$PROFILE/startup.log" >&2
        echo "AppImage exited before startup completed" >&2
        exit 1
    fi
    if [ "$attempt" -ge 12 ] && xdotool search --onlyvisible --name 'ActOne Screenplay' > /dev/null 2>&1; then
        echo "AppImage startup passed: visible window and main process still running."
        exit 0
    fi
    sleep 1
done
cat "$PROFILE/startup.log" >&2
echo "AppImage did not show its window within 30 seconds" >&2
exit 1
