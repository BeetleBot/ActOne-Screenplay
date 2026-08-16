# Rust Backend

## Entry Point

**`src-tauri/src/main.rs`** — calls `actone_lib::run()`. On Windows release builds, the console window is hidden.

## Main Module (`lib.rs`)

**`src-tauri/src/lib.rs`** (~907 lines) is the heart of the backend. It contains all Tauri IPC command handlers, state management, plugin registration, and application lifecycle logic.

### Managed State

Three pieces of state are managed via `tauri::State`:

| State Type | Wrapper | Persistence |
|------------|---------|-------------|
| `FontCache` | `Mutex<FontCache>` | None (rebuilt on startup) |
| `ThemeConfig` | `Mutex<ThemeState>` | `<app_data>/actone-theme.json` |
| `AppPrefsState` | `Mutex<HashMap<String,String>>` | `<app_data>/actone-prefs.json` |

### Setup Flow

1. **(Windows only)** Validates Microsoft Store license — exits with code 1 if invalid
2. Reads CLI args, emits `file-opened` event if matching files found
3. Initializes FontCache via cosmic-text fontdb, ThemeConfig, AppPrefsState
4. Registers all invoke handlers

### Sub-Modules

| Module | File | Purpose |
|--------|------|---------|
| `pdf` | `pdf/mod.rs` | PDF/FDX/FadeIn export pipeline (see separate doc) |
| `structures` | `structures.rs` | 8 story structure templates |
| `font_cache` | `font_cache.rs` | Font detection, script-based font recommendations |
| `app_prefs` | `app_prefs.rs` | Generic key-value preferences |
| `snapshots` | `snapshots.rs` | File snapshot/versioning system |
| `ollama` | `ollama.rs` | Ollama health checks, model discovery, streaming chat, cancellation |

## Tauri Commands

### File I/O

| Command | Description |
|---------|-------------|
| `open_file_dialog` | Native picker for `.actone`/`.zip` project files; returns the selected path |
| `save_file_dialog` | Save dialog for `.actone`/`.fountain`; writes content |
| `save_file_content` | Writes string content atomically to a given path |
| `read_file_content` | Reads a file as UTF-8 string |
| `read_file_binary` | Reads a file as bytes |
| `save_file_binary` | Writes bytes atomically to a file |
| `file_exists` | Checks if a file exists |
| `import_script_dialog` | File picker for `.fdx`/`.fadein`/`.fountain`/`.txt`/`.spmd` imports |
| `import_fountain_dialog` | Legacy-compatible alias for Fountain/text import |
| `pick_directory` | Directory picker |
| `get_cli_args` | Returns CLI args matching `.actone`/`.fountain`/`.txt` |
| `get_sample_bundle` | Returns a sample `.actone` bundle for templates/tutorials |

### PDF Export

| Command | Description |
|---------|-------------|
| `export_pdf` | Full PDF export with native save dialog |
| `generate_pdf_bytes` | Generates PDF bytes in memory (no dialog) |
| `get_page_breaks` | Dry-run page break calculation |
| `save_pdf_dialog` | Save dialog for `.pdf` |
| `select_watermark_image` | File picker for watermark images |

`PdfExportConfig` includes `scene_page_breaks` — when `true`, every scene heading starts on a new page (PDF export only).

### Other Export

| Command | Description |
|---------|-------------|
| `export_fountain` | Save dialog for `.fountain` |
| `export_csv` | Save dialog for `.csv` |
| `export_fdx` | Final Draft `.fdx` export |
| `export_fadein` | FadeIn `.fadein` export (ZIP archive) |
| `generate_fadein_bytes` | FadeIn bytes (no dialog) |
| `generate_fdx_string` | FDX XML string (no dialog) |

### Fonts

| Command | Description |
|---------|-------------|
| `get_system_fonts` | Lists all system font families (alphabetically sorted) |
| `get_fonts_for_script` | Recommended fonts for a script type |
| `get_detected_scripts` | Detects Indic scripts in text |

### Theme & Preferences

| Command | Description |
|---------|-------------|
| `get_theme_state` | Returns current theme ID, scale, custom themes |
| `set_theme_state` | Updates theme, persists to file, emits `theme:state-changed` |
| `get_app_prefs` | Returns all application preferences |
| `set_app_prefs` | Merges & persists preferences |
| `save_theme_dialog` | Save dialog for a custom theme file |
| `import_theme_dialog` | File picker for importing a custom theme |

