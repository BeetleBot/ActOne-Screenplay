# Changelog

## [0.2.16] - 2026-07-06

### Added
- **Production Tagging Undo/Redo**: Integrated the production tagging system with CodeMirror's history stack. Adding or removing tags via the editor's context menu can now be fully reverted and restored using standard undo/redo shortcuts.
- **Redo Shortcut**: Added `Ctrl+Shift+Z` as a supported shortcut for Redo on Windows and Linux, matching modern text editor standards alongside `Ctrl+Y`.
- **Custom Theme Sharing**: Added import/export support for custom themes via the `.actheme` JSON file format, featuring native save/open dialogs and schema structure validation.
- **Custom File Icons**: Created and integrated dedicated custom document icons for `.actone` screenplay bundles (dark-themed logo) and `.actheme` files (gradient-themed logo) for OS-level file associations.

### Changed
- **Cursor Focus Retention**: Implemented event capture in the workspace area so clicking in empty margins or below the screenplay page no longer hides the cursor, keeping the editor active.
- **Cursor Initialization**: The editor now automatically focuses and places the caret at the first line of the document on initial project load or script switch.

### Fixed
- **Tagging System Corruption**: Fixed right-click text selection loss and re-parsing data corruption bugs. Added `migrateProductionTags` to auto-repair flat/hybrid tag layouts in older or corrupted `.actone` bundles.

## [0.2.15] - 2026-07-06

### Changed
- **Ambient Sound Engine**: Completely rewrote the focus sound generator. Replaced synthetic procedural audio (Oscillators/Noise) with a file-based asset loading engine (`AudioBufferSourceNode`) using high-quality static MP3 loops (Light Rain, Coffee Shop, Wind in Trees, Ocean Waves) for smoother, less fatiguing background audio.
- **Window Resize Handles**: Reduced edge hit zone from 8px → 2px and corner size from 24px → 6px so the resize cursor only appears at the very edge of the window.
- **Window Border**: Added a thin 1px border around the app window (`body`) using `var(--border-color)` as a visible grab handle.
- **Empty Line Selection**: Plugin now only activates during actual drag-selection (skips cursor-only positions). Empty lines within a selection show a single-character-width marker via `::before` pseudo-element, matching Windows native selection behavior.
- **Animations Removed**: Removed `bouncy-zoom-in` dialog animation, `editor-fade-in`, `skeleton-shimmer`, `cinematic-drift`, `orb-drift-*`, `quote-fade-in`, and `logo-glow-pulse` keyframes for improved UI responsiveness. Removed `MuiPaper-root` from transition list.
- **MUI Transition Duration**: Set `MuiDialog` transition duration to `0`, `MuiPopover` and `MuiMenu` to `1` (instant). Tooltip `enterDelay` and `leaveDelay` set to `0`.
- **Welcome Screen**: Removed aurora breathing animation from background gradient.

### Added
- **Interactive Tutorials**: Added a new guided Onboarding Tour feature with two modes: a quick UI tour of the app interface, and an interactive Fountain writing sandbox that live-validates your formatting as you learn.
- **Clipboard Fallback**: Copy/cut operations now fall back to `document.execCommand("copy")` via a temporary textarea when `navigator.clipboard.writeText` fails.
- **Context Menu Focus**: Editor refocuses after context menu opens (`setTimeout(() => view?.focus(), 0)`).

### Fixed
- **Tutorial Closure Bug**: Fixed an issue in the Onboarding Tour where closing the tutorial overlay would incorrectly force-close the user's active project file and drop them back to the Welcome Screen.

### Removed
- **Retro Typewriter Audio**: Removed the typewriter ambient track and its procedural logic.

## [0.2.13] - 2026-07-04

### Changed
- **Header Bar**: Height increased from 30px → 40px. Command Palette button moved from ActivityBar into HeaderBar (replaces the ActivityBar `ActionKey` icon). Window control button heights adjusted (minimize: 48px, maximize/close: 40px). Tab border radius removed. Titlebar border-bottom removed.
- **ActivityBar**: Replaced MUI `IconButton` with custom `Box`-based buttons for better click feedback and performance. Removed `onOpenPalette` prop. Added press-bounce animation on active state. Active tab styling changed to filled primary background.
- **Store Update**: Simplified `install_store_update` — now returns a Microsoft Store URL instead of performing the installation directly. The frontend opens the URL via Tauri's `openUrl` plugin. Outside Tauri, falls back to `window.open` for the Store page.

