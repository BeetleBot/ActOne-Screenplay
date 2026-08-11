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

**File:** `src/hooks/useKeyboardShortcuts.ts` (~214 lines)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+N` | New screenplay | Create new tab |
| `Ctrl+O` | Open screenplay | Open file dialog |
| `Ctrl+S` | Save | Save active file |
| `Ctrl+Shift+S` | Save As | Save as new file/bundle |
| `Alt+Q` | Close tab | Close active editor tab |
| `Ctrl+Tab` | Next tab | Switch to next tab |
| `Ctrl+Shift+Tab` | Previous tab | Switch to previous tab |
| `Alt+↑` / `Alt+PageUp` | Previous scene | Jump to previous scene heading |
| `Alt+↓` / `Alt+PageDown` | Next scene | Jump to next scene heading |
| `F1` | Shortcuts & Syntax Modal | Open Shortcuts & Syntax overlay |
| `Ctrl+K` | Command Palette | Open fuzzy command palette |
| `Ctrl+F` | Find & Replace | Toggle search panel |
| `Ctrl+\` | Toggle sidebar | Show/hide sidebar activity bar |
| `Ctrl+Alt+Enter` | Toggle Zen Mode | Fullscreen distraction-free editing |
| `Alt+M` | Open Muse AI | Open/toggle Muse AI assistant pane |
| `Alt+S` | Snapshots | Toggle Snapshots sidebar panel |
| `Ctrl+,` | Settings | Open Settings window |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Zoom in/out/reset | Adjust editor font scale |
| `Ctrl+Alt+=` / `Ctrl+Alt+-` / `Ctrl+Alt+0` | Scale UI in/out/reset | Adjust overall interface scale |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | Formatting | Bold, italic, underline selection |

### Disabled State Behavior

When a modal is active (`isModalActive`), only `Ctrl+K` (Command Palette) and `Ctrl+,` (Settings) remain functional. All other shortcuts are suppressed.

## Implementing New Shortcuts

To add a new shortcut:

1. Add a `useEffect` in `useKeyboardShortcuts.ts`:
   ```typescript
   if (key === "x" && ctrl) {
     e.preventDefault();
     actionsRef.current.myHandler();
     return;
   }
   ```

2. If it's editor-specific, add to the CodeMirror keymap in `useCodeMirror.ts`:
   ```typescript
   keymap.of([
     { key: "Ctrl-Shift-something", run: myHandler },
   ])
   ```
