# Command Line Interface (CLI)

ActOne Screenplay supports command-line execution on both **Linux** and **Windows**. It enables fast terminal-based workflows, automated file opening, format conversion, script piping, and native Linux desktop integration.

---

## Basic Execution

Depending on your operating system and installation method, ActOne can be launched using the following commands:

### Linux
```bash
# Direct command (when installed via AppImage integration, .deb, or .rpm)
actone [file_path]

# AppImage standalone binary
./ActOne-Screenplay-x86_64.AppImage [file_path]

# Flatpak
flatpak run ink.iyal.actone [file_path]
```

### Windows
```powershell
# From PowerShell, Command Prompt, or Windows Terminal
ActOne.exe [file_path]

# Portable executable
ActOne-Portable-x64-0.4.24.exe [file_path]
```

*Note: Running `actone` or `ActOne.exe` without arguments launches the Welcome screen.*

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

## Linux AppImage Integration Flags

When running the universal Linux AppImage (`ActOne-Screenplay-x86_64.AppImage`), specialized CLI flags manage desktop integration without third-party AppImage daemons:

### `--install-integration` (or `install`)
Installs ActOne into your user environment:
1. Copies the AppImage to `~/.local/bin/ActOne-Screenplay.AppImage`.
2. Creates a symlink `~/.local/bin/actone` pointing to the installed AppImage (enabling terminal command `actone` system-wide if `~/.local/bin` is in `$PATH`).
3. Installs the desktop launcher to `~/.local/share/applications/actone.desktop`.
4. Installs high-resolution application icons (`128x128` and `256x256`) and MIME type icons (`text-vnd.fountain`, `application-vnd.actone.bundle`, `application-vnd.actone.theme`).
5. Updates system MIME and desktop databases, registering ActOne as the default handler for `.fountain`, `.actone`, and `.actheme` files.

```bash
./ActOne-Screenplay-x86_64.AppImage --install-integration
```

### `--uninstall` (or `uninstall`)
Cleanly uninstalls the AppImage integration:
- Removes `~/.local/bin/actone` and the installed AppImage binary.
- Removes `~/.local/share/applications/actone.desktop` and MIME definitions.
- Removes all installed application and MIME icons.
- Refreshes desktop and icon caches.

```bash
./ActOne-Screenplay-x86_64.AppImage --uninstall
```

### Standard AppImage Options
- **`--appimage-extract`**: Extracts the inner filesystem into a `squashfs-root` directory (useful for inspecting bundled assets or running without FUSE).
- **`--appimage-help`**: Displays general AppImage runtime options.

---

## Technical Details

- **IPC Event**: When launched from the command line, the Rust backend retrieves arguments via `std::env::args()`, filters valid extensions, and emits the `file-opened` event to the frontend.
- **Path Normalization**: Both forward slashes (`/`) and Windows backslashes (`\`) are parsed cleanly on all platforms.
- **Cross-Window Hand-off**: If the Welcome screen is currently open, receiving a CLI file event automatically forwards the file path, opens an editor window, and closes the Welcome screen.