### Fixed
- **ActivityBar Layout**: Removed unused vertical padding/gap that was causing inconsistent spacing.

## [0.2.12] - 2026-07-04

### Added
- **X-Ray Analysis**: Completed the screenplay analysis dashboard feature.

## [0.2.11] - 2026-07-04

### Changed
- **Welcome Screen**: Restored the v0.1.x welcome layout — centered logo, dynamic quote, three action cards (New Project, Open Project, Templates) and recent project chips — instead of the cinematic redesign.
- **Welcome Screen Animation**: Replaced static gradient with a subtle aurora glow at the top that breathes (slow scale + opacity pulse) using the theme's primary color. Theme-aware opacity (0.22 dark, 0.38 light) so it stays visible on both backgrounds.

### Added
- **Microsoft Store Update Check (Welcome)**: "Update available" button in the welcome screen footer appears when a Microsoft Store update is detected. Clicking it triggers the Store install flow.
- **Theme Cubes in Welcome**: Footer theme picker now shows the 2x2 color cube (editor / sidebar / accent / dropdown) on both the button and each menu item, matching the Quick Settings pattern.
- **Keyboard Shortcuts**: Ctrl+N and Ctrl+O now work in the standalone welcome window, using the `editor:ready` event pattern for reliable window transitions.

### Fixed
- **Logo Drag**: The welcome screen logo is no longer draggable (the browser default `img` drag behavior was making the app feel like a website). Added `draggable={false}`, `onDragStart` preventDefault, and `WebkitUserDrag: none`.

## [0.2.9] - 2026-06-29

### Added
- **Fade In (.fadein) Export**: Native OSF v5.0 XML exporter with correct `<style basestyle="..."/>` format, DEFLATE-ZIP packaging, and proper settings units (1/100 cm). Supports all element types (scene headings, action, character, parenthetical, dialogue, dual dialogue, transitions, lyrics, shots, centered text), scene numbers, inline bold/italic/underline, and title page metadata. 21 unit tests covering ZIP round-trip and format correctness.
- **Batch Export (Export All)**: New "Export All" button in the ScriptsView pane opens the same Export Modal. On export, prompts for a target folder and writes all scripts in the bundle as individual files using each script's name as the filename with the chosen format extension (.fdx, .fadein, .fountain, .pdf).
- **Export Modal Header**: Batch mode displays all script names comma-separated; export button text updates accordingly ("Export All as PDF" vs "Export to PDF").

### Changed
- **Export Formats**: Export Modal toggle group expanded from 3 (PDF / Fountain / FDX) to 4 (PDF / Fountain / FDX / Fade In).
- **FDX Export**: Added `generate_fdx_string` and `generate_fadein_bytes` Rust commands for generating export content without save dialogs (used by batch export).

### Internals
- Added `zip = "2"` crate dependency for `.fadein` archive packaging and `.actone` bundle read/write.

## [0.2.6] - 2026-06-28

### Added
- **Cross-Window Settings Sync**: Rust `AppPrefs` backend (`app_prefs.rs`) with cross-window `app-prefs:changed` broadcast event, paired with a frontend `AppPrefsEngine` mirroring the `ThemeEngine` pattern. Changing a setting in any window propagates automatically to all open windows (SettingsWindow, HelpWindow, ThemeManagerWindow, TagManagerWindow, and main editor).
- **"Hide the Tags" Toggle**: Ne    w setting hides production breakdown tag markers (`=`) in the editor for a cleaner reading view. Toggle via Settings/Quick Settings or Command Palette.
- **Quick Settings Theme Picker**: Redesigned theme section with color swatches grouped by Light / Dark / Adaptive / Custom, matching the Welcome Screen pattern.
- **Per-Script Settings**: New `perScriptSettings.ts` utility enables script-specific settings in multi-script `.actone` bundles. Production tags, parking items, todos, notepad, and character genders are now stored and retrieved per individual script rather than globally.

