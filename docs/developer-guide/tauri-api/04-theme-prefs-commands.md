# Theme & Preferences Commands

## Theme Commands

Theme state is managed via `ThemeConfig(Mutex<ThemeState>)` in the Rust backend, persisted to `<app_data_dir>/actone-theme.json`.

### ThemeState Structure

```typescript
interface ThemeState {
    themeId: string;
    appScale: number;
    customThemes: string; // JSON string of CustomTheme[]
}
```

### `get_theme_state`

Returns the current theme configuration.

```typescript
invoke<ThemeState>("get_theme_state");
```

### `set_theme_state`

Updates theme configuration. Persists to file and emits `theme:state-changed` event to all windows.

```typescript
invoke<void>("set_theme_state", {
    themeId?: string,        // New theme ID (optional)
    appScale?: number,       // New scale percentage (optional)
    customThemes?: string,   // New custom themes JSON (optional)
});
```

All parameters are optional — only provided fields are updated.

**Events emitted:** `theme:state-changed` with the full `ThemeState` payload.

## App Preferences Commands

App preferences are stored as `HashMap<String, String>` in `AppPrefsState(Mutex<HashMap<String,String>>)`, persisted to `<app_data_dir>/actone-prefs.json`.

### `get_app_prefs`

Returns all application preferences.

```typescript
invoke<Record<string, string>>("get_app_prefs");
```

### `set_app_prefs`

Merges new preferences into existing ones, persists, and emits `app-prefs:changed`.

```typescript
invoke<void>("set_app_prefs", { prefs: Record<string, string> });
```

**Events emitted:** `app-prefs:changed` with the full preferences map.

### Known Preference Keys

| Key | Type | Purpose |
|-----|------|---------|
| `actone-snapshot-enabled` | `"true" \| "false"` | Enable snapshots |
| `actone-snapshot-location` | `"project" \| "appdata" \| "custom"` | Snapshot storage location |
| `actone-snapshot-custom-path` | `string` | Custom snapshot directory |
| `actone-snapshot-max-retention` | `string` (number) | Max auto/on_save snapshots |
