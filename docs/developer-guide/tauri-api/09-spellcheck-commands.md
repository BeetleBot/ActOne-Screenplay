# Spellcheck Commands

Spellcheck is implemented by `src-tauri/src/spellcheck.rs` and exposed through Tauri commands. English is embedded in the application; additional dictionaries are downloaded and cached by the desktop app.

## Initialization

```typescript
await invoke("spellcheck_init", { lang: "en" });
```

`spellcheck_init` loads the requested dictionary and prepares the native engine. The frontend calls it during application startup using the persisted language preference.

## Checking Text

```typescript
const words = await invoke<MisspelledWord[]>("spellcheck_check_text", { ranges });
```

The command accepts text ranges and returns misspelled words with positions suitable for CodeMirror decorations. Screenplay-specific elements are filtered before or during checking so scene headings, character names, transitions, and Fountain syntax do not produce normal-word noise.

## Suggestions and Dictionaries

| Command | Purpose |
|---------|---------|
| `spellcheck_suggest` | Returns suggestions for a word |
| `spellcheck_add_word` | Adds a word to the persisted custom dictionary |
| `spellcheck_remove_word` | Removes a custom dictionary word |
| `spellcheck_ignore_word` | Ignores a word for the current session |
| `spellcheck_get_custom_words` | Lists custom dictionary words |
| `spellcheck_clear_custom_words` | Clears all custom dictionary words |
| `spellcheck_set_language` | Switches the active dictionary |

## Language Management

| Command | Purpose |
|---------|---------|
| `spellcheck_get_installed` | Lists bundled and downloaded dictionaries |
| `spellcheck_get_available` | Lists dictionaries available from the configured catalog |
| `spellcheck_download_dict` | Downloads and caches a dictionary by language code |
| `spellcheck_delete_dict` | Removes a downloaded dictionary |

The frontend uses these commands from Settings and the Status Bar language menu. Tauri calls must be guarded when running in browser mode, and command results must be treated as untrusted input.