### Snapshots

| Command | Description |
|---------|-------------|
| `create_snapshot` | Creates a file snapshot (with retention pruning) |
| `get_snapshots` | Lists snapshots for a file |
| `delete_snapshot` | Deletes a snapshot |
| `get_snapshot_folder_path` | Returns snapshot directory |
| `open_folder` | Opens folder in system file manager |

### Structures

| Command | Description |
|---------|-------------|
| `get_structures` | Lists all 8 story structure templates with beats |
| `get_structure_template` | Returns raw Fountain content for a structure |

### Ollama (Muse provider proxy)

| Command | Description |
|---------|-------------|
| `ollama_check` | Tests Ollama connectivity and reports an error on failure |
| `ollama_list_models` | Lists locally available Ollama models |
| `ollama_chat` | Streams a chat completion from a selected Ollama model |
| `cancel_ollama_chat` | Cancels an in-flight Ollama request |

### Spellcheck

| Command | Description |
|---------|-------------|
| `spellcheck_init` | Initializes the native spellcheck engine and language |
| `spellcheck_set_language` | Switches the active dictionary |
| `spellcheck_check_text` | Checks text ranges and returns misspelled words |
| `spellcheck_suggest` | Returns spelling suggestions for a word |
| `spellcheck_add_word` | Adds a word to the persisted custom dictionary |
| `spellcheck_remove_word` | Removes a custom dictionary word |
| `spellcheck_ignore_word` | Ignores a word for the current session |
| `spellcheck_get_custom_words` | Lists custom dictionary words |
| `spellcheck_clear_custom_words` | Clears the custom dictionary |
| `spellcheck_download_dict` | Downloads and caches a language dictionary |
| `spellcheck_delete_dict` | Deletes a downloaded dictionary |
| `spellcheck_get_installed` | Lists installed dictionaries |
| `spellcheck_get_available` | Lists dictionaries available for download |

### System & Diagnostics

| Command | Description |
|---------|-------------|
| `get_system_info` | OS, CPU, and memory information for crash reports |
| `send_error_report` | POSTs a crash payload to an error webhook |
| `flush_pending_panics` | Reads and clears the persisted panic log |
| `reload_window` | Reloads a single webview by window label |
| `restart_app` | Restarts the Tauri application |
| `get_target_os` | Returns the build target OS string |

### Store Updates

| Command | Description |
|---------|-------------|
| `check_for_store_update` | Checks for a pending Microsoft Store update |
| `install_store_update` | Installs the pending Store update |

### Licensing

| Command | Description |
|---------|-------------|
| `check_microsoft_store_license` | Windows-only MS Store license check |

## Cross-Window Communication

The Rust backend uses Tauri's event system:

- `theme:state-changed` — emitted when theme is updated (consumed by all windows)
- `app-prefs:changed` — emitted when preferences change
- `file-opened` — emitted when a file is opened via CLI args or file association
- `editor:ready` — emitted when the editor window is ready and has handled its action

Ollama streaming emits `ollama-chat-chunk` events with `{session_id, delta}` payloads (see `src-tauri/src/ollama.rs`); the frontend `useAIChat` hook consumes them. Event payloads must be treated as untrusted input.

## Font Management

The `font_cache` module:
- Scans system fonts via `cosmic-text` fontdb
- Detects 9 Indic scripts in text (Tamil, Devanagari, Telugu, Kannada, Malayalam, Bengali, Gujarati, Gurmukhi, Oriya)
- Recommends bundled fonts for each script
- Sorts Courier-family fonts first for English text

## Snapshot System

The `snapshots` module provides file versioning:
- Snapshots are stored in the active project's `.snapshots/` directory
- Three types: `auto`, `manual`, `on_save`
- Configurable retention (default 10 for auto/on_save)
- Index stored in `index.json` within the snapshot directory
- Implements custom date formatting (no `chrono` dependency)

## Window State

The `tauri-plugin-window-state` plugin persists the main window's size, position, and maximized state. The application saves state during shutdown and restores it during startup. This behavior is native desktop state and is not managed by React or localStorage.
