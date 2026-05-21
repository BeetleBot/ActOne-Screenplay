# Drafter: Development Phases

This document details the step-by-step phases for porting the Beat screenplay editor to Windows and Linux.

---

## Phase 1: Foundation & Workspace Scaffolding

### Goals
- Initialize the desktop window shell and React application.
- Set up global styling, custom window controls, and visual asset migration.

### Tasks
- Configure `src-tauri/tauri.conf.json` for frameless window configuration, window size bounds, and theme setups.
- Set up `src/index.css` with dark/light themes using CSS custom properties for native macOS-like aesthetics (acrylic blur, subtle borders, premium typography).
- Copy and organize visual assets from Beat (custom color tags, toolbar icons).
- Implement a custom frameless window titlebar in HTML/CSS with standard minimize/maximize/close actions bridged through Tauri's window API.
- Build the core React application layout: collapsible left sidebar, main text editor canvas, and right-hand outline inspector.

---

## Phase 2: Fountain Parser & State Core

### Goals
- Integrate the Fountain parsing engine.
- Establish document state management and file configuration reading.

### Tasks
- Import `FountainParser.ts` for line-by-line classification (Scene headings, action, character, dialogue, parenthetical, transition, centered, lyrics, page break, section, synopsis, title page).
- Set up a Web Worker (`FountainParser.worker.ts`) to handle screenplay parsing asynchronously on document updates.
- Create a React state context (`ScreenplayContext`) managing:
  - Document text and parsed line arrays.
  - Document settings parsed from the trailing JSON comment block.
  - Cursor position and current scene indexing.
- Implement the document reader/writer pipeline that strips the `/* BEAT: ... */` settings block on load and appends it back on save.

---

## Phase 3: Screenplay Editor (CodeMirror 6)

### Goals
- Build the core writing environment with screenplay formatting and assistive styling.

### Tasks
- Integrate CodeMirror 6 inside a React component wrapper (`FountainEditor.tsx`).
- Write a CodeMirror syntax highlighting extension for Fountain syntax (italicizing `*`, bolding `**`, coloring section headers, formatting dialogues).
- Create a decoration extension that hides syntax markers (e.g. `[[`, `*`, `_`, `#`, `=`) when the cursor is not actively on that line.
- Implement editor gutter extensions to display:
  - Scene numbers on heading lines.
  - Add-button hooks for comments or coloring.
- Implement an autocomplete engine using `@codemirror/autocomplete` providing:
  - Scene heading prefixes (INT., EXT.).
  - Character names extracted dynamically from the parsed screenplay lines.
  - Scene extensions (DAY, NIGHT, LATER).
  - Common transitions (CUT TO:, FADE OUT.).

---

## Phase 4: Screenplay Pagination & Print layout

### Goals
- Implement pagination calculation and editor guides.

### Tasks
- Replicate industry-standard screenplay metrics:
  - Courier Prime font, 12pt (10 pitch, 12pt line height).
  - Page margins: Left 1.5 inches, Right 1.0 inch, Top 1.0 inch, Bottom 1.0 inch.
  - Page capacity target: ~55 lines per page.
- Build the pagination algorithm that loops through parsed lines, accumulates line counts (handling word wrap under standard margins), and determines page-break points.
- Create a CodeMirror widget extension to render horizontal page-break indicators and page number labels directly between editor lines.
- Build a PDF export engine using native WebView printing pipelines and CSS print media stylesheets (`@media print` and `@page` rules).

---

## Phase 5: Sidebar Views & Features

### Goals
- Build the auxiliary tools for outline navigation, index card formatting, and script analysis.

### Tasks
- **Outline View**: Render a hierarchical tree showing Sections (`#`), Scenes, and Synopses (`=`) supporting click-to-scroll navigation.
- **Index Cards**: A grid-based workspace showing scenes as physical cards, colored by the heading's color tag, supporting drag-and-drop order rearrangement.
- **Timeline View**: A horizontal progress bar mapping scene lengths, color distributions, and narrative beats visually.
- **Character List**: Analysis tab showing character names, dialogue counts, and gender assignment settings.
- **Notepad**: An inline tab for scratch notes.
- **Statistics**: Scripts statistics panel mapping scene/dialogue ratios, location frequency, and gender statistics.

---

## Phase 6: Plugin Architecture & Sandbox Bridge

### Goals
- Replicate Beat's JavaScript plugin execution environment.

### Tasks
- Build a plugin runner engine using isolated frontend execution scopes (Iframe sandboxing or Web Workers).
- Implement the mocked global `beat` namespace exposing methods matching Beat's API:
  - Dialogues & Prompts (`alert`, `confirm`, `prompt`, `dropdownPrompt`, `modal`).
  - File management (`openFile`, `saveFile`, `writeToFile`).
  - Text actions (`setSelectedRange`, `addString`, `replaceRange`, `getSelectedRange`).
  - Document settings updates.

---

## Phase 7: Verification & Unicode/IME Tuning

### Goals
- Validate application stability, cross-platform UI rendering, and multi-language typing support.

### Tasks
- Test on Windows (WebView2) and Linux (WebKitGTK) to verify window control bindings, blur performance, and sizing behaviors.
- Validate IME input compatibility for Tamil and other Indian languages within CodeMirror 6 to ensure character assembly, cursor positioning, and font fallback rendering function correctly.
- Implement regression testing on sample `.fountain` files to verify that formatting is saved, loaded, and parsed without data corruption.
