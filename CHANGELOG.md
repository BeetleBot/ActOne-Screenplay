# Changelog

## [0.4.21] - 2026-08-27

### Added / Improved
- 📦 **Gen 3 Multi-Document `.actone` Bundle Layout** – Standardized the `.actone` bundle architecture so all screenplay and prose documents are cleanly organized and preserved within the `files/` directory alongside the `project.json` manifest. Automatically migrates legacy root-level script bundles on open.
- 🔄 **Automatic Script Metadata Migration** – Renaming a document inside the Project Pane now automatically migrates all associated metadata—including notes (`notepad`), tasks (`todos`), parking lots (`parking`), character genders (`genders`), character profiles (`characterProfiles`), and production tags (`productionTags`)—to the new file path, preventing orphaned data.
- 🧹 **Orphaned Metadata Cleanup on Script Deletion** – Deleting a script cleans up its associated metadata across all settings maps, and multi-script bundle export isolates production tags via `resolvePerScript()`.
- 🖱️ **Project Pane Right-Click Context Menu** – Added direct `onContextMenu` support across all document cards in the Project Pane, providing instant right-click access to Rename, Move Up, Move Down, Duplicate, and Delete actions.
- 🖱️ **1:1 Scrollbar Pointer Tracking & Rubber-Band Removal** – Replaced global `scroll-behavior: smooth` with `scroll-behavior: auto` and applied `overscroll-behavior: none` across the editor scroll area and sidebar cards. Dragging the scrollbar thumb now tracks the mouse pointer instantaneously without elastic lag or boundary bounce.
- 🚀 **Streamlined Welcome Screen** – Removed redundant Theme dropdown options from the Welcome Screen for a cleaner, distraction-free project launcher interface.
- 🌐 **Cross-Platform Docs Generation & Web Sync** – Created dedicated `generate_docs_linux.js`, `generate_docs_windows.js`, and auto-detecting `generate_docs.js` scripts in `iyal-ink/`, keeping the public web documentation in sync with all 88 help articles across 10 categories.
- 🧪 **Comprehensive Automated Test Coverage** – Expanded the test suite across the entire codebase to **63 test files and 652 tests** (100% pass rate), adding coverage for UI components, Muse AI tools and providers, Theme Engine, file utilities, script analysis, and custom context providers.

### Fixed
- ✏️ **Project Pane Rename Focus & Typing Glitch** – Fixed an issue where opening the Rename input from the context menu caused focus-restoration race conditions in MUI Menu to blur the input prematurely. Configured autofocus with one-time text selection on focus to ensure uninterrupted typing.
- 💾 **Save Pipeline Data Integrity & Re-Entrancy Guard** – Updated `saveFile` to write `rawText` directly, eliminating latency from debounced AST reconstruction. Added an `isSaving` guard to prevent Windows file-lock collisions (`SharingViolation`) during rapid double `Ctrl+S` keystrokes.
- 🔒 **Atomic Backend File Writes** – Updated Tauri backend save dialogs for PDF and Theme exports (`save_pdf_dialog`, `save_theme_dialog`) to write atomically via temporary files, preventing partially written or corrupted files upon system interruptions.

## [0.4.20] - 2026-08-26

### Added / Improved
- 🎨 **Comprehensive UI Overhaul & Design System Unification** – Unified all UI elements across the app with consistent border radii (pill buttons, rounded cards, dialog surfaces) and soft multi-layered elevation shadows across both light and dark modes.
- 🚀 **Redesigned Welcome Screen** – Modernized the welcome experience with floating window controls, an enlarged ActOne brand mark, elevated floating island cards with smooth hover feedback, and a StatusBar-styled footer with centered copyright info.
- 🪟 **Streamlined TitleBar Across All Windows** – Cleaned up TitleBar headers across all secondary windows and modals (Settings, Help, Export, Themes, X-Ray, About, Tutorials, Fix Formatting, Title Page Editor, Structure Import) by removing redundant icons and resolving hardware-accelerated tile clipping on WebKitGTK.
- 🎬 **Standalone Fountain Mode Refinement** – Automatically hides the Project / Scripts pane from the Activity Bar when working on standalone Fountain files (`.fountain`, `.txt`), preserving a focused, distraction-free environment.
- 🧹 **Feature & Footprint Cleanup** – Completely removed legacy ambient sound features and dependencies, streamlining application settings and memory footprint.

