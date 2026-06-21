# Changelog

## [0.11.0] - 2026-05-20

### Maturity Milestone
- **Project Status (v0.11.0)**: Fount has reached a highly mature milestone. The application is running smoothly, passing all unit tests, compiler checks, and code lints. Since the core feature set is now complete and solid for daily writing, development will transition to a slower pace, focusing primarily on bug fixes, performance maintenance, and ensuring long-term compatibility.

### Fixes
- **X-Ray Theme Contrast**: Fixed the font color contrast of character pair names in the X-Ray "Interactions" panel. Character pair names now dynamically inherit the theme's primary foreground color, making them perfectly readable in light themes (like "Lilac" and "Paper") instead of defaulting to terminal text color.

### Internal & Refactoring
- **Clippy Code Polish**: Resolved clippy lint warnings regarding collapsible nested if-let structures in TUI list rendering, ensuring a clean and zero-warning build state.

## [0.10.2] - 2026-05-19

### Improvements
- **Industry Standard PDF Margins**: Completely overhauled the PDF export engine to strictly adhere to the Final Draft formatting standard.
- **Absolute Element Anchoring**: Scene headings, action, dialogue, and character names now use exact absolute distances from the left edge (1.5", 2.5", 3.7", etc.), guaranteeing identical pagination and pacing regardless of whether you export to US Letter or A4.
- **Dynamic Right Margins**: Fount now dynamically calculates right margins to enforce the strict 6.0" maximum action block width and 3.5" dialogue width across all paper sizes.
- **Centered Lyrics**: Fixed Lyrics formatting to ensure they are properly centered, italicized, and elegantly indented rather than sticking to the right margin.

## [0.10.1] - 2026-05-18

### Changes
- **Windows Mode**: Introduced a dedicated Windows Mode for terminal compatibility, replacing the old ASCII-forcing approach with a smarter, platform-aware rendering strategy.
- **Removed `force_ascii`**: Dropped the legacy `force_ascii` configuration option in favor of the new Windows Mode.

## [0.10.0] - 2026-05-18

### New features
- **Smart Delimiter Newlines**: Pressing `Enter` directly before trailing screenplay markup delimiters (like `]]`, `*/`, `**`, `*`, `_`, `<`, `)`, `"`, `'`) now leaves them cleanly on the active line, automatically creating a new paragraph or line below.
- **Index Cards Vector Synopsis**: Replaced single synopsis inputs with a vector field in the Index Cards modal, allowing interactive editing of multi-paragraph scene synopses.
- **Horizontal Index Card Reordering**: Added support for horizontally shifting and reordering index cards using `Shift + Left/Right` with active, live visual move indicators.
- **Dynamic Page Sizing**: Implemented real-time page-specific line calculations and configuration options supporting custom page sizes (A4 vs US Letter).
- **Modular X-Ray Studio**: Completely upgraded the X-Ray analytics interface to feature sub-panes: **Pulse** (pacing analysis), **Ensemble** (character statistics table), **Blueprint** (scene metrics), and **Inventory** (metadata tracking).
- **Collapsible Scene Tree**: Added nested sequence collapsible hierarchy support in the sidebar scene tree navigation view.
- **Active Writing Sprints**: Added active writing session and sprint tracking to the UI with conflict prevention and enhanced footer status indicators.

### Improvements
- **TUI File Picker & Two-Stage Save**: Completely overhauled the integrated TUI File Picker for opening and saving screenplay files, featuring a safer two-stage saving flow with automatic extension validation and active "dirty" buffer tracking inside UI labels.
- **Note Rendering Performance**: Drastically improved screenplay rendering loop speeds by implementing dynamic invalidation caches for layout line calculations of hidden/note blocks.
- **Footer UI Simplification**: Streamlined the bottom footer status displays and refined the dynamic cursor positioning mechanics.

### Under the Hood / Tests
- **Randomized Monkey Testing**: Integrated a new high-frequency randomized stress testing module for application input stability.
- **Extensive Test Coverage**: Expanded the unit testing suite with targeted stress and edge cases for Scene Tree parsing, Index Card generation, and X-Ray pacing algorithms.

## [0.9.9] - 2026-05-16

### Fixes
- **Home Screen Shortcuts**: Fixed a bug where the `s` (Structure), `o` (Open), and other dashboard shortcuts were not responding to keypresses.
- **Recent Files Display**: Synced the dashboard to correctly display and navigate up to 4 recent files.

### Improvements
- **Stability Polish**: Minor internal fixes for a smoother, more reliable experience.


## [0.9.8] - 2026-05-16

### New features
- **Structured Dashboard**: Added a sleek, rounded border to the home screen to give it a more organized and premium "studio" feel.
- **Smarter Character Tags**: Fount now scans your production tags (like `[[CAST: ...]]`) and automatically adds those characters to your autocompletion list.
- **The "Clean Script" Tool**: A new `/clean` command that instantly tidies up your screenplay's formatting, fixing double spaces and extra lines in one go.
- **Fast Navigation**: You can now use `Ctrl+Home` to jump to the very top and `Ctrl+End` to jump to the very bottom of your script instantly.

### Improvements
- **Stability Polish**: Cleaned up the inner workings of the app to ensure it runs smoother and faster than ever.


## [0.9.7] - 2026-05-14

### New features
- **New Icon & Branding**: Rebranded Fount with a fresh, transparent square logo and a professional new tagline: "Blockbusters in Terminal".
- **FountTUI Overhaul**: Completely modernized the application interface for a more streamlined, focused, and premium aesthetic. This includes a transition to rounded corners, minimalist layered layouts, and a distraction-free full-page Home experience.
- **Full-Page Dashboard**: Transformed the Home screen from a modal into a dedicated full-screen landing page with a centered gradient logo, minimalist navigation, and an interactive footer.
- **Interactive Footer Links**: Added selectable Wiki and GitHub links to the Home screen, supporting `Tab` navigation for a professional dashboard experience.
- **Threaded Browser Integration**: External links now open in background OS threads, preventing the TUI from hanging while waiting for the browser to launch.
- **Stress Testing Suite**: Introduced a comprehensive 10-page screenplay complexity test (`src/app/tests/performance.rs`) to ensure high-performance parsing and stability under pressure.

### Improvements
- **Modernized Index Cards**: Updated the Index Card UI with premium **rounded corners** and standardized border styles to align with the "Bagels" design language.
- **Interface Decluttering**: Cleaned up the Index Cards footer and status bar, removing redundant hint text in favor of a persistent `? Quick Help` indicator.
- **Zero-Warning Codebase**: Finalized a clean, warning-free build state across all core modules.

### Fixes
- **CI Build Resolution**: Resolved a critical build failure in version 0.9.6 by replacing experimental `if let` guards with stable Rust syntax, ensuring cross-platform build stability.
- **Robust Scrolling Logic**: Fixed a critical clipping bug in Index Card mode that caused cards to overlap when partially scrolled off the top of the viewport.
- **Search Cancellation**: Corrected a regression where the `Esc` key failed to cancel search mode without a `Ctrl` modifier.
- **Structural Code Polish**: Resolved "too many arguments" and "needless update" warnings through context struct refactoring.

## [0.9.5] - 2026-05-11

### New features
- **Story Structure Templates**: Added the `/structure` command to instantly import narrative frameworks directly into your script. Included new templates: John Truby's 7 Key Steps, Michael Hauge's 6-Stage Journey, and The Sequence Approach.
- **Revision Tracking System**: Implemented a comprehensive revision tracking system (`/revision on`) with visual margin indicators (`*`) and full PDF export support.
- **Production Tags Support**: Added full support for structured inline metadata (e.g., `[[props: map]]`). Easily toggle their visibility within the editor using the `/prodtags` command, fully integrated with the X-Ray breakdown and CSV reports.
- **Metadata Autocomplete**: Intelligent autocompletion logic is now fully supported for production tags and metadata blocks.
- **Highlight Active Block**: A new focus tool that subtly dims all inactive text and brightly highlights your current paragraph or action line, keeping your eyes locked on your current thought. Toggle via `/set highlight`.
- **Theme Picker**: Implemented a streamlined theme selection workflow (`/theme`) for instantly previewing and applying curated color palettes.
- **Section Creation Shortcut**: Added `Shift+N` to instantly create a new Section in the Index Cards view.
- **Modal Editing Integration**: Successfully merged basic modal editing logic, allowing opt-in Vim-like interactions without disrupting the default Fount experience.

### Improvements
- **Production-Grade CSV Exports**: Massively enhanced CSV reports (Scene List, Character, Location, Notes) with page numbers, synopsis data, character dialogue statistics, and inline note extraction. Dialogue export now generates professional rehearsal sides.
- **Nerd Font Integration**: Added optional Nerd Font icon support across UI elements and status indicators for a highly polished look.
- **Intelligent Auto-Save Cycler**: The Auto-Save setting now cycles through precise intervals (`[1 min]`, `[3 min]`, `[5 min]`, `[10 min]`, `[OFF]`) directly from the Settings Modal.
- **Modernized Scene Tree**: Transformed the navigator into a clean, tree-structured outliner. Removed heavy horizontal rules in favor of minimalist tree-line spacing, eliminated "no synopsis" placeholder clutter, and implemented intelligent word-wrapping for long scene headings to prevent truncation.
- **Index Cards Overhaul**: Upgraded the basic grid to a premium card-like interface with visual depth effects, while drastically improving real-time character typing responsiveness.
- **Settings Modal Consolidation**: Migrated the Settings interface from a static side-pane to a sleek, centered, floating modal window that mirrors the Export and Snapshot screens.
- **Dynamic Shortcuts Registry**: The Cheat Sheet (`F1`) has been transformed into a source-driven, tabbed UI component. All shortcuts are now compiled directly into the binary, removing the need for external asset files.
- **Unified Typewriter Mode**: Merged "Typewriter" and "Strict Typewriter" modes into a single, highly robust vertical-centering mode that keeps your cursor locked to the center of the screen.
- **CLI Minimalism**: Completely stripped the command-line interface of all headless export flags and background diagnostic tools. The `fount` CLI is now strictly focused on its core purpose: opening files (`fount [file.fountain]`).
- **Show Markup Polish**: The "Show Markup" setting (`/set markup`) now guarantees a 100% accurate representation of your document by exposing *every* Fountain structural marker (e.g. `#`, `=`, `.`, `!`, `!!`, `@`, `^`, `~`, `===`) when enabled.
- **Line Number Enhancements**: Added `/set line` (and `/set linenums`) to toggle line numbers via command. Line numbers now automatically hide themselves when Focus Mode is engaged.
- **Status Bar Guidance**: The Index Cards mode now displays clear, contextual shortcut guidance in the status bar.

### Fixes
- **State Synchronization Panics**: Eliminated deep buffer desynchronization bugs causing fatal insertion index out-of-bounds panics when utilizing Shift+Enter, smart elements, multi-line pastes, and deleting index cards.
- **Empty Breakdown Crashes**: Prevented invalid selection crashes in the X-Ray breakdown panel when scene data is completely empty.
- **Robust Error Handling**: Audited layout and parsing routines to safely propagate errors, ensuring a crash-free experience during complex document edits.
- **Index Cards Stability**: Rewrote the grid rendering and navigation math to prevent underflow crashes during high-speed, multi-card scrolling in large scripts.
- **Rendering Performance**: Optimized `build_layout` and `parse_document` routines for a faster, distraction-free rendering loop during rapid typing.

## [0.9.4] - 2026-05-10

### Added
- **Shot Element Support**: Introduced support for **Shot** elements using the `!!` (or `！！`) prefix. Shots are now correctly parsed, rendered in the TUI, and included in PDF exports with proper formatting.
- **Literal Slash Support**: Added support for entering a literal `/` character by typing `//` in the command bar. This allows for searching or using paths containing slashes without triggering command parsing.
- **Native OS File Picker**: Replaced `rfd` with `native-dialog` to provide a more robust, native file selection experience on all platforms, with a graceful TUI fallback for terminal-only environments.
- **Normal Mode Shortcuts**: Implemented new quick-access shortcuts in normal mode for file management (`^O`, `^N`, `^S`) and search (`^F`), streamlining the writing workflow.

### Changed
- **UI Aesthetics**: Replaced legacy ASCII progress bars and UI separators with high-quality Unicode block elements (`█`, `▓`, `▒`) for a smoother, more modern "Zen" look.
- **Home Pane Refinement**: Updated the welcome dashboard with a cleaner layout and improved state management for recent files and tutorials.

### Fixed
- **Stability**: Improved overall application robustness by replacing direct error propagation with a centralized UI error reporting system across all file operations and commands.
- **MS Store Compliance**: Added a dedicated privacy policy document and synced manifests for Microsoft Store submission.

## [0.9.3] - 2026-05-02

### Added
- **Semantic Theme System**: Fully refactored UI to use a theme-aware semantic color system (`warning`, `error`, `success`, `info`). This ensures perfect legibility and a premium feel across all color schemes, from sleek dark modes to high-contrast paper themes.

### Changed
- **UI Icon Standardization**: Replaced all Nerd Font icons with terminal-safe ASCII/Unicode glyphs (`[ ]`, `[!]`, `[*]`). This guarantees a consistent, "just works" experience across all terminal environments without requiring specialized fonts.
- **Workflow Optimization**: Consolidated Windows distribution into a unified MSIX pipeline. Automated Microsoft Store branding with dynamic icon generation for all required sizes.

### Fixed
- **Stability**: Resolved multiple compilation errors and edge-case bugs in the UI rendering engine.
- **MSIX Manifest**: Synced with official Microsoft Store identity for seamless installation.

## [0.9.2] - 2026-04-30

### Fixed
- **Windows Installer**: Switched to `WixUI_Minimal` to resolve winget validation failures. This ensures a clean silent installation path by removing interactive feature selection dialogs.

## [0.9.1] - 2026-04-30

### Added
- **New Distribution Channels**:
    - **Winget Integration**: Official support for the Windows Package Manager. Install via `winget install BeetleBot.Fount`.
    - **SmartScreen Documentation**: Comprehensive guides for bypassing Windows SmartScreen blocks on unsigned binaries.
- **Typography**: Added support for **Courier Prime Sans** in the editor and exports.

### Changed
- **UI Architecture**: Transitioned the main Editor Pane into a focused **Editor Modal** for a cleaner, more modular interface.

### Fixed
- **Export Engine**:
    - Resolved alignment issues for **Transitions** in the final PDF export.
    - Fixed **Title Page** rendering bugs where metadata was improperly formatted.

## [0.8.7] - 2026-04-29

### Added
- **Enhanced TUI File Picker**:
    - **Locked Folder Workflow**: A new, more focused saving experience. Press `Tab` to "lock" your current directory and switch the picker into **Naming Mode**.
    - **Dedicated Save Shortcut**: While a folder is locked, the `Enter` key is exclusively for saving, ensuring you don't accidentally navigate away while typing.
    - **Interactive Overwrite Dialog**: A premium, centered confirmation modal with selectable **YES/NO** buttons. Support for arrow-key navigation and quick keys (`y`/`n`).
- **Advanced Export Options**:
    - Added support for including structural metadata in PDF exports.
    - **Sections** are rendered in **BOLD UPPERCASE**.
    - **Synopses** are rendered in ***italics*** for better readability.
- **UI/UX Refinement**:
    - **Sticky Scene Heading**: The current scene heading is now "sticky" in the status bar, providing constant orientation within long scripts.
    - **Live Navigator Preview**: The main editor now automatically scrolls to the selected scene as you browse the Scene Tree sidebar, allowing for quick "peeks" before jumping.

## [0.8.6] - 2026-04-27

### Added
- **Mac Mode**:
    - Automated detection for the default macOS `Terminal.app` (`TERM_PROGRAM=Apple_Terminal`).
    - Automatically enables safe defaults (No Color, ASCII-only borders, and disabled Nerd Fonts) to ensure perfect rendering on legacy Mac terminals.
    - Added a `[ MAC MODE ]` status indicator in the header when active.
- **AUR Release Automation**:
    - Integrated GitHub Actions with the Arch User Repository (AUR).
    - The `fount-bin` package now updates automatically on every new tag, ensuring `yay` users always have the latest version.

### Fixed
- **Typewriter Mode Stability**:
    - Completely re-engineered the scroll and centering logic for Typewriter Mode.
    - Simplified calculations using height midpoints instead of full-screen offsets, resolving the "jumping cursor" bug when toggling UI elements or Focus Mode.
    - Fixed a 1-pixel drift issue on terminal windows with odd-numbered heights.

## [0.8.5] - 2026-04-23

### Added
- **Global Search & Replace**:
    - Interactive replacement workflow with `r` (Replace Current) and `Shift+R` (Replace All) while search is active.
    - Incremental navigation with `Alt+Up/Down` directly after starting a search.
- **Searchable Cheat Sheet**:
    - The dynamic Cheat Sheet (`F1`) now supports live filtering with the `/` shortcut.
    - Shortcuts are now managed via a centralized `assets/shortcuts.txt` registry.
- **Command History**: New `Alt+/` shortcut to recall and edit the last successfully executed command.
- **Improved Theme Sensitivity**:
    - Modals (X-Ray, Cheat Sheet, Snapshots, File Picker) now fully respect theme backgrounds and foregrounds.
    - Fixed visibility of analysis charts in light themes (e.g., "Paper").

### Changed
- **Header UI Restructuring**:
    - Buffer tabs moved to the left side for better focus.
    - App mode and version moved to the right side.
    - Removed theme name from the header to reduce clutter.
- **Scene Tree Aesthetics**:
    - Scene headings are now bolded for better hierarchy.
    - Selection bar is now a neutral, adaptive gray.
    - Color markers are preserved even when a scene is selected.
- **Command Bar UX**:
    - Fully case-insensitive autocompletion and inline hints.
    - Normalized theme name suggestions to compatible slugs (lowercase, no spaces).

### Fixed
- **Cleanup**: Resolved all compiler warnings and verified test suite stability.

## [0.8.4] - 2026-04-20

### Added
- **Linux Desktop Integration**:
    - Official app drawer icon support for all Linux releases.
    - Added a desktop entry (`.desktop`) with `Fount` branding and file associations.
    - Updated AUR, DEB, and RPM packaging to automatically install the icon and launcher.

## [0.8.3] - 2026-04-20

### Added
- **Dynamic Shortcuts Registry**:
    - Centralized all keybindings and command-line shortcuts into a single source of truth in `src/app/shortcuts.rs`.
    - The **Cheat Sheet (F1)** is now dynamically generated from this registry, ensuring it is always in sync with the codebase.
    - Added missing `/ic` (Index Cards) and `/editor` (Normal Mode) commands to the documentation and completions.
- **Documentation Overhaul**:
    - Redesigned `README.md` with a heartfelt Developer's Note, prominent credit to inspirations (Lottie, Beat, Fountain), and refined installation paths.

### Changed
- **Command Completions**: Refactored `get_command_completions` to pull directly from the dynamic registry for better discovery of `/set` options and mode-specific commands.

### Fixed
- **Documentation Gap**: Resolved an issue where several core commands were functional but not documented in the internal help panel.


## [0.8.2] - 2026-04-20

### Added
- **Index Cards Mode (`/ic`)**:
    - **Visual Scene Organization**: A complete redesign of the "Story Architect" into a premium, card-based interface.
    - **ASCII Aesthetic**: Cards now feature a unique `[ ]` ASCII bracket design with dynamic background support for all themes (including light modes).
    - **Marker Color Integration**: Scene headings on cards now inherit the color of `[[marker]]` tags for instant structural visualization.
    - **Interactive Reordering**: Shift scenes intuitively using `Shift+Up/Down` with robust re-indexing.
- **Multi-Platform Distribution**:
    - **Native Linux Packaging**: Official support for **`.deb`** (Debian/Ubuntu) and **`.rpm`** (Fedora/RHEL) packages.
    - **Windows Portable**: Universal `.zip` release for Windows 10/11 x64 systems.
    - **AUR Release Support**: Standardized PKGBUILD preparation for `yay` users.

### Fixed
- **UI State Persistence**: Re-engineered the state machine (`previous_mode`) to prevent jarring jumps back to the editor when opening the command bar from Index Cards.
- **Theme Context Consistency**: Resolved a bug where Index Cards would retain a dark background in light themes (e.g., "Paper").
- **Adaptive Header/Footer**: Standardized the Zen shell to dynamically display relevant metadata (Scene Counts vs Word Counts) and context labels based on the current view.
- **Navigation Shortcuts**: Refined [Esc] and [Backspace] logic to correctly restore the previous interactive view.

## [0.8.1] - 2026-04-18

### Changed
- **Windows Distribution**: Removed pre-built Windows binaries and MSI installer from releases due to Smart App Control blocking unsigned apps. Windows users should install via `cargo install fount`.

### Added
- **Zen Studio Polish**:
    - **Rotating Quotes**: The home screen now features inspiring quotes from legendary screenwriters.
    - **Saved Indicator**: A subtle visual confirmation (✓ Saved) now appears in the status bar after successful saves.

## [0.7.8] - 2026-04-18

### Added
- **Windows MSI Installer**: Professional installer for Windows with Start Menu integration and desktop shortcuts.
- **Embedded App Logo**: The executable now features the Fount branding in File Explorer and the Taskbar.

### Fixed
- **Windows Icon Rendering**: Improved terminal icon compatibility with automatic fallback for standard Windows terminals (Nerd Font vs. Unicode).

## [0.7.6] - 2026-04-18

### Fixed
- **Windows Startup**: Resolved a startup crash on legacy Windows terminals and improved release naming conventions.

## [0.7.5] - 2026-04-18

### Added
- **X-Ray Script Analysis**: A comprehensive new diagnostic dashboard (`/xray`) with triple-tabbed pages for Dialogue Balance (bar charts), Pacing Heatmaps (action vs dialogue density), and Scene Length tracking with "TOO LONG" warnings.
- **Enhanced Character Analytics**: Implemented robust mapping to merge character variants (e.g. `(V.O.)`, `(CONT'D)`) into single entities across all sidebars and reports.
- **Focus Mode Header Hiding**: Focus Mode now automatically collapses the top header and tab bar along with the status bar for a zero-distraction writing environment.
- **Platform-Specific READMEs**: Individual `PORTABLE.txt` files for Windows, Linux, and macOS now bundle with each release in `docs/readme/`.

### Changed
- **Home Screen UI Overhaul**: Completely redesigned the dashboard with a premium glassmorphism aesthetic, featuring curated "Quick Start" shortcuts for tutorials and recent scripts.
- **Widened Analysis Modal**: Increased the X-Ray modal width to 100 columns and added Dialogue Line counts (`L`) for more granular prominence tracking.

### Fixed
- **Name Normalization**: Fixed a long-standing bug where parenthetical character extensions caused duplicated entries in the Ensemble Sidebar (`Ctrl+L`).

## [0.7.0] - 2026-04-17

### Added
- **Refined Buffer Tabs**: Implementation of a minimalist, adaptive tab bar that appears only when multiple scripts are open. Features high-contrast dynamic foreground detection and dirty state indicators.
- **Buffer Switch Shortcuts**: New navigation keys for multi-buffer workflows: `Ctrl+PageUp` (Previous) and `Ctrl+PageDown` (Next).
- **Interactive Save Prompt**: `/w` command now dynamically triggers the file picker when saving unnamed buffers, providing a seamless "Save As" experience.

### Changed
- **Streamlined Distribution**: Removed Windows MSI installers in favor of standardized, portable tarballs across all platforms.
- **UI Aesthetic Polish**: Refined the tab bar with ` | ` separators, vibrant primary-colored delimiters, and subtle horizontal padding for a premium feel.
- **Workflow Automation**: Simplified GitHub Actions release cycle by removing redundant platform-specific README documents.

### Fixed
- **Active Tab Contrast**: Resolved visibility issues in the "Adaptive" theme by using unified theme selection colors for the active tab.

## [0.6.0] - 2026-04-08

### Added
- **Sprint Tracking**: Professional timed writing goals with real-time status bar progress, persistent history, and CSV export functionality.
- **Advanced Session Snapshots**: Redesigned session recovery with a table-based UI and dual restoration modes (Replace current or Open in new buffer).
- **Theme Management System**: High-performance theme engine with dynamic swapping and persistent user themes support.
- **Production Mode Scene Locking**: Industry-standard scene numbering system with auto-incrementing suffixes and production-safe locks.
- **Enhanced Command Help**: Completely redesigned command pane with standardized `/` prefixes, clear categorization, and "one command per line" layout.

### Changed
- **Command Prefix Standardization**: Unified all Ex-style commands under the `/` prefix for consistent interaction.
- **UI Architecture**: Refined the modal rendering stack to ensure consistent visibility across all application modes.

### Fixed
- **Snapshot State Handling**: Resolved type mismatch issue when navigating the upgraded snapshot table.
- **Sprint Export Workflow**: Replaced legacy menu-based export with an interactive TUI file picker for custom save locations.

## [0.5.0] - 2026-04-06

### Added
- **TUI File Picker**: Native, high-performance file selection with zero GUI dependencies, featuring scrolling support and home directory defaults.
- **Structural Thread Navigation**: Completely refined scene tree with new **Structural Thread** support, integrating Sections, Scenes, and Synopses for advanced script organization.
- **Character Reports Pane**: Dedicated new pane for comprehensive character analysis and reporting.
- **Interactive Tutorial**: Dedicated tutorial mode with rewritten documentation using the new engine features.

### Changed
- **Command-First UI**: Transitioned the interface to be primarily command-based. Basic functions and pane-opening shortcuts are preserved, while most secondary actions have migrated to the command bar.
- **Robust Error Handling**: Significantly improved application stability by replacing unsafe `.unwrap()` calls with proper error propagation and recovery logic.
- **Home Screen Refinement**: Refined navigation, buffer management, and active UI prompt handling.
- **Build Optimization**: Smaller binary size and faster compilation through `rfd` removal and refined release profiles.

### Fixed
- **Buffer Protection**: Enhanced protection mechanisms to prevent accidental document loss during complex edits.
- Removed unused `NavigatorItem` and other redundant imports.
- Fixed all unit and doc-tests for the updated engine.

## [0.4.3] - 2026-04-05

### Fixed
- **Windows MSI Packaging**: Fixed GitHub Actions release workflow failing to build the MSI installer due to hardcoded executable paths.
- **Dynamic MSI Naming**: The resulting Windows installer now includes the release version in its filename (e.g., `Fount_Windows_v0.4.3.msi`).

## [0.4.2] - 2026-04-05

### Added
- **Home Screen**: New aesthetic main menu for quick access to recent scripts and help.
- **Production Reports**: Expanded Export UI with options for production-ready reports.
- **Shortcuts Mode**: Dedicated shortcuts status indicator in the UI.
- **Color-Coded Scene Tree**: Scene headings now adopt the color of `[[color]]` markers placed anywhere in the scene.
- **Proper Installation Channels**: Added Windows MSI installer support and automated release workflows.

### Changed
- **Forced Physical Uppercase**: Scene headings, characters, and transitions are now permanently transformed to uppercase in the screenplay buffer for professional formatting.
- **Responsive UI Refactor**: Redesigned UI panels with mode-aware coloring and refreshed list layouts for better clarity and focus.
- **Improved Contrast**: Refined the theme detection and color mapping for a better experience across all terminals.
- **Streamlined Release Workflow**: Optimized CI/CD to focus on Windows MSI installers and Crates.io publication for higher reliability.

### Fixed
- **Robust Marker Detection**: Enhanced the scene parser to correctly identify marker colors even when separated by notes or empty lines.
- **Heading Cleaning**: Stripped metadata markers from scene tree headings for a cleaner display.
- Resolved cursor misalignment in certain terminal environments.
- Fixed navigation issue where selection wouldn't update correctly when switching panes.

## [0.3.0] - 2026-04-04

### Added
- **Text Selection & Clipboard**: Implement text selection, system clipboard support (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`).
- **Command Mode**: Implement a modernized command interface (`/`) with tab completion, migrating shortcut actions to command-based execution.
- **Format Pane**: Introduce FormatPane for document formatting and scene number management.
- **PDF Export**: Re-implement robust PDF screenplay export functionality.
- **Mouse Support**: Added 'Click with mouse' and 'Scroll with mouse' to the scene tree.
- **Word Wrap**: Added word wrap for Scene headings.

### Changed
- Complete architecture refactoring of the source code (`app.rs` and inputs).
- **Zen Footer**: Modernized the status footer with a beautiful Powerline layout featuring colored edge blocks, transparent center blocks, soft `` separators, and live word/line counts.
- **Maximized Workspace**: Removed the redundant top title header to fully maximize vertical screen space for writing.
- **Light Mode Enhancements**: Removed hardcoded dark grey backgrounds in the footer so it natively adapts to light terminals, and softened the `Parenthetical` text styling using `Modifier::DIM` to prevent "washed out" colors.

## [0.2.0] - 2026-04-04

### Added
- **Zen Studio UI**: Complete aesthetic overhaul for a distraction-free, premium experience.
- **Unified Footer**: Consolidated status messages, real-time word/page counts, and shortcut hints into a single, clean bar.
- **Shortcuts Sidebar**: Interactive right-side pane (F1) for keybinding reference, keeping the main editor area uncluttered.
- **Vertical Pane Borders**: Added `│` separators for better visual pane isolation.
- **Selection Cursors**: Interactive `»` focus indicators in the Scene Tree.
- **Adaptive Contrast**: Automated theme detection (Light/Dark) using `Modifier::DIM` and standard terminal colors (Color::Reset) instead of hardcoded white/black.

### Changed
- Refined typography and spacing across the TUI for a more "human" feel.
- Removed legacy `High Contrast` toggle in favor of the new adaptive system.

### Fixed
- Updated the test suite to align with the new consolidated layout and string labels.

## [0.1.3] - 2026-04-04

### Added
- **Fount Portable (Linux)**: Integrated a fully static MUSL build for the Linux release, ensuring the application works on any Linux distribution (Arch, Ubuntu, Fedora, Alpine, etc.) without external dependencies.
- Added GitHub documentation for release procedures.

### Changed
- Streamlined release process to focus on portable Linux binaries and source code.
- Moved `clipboard-win` to Windows-only target dependencies to improve Linux build isolation.

### Removed
- Pre-built binaries for macOS and Windows (users on these platforms can still compile from source using `cargo`).

## [0.1.2] - 2026-04-04

### Added
- **Scene Tree**: Quick navigation through scenes with `Ctrl+T`.
- **Settings Pane**: Interactive settings configuration with `Ctrl+P`.
- **Multi-Buffer Support**: Open and switch between multiple Fountain files.
- **Auto-Title Page**: Automatically generate title page metadata for new files.
- **Search**: Case-insensitive regex search support.
- **Undo/Redo**: Global history state management for all buffers.
- **Status Bar**: Detailed cursor position reporting (line, column, character percentage).
- **Safe Exit**: Automatic emergency saving if the application crashes.

### Changed
- Migrated primary keybindings to `Ctrl`-based modifiers for better macOS compatibility.
- Renamed project to **Fount**.

### Fixed
- Improved text rendering and indentation for across different terminal sizes.
