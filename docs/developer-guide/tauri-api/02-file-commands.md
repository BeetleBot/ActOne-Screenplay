# File I/O Commands

## `open_file_dialog`

Opens a native file picker for ActOne-supported formats.

```typescript
invoke<OpenFileResult | null>("open_file_dialog");
```

**Returns:** `{ path: string, content: string } | null`

**Filters:** `.actone` (ActOne Screenplay Bundle), `.fountain` (Fountain Screenplay), `.txt` (Plain Text)

**Implementation:** Uses `rfd::FileDialog::new().add_filter(...).pick_file()`, reads file content via `std::fs::read_to_string()`.

---

## `import_fountain_dialog`

File picker for `.fountain`/`.txt` only (excludes `.actone` bundles).

```typescript
invoke<ImportResult | null>("import_fountain_dialog");
```

**Returns:** `{ path: string, content: string } | null`

---

## `save_file_dialog`

Opens a native save dialog. Writes content to the selected path.

```typescript
invoke<string | null>("save_file_dialog", { content: string });
```

**Parameters:**
- `content: string` — text content to write

**Returns:** Saved file path or `null` if cancelled.

**Filters:** `.actone` (with `.fountain` as alternative).

---

## `save_file_content`

Writes string content to a specific file path (no dialog).

```typescript
invoke<void>("save_file_content", { path: string, content: string });
```

**Parameters:**
- `path: string` — target file path
- `content: string` — text content to write

**Errors:** If path is invalid or write fails.

---

## `read_file_content`

Reads a file as UTF-8 string.

```typescript
invoke<string>("read_file_content", { path: string });
```

**Parameters:**
- `path: string` — file path to read

**Returns:** File contents as string.

**Errors:** If file doesn't exist or isn't valid UTF-8.

---

## `read_file_binary`

Reads a file as raw bytes.

```typescript
invoke<number[]>("read_file_binary", { path: string });
```

**Returns:** Byte array (used for `.actone` bundle reading).

---

## `save_file_binary`

Writes bytes to a specific file path.

```typescript
invoke<void>("save_file_binary", { path: string, bytes: number[] });
```

**Parameters:**
- `path: string` — target file path
- `bytes: number[]` — byte data to write

---

## `file_exists`

Checks if a file exists at the given path.

```typescript
invoke<boolean>("file_exists", { path: string });
```

**Returns:** `true` if file exists.

---

## `pick_directory`

Opens a native directory picker.

```typescript
invoke<string | null>("pick_directory");
```

**Returns:** Selected directory path or `null`.

---

## `get_cli_args`

Returns command-line arguments matching ActOne file extensions (`.actone`, `.fountain`, `.txt`). Only returns once per session.

```typescript
invoke<string[]>("get_cli_args");
```

**Returns:** Array of file paths passed as CLI arguments.