### Fixed
- 📂 **Welcome Screen File Picker Stability** – Prevented duplicate dialog triggers when dismissing or canceling the file picker on the Welcome Screen.
- 🖥️ **WebKitGTK Compositor Artifacts** – Fixed hardware-accelerated clipping and uninitialized tile issues on borderless windows under Linux WebKitGTK.

## [0.4.19] - 2026-08-22

### Fixed
- 💾 **Prose Document Save & Content Preservation** – Resolved an issue where opening an `.actone` bundle with an active prose/markdown document (`.md`) caused its text content to be saved as an empty string. The saving and file-opening routines now directly use raw markdown text and initialize dedicated prose structures rather than reading empty screenplay line lists.

## [0.4.18] - 2026-08-22

### Added / Improved
- 🚀 **Project Landing Pad & Zero-Script Projects** – New `.actone` projects now start cleanly on the interactive Landing Pad, offering instant actions to create a Screenplay (`.fountain`), start Prose (`.md`), or import existing files without forcing a blank editor.
- 📝 **Prose & Markdown Document Support (`.md`)** – Introduced native multi-document Prose support within `.actone` bundles. Write treatments, outlines, character bibles, and prose notes alongside your screenplays with full Markdown formatting (headings, blockquotes, ordered/unordered lists, and code blocks).
- 📊 **Prose-Specific Statistics & Metrics** – Switched status bar and document metrics to context-aware modes: displaying word count, character count, and estimated reading time for Prose documents, and page count, scene count, and characters for Screenplay documents.
- 📄 **Native Rust Markdown PDF Export** – Extended the backend Rust PDF export engine to render Markdown prose documents with clean typography, blockquote indentation, formatted lists, and custom styling.
- 🏗️ **Modularized Core Editor Architecture** – Refactored the editing core into `CoreEditor`, `useCoreCodeMirror`, and `useScriptCodeMirror` with `ScriptEditorContext`, streamlining state management, scene navigation, and multi-document switching.
- 🗂️ **"Project Pane" Nomenclature & UI Unification** – Renamed the legacy "Scripts Pane" to "Project Pane" across the Activity Bar, tooltips, Command Palette, and documentation to reflect multi-document screenplay and prose workspaces.
- 🎓 **Interactive Onboarding Tutorials Redesign** – Updated interactive tours for the new UI: the Basic UI Tour launches on the Landing Pad and seamlessly loads the sample screenplay (*Bee Detective v2*) upon advancing. Completely removed obsolete tagging steps and updated Outline View guides.
- ⌨️ **High-Visibility Shortcut Badge on Tour Cards** – Replaced the condensed shortcut label on Tour Card buttons with a prominent, high-contrast `Shift+Enter` badge.
- 📋 **Seamless Structure Template Import on Plain Projects** – Importing screenplay structure templates (Save the Cat, Hero's Journey, Three-Act Structure) into an empty project now automatically generates `<filename>_<structurename>.fountain`, populates the structure beats, and opens the editor.

### Fixed
- 🔌 **Tauri IPC Listener Cleanup Stability** – Fixed race conditions during window and file switching where unlisteners could trigger before handler registration completed, eliminating `TypeError: Cannot read properties of undefined (reading 'handlerId')` errors.
- 📜 **Prose Document Parsing in File Context** – Corrected settings merging and document state updates when switching between screenplay and markdown documents within multi-script bundles.

## [0.4.17] - 2026-08-17

### Added / Improved
- 🔤 **Curly Apostrophe & Typographic Contraction Support** – Enhanced spellchecking and word tokenization to natively recognize right single quotation marks / curly apostrophes (`\u2019`), preventing false-positive spelling errors on contractions like `couldn’t` or `don’t`.
- 🎭 **Character Name Exclusions in Spellchecking** – Integrated dynamic screenplay character name awareness into the spellchecking engine so character names from the script are automatically excluded from being flagged as spelling errors.
- ⚡ **Optimized Background Spellcheck Scheduling** – Streamlined spellcheck scheduling by caching full document checks on startup/forced events and utilizing debounced viewport checks during edits to minimize background re-processing.
- 🎨 **Enhanced Catppuccin & Custom Theme Mappings** – Expanded theme system with dynamic Catppuccin palette color mapping overrides across light and dark modes, standardizing surface, accent, and typography colors.
- 💬 **Native Tauri Dialogs** – Migrated browser confirm and alert dialogs (such as project structure and screenplay element imports) to native Tauri dialogs for a cohesive desktop experience.
- 🔍 **Command Palette Streamlining** – Refactored the Command Palette to remove redundant recent command tracking and polished category subheader typography and spacing.

### Fixed
- 📜 **Dialogue & Parenthetical Contiguity** – Refactored Fade In and screenplay dialogue parsers to maintain contiguity between dialogue and parenthetical lines, preventing improper breaks during script import.

## [0.4.16] - 2026-08-16

### Added / Improved
- ✍️ **Native Rust Spellcheck Engine** – Integrated a high-performance, pure-Rust spellchecking engine using `spellbook` (from the Helix editor team), delivering instantaneous, memory-safe spellchecking without any C++ runtime dependencies.
- 📦 **Embedded Offline English Dictionary** – Bundled American English dictionary files (`.aff` + `.dic`) directly into the application binary via `include_str!`, ensuring out-of-the-box offline spellchecking with zero downloads.
- 🌐 **Multi-Language Dictionary Downloads** – Built-in dictionary manager supporting on-demand downloads for international languages (Spanish, French, German, Italian, Portuguese, Russian, and more) directly from CDN with disk caching.
- 🎬 **Screenplay Element Awareness** – Screenplay-specific syntax and terms (`INT`, `EXT`, `POV`, `VO`, `FOUNTAIN`, `SLUGLINE`, uppercase acronyms $\le 5$ chars), as well as Scene Heading lines, Character lines, Dual Character lines, and Transition lines, are intelligently excluded from spellchecking.
- 〰️ **Persistent High-DPI Squiggly Underlines** – Replaced coarse native wavy underlines with crisp, symmetrical repeating SVG wave decorations that hug the character baseline and stay persistent across clicks, cursor movements, and scrolling.
- 🖱️ **Context Menu Corrections & Dictionary** – Right-clicking any flagged typo displays instant spelling replacement suggestions, **"Add '[word]' to Dictionary"** (persisted across sessions), and **"Ignore '[word]'"** (for the current session).
- ⚙️ **Dedicated Spellcheck Settings Tab** – Introduced a new **Spellcheck** tab in Settings with a master toggle (off by default), active language selector, installed dictionary management, downloadable languages catalog, and custom dictionary word list management.
- 📊 **Status Bar Language Indicator & Quick Menu** – Added an active language indicator to the status bar (rendered normally when enabled, faded when disabled) with a popup menu to toggle spellcheck on/off, switch languages, or open settings.
- 📥 **Script Importers (Final Draft, Fade In & Fountain)** – Added direct script import from the Welcome Screen and editor supporting **Final Draft (`.fdx`)**, **Fade In (`.fadein`)**, and **Fountain (`.fountain`, `.txt`)** formats.
- 🎯 **Forced Fountain Element Formatting** – Parsed scripts automatically receive forced Fountain syntax (Scene Headings with `.`, Characters with `@`, Actions with `!`, Transitions with `>`, and Shots with `!!`), guaranteeing 100% accurate screenplay element classification.
- 💾 **Instant `.actone` Project Conversion** – Imported scripts are instantly structured into native ActOne projects and trigger an immediate save prompt to preserve work directly as `.actone` bundles.
- ⌨️ **Command Palette Actions** – Added "Import Screenplay...", "Enable Spellcheck" / "Disable Spellcheck", and "Open Spellcheck Settings..." commands.
- 📄 **Stable & Accurate Editor Pagination** – Harmonized editor status bar pagination with native Rust PDF export metrics; eliminated rapid page number jumping during typing by preserving authoritative Rust page breaks in desktop mode and correctly distinguishing title page headers from content pages.
- 🪟 **Window Size & Position Retention** – The main editor window now remembers its size, position, and maximized state across sessions on Windows, Linux, and macOS, restoring it instantly on launch without any resize flash.

## [0.4.15] - 2026-08-11

### Fixed
- 💾 **Large Screenplays & `.actone` Bundle Save Fix** – Resolved a critical saving freeze on large screenplays (80–100+ pages) by restoring synchronous direct zipping (`zipSync`) and converting byte buffers to flat numeric arrays before Tauri IPC transfer. This prevents Web Worker security blocks and JSON object map inflation from hanging the save process.
- 🔄 **Infinite Page Breaks Loop Fix** – Eliminated a main-thread deadlock in `paginateScreenplay` where backtracking for consecutive scene headings or character names at page breaks created an infinite pagination loop.
- 🔌 **Safeguarded Tauri IPC Event Cleanup** – Wrapped event unlisten handlers in `App.tsx` with safety `try/catch` guards to prevent `TypeError: Cannot read properties of undefined (reading 'handlerId')` crashes during hot-reloads and unmounts.

### Added / Improved
- 🗄️ **Project-Centric Snapshots** – Standardized screenplay snapshot backups to save exclusively inside the `.snapshots/` folder within your active project directory. Removed redundant save location dropdowns from Settings.
- 📂 **Snapshots Folder Shortcut** – Updated the "Open Snapshots Folder" action to open the root `.snapshots/` directory, allowing instant visibility of all historical script backups.
- 📦 **Streamlined Repository** – Cleaned up the repository by removing legacy Flatpak configuration files, workflows (`build-flatpak.yml`, `update-flathub.yml`), version syncing tasks, and developer guide references.

## [0.4.14] - 2026-08-11

### Fixed
- ⏭️ **Scene Navigation Keybinding Fix** – Intercepted `Alt-ArrowUp` and `Alt-ArrowDown` in CodeMirror's internal keymap to prevent default line dragging, restoring smooth `Alt+↑` / `Alt+↓` scene navigation (`useCodeMirror.ts`).
- 📦 **Flatpak Host Fonts Permission** – Added `--filesystem=host-fonts` to Flatpak finish-args (`flatpak/ink.iyal.actone.yml`), allowing access to host system fonts without sandboxing path reservation warnings.

## [0.4.13] - 2026-08-11

### Added
- 📖 **Quick Guide Overlay (`F1`)** – Pressing `F1` opens the new **Quick Guide** modal (`QuickGuideModal.tsx`), featuring sticky tabs for **Shortcuts** and **Syntax Reference**, generous spacing, and a brand footer with `iyal.ink`.
- ⌨️ **Phosphor `KeyReturn` Icon** – Integrated Phosphor's `KeyReturn` icon (`KeyboardShortcutsIcon`) for the Quick Guide header, supporting all 3 dynamic icon style variants (`fill`, `regular`, `duotone`).
- ⏭️ **Previous & Next Scene Navigation** – Added `Alt+↑` / `Alt+PageUp` (Previous Scene) and `Alt+↓` / `Alt+PageDown` (Next Scene) shortcuts for rapid keyboard navigation between scene headings (`EditorContext.tsx`).
- 🔄 **Centralized Dynamic Shortcuts & Syntax Registry** – Created `src/constants/shortcuts.ts` as a single source of truth for all keyboard shortcuts and exact Fountain syntax rules (sluglines, character names, transitions, lyrics, dual dialogue, markers, storylines, and scene colors).

### Fixed
- 🐛 **Linux CodeMirror `p.top` Layout Crash** – Refactored scroll position measurements in `useCodeMirror.ts` to use CodeMirror's native `view.requestMeasure()` API instead of raw `requestAnimationFrame` calls, eliminating `TypeError: undefined is not an object (evaluating 'p.top')` crashes on WebKit / Linux.
- 📦 **GitHub Actions Flatpak Workflow** – Fixed CI/CD Flatpak build failures by implementing a 2-job pipeline (`build-binary` on bare runner + `package-flatpak` inside `ghcr.io/flathub-infra/flatpak-github-actions:gnome-48` container with `--privileged` and `safe.directory` setup).

## [0.4.12] - 2026-08-10

### Fixed
- 🪟 **Windows App Shutdown Crash Fix** – Fixed an intermittent Windows application crash (`tao` event loop runner panic: `cannot move state from Destroyed`) when closing the app by intercepting exit signals cleanly.

### Added / Improved
- 🛑 **Graceful App Shutdown Sequence** – Implemented a clean process teardown sequence that automatically aborts active background streaming/AI requests (`ollama::cancel_all_sessions`), flushes pending panic/error logs to disk, and safely releases OS system resources before process exit.

## [0.4.11] - 2026-08-10

### Fixed
- 🔢 **Scene Renumbering & Clearing Fix** – Fixed "Renumber Scene Headings" and "Clear Scene Numbers" in the Command Palette by dispatching document changes directly to CodeMirror's `editorView`, resolving an issue where updates were blocked or lost.
- 🎨 **Classic Dark Theme Selection Contrast** – Fixed low contrast bug on selected active items in Classic Dark theme where dark grey text rendered on dark grey backgrounds by forcing high-contrast text rendering.

### Added / Improved
- 🇮🇳 **Enhanced Indic Script Language Support** – Integrated font fallback chain (`--font-editor-indic`) featuring bundled fonts for Malayalam (*Baloo Chettan 2*, *Mukta Malar*), Hindi/Marathi (*Mukta*), Telugu (*Hind Guntur*), Bengali (*Hind Siliguri*), Gujarati (*Hind Vadodara*), Kannada (*Baloo Tamma 2*), Punjabi (*Baloo Paaji 2*), and Odia (*Baloo Bhaina 2*).
- 🔤 **Global UI Font Engine** – Migrated the application design system to **Inter** across all UI elements, navigation panels, header tabs, and popovers (`src/index.css`, `src/theme/muiTheme.ts`).
- 🏷️ **Uniform Fixed-Size Script Tabs** – Standardized open file tabs in the header bar to a clean 175px fixed width with text-overflow ellipsis for long titles (`HeaderBar.tsx`).
- 💡 **Rich Script Tooltips & 1-Second Hover Delay** – Added rich script title and file path tooltips to tabs and configured a global 1-second (1000ms) hover delay across all tooltips, including Activity Bar buttons (`muiTheme.ts`).
- 🎨 **Outline View Overhaul** – Redesigned scene cards with soft, translucent background color fills (`color-mix`), bold 700 scene titles, readable `0.7rem` scene number badges, and separate attached sub-cards for Storylines and Synopses.
- ✍️ **Enhanced Synopsis Styling** – Improved synopsis font size (`0.75rem` / 12px) with comfortable line-height (`1.4`) and dedicated sub-card presentation.
- 🖱️ **Theme-Adaptable Mouse Cursor** – Integrated Bootstrap text selection mouse cursor with dynamic light/dark mode color adaptation (pitch black in light mode, pure white in dark mode).

## [0.4.10] - 2026-08-09

### Fixed
- 🖱️ **Linux Caret & Selection Fix** – Fixed duplicate caret and selection rendering bugs on Linux by replacing CodeMirror's `drawSelection` with a custom cursor layer.

### Changed / Improved
- 🎨 **Catppuccin Mocha Theme** – Made the theme more consistent using proper Mocha palette colors (Mantle sidebar, darker Crust editor).

## [0.4.9] - 2026-08-08

### Added
- 🤖 **Agentic AI Tools & Batch Tool Calls** – Enabled dynamic tool execution within Muse AI (`src/lib/aiTools.ts`), supporting batch tool calls, direct script reading/editing, line insertions, deletions, replacements, scene metadata extraction, and automatic character profile syncing with the X-Ray window.
- 💬 **Direct AI Chat & Composer** – Replaced legacy prompt listeners with direct AI chat session management in `MusePanel.tsx` and `useAIChat.ts`, featuring streaming responses, custom prompt configurations, rich markdown rendering, and interactive Fountain script diff cards (`FountainBlock.tsx`).
- ⚡ **Scene Indexing Engine** – Integrated a high-performance AST scene indexer (`src/utils/sceneIndexer.ts`) with character, location, dialogue, and line range extraction for instant script navigation and precise AI tool targeting.
- 🎯 **Global Cursor Context** – Added `CursorContext` to track active cursor positions, line numbers, and script selections globally across the editor and AI features.
- 🎨 **App Native Context Menus** – Replaced heavy Material-UI context menus with zero-dependency native-style custom app context menus (`ContextMenu.tsx`) across the editor, tab bar, and snapshot panel with full keyboard accessibility, submenus, and viewport auto-clamping.

### Changed / Improved
- 💾 **Smart Idle Auto-Save** – Enhanced auto-save logic in `FileContext.tsx` to monitor user keypress activity and defer background file saves until the user has been idle for at least 1500ms using `requestIdleCallback`, eliminating micro-stutters while typing.
- 🚀 **Active Line Render Optimization** – Refactored CodeMirror's `activeLineAlwaysPlugin` to update line decorations only when the cursor line number changes or document updates, reducing redundant re-renders on selection events.
- 📜 **Typewriter Pointer Selection** – Extracted typewriter scroll logic into `src/editor/typewriter.ts` and disabled viewport centering on pointer selection events to prevent erratic scrolling during mouse drag selection.
- 📦 **Asynchronous Bundle Packing** – Converted `.actone` file bundle compression (`src/utils/actone.ts`) to execute asynchronously off the main UI thread using `fflate`.
- 👁️ **Enhanced Editor Caret Visibility** – Increased cursor width to 2px with high-contrast dynamic theme color matching (`var(--text-color, var(--editor-cursor))`) for improved visibility across light and dark themes.

### Fixed
- 🏷️ **Publisher Display Name Fixes** – Updated MSIX installer manifests (`AppxManifest.xml`, `bundle.config.json`, `Cargo.toml`, `tauri.conf.json`) to use `iyal.ink` as the publisher display name and removed deprecated configuration properties.
- 🪟 **Tauri Window Teardown Crash** – Prevented invalid resource ID rejections during window dragging and teardown from surfacing as false crash windows, while retaining them for diagnostics.

## [0.4.7] - 2026-08-05

### Added
- ✨ **Fix Formatting Feature** – Introduced a standalone screenplay layout formatting engine (`src/utils/fixFormatting.ts`) accessible via the Command Palette (`Ctrl+K`). Automatically collapses dialogue blank lines, enforces 1 blank line between elements, preserves multi-line action paragraphs, trims whitespace after forced syntax symbols (`.`, `#`, `=`, `@`, `!`, `~`), trims inline notes (`[[ ]]`), and normalizes title page headers.
- 📊 **Fix Formatting Summary Modal** – Added a 0px border-radius summary modal (`FixFormattingModal.tsx`) that opens upon completion of Fix Formatting, displaying a breakdown of lines removed, dialogue spaces collapsed, syntax prefixes trimmed, and note spaces cleaned.
- 📚 **Help Guide & Docs Integration** – Added a dedicated "Fix Formatting" article to the Help Guide (`src/data/helpArticles.tsx`) and updated feature documentation (`13-command-palette.md`, `19-help-guide.md`).

### Changed / Improved
- ⚡ **Accelerated Startup & Welcome Screen** – Parallelized initial recent file `file_exists` filesystem checks using `Promise.allSettled()` and pre-cached theme state synchronously from `localStorage`, eliminating load lag on Windows and Linux.
- 🎨 **App Re-branding & Title** – Updated Welcome Screen header title to **"Welcome To ActOne Screenplay!"**.
- 🔲 **Studio-Style About Modal** – Redesigned `AboutModal.tsx` with a sharp 0px border-radius layout, integrated `<TitleBar />`, and squarish container cards.
- 🏷️ **Copyright Tag Link** – Replaced plain copyright text in AboutModal and WelcomeScreen footers with a tag badge containing a clickable `iyal.ink` link.
- 🔒 **Viewport & Scroll Lock** – Added root-level scroll position snapshotting in `useModals.ts` to prevent editor viewport jumps when opening or closing modals.

### Removed
- 🔋 **Low Power Mode Removal** – Removed deprecated Low Power / Battery Saver mode settings, CSS overrides (`body.low-power-mode`), and parse-delay throttle logic across the app.

## [0.4.5] - 2026-08-03

### Changed / Improved
- 🇮🇳 **Indic Font & Typography Support** – Integrated comprehensive Indic script fonts (Mukta Malar, Mukta, Noto Sans Telugu/Tamil/Malayalam/Kannada/Bengali/Gujarati/Devanagari/Oriya/Gurmukhi) in the editor font stack and resolved fallback italic glyph rendering.
- ✒️ **Non-English Underline Offset** – Configured `text-underline-offset: 3px` and `text-decoration-skip-ink: none` for `.cm-fountain-underline` to ensure underlines clear low glyph descenders and vowel signs in complex scripts.
- 📄 **PDF Italic Export** – Enhanced backend Rust PDF export engine to support italic text rendering across script elements.

## [0.4.4] - 2026-08-03

### Added
- 🚨 **Severity-based Crash Recovery** – Crashes are classified by severity (`pane` / `window` / `app`) and recovered based on where the failure happened, not the error type: contained pane failures show an inline Retry bar and keep the app running, window-level failures open a compact crash window with a Reload action, and app-level failures offer a full Restart.
- 🪟 **Compact Crash Window** – New standalone 540×480 crash window showing the error code, diagnostics, and severity-matched recovery actions (`Reload Window` / `Restart App`) with Dismiss and Copy options.
- 🎛️ **Recovery Commands** – Added `reload_window(label)` (reloads only the affected webview so other windows survive) and `restart_app` Tauri commands.
- 🟩 **Muse Status Indicator** – The Muse entry moved from the header bar to a full-height square at the far right of the status bar: green when an AI provider is configured (click toggles the Muse pane), red when none is set (click opens Muse Settings).
- 🎯 **Consolidated Muse Commands** – The Command Palette now offers exactly two Muse entries — "Open Muse Pane" (`Alt+M`) and "Open Muse Settings" — replacing the four overlapping options (Toggle Muse, Open Muse, Open Muse Pane, Switch Sidebar Tab: Muse).

### Changed / Improved
- **Always-Complete Diagnostics** – Crash reports merge system info at send time, so reports captured before OS/CPU/RAM resolution still ship with full system details in Discord.
- **Cleaner Discord Embeds** – Footer simplified to "Automatic crash report"; added a Scope field reporting crash severity.
- **Dev-Safe Reporting** – Reports are captured and surfaced in the crash UI but never queued or posted to Discord during development (`npm run dev` / `npm run tauri dev`); only production builds send.

### Removed
- **Previous-Session Crash Detection** – Removed heartbeat/clean-exit tracking, the startup "previous session crashed" notice, and the `webview-crash` report type. A crashed session already sent its report live, and Alt+F4 no longer triggers false positives.
- **Title Bar Muse Button** – Removed in favor of the status bar indicator and Command Palette.

### Fixed
- **Muse AI Test Regression** – Fixed the `useAIChat` test that failed on the `registerTranslationAbort` mock introduced during 0.4.3's AI cancellation work.

## [0.4.3] - 2026-08-01

### Added
- 📤 **Export Pane Overhaul** – Redesigned the screenplay Export Modal into a modern, compact, two-column window with a vertical format sidebar and fixed height (`520px`) to eliminate layout jumping.
- ⏹️ **Immediate AI Cancel/Stop** – Integrated a global Stop button in the status bar with pulsing square indicator to immediately terminate active Muse chat generation or document translation tasks.
- ⚙️ **Atomic File Writing** – Reimplemented Rust file saving (`save_file_content` and `save_file_binary`) to write to a temp file first and rename it, preventing 0-byte file corruption on OS crashes.
- ⚡ **Web Worker Background Parser** – Offloaded Fountain script AST parsing to a background Web Worker thread, eliminating typing lag and keeping the main UI thread completely fluid.
- 🗂️ **Virtualized Outline View** – Virtualized rendering of the screenplay outline panel, allowing navigation of scripts with thousands of scenes with zero lag.
- 📜 **Dialog-aware Typewriter Scroll** – Enhanced Zen-mode typewriter scrolling with smooth CSS transitions and dialogue block tracking.
- 🏷️ **Clean Translation Names** – Translated scripts are now automatically named `[ScriptName]-[Language]` (e.g. `Script-Tamil`) rather than appending duplicate counters like `Script (2)`.

### Changed / Improved
- **MUI Icon Overhaul** – Replaced broken font icon buttons (B/I/U element style selectors) in the Export dialog with high-legibility native text styling and a clear heading row.
- **Watermark Controls** – Compacted watermark security preferences (headers, footers, center text/images) into inline cards with opacity sliders.
- **Editor Responsiveness** – Optimized tag state lookups, decreased editor debouncing timers, and broadened CodeMirror viewport margins to speed up typing on massive screenplays.

## [0.4.0] - 2026-07-24

- 🤖 AI – completely Bring Your Own Model (Either Local or by API).
- 💬 Chat interface – custom sidebar panel now features complete session history and advanced prompt configuration.
- 📐 Layout updates – streamlined MainLayout header bar with status bar indicators and removed the deprecated X-Ray launch button.
- ✍️ Smart editing – simplified blank line insertion logic after specific active fountain elements, improved key press detection, and cleaned up window native application keyboard shortcut event handling.
- 🎨 UI components – default properties configured for text fields to ensure consistent input text box styling.
- 📊 Script analysis – advanced metrics added for calculating acts, scenes, and settings. Get much better statistical details on all active project reports.
- 🧹 Deprecated cleanup – completely removed the legacy moodist subproject code files to keep our active repository clean and lightweight.

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
- **Editor Context Menu Expansion**: Right-click menu now includes Tag (production breakdown), Highlight Scene (color), Drop Marker, Format (Bold/Italic/Underline), Transform Case (UPPER/Title/lower), Look Up Word, Create Task, and Park Selection.
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
