# Keyboard Shortcuts & Keymaps

ActOne registers custom CodeMirror keymaps in addition to the default editor keybindings.

## Custom Keymap (in `useCodeMirror.ts`)

| Key | Handler | Description |
|-----|---------|-------------|
| `Tab` | `cycleLinePrefix` | Cycles through Fountain prefixes on active line |
| `Enter` | `handleEnter` | Smart Enter: auto-parenthetical after character, continue dialogue |
| `Shift-Enter` | `handleShiftEnter` | Soft line break |
| `Ctrl-D` | `duplicateLine` | Duplicate current line |
| `Ctrl-/` | `toggleComment` | Toggle boneyard comment on line |

## Global Shortcuts (in `useKeyboardShortcuts.ts`)

**File:** `src/hooks/useKeyboardShortcuts.ts` (~200 lines)

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New screenplay |
| `Ctrl+O` | Open screenplay |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+W` / `Alt+Q` | Close tab |
| `Ctrl+P` | Export / Print |
| `Ctrl+,` | Settings |
| `Ctrl+F` | Find |
| `Ctrl+Shift+F` | Find & Replace |
| `Ctrl+K` | Command Palette |
| `Ctrl+\` | Toggle sidebar |
| `Ctrl+Alt+Enter` | Toggle Zen Mode |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Reset zoom |
| `Ctrl+Shift+P` | Switch Editor/Planning Board |
| `Ctrl+B` | Bold (`**`) |
| `Ctrl+I` | Italic (`*`) |
| `Ctrl+U` | Underline (`_`) |
| `Shift+Alt+C` | Clean spaces |
| `Escape` | Focus editor |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |

## Implementing New Shortcuts

To add a new shortcut:

1. Add a `useEffect` in `useKeyboardShortcuts.ts`:
   ```typescript
   useShortcut("Ctrl+Shift+Something", () => {
       // handler
   });
   ```

2. If it's editor-specific, add to the CodeMirror keymap in `useCodeMirror.ts`:
   ```typescript
   keymap.of([
       { key: "Ctrl-Shift-something", run: myHandler },
   ])
   ```
