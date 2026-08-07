# Settings

**Window:** `?modal=settings` (`src/components/SettingsWindow.tsx`)

Settings is a standalone Tauri window with four tabs: General, Editor, Snapshots, and Muse. In browser development mode it renders through the same URL parameter but native window behavior is unavailable.

## General

| Setting | Options | Description |
|---------|---------|-------------|
| Paper Size | `letter` / `a4` | Default paper size used by the editor and export pipeline |
| Interface Scale | 75%-300% in steps of 5 | Scales the application interface |
| Icon Style | `duotone` / `fill` / `regular` | Select interface icon style (Dual Tone, Solid, Stroke) |
| Auto-save | On or off | Automatically saves files with an existing path |
| Auto-save interval | 30 seconds, 1 minute, 2 minutes, or 5 minutes | Interval used when auto-save is enabled |
| Reset Settings | Action | Removes application settings and restores defaults |

## Editor

| Setting | Description |
|---------|-------------|
| Font Family | Courier Prime or Courier Prime Sans |
| Editor Zoom | 50%-400% in steps of 10 |
| Typewriter Mode | Keep the active line centered |
| Autocomplete | Toggle character, transition, and Fountain ghost-text suggestions |
| Smart Quotes | Auto-convert straight quotes while typing |
| Auto-match | Auto-close parentheses and related delimiters |
| Hide Markup | Hide Fountain markup on inactive lines |
| Focus Mode | Dim lines other than the active line |
| Syntax Colors | Enable or disable Fountain color decorations |

## Audio

| Setting | Description |
|---------|-------------|
| Ambient Sounds | Toggle ambient typing sounds (bundled MP3 asset engine) |

## Appearance

| Setting | Description |
|---------|-------------|
| Theme | Select from 17 built-in + custom themes |
| App Scale | UI size percentage (50–300%, step 5, default 100) |
| Theme Manager | Open custom theme editor |
| Interface Scale | Separate from zoom — controls overall UI chrome size |

## Export

| Setting | Description |
|---------|-------------|
Export defaults are configured from the General tab's paper-size setting and the editor font setting. Export-specific controls are available in `ExportModal` when an export is started.

## Snapshots

| Setting | Description |
|---------|-------------|
| Enable Snapshots | Toggle auto-snapshot feature |
| Enable Auto Snapshots | Periodic auto-snapshots (default every 5 min) |
| Snapshot on Save | Create snapshot on every manual save (default on) |
| Snapshot Location | Project folder / App data / Custom |
| Custom Path | Directory for custom snapshot storage |
| Max Retention | Number of auto/on_save snapshots to keep (default 10) |

## Microsoft Store

| Setting | Description |
|---------|-------------|
| License Status | Shows active/inactive |
| (Windows only) | |

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

The current chat composer does not provide `@write-scene`, `@q`, `@lookup`, or `@synonyms` command autocomplete. Users enter normal-language requests in Muse chat.

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
