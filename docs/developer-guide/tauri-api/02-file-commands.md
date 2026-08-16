# File I/O Commands

## `open_file_dialog`

Opens a native file picker for ActOne-supported formats.

```typescript
invoke<OpenFileResult | null>("open_file_dialog");
```

**Returns:** `{ path: string, content: string } | null`

**Filters:** `.actone` and `.zip` (ActOne project bundles)

**Implementation:** Uses `rfd::FileDialog::new().add_filter(...).pick_file()` and returns the selected path with an empty content field. The frontend reads the project bundle separately.

---

## `import_script_dialog`

Opens the import picker for screenplay files and excludes `.actone` bundles. The frontend converts the selected file to Fountain before creating an ActOne project.

```typescript
invoke<ImportResult | null>("import_script_dialog", { format: null });
```

**Returns:** `{ path: string, name: string, extension: string } | null`

**Supported formats:** `.fdx`, `.fadein`, `.fountain`, `.txt`, and `.spmd`. Fade In files are read as binary data because they are packaged project files.

`import_fountain_dialog` remains registered as a compatibility alias for Fountain/text-only callers.

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

Writes string content to a specific file path (no dialog). Writes are performed **atomically** (via a temporary file in the same directory, which is renamed upon successful write completion) to prevent file truncation or corruption.

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

Writes bytes to a specific file path. Writes are performed **atomically** (via a temporary file in the same directory, which is renamed upon successful write completion) to prevent file truncation or corruption.

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
