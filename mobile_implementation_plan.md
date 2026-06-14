# ActOne Android Prototype

Build a working Android prototype of ActOne in a separate `ActOneAndroid/` folder, reusing the Rust engine from the desktop codebase via symlinks.

## Architecture

```
ActOne/
├── src/                         (desktop frontend — untouched)
├── src-tauri/                   (desktop backend — untouched)
│   └── src/
│       ├── pdf/                 ← THE ENGINE (shared via symlink)
│       ├── structures.rs        ← shared via symlink
│       └── lib.rs               (desktop-only commands)
│
├── ActOneAndroid/               ← NEW
│   ├── src/                     (mobile-first React frontend)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── fonts.css
│   │   ├── parser/              (symlink → ../../src/parser/)
│   │   ├── components/
│   │   │   ├── MobileLayout.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── DrawerMenu.tsx
│   │   │   ├── MobileEditor.tsx
│   │   │   ├── QuickActionBar.tsx
│   │   │   ├── OutlinePanel.tsx
│   │   │   └── ExportSheet.tsx
│   │   ├── context/
│   │   │   ├── FileContext.tsx
│   │   │   └── UIContext.tsx
│   │   ├── editor/
│   │   │   ├── useCodeMirror.ts
│   │   │   └── fountainSyntax.ts (symlink → ../../src/editor/fountainSyntax.ts)
│   │   └── theme/
│   │       └── muiTheme.ts      (symlink → ../../src/theme/muiTheme.ts)
│   ├── src-tauri/
│   │   ├── Cargo.toml           (same engine deps, NO rfd, NO font-kit)
│   │   ├── tauri.conf.json      (Android-specific config)
│   │   ├── capabilities/
│   │   ├── assets/              (symlink → ../../src-tauri/assets/)
│   │   └── src/
│   │       ├── main.rs
│   │       ├── lib.rs           (mobile commands, no rfd)
│   │       ├── pdf              (symlink → ../../../src-tauri/src/pdf/)
│   │       └── structures.rs    (symlink → ../../../src-tauri/src/structures.rs)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
```

> [!IMPORTANT]
> **Symlinks** keep the engine code in one place. Editing `src-tauri/src/pdf/` on desktop automatically updates the Android build. No code duplication.

---

## Proposed Changes

### Phase 1: Project Scaffold

#### [NEW] ActOneAndroid/ — Tauri v2 project targeting Android

1. Initialize a new Tauri v2 + React + Vite project in `ActOneAndroid/`
2. Create symlinks for shared code:
   - `ActOneAndroid/src-tauri/src/pdf` → `../../src-tauri/src/pdf/`
   - `ActOneAndroid/src-tauri/src/structures.rs` → `../../src-tauri/src/structures.rs`
   - `ActOneAndroid/src-tauri/assets/` → `../../src-tauri/assets/`
   - `ActOneAndroid/src/parser/` → `../../src/parser/`
   - `ActOneAndroid/src/editor/fountainSyntax.ts` → `../../src/editor/fountainSyntax.ts`
   - `ActOneAndroid/src/theme/muiTheme.ts` → `../../src/theme/muiTheme.ts`
3. Configure `Cargo.toml` with the same engine dependencies (krilla, cosmic-text, serde, etc.) but **without** `rfd` and `font-kit`

---

### Phase 2: Rust Backend (Mobile Commands)

#### [NEW] ActOneAndroid/src-tauri/src/lib.rs