### Changed
- **Theme Resolution**: Introduced shared `resolveThemeConfig()` in `themeUtils.ts` for consistent theme resolution across all windows, including custom themes and adaptive (system dark/light) mode.
- **SettingsWindow**: Removed theme dropdown; theme selection is now exclusively in Quick Settings. The window now respects cross-window pref changes.
- **TagManagerWindow**: Removed Edit Tags tab. The window now receives resolved per-script production tag settings on init.
- **.actone Bundle Format**: Multi-script bundles now store `characters.json`, `todos.json`, `parking.json`, and `notepad.json` as per-script maps. Removed `marker.json` entirely from the bundle.
- **Editor Line Tracking**: Active line tracking switched from ID-based to index-based (`activeLineNumber`), improving OutlineView scroll synchronization and scene selection accuracy.
- **Smart Clipboard**: Copy, cut, and paste in Command Palette now use `navigator.clipboard` API instead of deprecated `document.execCommand`.
- **Chunk Splitting**: Improved Rollup chunk partitioning in `vite.config.ts` for smaller async bundles.

### Fixed
- **HelpWindow & ThemeManagerWindow**: Now correctly load custom themes and respect `appScale` / `systemDark` from the broadcast state.
- **Page Breaks**: Removed stale `pageBreaks: undefined` spread from `FileContext` when merging parsed document settings.

### Removed
- **Scrite References**: Removed residual Scrite-related comments from the PDF exporter Rust source.
- **marker.json**: Removed from `.actone` bundle read/write (legacy artifact; marker data was never actually used).

## [0.1.16] - 2026-06-22

### Changed
- **Branding Attribution**: Renamed Lune Studio Works to Write Up Film Service Company.
- **Markers Navigation Filters**: Rebuilt the Markers list filter UI. Replaced static color chips with a popover filter menu containing Marker Color and Storyline filters.
- **Marker Lists Item Details**: Added outlined storyline tag chips inside each list item matching navigator style.

### Fixed
- **Vite Developer Server**: Ignored Visual Studio `.vs/` files in Vite's HMR watcher to prevent file lock crashes on Windows.
- **CI Workflows**: Enabled Rust caching in release actions and resolved MSIX packaging build failure by correcting the Square310x310Logo icon target.

## [0.1.13] - 2026-06-21

### Added
- **Inline Ghost Text Autocomplete**: Character names, locations, and parenthetical extensions (V.O., O.S., etc.) now appear as faint ghost text inline as you type. Press Tab to accept; press ArrowDown to open the full dropdown for alternative matches.
- **Quick Tag Mode**: Hold Ctrl while right-clicking a selection to open a streamlined context menu showing only category/tag options — no more wading through the full menu for production breakdown tagging.
- **Empty Line Visual Selection**: Empty lines now properly show selection highlighting, making multi-line selections visually consistent.
- **Gender Cycle Pill**: In the Characters sidebar, gender is now set by clicking a colored pill that cycles through Unknown → Male → Female → Non-Binary, replacing the previous dropdown menu.
- **Tutorial Topics Reference**: Added `TUTORIAL_TOPICS.md` outlining planned video tutorial topics for future documentation.
- **Production Breakdown Matrix**: Added a structured, scene-wise grid view that aggregates breakdown tags (Cast, Prop, VFX, etc.) under their corresponding scenes for easier reference.
- **CSV Export**: Added support for exporting production breakdown data to a CSV sheet (using native save dialogs under Tauri, and data-URI downloads under web browsers).
- **Automatic Cast Detection**: Scenes automatically include speaking characters in their Cast list columns by scanning for dialogue elements, saving manual tagging overhead.
- **Focus Mode**: Added a Focus Mode toggle (Settings → Editor, or via Command Palette) that fades all non-active lines to reduce visual clutter and help writers concentrate on the current line.

### Changed
- **Autocomplete Activation**: Autocomplete now activates only on explicit request (Ctrl+Space), avoiding unwanted popups while typing. Character and location completions appear inline as ghost text instead.
- **Autocomplete Dropdown Styling**: Cleaner, tighter dropdown with reduced padding, no backdrop blur, and rounded item corners.
- **Section Heading Detection**: `#` and `##` section headings are now properly distinguished from invalid `###` prefixes.
- **Shot Line Blank Line Insertion**: Pressing Enter after a shot line now automatically inserts the required blank line, matching other Fountain element behavior.
- **Context Menu Styling**: Backdrop blur removed from context menus for better consistency across platforms.
- **Repository Optimization**: Streamlined `.gitignore` rules and removed untracked vendored folders (like `ref/`) from version control tracking.
- **Build Chunk Optimization**: Configured Rollup code-splitting in `vite.config.ts` to separate Material UI and CodeMirror libraries into separate chunks, eliminating the 500 KB bundle size warning.
- **Character Autocomplete Case Sensitivity**: Ghost text and dropdown character suggestions on action lines now only trigger when the typed text is all-uppercase (e.g., `SM` → `SMITH`) or forced with `@`. Lowercase input no longer produces unwanted character suggestions.

