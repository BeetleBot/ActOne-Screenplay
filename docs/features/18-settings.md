# Settings

**Window:** `?modal=settings` (`src/components/SettingsWindow.tsx`)

Settings is a standalone Tauri window with five **pill-segmented tabs** (General / Editor / Spellcheck / Snapshots / Muse) — the tab bar is a soft inset track (`8px` radius) with the active tab shown as a paper pill with shadow. The transparent TitleBar uses minimal `28px` rounded window controls. All section cards are `8px` rounded. In browser dev mode it renders through the same URL param but native window behavior is unavailable.

## General

| Setting | Options | Description |
|---------|---------|-------------|
| Paper Size | `letter` / `a4` | Default paper size used by the editor and export pipeline |
| Interface Scale | 75%-300% in steps of 5 | Scales the application interface |
| Icon Style | `duotone` / `fill` / `regular` | Select interface icon style (Dual Tone, Solid, Stroke) |
| Auto-save | On or off | Automatically saves files with an existing path |
| Auto-save interval | 30 seconds, 1 minute, 2 minutes, or 5 minutes | Interval used when auto-save is enabled |
| Reset Settings | Action — pill outlined button (`6px` radius, error color) | Removes application settings and restores defaults |

## Editor

| Setting | Description |
|---------|-------------|
| Font Family | Courier Prime or Courier Prime Sans (with bundled Indic script font fallback) |
| Editor Zoom | 50%-400% in steps of 10 |
| Typewriter Mode | Keep the active line centered |
| Autocomplete | Toggle character, transition, and Fountain ghost-text suggestions |
| Smart Quotes | Auto-convert straight quotes while typing |
| Auto-match | Auto-close parentheses and related delimiters |
| Auto (CONT'D) | Automatically append virtual (CONT'D) tags when characters speak consecutively |
| Hide Markup | Hide Fountain markup on inactive lines |
| Line Focus | Dim lines other than the active line (labeled "Line Focus" in UI) |
| Syntax Colors | Enable or disable Fountain color decorations |

## Spellcheck

| Setting | Description |
|---------|-------------|
| Enable Spellcheck | Enables native Rust spellchecking; disabled by default (toggle in its own `8px` card) |
| Active Language | Dropdown of installed dictionaries (disabled until spellcheck is enabled) |
| Download More Languages | Pill button (`6px`) that opens the download dialog |
| Installed Languages | List of bundled (chip "Bundled") vs downloaded (chip + "Remove" button); rows are `6px` rounded with `action.hover` bg |
| Personal Dictionary | Card showing word-count chip and **Clear Custom Words** pill button (replaces old "Custom Dictionary") |

## Snapshots

| Setting | Description |
|---------|-------------|
| Enable Automated Snapshots | Master toggle (label updated from "Enable Snapshots") |
| Save Location | Text field + **Browse…** folder picker (Tauri dialog) and **Reset to Default** pill button; field is `8px` rounded |
| Snapshot Info | Note that snapshots live in the project's `.snapshots/` folder + **Open Snapshots Folder** pill button (`6px`) |
| Background | Periodic auto-snapshots and snapshot-on-save are configured separately; Max Retention (auto/on_save snapshots to keep) |

## Muse

| Setting | Description |
|---------|-------------|
| Provider | `none`, `openai-compatible`, or `ollama` |
| Configure Providers | Nested dialog for named OpenAI-compatible API entries or Ollama connection settings |
| Model | Active OpenAI API entry or Ollama model |
| Chat Temperature | Slider 0.0-1.0, default 0.7 |
| Rephrase Temperature | Slider 0.0-1.0, default 0.1 |
| Translate Temperature | Slider 0.0-1.0, default 0.1 |
| Translate Languages | Languages shown in the editor Translate menu |
| Custom Instructions | General Muse prompt, rephrase presets, and translation instructions |
| Fountain Rules | Read-only display of rules added to writing prompts |

The current chat composer is a pill input (`20px` radius) with a pill send button and streaming indicator. It does not provide `@write-scene`, `@q`, `@lookup`, or `@synonyms` command autocomplete. Users enter normal-language requests in Muse chat.

### OpenAI-compatible entries

Each entry contains:

- Name
- Endpoint URL
- API key
- Model identifier

The endpoint is sent as entered. ActOne does not append `/chat/completions` automatically.

### Ollama connection

The default URL is `http://localhost:11434`. The Settings window checks Ollama availability and loads model names from the server.

See `features/21-muse.md` for provider behavior, chat sessions, tool execution, persistence, and privacy details.
