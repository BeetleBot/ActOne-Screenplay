# Command Line Interface (CLI)

ActOne Screenplay supports command-line execution on **Linux**. It enables fast terminal-based workflows, automated file opening, format conversion, script piping, and portable execution.

---

## Basic Execution

On Linux, ActOne can be launched from the terminal using either your installed command or portable AppImage:

```bash
# System PATH or installed command
actone [file_path]

# Portable AppImage standalone binary
./ActOne-Screenplay-x86_64.AppImage [file_path]
```

*Note: Running `actone` without arguments launches the Welcome screen.*

---

## File Argument Handling

ActOne accepts any supported screenplay, project, or prose file path as a command-line argument. Paths can be relative or absolute.

```bash
actone path/to/my_script.fountain
```

### 1. Native Projects & Screenplays
- **`.actone`**: Opens the ActOne project bundle directly into the editor, restoring all scripts, notes, scratchpad, character data, and active session state.
- **`.fountain`**: Opens the Fountain screenplay directly in the editor with live syntax highlighting and outline navigation.
- **`.txt`**: Opens the plain text file in the editor.

### 2. Auto-Converting Import Formats
When passing an external screenplay format, ActOne parses and converts the file immediately into an unsaved `Untitled.actone` project ready for editing, without interrupting you with a save dialog:

- **`.pdf`**: Automatically parsed and converted into Fountain format via the pure Rust `pdf2fountain` engine. A non-blocking note dialog advises reviewing formatting.
- **`.fdx`**: Final Draft XML files are parsed and converted into Fountain text.
- **`.fadein`**: Fade In `.fadein` archives are extracted and converted into Fountain text.
- **`.md` / `.markdown`**: Markdown documents are converted and opened as prose documents (`type: "markdown"`).

Inside the project, the primary script is named using the source file's base name (e.g. `actone draft.pdf` creates an `Untitled.actone` project with a script named `draft`). You can save the project whenever you are ready (<kbd>Ctrl+S</kbd>).

---

## Technical Details

- **IPC Event**: When launched from the command line, the Rust backend retrieves arguments via `std::env::args()`, filters valid extensions, and emits the `file-opened` event to the frontend.
- **Path Normalization**: Both forward slashes (`/`) and Windows backslashes (`\`) are parsed cleanly on all platforms.
- **Cross-Window Hand-off**: If the Welcome screen is currently open, receiving a CLI file event automatically forwards the file path, opens an editor window, and closes the Welcome screen.