### Removed
- **ACTONE Metadata Comments**: The embedded `/* ... ACTONE: ... END_ACTONE*/` comment block system has been removed. Settings are no longer stored inside `.fountain` files, simplifying the format. Existing files with these blocks will read cleanly — the blocks are simply ignored.
- **Legacy Autocomplete Module**: Replaced the old `autocomplete.ts` system with the new inline ghost-text autocomplete (`inlineAutocomplete.ts`).
- **Collapsible Headings (Folding)**: Removed the editor folding/collapse feature for section and scene headings.
- **Active Line Highlight**: Removed the active line background highlight from the editor.

### Fixed
- **Test Environment & Dependencies**: Fixed the missing/corrupted package installation of `pretty-format` that caused the Vitest runner to fail rendering test suites.
- **Inter UI Font Assets**: Restored the Inter UI font files (`woff2` formats) to `public/fonts/` to resolve asset-resolution warnings during compilation and ensure consistent UI styling.

## [0.1.12] - 2026-06-20

### Changed
- **Editor Font Rendering**: Applied `text-rendering: optimizeLegibility` and `font-weight: 450` to `.cm-editor` for smoother Courier Prime glyph rendering on Windows/Linux.

## [0.1.11] - 2026-06-15

### Added
- **Dynamic Versioning**: Implemented automated version synchronization from `package.json` to Tauri configuration and Rust compiler config (`Cargo.toml`).

### Changed
- **Planning Board Drag & Drop**: Enabled seamless, fluid drag-and-drop animation and container layout shifting across different section columns.
- **View Switcher Control**: Redesigned the Editor/Planning mode switcher in the status bar to operate as a direct toggle click instead of a dropdown menu.
- **Branding Attribution**: Transitioned project metadata, author fields, and copyright elements to brand under "Write Up Film Service Company".

### Fixed
- **Windows Drag & Drop**: Resolved exceptions under WebView2 (Windows WebView) that caused drag-and-drop actions to silently abort.
- **Delete Button on Virtual Section**: Hidden the delete button on the unassigned/preamble section header to prevent deletion of the virtual column.

## [0.1.10] - 2026-06-15

