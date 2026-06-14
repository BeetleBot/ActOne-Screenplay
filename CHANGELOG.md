# Changelog

## [0.1.8] - 2026-06-14

### Changed
- Editor: Added "Start writing here" placeholder text when document is empty.
- `ProductionBreakdownModal` fully typed — 16 `: any` replaced with proper interfaces.
- `PILL_RADIUS` constant used across 6 component files + muiTheme (replaces hardcoded `"9999px"`).

### Fixed
- Build: test files excluded from `tsc` compilation to prevent pipeline failures.
- Unused imports removed from SidebarViews (`LinearProgress`, `ListItem`) and Workspace (`setIsSidebarOpen`).
- Fragile `key={idx}` in HelpModal replaced with stable keys.
- Windows portable zip removed from release workflow (MSI/MSIX preferred).

## [0.1.7] - 2026-06-14

### Changed
- Modal focus rings removed globally (MuiDialog paper `outline: none`).
- All modals standardised to compact layout with consistent padding and `borderRadius: 10px`.
- Hover transitions consolidated to `0.12s ease` across the entire UI.
- Script list icon changed to `LibraryBooksIcon`.
- Structure Import Modal layout rebuilt with flex for independent pane scrolling.
- `updateSettings` uses a shared `SettingsUpdater` type instead of `(prev: any) => any`.
- `isTauri` detection uses safe `"__TAURI_INTERNALS__" in window` cast.
- All localStorage keys centralised in `src/constants.ts` as `STORAGE_KEYS`.

### Fixed
- Empty `catch` blocks across 17 locations now log errors instead of silent failures.
- `editorView` typed as `EditorView | null` instead of `any` (10+ unsafe casts eliminated).
- Windows `\r\n` line endings normalised in TitlePageEditorModal and FileContext.
- Stale recent files proactively removed on startup via `file_exists` Tauri command.
- Fragile React keys in ScriptsView and StatusBar replaced with stable identifiers.

## [0.1.6] - 2026-06-12

### Changed
- Shifted Welcome Screen cards horizontally for a modern, compact, and non-clashing structure.
- Status Bar: Removed "Fountain Mode" indicator, moved document counts to the right, and fully adapted style/colors to the active theme.
- Help Modal: Added instant-search guide containing fully indexed docs, keyboard shortcut references, and Fountain rules.
- Header Bar: Shrunk tab height to a sleek 30px, increased the size of tab close buttons, and made them always visible.
- Autocomplete: Restricted autocomplete popup suggestions strictly to character names.

### Fixed
- WebView Hang/Exit Loop: Resolved event-loop crash when exiting. Added `isExitingRef` close-request synchronization to handle native window close calls safely.
- Security Capability permissions: Added `"core:window:allow-destroy"` capability to allow programmatic frontend exit commands.
- Last Tab Exit: Closing the last open tab now cleanly closes the editor window and redirects back to the Welcome Screen.
- Startup File Associations: Added instant startup check to load double-clicked `.fountain` or `.actone` files directly into the editor, skipping the welcome screen.
- Autocomplete: Pressing Enter on a character name suggestion now inserts the name and moves the cursor to the next line.

## [0.1.5] - 2026-06-11

### Changed
- Parenthetical autocomplete suggestions no longer include parentheses in the suggestion list; stored as bare text (e.g. `smiles` instead of `(smiles)`). The `(` and `)` are preserved in the document via auto-match and the completion range logic.
- Removed "Language" group from parenthetical suggestions (in French, in Spanish, etc.).
- Autocomplete dropdown styling: reduced border-radius, added backdrop blur, tighter padding, accent-colored matched text, reduced item spacing with border-radius on hover.
- Editor context menu styling: denser layout, reduced border-radius and shadow.
- Editor Enter key now skips over a trailing `)` on parenthetical lines instead of breaking.

### Fixed
- Parenthetical completions now correctly replace only the text between `(` and `)`, keeping both parentheses intact.