Mobile-specific Tauri commands. The 8 `rfd`-based file dialog commands from desktop are replaced with path-based equivalents (the frontend will handle Android's file picker via `tauri-plugin-dialog`).

**Commands to include:**

| Command | Source | Notes |
|---|---|---|
| `save_file_content` | Portable | Path-based `fs::write` |
| `read_file_content` | Portable | Path-based `fs::read_to_string` |
| `read_file_binary` | Portable | Path-based `fs::read` |
| `save_file_binary` | Portable | Path-based `fs::write` |
| `file_exists` | Portable | `Path::exists()` |
| `generate_pdf_bytes` | Portable | In-memory PDF generation via krilla |
| `get_page_breaks` | Portable | Pure computation |
| `generate_fdx_string` | Portable | Pure computation |
| `get_structures` | Portable | Embedded templates via `include_str!` |
| `get_structure_template` | Portable | Embedded templates |

**Dropped commands** (desktop-only):
`open_file_dialog`, `save_file_dialog`, `save_pdf_dialog`, `export_pdf`, `export_fountain`, `export_fdx`, `pick_directory`, `import_fountain_dialog`, `get_system_fonts`, `get_cli_args`

**New mobile commands:**
| Command | Purpose |
|---|---|
| `save_pdf_to_path` | Takes PDF bytes + path, writes to disk (frontend picks path) |
| `save_fdx_to_path` | Takes fountain text + path, converts and writes FDX |

---

### Phase 3: Mobile Frontend — Layout

#### [NEW] MobileLayout.tsx

```
┌─────────────────────────────┐
│  TopBar (title, menu, save) │
├─────────────────────────────┤
│                             │
│    Editor / Panel Content   │
│    (full screen area)       │
│                             │
├─────────────────────────────┤
│  QuickActionBar             │
│  (above keyboard, when      │
│   keyboard is active)       │
├─────────────────────────────┤
│  BottomNav                  │
│  (Editor | Outline |        │
│   Export | More)            │
└─────────────────────────────┘

← Swipe right: DrawerMenu
```

#### [NEW] TopBar.tsx
- Hamburger menu icon (opens DrawerMenu)
- Document title (editable)
- Save indicator (dot when dirty)
- Undo / Redo buttons

#### [NEW] BottomNav.tsx
- 4 tabs: **Editor** (edit icon), **Outline** (list icon), **Export** (download icon), **More** (dots icon)
- Standard MUI `BottomNavigation` with touch-sized 48px targets

#### [NEW] DrawerMenu.tsx
- Slides in from left edge (swipe or hamburger tap)
- Sections: **File** (New, Open, Save As), **View** (Theme picker, Paper Size), **Settings**
- Recent files list

#### [NEW] QuickActionBar.tsx
- Horizontal scrollable toolbar shown above the virtual keyboard
- Buttons: `INT.` `EXT.` `@` (Character) `(` `)` `>` (Transition) `===` (Page Break) **B** *I* _U_
- Detects keyboard visibility via `visualViewport` resize events

#### [NEW] OutlinePanel.tsx
- Simplified scene outline (list of headings with scene numbers and colors)
- Tap to jump to scene in editor
- No drag-reorder in prototype (course correction later)

#### [NEW] ExportSheet.tsx
- Bottom sheet with export options: PDF, Fountain, FDX
- Paper size toggle (Letter / A4)
- Uses `generate_pdf_bytes` → Android share intent or save to Downloads

---

### Phase 4: Mobile Frontend — Editor

#### [NEW] MobileEditor.tsx
- CodeMirror 6 container (CM6 supports mobile/touch natively)
- Touch-optimized: larger line height, comfortable tap targets
- Uses the symlinked `fountainSyntax.ts` for syntax highlighting
- Simplified context menu (long-press): Cut, Copy, Paste, Format (Bold/Italic/Underline)

#### [NEW] useCodeMirror.ts (mobile version)
- Stripped-down version of the desktop hook
- Extensions: fountain syntax highlighting, basic keybindings, undo/redo history
- No: page break decorations, typewriter scroll mode, smart quotes (prototype scope)
- Handles `visualViewport` resize to scroll cursor into view when keyboard appears

---

### Phase 5: Mobile Frontend — State Management

#### [NEW] FileContext.tsx (mobile)
- Single-file editing (no tabs in prototype)
- `rawText`, `parsedDoc`, `isDirty`, `filePath`
- Open: uses `tauri-plugin-dialog` to pick file → `invoke("read_file_content")` or `invoke("read_file_binary")` for `.actone`
- Save: uses `tauri-plugin-dialog` to pick save location → `invoke("save_file_content")` or `invoke("save_file_binary")`
- New: resets state to empty document

#### [NEW] UIContext.tsx (mobile)
- `paperSize`, `theme`, `activeTab` (bottom nav state)
- Persisted via `localStorage` (WebView localStorage works on Android)

---

### Phase 6: Styling

#### [NEW] index.css (mobile)
- Full-screen layout, no page-width simulation
- Touch-optimized font sizes (16px base to prevent iOS/Android zoom on focus)
- Fountain syntax CSS classes (reused from desktop `index.css`)
- Dark theme by default
- Safe area insets for notch/navigation bar (`env(safe-area-inset-*)`)

#### Symlinked fonts.css
- Courier Prime fonts loaded from bundled assets (same as desktop)

---

## Open Questions

> [!IMPORTANT]
> **Android SDK setup**: Do you have Android Studio, SDK Platform 35, and NDK installed? If not, we'll need to set that up first before we can test on a device/emulator.

> [!IMPORTANT]
> **`.actone` bundle format**: The desktop uses `fflate` (JS zip library) for `.actone` bundles. Should the Android prototype support `.actone` bundles in the MVP, or should we start with plain `.fountain` files only?

---

## Verification Plan

### Build Verification
- `cargo check` in `ActOneAndroid/src-tauri/` — Rust compiles without `rfd`/`font-kit`
- `npm run dev` in `ActOneAndroid/` — Vite dev server starts
- `npx tauri android build --debug` — APK builds successfully

### Manual Verification
- Launch on Android emulator or device
- Create a new screenplay, type Fountain-formatted text
- Verify syntax highlighting works
- Navigate between Editor and Outline tabs
- Export a PDF (verify `generate_pdf_bytes` works)
- Open and save `.fountain` files
