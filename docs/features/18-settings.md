# Settings

**Window:** `?modal=settings` (~574 lines)

## General

| Setting | Options | Description |
|---------|---------|-------------|
| Language | `en` (only) | Interface language |
| Telemetry | Off (only) | ActOne collects no data |
| Icon Style | `duotone` / `fill` / `regular` | Select interface icon style (Dual Tone, Solid, Stroke) |

## Editor

| Setting | Description |
|---------|-------------|
| Font Family | Courier Prime or Courier Prime Sans |
| Enable Autocomplete | Toggle ghost text suggestions |
| Enable Smart Quotes | Auto-convert to curly quotes |
| Enable Auto-Match Brackets | Auto-close parentheses, brackets, quotes |
| Typewriter Mode | Default state (on by default) |
| Hide Fountain Markup | Show/hide formatting characters |
| Enable Auto-Save | Toggle periodic auto-save (on by default, 5 min interval) |
| Enable Line Focus | Dim un-focused lines |
| Hide Tags | Hide production tag decorations |

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
| Default Paper Size | US Letter or A4 (default A4) |
| Default Font | Courier Prime Sans (default) or Courier Prime |
| Mirror Scene Numbers | Off / Left / Mirror |
| Export Sections | Include section headers |
| Export Synopses | Include synopsis lines |
| Export Title Page | Include title page |
| Export Scene Colors | Include scene color rendering |

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
| Provider | `"none"`, `"openai-compatible"`, or `"ollama"` |
| Configure Providers | Nested dialog to manage multiple OpenAI-compatible API entries (name, endpoint, API key, model per entry) |
| Model | Active model (from selected API entry for OpenAI, or Ollama model list) |
| Temperature (Chat) | Slider 0.0-1.0 (default 0.7) — controls response randomness |
| Custom Instructions | Nested dialog to customize system prompts for @write-scene, @q, @lookup, @synonyms |
| System Prompt | Text area for customizing the main Muse personality prompt |

See `features/21-muse.md` for complete Muse documentation.
