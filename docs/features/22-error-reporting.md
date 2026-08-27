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
- Multi-window and crash window deduplication is enforced through localStorage sent-code tracking and in-flight transmission locks, ensuring each crash report code is transmitted to Discord exactly once.
- Modal windows (e.g. `/?modal=crash`, `/?modal=settings`) skip startup queue flushing so only the primary window manages background queue retry.
- Diagnostics are merged at send time, so a report captured before system info resolves still includes full OS/CPU/RAM details.
- Recent action trails (the last 30 operational logs preceding the crash) are captured and included in the Discord embed and error details for instant reproduction context.
- Embeds are color-coded by severity: 🔴 `#E53935` for `app` crashes, 🟠 `#FB8C00` for `window` crashes, and 🟡 `#FDD835` for `pane` failures.
- Session uptime and privacy-preserved script metrics (mode, scenes count, lines count, estimated pages without text content) are automatically included.
- Full diagnostic reports and complete un-truncated logs are uploaded alongside the embed as a `.txt` attachment (`crash-ACT-xxxx.txt`) via multipart POST.
- Rapid error bursts and tight render loops are automatically throttled and aggregated into occurrence duration summaries.
- Rust panic details are written to the application data directory and flushed at startup with `severity: "app"`.
- Expected Tauri window-teardown errors, including invalid resource IDs from a closing WebView, are retained for diagnostics but do not open a crash window.

There is no previous-session detection and no "send report" button: a crashed session already sent its report live, and clean-exit detection was unreliable.

## Recovery commands

- `reload_window(label)` — reloads only the given webview (empty label targets `"main"`); other windows survive.
- `restart_app()` — full process restart for crashes that make the app unusable.

## Discord Configuration

The webhook is configured in `src/constants/reporting.ts` and sent through the Rust `send_error_report` command. Keep the Discord channel private because a webhook URL is distributed with the application and can be extracted from an installed copy.

Development builds never send to Discord: when running under Vite dev (`npm run tauri dev`), reports are still captured and surfaced in the crash UI, but they are not queued or posted. This is enforced in `src/utils/errorReport.ts` via `isDevReporting()` (`import.meta.env.DEV` and non-test mode), so testing crashes locally won't spam the channel.
