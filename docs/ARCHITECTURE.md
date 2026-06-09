# ActOne Architecture

ActOne is a screenplay writing application built with Tauri, React, Vite, and CodeMirror 6.

## 1. Core Stack
- **Frontend Framework:** React 19 + Vite
- **Desktop Runtime:** Tauri 2.0 (Rust)
- **Editor:** CodeMirror 6
- **Script Parsing:** Custom Fountain Parser

## 2. Directory Structure
- `src/components/`: React UI components (Sidebar, Search Panel, Editor).
- `src/context/`: Global State Management.
  - `AppContext.tsx`: Combines File, UI, and Editor contexts.
  - `FileContext.tsx`: Manages the active file, raw text, and parsed AST.
  - `UIContext.tsx`: Manages UI states like zoom level, active tab, and theme.
- `src/editor/`: CodeMirror integration (`useCodeMirror.ts`, themes, and commands).
- `src/parser/`: Synchronous Fountain parser (`FountainParser.ts`).
- `src-tauri/`: Rust backend for Tauri native APIs.

## 3. Global State & Data Flow
The application state revolves around the editor text and the parsed Fountain AST.
1. **User Types:** The user types in the CodeMirror editor (`src/components/FountainEditor.tsx`).
2. **Editor Dispatch:** `useCodeMirror.ts` captures the document change via `updateListener` and calls `setRawText`.
3. **Synchronous Parsing:** `setRawText` in `FileContext.tsx` synchronously calls `parseScreenplay` on the main thread. 
4. **Context Update:** The newly parsed AST (`parsedDoc`) is saved into the FileContext.
5. **UI Re-render:** The Sidebar (`SidebarViews.tsx`) reads `parsedDoc` and updates the Characters, Outline, and Stats tabs instantly.

## 4. Critical Architectural Constraints (WARNING TO AGENTS)
- **NO WEB WORKERS FOR PARSING:** Do not use Web Workers (`new Worker()`) for parsing screenplays. Tauri's Linux WebKit2GTK webview natively blocks Module Web Workers loaded over the custom `tauri://localhost` protocol due to cross-origin security policies. Parsing must remain synchronous on the main thread.
- **FORCED CHARACTERS:** The Fountain Parser (`FountainParser.ts`) must respect the `@` symbol for forced character names (e.g., `@sharanya`), regardless of whether the character name is in uppercase or lowercase.
- **LINUX PACKAGING:** When building for Linux release, always build the frontend first (`npm run build`) before running the Tauri packager (`npx tauri build`), and package the binary using the custom `install.sh` and `uninstall.sh` shell scripts in the `portable/` directory.

## 5. Fountain Syntax Parsing Rules (`FountainParser.ts`)
The custom parser implements the Fountain specification alongside several ActOne-specific extensions. Agents MUST respect these parsing rules when reading or modifying parser logic:

### 5.1. Title Page (`LineType.titlePage...`)
- Parsed at the very beginning of the document. Ends when an empty line is followed by non-title content.
- Recognizes the following keys (case-insensitive): `Title:`, `Author:`, `Authors:`, `Credit:`, `Source:`, `Contact:`, `Draft date:`, `Date:`.

### 5.2. Core Screenplay Elements
- **Scene Headings (`LineType.heading`)**:
  - **Auto-detected**: If a line starts with `INT`, `EXT`, `I/E`, `I/E.`, `E/I`, or `E/I.` (case-insensitive) and is preceded by an empty line.
  - **Forced**: Prefixing any line with a period `.` (but not `..`) forces it to be a Scene Heading.
  - **Scene Numbers**: Automatically extracted if the heading ends with `#number#` (e.g., `INT. KITCHEN - DAY #1#`).
- **Characters (`LineType.character`)**:
  - **Auto-detected**: If a line is strictly **ALL CAPS**, preceded by a blank line, and followed by a non-blank line (which will be Dialogue).
  - **Forced**: Prefixing a line with `@` forces it to be a Character (e.g., `@sharanya` or `@Dev`), regardless of casing.
  - **Dual Dialogue (`LineType.dualDialogueCharacter`)**: If a character line ends with a caret `^`, it triggers dual dialogue alongside the previous character block.
- **Dialogue & Parentheticals**:
  - **Parentheticals (`LineType.parenthetical`)**: Lines starting with `(` and ending with `)` that immediately follow Character, Dialogue, or another Parenthetical.
  - **Dialogue (`LineType.dialogue`)**: Any text line that doesn't fit other rules but immediately follows a Character or Parenthetical.
- **Action (`LineType.action`)**:
  - The default fallback for any text.
  - **Forced Action**: Prefixing a line with `!` forces it to be Action.
- **Transitions (`LineType.transitionLine`)**:
  - **Auto-detected**: An ALL CAPS line ending with `TO:` preceded by a blank line.
  - **Forced**: Prefixing a line with `>` (with no matching `<` at the end).
- **Centered Text (`LineType.centered`)**:
  - Text wrapped in greater-than/less-than symbols `> like this <`.

### 5.3. Structural & Musical Elements
- **Sections/Outlining (`LineType.section`)**:
  - Lines prefixed with one or more `#`. The depth of the section is determined by the number of `#` characters (e.g., `## Act Two`).
- **Synopses (`LineType.synopse`)**:
  - Lines prefixed with `=` are treated as synopsis elements.
- **Page Breaks (`LineType.pageBreak`)**:
  - Lines consisting exclusively of `===`.
- **Lyrics (`LineType.lyrics`)**:
  - Lines prefixed with `~`.
- **Shots (`LineType.shot`)**:
  - Lines prefixed with `!!`.

### 5.4. ActOne-Specific Extensions (Inline Annotations)
ActOne supports inline double-bracket syntax `[[ ]]` to add metadata to lines without appearing in standard exports.
- **Markers**: E.g., `[[marker red: Review this]]` or `[[red]]` attaches a color-coded sticky marker to the line. Supported colors include `blue`, `brown`, `cyan`, `green`, `magenta`, `none`, `orange`, `pink`, `purple`, `red`, `yellow`, or standard HEX codes.
- **Storylines**: E.g., `[[storyline Plot A, Romance]]` immediately following a Scene Heading attaches storyline tags to the scene.
- **Scene Colors**: E.g., `[[color green]]` following a Scene Heading sets the highlight color of the scene in the UI.
