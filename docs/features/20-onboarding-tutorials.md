# Interactive Tutorials & Onboarding

ActOne includes an interactive tour and tutorial system designed to orient new users with the application interface and teach standard screenplay syntax using Fountain in a live sandbox environment.

## Tutorials Window

A dedicated **Tutorials Window** component (`src/components/TutorialsWindow.tsx`) serves as a launcher for all available tours. It can be opened via:

- **Welcome Screen** → "Interactive Tutorials" launcher card
- **Command Palette** → "Interactive Tutorial" command
- **Programmatically** via `openTutorialsWindow()` from `useModalWindows` hook

The window is rendered either as a standalone Tauri window (`?modal=tutorials`, 500×400, not resizable) or as a MUI Dialog modal inside the editor window. It displays 5 tour cards (App Tour, Fountain Syntax, Tagging, Advanced Syntax, Theming) with descriptions and a "Start" button for each.

---

## Overview

The onboarding system consists of five paths:
1. **🧭 App Tour (`ui`)**: An end-to-end walkthrough of the workspace — Activity Bar panels, Header, Editor, Status Bar — finishing with a hands-on Command Palette discovery.
2. **✍ Basic Fountain Syntax (`fountain`)**: A hands-on sandbox tutorial instructing users to type scene headings, characters, dialogue, parentheticals, transitions, and camera shots.
3. **🏷️ Tagging Tour (`tagging`)**: Learn to create production tags, discover auto-populated Cast tags, and toggle tag visibility in the editor.
4. **🎨 Advanced Syntax (`advanced`)**: Sections, subsections, synopses, scene colours, storyline tags, and markers — six production-ready Fountain features. Users type each syntax in a blank sandbox (like the Basic Fountain tour), then explore a 6-scene demo via the Outline navigator and Markers pane.
5. **🎨 Theming Tour (`theming`)**: Opens the Bee Detective sample in the main window and the Theme Manager window with an embedded tour card. Covers picking a theme, creating a custom one, and exporting/importing .actheme files.

---

## Features

### 1. Highlight Spotlight Overlay
The system renders a full-screen semi-transparent SVG mask. It queries targeted DOM element coordinates at runtime and clips transparent "holes" into the mask to spotlight specific components (e.g., highlighting the Activity Bar or Header Bar).

### 2. Keyboard Shortcuts & Draggable Cards
**Shift+Enter** advances to the next step (or finishes the tour) without requiring a mouse click. The shortcut only fires when the tour is active and the current step is complete.

Cards can also be **clicked and dragged** from their header. Dragging raises card elevation (`elevation={16}`) and scales it up slightly (`scale(1.025)`) to simulate physical lifting. Positions auto-reset on step transition to prevent cards from getting lost off-screen.

### 3. Verification & Live Validation
For interactive writing steps, the tutorial reads CodeMirror's document state in real-time to validate user inputs against target regex rules. The "Next" button only unlocks once the typing task is successfully matched.

For DOM-based steps (e.g., the Command Palette tour), steps can declare a `detect()` function that polls the DOM every 200ms. When the condition passes (e.g., `[data-tour-palette]` appears because the palette opened), the step completes — and steps flagged `autoAdvance` move forward without requiring a "Next" click.

Steps can also opt out of the spotlight mask (`noMask`) so floating UI like the Command Palette stays fully visible and interactive, override the card position (`cardPosition`), and customize the "Next" button label (`nextLabel`).

### 4. Smart Focus & Newline Placement
*   **Auto-Focus**: Starting a step automatically focus-locks the cursor at the end of the text.
*   **Auto-Newline**: Proceeding to a writing step automatically injects a double line break (`\n\n`) to place the writer on a fresh line.

### 5. Scene Injection (Advanced Tour)
The Advanced Syntax tour uses two injections: a blank sandbox (`=== ADVANCED SANDBOX ===`) for typing practice (steps 3-8), then a 6-scene demo file with two acts, six sections/subsections/synopses/colours/markers, and three storylines — injected at step 9 for guided exploration via the Outline and Markers panels.

### 6. Export Behaviour
Scene colours, sections, subsections, and synopses can be included or excluded in the PDF export via the Export dialog options. Markers (`[[marker ...]]`) are always stripped from exports — they are for the writer's eyes only.

### 7. Silent Sandbox Destruction
All tours launch inside a temporary, virtual workspace sandbox. When exiting or completing the tour, the system calls `closeFile(activeFileId, true)` (with the `force` flag enabled) to silently discard edits without prompting the user with an "Unsaved Changes" dialog.

---

## Technical Architecture

### Component Entry Points
*   **Trigger Component:** `WelcomeScreenWindow` renders the "Interactive Tutorials" launcher card which pops open the selection dialog.
*   **Command Palette:** The `Interactive Tutorial` command is registered under the Help section of the command registry.
*   **Container Component:** `App.tsx` handles the initial `?action=tutorial` query param, instantly creating the sandbox file in memory on mount to prevent rendering deadlocks, then mounts `<OnboardingTour>`.
*   **Main Component:** `src/components/OnboardingTour.tsx` contains the tour definitions (`UI_STEPS`, `FOUNTAIN_STEPS`, `TAGGING_STEPS`, `ADVANCED_STEPS`), drag event listeners, coordinate polling hooks, SVG mask elements, and typography layout.
*   **Theme Manager Tour:** The `"theming"` tour is rendered standalone inside `ThemeManagerWindow.tsx` when opened with `?modal=theme-manager&tour=theming`. It uses `CrossWindowTourCard` directly with its own step polling effect, rather than going through `OnboardingTour`. The main window loads the Bee Detective sample and opens the Theme Manager, but does not mount `OnboardingTour` for theming.
