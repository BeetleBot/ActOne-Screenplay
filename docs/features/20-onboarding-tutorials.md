# Interactive Tutorials & Onboarding

ActOne includes an interactive tour and tutorial system designed to orient new users with the application interface and teach standard screenplay syntax using Fountain in a live sandbox environment.

---

## Overview

The onboarding system consists of two primary paths:
1. **🧭 App Interface Tour (`ui`)**: A visual tour highlighting key interface areas (Activity Bar, Header Bar, Command Palette, Editor, and Status Bar).
2. **✍ Fountain Writing Tutorial (`fountain`)**: A hands-on sandbox tutorial instructing users to type scene headings, characters, dialogue, parentheticals, transitions, and camera shots.

---

## Features

### 1. Highlight Spotlight Overlay
The system renders a full-screen semi-transparent SVG mask. It queries targeted DOM element coordinates at runtime and clips transparent "holes" into the mask to spotlight specific components (e.g., highlighting the Activity Bar or Header Bar).

### 2. Draggable Information Cards
To ensure the guide cards never block the writer's view or typing area:
*   Users can **click and drag** cards from their header.
*   Dragging raises card elevation (`elevation={16}`) and scales it up slightly (`scale(1.025)`) to simulate physical lifting.
*   Positions auto-reset on step transition to prevent cards from getting lost off-screen.

### 3. Verification & Live Validation
For interactive writing steps, the tutorial reads CodeMirror's document state in real-time to validate user inputs against target regex rules. The "Next" button only unlocks once the typing task is successfully matched.

### 4. Smart Focus & Newline Placement
*   **Auto-Focus**: Starting a step automatically focus-locks the cursor at the end of the text.
*   **Auto-Newline**: Proceeding to a writing step automatically injects a double line break (`\n\n`) to place the writer on a fresh line.

### 5. Silent Sandbox Destruction
Both tours launch inside a temporary, virtual workspace sandbox. When exiting or completing the tour, the system calls `closeFile(activeFileId, true)` (with the `force` flag enabled) to silently discard edits without prompting the user with an "Unsaved Changes" dialog.

---

## Technical Architecture

### Component Entry Points
*   **Trigger Component:** `WelcomeScreenWindow` renders the "Interactive Tutorials" launcher card which pops open the selection dialog.
*   **Command Palette:** The `Interactive Tutorial` command is registered under the Help section of the command registry.
*   **Container Component:** `App.tsx` handles the initial `?action=tutorial` query param, instantly creating the sandbox file in memory on mount to prevent rendering deadlocks, then mounts `<OnboardingTour>`.
*   **Main Component:** `src/components/OnboardingTour.tsx` contains the tour definitions, drag event listeners, coordinate polling hooks, SVG mask elements, and typography layout.
