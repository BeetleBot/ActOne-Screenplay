# Privacy Policy

**Last updated:** August 28, 2026

**ActOne** is a cross-platform screenplay editor. This privacy policy explains how we handle your data.

## Data Collection

**ActOne does not collect, store, transmit, or share personal data except as described below.**

- ActOne does not require an account or registration and does not track user behavior.
- No personal information is requested or collected.
- ActOne includes automatic crash reporting described in the [Crash Reporting](#crash-reporting) section below.

## Local Storage

ActOne stores the following data **locally on your device** using your browser/WebView's built-in `localStorage`:

- **User preferences**: theme choice, font family, zoom level, paper size, autocomplete settings, and other editor preferences.
- **Application state**: recent file list, sprint tracking data, and window coordination flags.
- **Custom themes**: any themes you create.
- **Muse state**: provider configuration (including any API key you enter), and per-file chat session history (`actone_ai_chat::<path>`).

This data is stored **solely on your local machine** and is never transmitted except as described under [Muse Providers](#muse-providers) and [Crash Reporting](#crash-reporting) below.

## Files

- ActOne reads and writes `.fountain`, `.actone`, and `.fdx` files exclusively on your local filesystem.
- You choose where to save and open files. ActOne does not access your files without your explicit action.
- No file content is ever uploaded or transmitted unless you enable a Muse provider (below).

## Muse Providers

Muse is an optional AI assistant. ActOne does **not** host a model or provide a default AI service. You must configure a provider yourself:

- **Ollama**: runs entirely on your machine if you use a local Ollama server. Requests are proxied through the app; no data leaves your device.
- **OpenAI-compatible endpoints**: when configured with a remote base URL, the provider, endpoint, and model you choose receive the chat messages and the screenplay context Muse builds for a request (screenplay index, active scene text, todos, parking notes, and character profiles as applicable).

Only the screenplay text required to answer the selected request is included. Provider configuration and API keys are stored in localStorage and are sent to the configured provider endpoint when a request is made. Do not configure a remote provider if keeping screenplay content local is a requirement.

## Third-Party Services

The only dependencies that interact with external resources are:

- **Tauri's `opener` plugin**: used to open files with your operating system's default application (e.g., opening a PDF in your PDF viewer). This is a purely local operation.
- **Muse providers** you configure (see [Muse Providers](#muse-providers)).
- **Crash reporting & User bug reporting** (see below).

## Crash Reporting

When the application crashes, ActOne automatically sends a report to the configured private crash-report channel (a Discord webhook). Reports include an error code, timestamp, app version, error type, severity, component, operating system and version, architecture, processor, CPU count, memory totals, WebView details, locale, session uptime, network state, a limited stack trace, anonymous script metrics (mode, scene count, line count, estimated page count), and recent operational log events preceding the failure.

- Reports are sent automatically; there is no "send report" confirmation dialog.
- The webhook URL is distributed inside the application and can be extracted from an installed copy.
- **No screenplay text, dialogue, character names, or story content is ever included in crash reports.**

## User-Initiated Bug Reporting

You can voluntarily submit bug reports using **Report a Bug** from the Command Palette (<kbd>Ctrl+K</kbd>).

- When submitting a bug report, you provide a description of the issue and may optionally include your name, contact email, and Discord username.
- The report includes auto-detected system diagnostics (OS, processor, memory, app version, resolution) and recent operational app logs.
- **No screenplay text, dialogue, character names, or file content is ever transmitted.**
- The report is sent directly to the development team's private bug-reporting channel.

## Changes to This Policy

If this policy changes, the "Last updated" date at the top will be revised.

## Contact

For questions about this privacy policy, contact our team at:

Email us : actonesupport@iyal.ink

