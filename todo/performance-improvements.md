# Proposed Performance Improvements (Layman Terms)

Here is a breakdown of the 4 proposed improvements to make ActOne feel snappier and smoother, translated into plain terms. These changes are designed to optimize resource usage and will not affect any of the app's features.

---

## 1. Debounce Sidebar Updates
*   **What it does:** Right now, every single letter you type causes the entire sidebar Outline list to immediately recalculate and redraw itself. If you have a script with 100 scenes, the app is redrawing all 100 scene names in the background on every single keystroke. "Debouncing" means the sidebar will wait until you pause typing (for a fraction of a second, like 300ms) before updating itself.
*   **Safety Check:** Typing is still 100% instant inside the editor sheet. The only difference is that the visual "Outline list" on the left updates smoothly when you pause rather than flickering or lagging as you type.

---

## 2. Split Context State (Type-to-CodeMirror isolation)
*   **What it does:** Right now, React (the system building the app window layout) is listening to your keyboard and trying to update the *entire app state* on every letter. CodeMirror (our underlying editor engine) is already extremely fast at handling text entry. We want CodeMirror to manage your typing text in its own fast memory, and only notify React to update the rest of the application on saves, tab switches, or every second for backups.
*   **Safety Check:** Features like auto-save, notes, and PDF exports still get the exact same text document they expect. We are simply letting the writing editor handle typing independently so the rest of the interface stays quiet and responsive.

---

## 3. Memoize Outline & Marker Nodes
*   **What it does:** This is like giving the app a memory card of what the outline items look like. Instead of recreating the HTML elements for all scenes, markers, and checklists from scratch when the sidebar updates, the app checks: *"Did the title of Scene 5 change? No? Then keep using the exact same visual element."*
*   **Safety Check:** The scenes, coloring, storylines, and notes will still display exactly as they do now. It simply prevents the computer from rebuilding things it has already built.

---

## 4. Coordinate Mapping Over direct DOM Queries
*   **What it does:** When the app needs to position things (like a parenthetical hint or a line highlighting box), it has to ask: *"Where on the screen is this line?"* If we query the browser DOM directly, it forces the browser to freeze and recalculate the layout of the entire page (a process called reflow). Instead, we query CodeMirror's internal pre-calculated coordinates.
*   **Safety Check:** Highlights and placements will still appear in the exact same positions. We are just using CodeMirror's fast internal ruler to measure positions instead of asking the browser to redraw and measure the screen.