### Added
- **Planning Board**: New kanban-style storyboard view that visualizes screenplay structure as columns (sections), grouped areas (subsections), and draggable scene cards with synopsis editing. Switch via status bar or `Ctrl+Shift+P`. (src/components/PlanningBoard.tsx, src/utils/boardUtils.ts)
- **Hide Fountain Markup**: New toggle in Settings and Quick Settings menu to hide Fountain syntax prefixes (`.`, `@`, `!`, `>`, `~`, `#`, `=`) on inactive lines for a clean manuscript-like reading view. Active line still shows prefixes. (src/editor/fountainSyntax.ts, src/editor/useCodeMirror.ts, src/components/SettingsModal.tsx, src/components/layout/ActivityBar.tsx, src/constants.ts, src/context/UIContext.tsx)
- **View Mode Switching**: Toggle between Editor and Planning Board modes via status bar dropdown or `Ctrl+Shift+P` keyboard shortcut. Status bar shows context-sensitive stats for each mode. (src/components/layout/StatusBar.tsx, src/components/layout/Workspace.tsx, src/hooks/useKeyboardShortcuts.ts)
- **Scene Highlighting (Color Coding)**: Right-click a scene heading in the editor and choose Highlight Scene to assign a color (Red, Orange, Yellow, Green, Blue, Purple, Pink). Colored left border shows in editor; colored card border shows in Planning Board. (src/components/FountainEditor.tsx)
- **Text Parking**: New sidebar tab for storing temporary text snippets. Right-click a selection and choose "Park Selection". Click a parked item to re-insert it at cursor. Persists in .actone bundles. (src/components/layout/ActivityBar.tsx)
- **Tab-to-Cycle Line Prefixes**: Press Tab at the start of a line to cycle through Fountain prefixes: `@` (forced character) → `.` (forced scene heading) → `>` (forced transition) → normal. (src/editor/fountainSyntax.ts)
- **Smart Newline Handling**: Pressing Enter after scene headings, character names, parentheticals, dialogue, or transitions automatically inserts correct blank line spacing per Fountain spec.
- **Look Up Word**: Right-click any selected word and choose "Look Up" to search it on Google in a new browser tab.
- **Scene Numbers**: Command Palette options to auto-number scene headings (`#1#`, `#2#`, ...) and clear all scene numbers at once.
- **Scene Drag-and-Drop Reordering**: Drag scenes in the Outline sidebar to reorder them with visual insertion indicator. Editor text updates automatically.
- **Editor Context Menu Expansion**: Right-click menu now includes Tag (production breakdown), Highlight Scene (color), Drop Marker, Format (Bold/Italic/Underline/Clean Spaces), Transform Case (UPPER/Title/lower), Look Up Word, Create Task, and Park Selection.
- **Import Structure Template**: Command Palette > Import Structure Template to insert predefined screenplay structures (Three-Act Structure, Save the Cat, Hero's Journey) as outline elements.
- **Title Page Editor**: Command Palette > Edit Title Page to set screenplay title, author, contact, draft date, and more. Embedded in Fountain file and appears in PDF exports.
- **4 New Built-in Themes**: Warm Sepia, Matrix Charcoal, Pitch Black, and Pitch White.
- **5 Preset Custom Themes**: Noir, Ocean, Sunset, Forest, Lavender available in Theme Manager.
- **Font & Paper Settings**: Choose Courier Prime or Courier Prime Sans; switch paper size between US Letter and A4 for PDF formatting. (src/components/SettingsModal.tsx)
- **Autosave, Smart Quotes, Auto-Parentheses, Autocomplete Toggles**: New Settings toggles for all smart editing features. (src/components/SettingsModal.tsx, src/context/UIContext.tsx)
- **Keyboard Shortcuts**: `Ctrl+Tab`/`Ctrl+PageDown` (next tab), `Ctrl+Shift+Tab`/`Ctrl+PageUp` (prev tab), `Ctrl+A` (select all) added to help reference.
- **Help Modal Overhaul**: Added "Settings & Config" tab; restructured and expanded feature documentation with detailed descriptions for all new features. (src/components/HelpModal.tsx)
- **Theme Manager**: Full modal UI for creating, editing, and applying custom color themes with color pickers and presets. (src/components/ThemeManagerModal.tsx)

### Changed
- Status bar displays Planning Board stats (Sections/Subsections/Scenes) when in board mode; hides sprint details for bundle files. (src/components/layout/StatusBar.tsx)
- File save-as (.fountain and .actone) now correctly persists scripts state, filePath, isDirty, and activeScriptIndex after both Tauri save dialog and browser download flows. (src/context/FileContext.tsx)
- Editor syntax highlighting refactored to support "hide syntax" mode; `syntaxDeco` uses `Decoration.replace` vs `Decoration.mark` based on line activity and setting. (src/editor/fountainSyntax.ts)
- Theme mode toggles (Light/Dark) replaced with full theme selector supporting 6 built-in themes + custom themes. (src/theme/muiTheme.ts, src/components/ThemeManagerModal.tsx)
- Workspace component conditionally renders `<PlanningBoard />` or `<FountainEditor />` based on `mainView` state. (src/components/layout/Workspace.tsx)
- `useKeyboardShortcuts` accepts new `toggleViewMode` action mapped to `Ctrl+Shift+P`. (src/hooks/useKeyboardShortcuts.ts)

### Fixed
- vitest config excludes `ref/` directory to prevent test discovery in vendored code. (vitest.config.ts)
- `.actone` bundle re-save (Ctrl+S) now correctly updates scripts array on the file state instead of losing multi-script data.
- Browser download save-as for plain `.fountain` files properly resets scripts state to avoid stale script references.
- Editor scroll area conditionally renders search panel and paper only in editor mode; prevents planning board from inheriting editor scroll/zoom styles.

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
