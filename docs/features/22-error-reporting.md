# Error Reporting

ActOne automatically reports application failures to the configured private Discord crash-report channel. Reports include an error code, timestamp, app version, error type, component, operating system and version, architecture, processor, CPU count, memory totals, WebView details, locale, network state, and a limited stack trace.

Screenplay content and full file paths are not included.

## Severity model

Every report is tagged with a severity that determines how the app recovers:

- **`pane`** — a contained component failed (Outline, editor, sidebar, activity bar, status bar). The pane shows a compact inline error bar with a Retry action; the rest of the app keeps running. No window is opened and no restart happens. The report is still sent to Discord automatically.
- **`window`** — the current window's root renderer failed. A compact separate crash window (540×480) opens with the error code, a **Reload Window** action, and an auto-sent report.
- **`app`** — the process is unusable (root boundary, Rust panic). The crash window opens with a **Restart App** action.

Recovery is chosen from the boundary placement and severity, not from the error type alone.

## Crash window

The crash window is a small standalone `WebviewWindow("crash-report")` opened at `/?modal=crash`. The report is handed off through the `CRASH_REPORT_WINDOW_KEY` localStorage entry. Inside Tauri it opens via `WebviewWindow`; in a plain browser it falls back to `window.open`. The window only shows recovery actions that match the severity (`Reload Window` for `window`, `Restart App` for `app`), otherwise just Dismiss and Copy.

## Reporting pipeline

- Errors are captured by `ErrorBoundary` components, the global `uncaught`/`unhandledrejection` handlers, the pre-mount `index.html` handler, and the Rust panic hook.
- Reports are queued locally when Discord or the network is unavailable and retried automatically.
- Diagnostics are merged at send time, so a report captured before system info resolves still includes full OS/CPU/RAM details.
- Rust panic details are written to the application data directory and flushed at startup with `severity: "app"`.

There is no previous-session detection and no "send report" button: a crashed session already sent its report live, and clean-exit detection was unreliable.

## Recovery commands

- `reload_window(label)` — reloads only the given webview (empty label targets `"main"`); other windows survive.
- `restart_app()` — full process restart for crashes that make the app unusable.

## Discord Configuration

The webhook is configured in `src/constants/reporting.ts` and sent through the Rust `send_error_report` command. Keep the Discord channel private because a webhook URL is distributed with the application and can be extracted from an installed copy.

Development builds never send to Discord: when running under Vite dev (`npm run tauri dev`), reports are still captured and surfaced in the crash UI, but they are not queued or posted. This is enforced in `src/utils/errorReport.ts` via `isDevReporting()` (`import.meta.env.DEV` and non-test mode), so testing crashes locally won't spam the channel.
