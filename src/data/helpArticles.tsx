import { generateShortcutsHelpMarkdown } from "../constants/shortcuts";

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  relatedIds: string[];
}

export const articles: HelpArticle[] = [
  // ===== GETTING STARTED =====
  {
    id: "welcome-screen",
    title: "Welcome Screen",
    category: "Getting Started",
    tags: ["welcome", "launch", "start"],
    relatedIds: ["new-project", "open-file", "recent-files"],
    content: `When you launch ActOne with no files open, the Welcome screen appears. From here you can:

- **New Project** — Create a new project.
- **Open Project** — Browse for an existing \`.actone\` project file (or legacy \`.fountain\` / \`.txt\` file) via the file dialog.
- **Templates** — Import a screenplay structure template (Three-Act, Save the Cat, Hero's Journey, etc.).
- **Help Guide** — Opens the Help Wiki window with searchable documentation.
- **Recent Projects** — Quick-open recently used projects (up to 6 displayed). Click the X to remove from the list. Stored for quick access (up to 10 entries).

**Footer actions:**
- **Help** — Opens the Help Wiki window with searchable documentation.
- **Discord** — Opens the ActOne Discord invite in your default browser.
- **Quick Settings** (gear icon) — Open the settings sidebar to switch themes, adjust zoom, and more.
- **App version** — Current build number.

The Welcome screen also displays an inspiring rotating writing quote from famous screenwriters, and alerts you when a new update is available.`,
  },
  {
    id: "new-project",
    title: "Creating a New Project",
    category: "Getting Started",
    tags: ["new", "create", "project", "untitled"],
    relatedIds: ["welcome-screen", "landing-pad", "open-file", "file-tabs"],
    content: `Press <kbd>Ctrl+N</kbd> or open the Command Palette (<kbd>Ctrl+K</kbd>) and choose "New Project" to create a new untitled project tab. Each project is saved as an \`.actone\` project file, which can contain multiple screenplay drafts and revisions in the Scripts pane. When a new project is created with no scripts, the Landing Pad allows you to create your first script with a single click.`,
  },
  {
    id: "landing-pad",
    title: "Project Landing Pad",
    category: "Getting Started",
    tags: ["landing pad", "new script", "empty project", "create"],
    relatedIds: ["new-project", "scripts-manager", "welcome-screen"],
    content: `When you create a new project with no documents, or delete all existing documents from a project, ActOne displays the **Project Workspace** landing pad:

- **New Screenplay (\`.fountain\`)**: Create and initialize an industry-standard screenplay with automatic pagination and formatting.
- **New Prose Document (\`.md\`)**: Create a Markdown document for treatments, story beat sheets, character bibles, and notes.
- **Import or Structure Template**: Import existing files (\`.fountain\`, \`.pdf\`, \`.fdx\`, \`.fadein\`, \`.md\`) or start with a Three-Act, Hero's Journey, or Save the Cat structure template.
- **Sidebar Integration**: The sidebar automatically switches to the **Project & Scripts** pane where you can organize, reorder, or rename all documents in your project.`,
  },
  {
    id: "open-file",
    title: "Opening Projects",
    category: "Getting Started",
    tags: ["open", "project", "file", "fountain", "actone", "txt", "cli"],
    relatedIds: ["welcome-screen", "new-project", "file-tabs", "recent-files", "cli-commands"],
    content: `Press <kbd>Ctrl+O</kbd> or use the Command Palette (<kbd>Ctrl+K</kbd>) → "Open Project…" to open an \`.actone\` project (or \`.fountain\` / \`.txt\` file) via the native file dialog.

When launched from the command line on Linux, ActOne accepts file paths as arguments (see the **Command Line Interface (CLI)** article for complete details). The app also listens for OS-level file-open events (e.g., double-clicking a .actone or .fountain file).

Importing other screenplay formats is separate from opening an existing project. Use **Import Screenplay...** for <code>.pdf</code>, <code>.fdx</code>, <code>.fadein</code>, <code>.fountain</code>, or <code>.txt</code> files. ActOne converts the selected screenplay file into an ActOne <code>.actone</code> project.`,
  },
  {
    id: "recent-files",
    title: "Recent Files",
    category: "Getting Started",
    tags: ["recent", "history", "quick open"],
    relatedIds: ["open-file", "welcome-screen"],
    content: `The Welcome screen shows your most recently opened files (up to 6) as clickable chips. Click one to re-open it. Hover and click the X to remove an entry from the list. Recent files are remembered across sessions (up to 10 entries), and files that have been moved or deleted are automatically cleaned up on launch.`,
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts Reference",
    category: "Getting Started",
    tags: ["shortcuts", "keys", "hotkeys", "keyboard"],
    relatedIds: ["command-palette"],
    content: generateShortcutsHelpMarkdown(),
  },
  {
    id: "command-palette",
    title: "Command Palette",
    category: "Getting Started",
    tags: ["commands", "palette", "ctrl+k", "search"],
    relatedIds: ["keyboard-shortcuts"],
    content: `Press <kbd>Ctrl+K</kbd> to open the Command Palette. Type to filter commands across six categories:

**File:** New Project, Open Project, Import Screenplay, Save Project, Save Project As, Close Active Project, Export.

**Edit:** Undo, Redo, Cut, Copy, Paste, Find/Search, and Enable/Disable Spellcheck.

**View:** Toggle Sidebar, Switch Sidebar Tab (Outline / Notepad), Typewriter Mode, Zen Mode, Focus Mode, Zoom In / Zoom Out / Reset Editor Scale, Show/Hide Fountain Markup, Open X-Ray Analysis, Show Snapshots.

**Format:** Edit Title Page, Import Structure Template, Renumber Scene Headings, Clear Scene Numbers.

**Settings:** Open Settings, Open Spellcheck Settings, Set Font (Courier Prime / Courier Prime Sans), Set Paper Size (Letter / A4), Theme Manager.

**Help:** Help Guide, Interactive Tutorial, Fountain Syntax Guide, Report a Bug (with diagnostics & privacy controls).

Each command shows its keyboard shortcut when available. Navigate with arrow keys and press Enter to execute. Press Escape to close. Available even when modals are open.`,

  },
  {
    id: "script-import",
    title: "Importing Screenplays",
    category: "Getting Started",
    tags: ["import", "pdf", "fdx", "fadein", "fountain", "convert"],
    relatedIds: ["open-file", "new-project", "actone-bundle"],
    content: `Use **Import Screenplay...** from the Welcome screen, editor, or Command Palette (<kbd>Ctrl+K</kbd>) to convert an existing screenplay into an ActOne project.

Supported formats are:
- PDF Screenplay (<code>.pdf</code>)
- Final Draft XML (<code>.fdx</code>)
- Fade In project files (<code>.fadein</code>)
- Fountain (<code>.fountain</code>)
- Plain text (<code>.txt</code>)
- Markdown documents (<code>.md</code>, <code>.markdown</code>)

ActOne converts the source and immediately opens it as an unsaved <code>Untitled.actone</code> project ready for editing, without interrupting you with an immediate save dialog. You can save whenever you are ready (<kbd>Ctrl+S</kbd>).

### Drag-and-Drop
You can drag and drop any supported file directly into ActOne:
- **Dropping into the main window**: Opens the file as a new <code>Untitled.actone</code> project.
- **Dropping into the Project & Scripts pane**: Adds the file directly into your current project as an additional script (or prose document for Markdown).

*Note: When importing PDFs, a brief notice will remind you to review formatting, as PDF exports from different screenwriting programs vary widely.*`,
  },
  {
    id: "interactive-tutorial",
    title: "Interactive Tutorial",
    category: "Getting Started",
    tags: ["tutorial", "tour", "learn", "onboarding"],
    relatedIds: ["welcome-screen", "command-palette"],
    content: `You can launch the **Interactive Tutorial** from the Welcome screen or by searching for it in the Command Palette (<kbd>Ctrl+K</kbd>).

There are two tutorials available:
- **UI Tour:** A quick guided tour showing you around the interface (Sidebar, X-Ray, Focus Mode, Zen Mode, etc.).
- **Fountain Elements:** An interactive sandbox that teaches you how to format a screenplay using the Fountain syntax. It will live-validate your formatting as you learn.`,
  },
  {
    id: "cli-commands",
    title: "Command Line Interface (CLI)",
    category: "Getting Started",
    tags: ["cli", "terminal", "command line", "linux", "arguments", "appimage"],
    relatedIds: ["open-file", "script-import", "welcome-screen"],
    content: `ActOne can be launched directly from the terminal on **Linux**.

### Basic Usage
\`\`\`bash
actone [file_path]

# Linux (AppImage standalone)
./ActOne-Screenplay-x86_64.AppImage [file_path]
\`\`\`

When launched without arguments, ActOne displays the Welcome screen.

### Supported File Arguments
Passing a file path opens or imports the document directly:

- **Native Projects & Screenplays**:
  - \`actone screenplay.actone\` — Opens the \`.actone\` project bundle directly into the editor.
  - \`actone script.fountain\` — Opens the Fountain screenplay directly with live formatting.
  - \`actone notes.txt\` — Opens a plain text file.

- **Instant Imports**:
  - \`actone draft.pdf\` — Automatically converts the PDF screenplay and opens it as a project ready for editing.
  - \`actone draft.fdx\` — Converts Final Draft XML into an unsaved project.
  - \`actone draft.fadein\` — Converts Fade In project files into an unsaved project.
  - \`actone treatment.md\` — Converts Markdown as a prose document in an unsaved project.`,
  },

  // ===== FOUNTAIN SYNTAX =====
  {
    id: "scene-headings",
    title: "Scene Headings / Sluglines",
    category: "Fountain Syntax",
    tags: ["scene heading", "slugline", "int", "ext", "interior", "exterior"],
    relatedIds: ["character-names", "action", "sections", "scene-numbers"],
    content: `Scene headings indicate time and location changes. Start a line with \`INT\`, \`EXT\`, \`INT/EXT\`, \`EXT/INT\`, \`I/E\`, or \`E/I\` followed by a location and time of day separated by a dash.

Example: \`INT. WRITING STUDIO - DAY\`

To force any line to be a scene heading, begin it with a period: \`.SECRET HIDEOUT\`

The parser extracts the shooting location (e.g., "WRITING STUDIO") and time of day automatically. Scene numbers can be added with \`#1#\` syntax at the end of the heading. Use the Command Palette to auto-renumber or clear scene numbers.`,
  },
  {
    id: "character-names",
    title: "Character Names",
    category: "Fountain Syntax",
    tags: ["character", "@", "name", "all caps"],
    relatedIds: ["dialogue", "parentheticals", "xray-character-data", "autocomplete"],
    content: `Introduce a character by typing their name in ALL CAPS on a line preceded by a blank line. Names with lowercase letters can be forced with the \`@\` prefix: \`@McQueen\`

Character names with parenthetical extensions like \`JOHN (V.O.)\` are supported — 29 built-in extensions including \`(V.O.)\`, \`(O.S.)\`, \`(O.C.)\`, \`(CONT'D)\`, \`(PHONE)\`, \`(NARRATOR)\`, and more.

ActOne automatically recognizes character lines and formats the following text as dialogue. Character names are tracked in the **X-Ray Analysis** window (Status Bar bar-chart icon or Command Palette) with dialogue line counts, gender assignments, and connection data. See \`xray-character-data\`.`,
  },
  {
    id: "dialogue",
    title: "Dialogue",
    category: "Fountain Syntax",
    tags: ["dialogue", "speech", "speaking"],
    relatedIds: ["character-names", "parentheticals", "dual-dialogue"],
    content: `Place dialogue text directly underneath a character name line, with no blank lines between them. Dialogue automatically gets the correct screenplay indentation (roughly 2 inches from the left margin). Lines following a parenthetical also render as dialogue.`,
  },
  {
    id: "parentheticals",
    title: "Parentheticals (Wrylies)",
    category: "Fountain Syntax",
    tags: ["parenthetical", "wryly", "delivery", "parentheses"],
    relatedIds: ["character-names", "dialogue"],
    content: `Add actor directions by wrapping text in parentheses on a line between the character name and dialogue: \`(whispering)\`

Pressing \`(\` on a blank line after a character name automatically creates a parenthetical line (removes the blank line). If Auto-Match Parentheses is enabled, typing \`(\` inserts \`()\` and places the cursor between them.`,
  },
  {
    id: "action",
    title: "Action & Scene Descriptions",
    category: "Fountain Syntax",
    tags: ["action", "description", "!", "exclamation"],
    relatedIds: ["scene-headings", "transitions"],
    content: `Write action in standard mixed-case paragraphs. Any line that doesn't trigger another Fountain rule is treated as action. Force a line as action by starting it with \`!\`: \`!He exits through the window.\``,
  },
  {
    id: "transitions",
    title: "Transitions",
    category: "Fountain Syntax",
    tags: ["transition", "cut to", "fade in", ">", "TO"],
    relatedIds: ["action"],
    content: `Write transitions like \`CUT TO:\` or \`FADE OUT.\` in ALL CAPS ending with \`TO:\`. Force a transition on any line by starting with \`>\`: \`> FADE IN:\`

Transitions render right-aligned in PDF exports.`,
  },
  {
    id: "centered-lyrics",
    title: "Centered Text & Lyrics",
    category: "Fountain Syntax",
    tags: ["centered", "lyrics", "~", "> <", "music"],
    relatedIds: ["action"],
    content: `Center text by wrapping it in \`>\` and \`<\`: \`> THE END <\`. Start a line with \`~\` for lyrics (rendered in italics): \`~ Sing a song\``,
  },
  {
    id: "shot-lines",
    title: "Shot Lines (Camera Directions)",
    category: "Fountain Syntax",
    tags: ["shot", "camera", "!!", "direction"],
    relatedIds: ["action", "transitions"],
    content: `Force a line as a camera direction by starting it with \`!!\`: \`!!CLOSE UP ON THE LETTER\`. Shot lines render in bold uppercase in exports.`,
  },
  {
    id: "page-breaks",
    title: "Page Breaks",
    category: "Fountain Syntax",
    tags: ["page break", "===", "new page"],
    relatedIds: ["export-pdf"],
    content: `Force a page break in PDF exports by typing exactly \`===\` on a line by itself. The editor shows a visual page break indicator. The pagination engine also handles smart orphan/widow protection — headings that would appear alone at a page bottom are pushed to the next page, and dialogue blocks are kept together.`,
  },
  {
    id: "dual-dialogue",
    title: "Dual Dialogue",
    category: "Fountain Syntax",
    tags: ["dual dialogue", "^", "simultaneous", "side by side"],
    relatedIds: ["dialogue", "character-names"],
    content: `Create side-by-side dialogue by appending \`^\` (carat) to the second character's name: \`BOB ^\`. Both characters' dialogue renders in parallel columns in PDF exports.`,
  },
  {
    id: "synopsis",
    title: "Synopsis Outline Notes",
    category: "Fountain Syntax",
    tags: ["synopsis", "=", "outline", "notes", "invisible"],
    relatedIds: ["sections", "outline-navigator"],
    content: `Add outline summaries by starting a line with \`=\`: \`= Introduce the villain\`. Synopsis lines appear in the Outline Navigator and are invisible in exported PDFs (unless toggled on in export settings).`,
  },
  {
    id: "sections",
    title: "Sections & Hierarchy",
    category: "Fountain Syntax",
    tags: ["section", "#", "act", "sequence", "header"],
    relatedIds: ["synopsis", "outline-navigator", "structure-templates"],
    content: `Organize your script with Fountain section headers. Use \`#\` for major blocks (e.g., \`# Act I\`) and \`##\` for sub-sequences. These structure the Outline Navigator hierarchy with collapsible sections. At most two levels of depth are supported.`,
  },
  {
    id: "inline-formatting",
    title: "Inline Text Formatting",
    category: "Fountain Syntax",
    tags: ["bold", "italic", "underline", "**", "format"],
    relatedIds: ["transform-case"],
    content: `Select text and use <kbd>Ctrl+B</kbd> for bold (\`**text**\`), <kbd>Ctrl+I</kbd> for italic (\`*text*\`), <kbd>Ctrl+U</kbd> for underline (\`_text_\`). Press the same shortcut again to remove formatting. Also accessible via right-click → Format.`,
  },
  {
    id: "boneyard-comments",
    title: "Boneyard Comments",
    category: "Fountain Syntax",
    tags: ["boneyard", "comments", "/*", "hidden"],
    relatedIds: ["notes-markers"],
    content: `Wrap text in \`/*\` and \`*/\` to create boneyard comments — sections that are completely ignored by the parser and invisible in exports. Useful for hiding alternate lines or notes.`,
  },

  // ===== MARKDOWN SYNTAX =====
  {
    id: "markdown-overview",
    title: "Markdown & Prose Overview",
    category: "Markdown Syntax",
    tags: ["markdown", "prose", "overview", "syntax", "guide", "writing"],
    relatedIds: ["markdown-headings", "markdown-formatting", "markdown-lists", "markdown-blockquotes", "prose-markdown-editor"],
    content: `ActOne features first-class multi-document workspace support. In addition to industry-standard Fountain screenplays, you can create and edit **Prose Documents (\`.md\`)** directly inside your \`.actone\` project bundles.

### Why Use Prose in ActOne?
- **Treatment & Beat Sheets**: Write comprehensive story treatments and narrative overviews alongside your screenplay drafts.
- **Character Bibles & World-Building**: Maintain rich lore, locations, character biographies, and production notes.
- **Director's Pitch & Synopses**: Craft polished pitch decks, series bibles, and episode breakdowns.

### Live Inline Formatting
ActOne's Prose editor renders Markdown elements with live inline visual styling while keeping the underlying markdown syntax characters clean, readable, and fully editable.

### Quick Syntax Summary
| Element | Syntax Example | Rendered Style |
| :--- | :--- | :--- |
| **Heading 1** | \`# Title\` | Large bold title |
| **Heading 2** | \`## Section\` | Subsection title |
| **Bold** | \`**bold text**\` | **bold text** |
| **Italic** | \`*italic text*\` | *italic text* |
| **Highlight** | \`==highlighted==\` | highlighted |
| **Strikethrough** | \`~~deleted~~\` | ~~deleted~~ |
| **Inline Code** | \`\` \`code\` \`\` | Monospace tag |
| **Bulleted List** | \`- Item\` or \`* Item\` | Clean bullet list |
| **Numbered List** | \`1. Item\` | Sequential list |
| **Task Checkbox** | \`- [ ] To-do\` | Interactive checkbox |
| **Blockquote** | \`> Quote\` | Stepped colored rail |
| **Table** | \`| Col 1 | Col 2 |\` | Interactive table |`,
  },
  {
    id: "markdown-headings",
    title: "Headings & Section Dividers",
    category: "Markdown Syntax",
    tags: ["headings", "headers", "titles", "h1", "h2", "h3", "divider", "hr"],
    relatedIds: ["markdown-overview", "markdown-formatting", "outline-navigator"],
    content: `Structure your prose documents into hierarchical sections using Markdown heading prefixes:

### Heading Levels
Prefix any line with one to six hash (\`#\`) characters followed by a space:
- \`# Heading 1\` — Document Title or Major Chapter
- \`## Heading 2\` — Act or Main Section
- \`### Heading 3\` — Subsection or Beat
- \`#### Heading 4\` — Sub-beat or Detailed Note
- \`##### Heading 5\` — Minor Header
- \`###### Heading 6\` — Sub-header

> [!TIP]
> Headings automatically populate the **Outline View** in the sidebar, allowing you to jump instantly between chapters and sections.

### Horizontal Rules (Dividers)
Create a clean horizontal dividing line between scenes or sections by typing three or more hyphens, asterisks, or underscores on their own line:
\`\`\`markdown
---
\`\`\`
or
\`\`\`markdown
***
\`\`\``,
  },
  {
    id: "markdown-formatting",
    title: "Text Formatting & Emphasis",
    category: "Markdown Syntax",
    tags: ["bold", "italic", "strikethrough", "code", "links", "formatting", "emphasis"],
    relatedIds: ["markdown-overview", "markdown-headings", "markdown-lists"],
    content: `Style inline words and phrases with standard Markdown emphasis:

### Bold & Italic
- **Bold**: Wrap text with double asterisks or double underscores:
  \`**important beat**\` or \`__important beat__\`
- **Italic**: Wrap text with single asterisks or single underscores:
  \`*whispering voice*\` or \`_whispering voice_\`
- **Bold + Italic**: Wrap text with triple asterisks:
  \`***crucial plot twist***\`

### Highlight
Wrap text with double equals to mark it with a theme-adaptive solid yellow highlight box (Ctrl+Shift+H):
\`==highlighted note==\`
Highlighting can safely be applied across any screenplay element (character cues, scene headings, dialogue, transitions, action) without altering line classifications.

### Strikethrough
Wrap text with double tildes to mark deleted or revised ideas:
\`~~discarded scene concept~~\`

### Inline Code & Monospace
Wrap text in single backticks for technical terms, timecodes, or cues:
\`\`\`markdown
Set lighting cue to \`CUE_NIGHT_04\` at \`01:24:10\`.
\`\`\`

### Hyperlinks
Create clickable external links using standard Markdown link syntax:
\`[ActOne Website](https://iyal.ink)\`
ActOne displays an external link affordance icon next to the link so you can open it in your default web browser with a single click.`,
  },
  {
    id: "markdown-lists",
    title: "Lists & Interactive Task Checkboxes",
    category: "Markdown Syntax",
    tags: ["lists", "bullets", "numbered", "tasks", "checkbox", "indentation", "todo"],
    relatedIds: ["markdown-overview", "markdown-blockquotes", "tasks"],
    content: `Create bulleted lists, sequential numbered steps, and interactive to-do checklists in your notes and prose documents.

### Bulleted (Unordered) Lists
Start a line with a dash (\`-\`), asterisk (\`*\`), or plus (\`+\`) followed by a space:
\`\`\`markdown
- Character motivations
* Key story beats
+ Unresolved conflicts
\`\`\`
ActOne replaces the raw prefix with clean, aligned bullet indicators with comfortable spacing.

### Numbered (Ordered) Lists
Start a line with a number followed by a period and space:
\`\`\`markdown
1. Setup and Inciting Incident
2. Rising Action and Midpoint Climax
3. Climax and Resolution
\`\`\`
- **Automatic Re-numbering**: Pressing <kbd>Enter</kbd> automatically generates the next sequential number (e.g. \`2.\`, \`3.\`).
- If you delete or reorder items, ActOne maintains smooth sequential order.

### Interactive Task Checklists
Create task checkboxes for production to-do lists and revision trackers:
\`\`\`markdown
- [ ] Research period costumes
- [x] Finalize dialogue polish for Act II
\`\`\`
> [!NOTE]
> Checkboxes are **interactive**! You can click the checkbox directly inside the editor to toggle between completed (\`[x]\`) and pending (\`[ ]\`). Completed task lines receive a clean subtle strikethrough.

### Smart List Navigation
- **Indent Sub-item**: Press <kbd>Tab</kbd> to indent a list item into a nested sub-list.
- **Un-indent**: Press <kbd>Shift+Tab</kbd> to un-indent back to the parent level.
- **Exit List**: Press <kbd>Enter</kbd> on an empty list item to immediately clear the marker and resume standard paragraph writing.`,
  },
  {
    id: "markdown-blockquotes",
    title: "Blockquotes & Stepped Rails",
    category: "Markdown Syntax",
    tags: ["blockquote", "quote", "rail", "dialogue quote", "citation", "nesting"],
    relatedIds: ["markdown-overview", "markdown-lists", "prose-markdown-editor"],
    content: `Highlight important quotes, voice-over transcripts, or script citations using blockquotes.

### Creating Blockquotes
Start a line with a greater-than symbol (\`>\`) followed by a space:
\`\`\`markdown
> "Every great story is born from a single moment of genuine vulnerability."
\`\`\`

### Visual Stepped Indicator Rails
- ActOne renders blockquotes with vertical colored indicator rails on the left margin.
- Each nesting depth adds a distinct stepped indentation level.

### Multi-Level Nesting
Nest blockquotes for character back-and-forths or threaded notes:
\`\`\`markdown
> Producer Notes:
>> Director Response: We will adjust the lighting for this scene.
\`\`\`

### Smart Keyboard Shortcuts
- **Increase Depth**: Press <kbd>Tab</kbd> on a blockquote line to increase nesting depth (\`>\` → \`>>\`).
- **Decrease Depth**: Press <kbd>Shift+Tab</kbd> to decrease nesting depth (\`>>\` → \`>\`).
- **Continue on Enter**: Pressing <kbd>Enter</kbd> preserves the active blockquote depth on the new line.
- **Exit Blockquote**: Pressing <kbd>Enter</kbd> on an empty blockquote line clears the quote rail and returns to standard text.`,
  },
  {
    id: "markdown-tables",
    title: "Tables & Grid Formatting",
    category: "Markdown Syntax",
    tags: ["tables", "grid", "data", "columns", "rows", "cast matrix"],
    relatedIds: ["markdown-overview", "prose-markdown-editor", "markdown-codeblocks"],
    content: `Create structured tables for character grids, schedule timelines, scene breakdowns, or budget summaries.

### Table Syntax
Separate column values using pipe (\`|\`) characters, and define the header separator with hyphens (\`---\`):

\`\`\`markdown
| Scene | Location | Characters | Mood |
| :--- | :--- | :--- | :--- |
| 1 | Int. Detective Office | Nirmal, Kasi | Tense |
| 2 | Ext. Waterfront | Nirmal | Melancholic |
\`\`\`

### Column Alignment
- **Left Align**: \`:---\` (default)
- **Center Align**: \`:---:\`
- **Right Align**: \`---:\`

### Live Interactive Table Widget
When table rendering is active, ActOne renders the Markdown table as a live, interactive UI table:
- **Direct Cell Editing**: Click any cell to type and edit content directly.
- **<kbd>Tab</kbd> Navigation**: Press <kbd>Tab</kbd> to jump seamlessly to the next cell; press <kbd>Shift+Tab</kbd> to jump to the previous cell.
- **Auto-Append Row**: Pressing <kbd>Tab</kbd> on the last cell in the table automatically appends a new blank row.`,
  },
  {
    id: "markdown-codeblocks",
    title: "Fenced Code Blocks & Preformatted Text",
    category: "Markdown Syntax",
    tags: ["code", "codeblocks", "pre", "monospace", "technical", "fenced"],
    relatedIds: ["markdown-overview", "markdown-formatting", "markdown-tables"],
    content: `Embed multi-line technical snippets, camera rig setups, or preformatted text blocks using fenced code blocks.

### Creating Code Blocks
Wrap the content in triple backticks:

\`\`\`markdown
\`\`\`json
{
  "scene": "Opening Teaser",
  "camera": "Arri Alexa Mini LF",
  "lens": "Signature Prime 35mm"
}
\`\`\`
\`\`\`

Code blocks render in a high-contrast monospace container with distinct background tinting and preserved whitespace formatting.`,
  },

  // ===== WRITING TOOLS =====
  {
    id: "tab-cycle",
    title: "Tab-to-Cycle Line Prefixes",
    category: "Writing Tools",
    tags: ["tab", "prefix", "@", ".", ">", "cycle"],
    relatedIds: ["character-names", "scene-headings", "transitions"],
    content: `Press <kbd>Tab</kbd> at the start of a line to cycle through Fountain prefixes: \`@\` (forced character) → \`.\` (forced heading) → \`>\` (forced transition) → back to normal. Each press advances to the next in the cycle. On lines with existing text, the prefix is prepended; on empty lines, the prefix is set directly.`,
  },
  {
    id: "smart-newline",
    title: "Smart Newline Handling",
    category: "Writing Tools",
    tags: ["enter", "newline", "spacing", "auto spacing"],
    relatedIds: ["tab-cycle", "auto-parentheses"],
    content: `When you press <kbd>Enter</kbd> after a scene heading, character name, parenthetical, dialogue, transition, or shot line, ActOne automatically inserts the correct blank line spacing required by Fountain syntax. No need to manually add blank lines.

Additionally, pressing \`(\` on a blank line after a character name automatically converts it into a parenthetical line for you.`,
  },
  {
    id: "autocomplete",
    title: "Autocomplete & Ghost Text",
    category: "Writing Tools",
    tags: ["autocomplete", "suggestions", "character", "location", "ghost"],
    relatedIds: ["smart-quotes", "smart-newline", "character-names"],
    content: `ActOne provides inline ghost text suggestions as you type:

- On **character lines**: suggests character names from previously used characters.
- On **heading lines**: suggests location names from previously used scene headings.
- On **character lines with \`(\`**: suggests 29 character extensions like \`(V.O.)\`, \`(O.S.)\`, \`(CONT'D)\`, \`(NARRATOR)\`, etc.
- On **action lines**: suggests character names if the text is ALL-CAPS.

Press <kbd>Tab</kbd> to accept the ghost suggestion, or <kbd>ArrowDown</kbd> to open the full autocomplete dropdown. Toggle in Settings → Editor → Character/Scene Autocomplete.`,
  },
  {
    id: "smart-quotes",
    title: "Smart Quotes",
    category: "Writing Tools",
    tags: ["smart quotes", "curly quotes", "quotes", "typography"],
    relatedIds: ["autocomplete", "auto-parentheses"],
    content: `Straight quotation marks (\`"\` and \`'\`) are automatically converted to smart curly quotes (\`"\` and \`"\`) as you type based on the preceding character (open vs. close detection). Toggle in Settings → Editor → Smart Quotes.`,
  },
  {
    id: "auto-parentheses",
    title: "Auto-Match Parentheses",
    category: "Writing Tools",
    tags: ["parentheses", "auto", "match"],
    relatedIds: ["smart-quotes", "parentheticals"],
    content: `When enabled, typing \`(\` inserts \`()\` and places the cursor between them. If the next character is already \`)\`, it jumps over it instead. Toggle in Settings → Editor → Auto-Match Parentheses.`,
  },
  {
    id: "typewriter-mode",
    title: "Typewriter Mode",
    category: "Writing Tools",
    tags: ["typewriter", "scroll", "center cursor"],
    relatedIds: ["hide-syntax", "editor-zoom", "focus-mode"],
    content: `Keeps your active editing line vertically centered on screen. As you type, the page scrolls smoothly around your active line so your gaze stays comfortably in the center of the display. Toggle via Quick Settings in the Activity Bar, the Command Palette, or Settings → Editor.`,
  },
  {
    id: "hide-syntax",
    title: "Hide Fountain Markup",
    category: "Writing Tools",
    tags: ["hide syntax", "clean view", "reading view", "prefixes"],
    relatedIds: ["typewriter-mode", "zen-mode", "focus-mode"],
    content: `Toggle "Hide Fountain Markup" via Command Palette or Quick Settings to hide syntax prefixes (\`.\`, \`@\`, \`!\`, \`>\`, \`~\`, \`#\`, \`=\`, \`^\`, \`!!\`, \`[[…]]\`) from view on non-active lines. The active (cursor) line always shows prefixes so you can edit. Gives a clean manuscript-like reading experience.`,
  },
  {
    id: "focus-mode",
    title: "Focus Mode (Line Focus)",
    category: "Writing Tools",
    tags: ["focus", "line focus", "fade", "concentration"],
    relatedIds: ["hide-syntax", "typewriter-mode", "zen-mode"],
    content: `Toggle Focus Mode via Settings or Command Palette to fade out all lines except the one your cursor is on. The active line stays fully visible while every other line is dimmed. Helps you concentrate on one line at a time. Combine with Typewriter Mode and Hide Syntax for a truly distraction-free experience.`,
  },
  {
    id: "fix-formatting",
    title: "Fix Formatting",
    category: "Writing Tools",
    tags: ["fix formatting", "format", "clean spaces", "dialogue", "spacing"],
    relatedIds: ["inline-formatting", "search-replace"],
    content: `Run **Fix Formatting** via the Command Palette (<kbd>Ctrl+K</kbd>) to instantly clean and reformat your screenplay according to industry standard layout rules.

**What Fix Formatting does:**
- **Compact Dialogue**: Removes extraneous blank lines between Character, Parenthetical, and Dialogue blocks.
- **Element Separation**: Ensures exactly 1 blank line between distinct elements (e.g. Scene Headings, Action, Dialogue) and collapses 2+ consecutive blank lines down to 1.
- **Paragraph Preservation**: Retains multi-line action and lyric paragraphs without forcing them into a single line.
- **Syntax Prefix & Note Trimming**: Trims whitespace after forced syntax symbols (\`.\`, \`#\`, \`=\`, \`@\`, \`!\`, \`~\`) and inside inline note brackets \`[[ ]]\`.
- **Title Page Cleaning**: Normalizes extra empty lines in title page metadata header block.

Upon execution, a summary modal opens displaying the total number of lines removed, dialogue spaces collapsed, syntax prefixes trimmed, and note spaces cleaned.`,
  },
  {
    id: "editor-zoom",
    title: "Editor Zoom",
    category: "Writing Tools",
    tags: ["zoom", "font size", "ctrl+=", "ctrl+-"],
    relatedIds: ["typewriter-mode", "interface-scale"],
    content: `Zoom the editor text from **50% to 400%** using <kbd>Ctrl+=</kbd> (zoom in), <kbd>Ctrl+-</kbd> (zoom out), and <kbd>Ctrl+0</kbd> (reset to 100%). Step size is 10%. Also adjustable via Quick Settings slider or Settings → Editor → Editor Zoom. Your preferred zoom level is saved automatically.`,
  },
  {
    id: "transform-case",
    title: "Transform Case",
    category: "Writing Tools",
    tags: ["uppercase", "lowercase", "title case", "case"],
    relatedIds: ["inline-formatting"],
    content: `Right-click a selection and choose Transform Case to convert between UPPERCASE, Title Case, or lowercase. Useful for normalizing character names and scene headings.

- **UPPERCASE**: Converts all selected text to capital letters.
- **Title Case**: Capitalizes the first letter of each word.
- **lowercase**: Converts all selected text to lowercase.`,
  },
  {
    id: "look-up",
    title: "Look Up Word",
    category: "Writing Tools",
    tags: ["look up", "google", "search", "research"],
    relatedIds: ["context-menu"],
    content: `Right-click any selected word and choose "Look Up" to search it on Google in your default browser. Convenient for quickly researching terms, historical context, or locations without breaking your writing flow.`,
  },
  {
    id: "search-replace",
    title: "Search & Replace",
    category: "Writing Tools",
    tags: ["search", "replace", "ctrl+f", "regex", "preserve case"],
    relatedIds: ["look-up"],
    content: `Press <kbd>Ctrl+F</kbd> to open the Find & Replace pane on the right side of the editor. Features:

- **Find input** — auto-populates from selected text when opened
- **Toggles**: **Match Case** (\`Aa\`) for case-sensitive search, **Whole Word** (\`\\b\`) to match complete words, and **Regex** (\`.*\`) to treat search as a regular expression.
- **Match counter** — displays \`currentMatch/totalMatches\` with previous and next navigation arrows
- **Results list** — displays matching occurrences with scene numbers, scene context, and line previews with highlighted hits. Click any result to jump to it in the editor, or use the checkbox on each row for selective replacement.
- **Close** — \`×\` button in the pane header or <kbd>Esc</kbd>
- **Enter** — jump to next match; <kbd>Shift+Enter</kbd> — jump to previous match

All matches are highlighted inline in the editor.

**Replace** (collapsible section):

- **Replace input** — text field for replacement string
- **Preserve Case** (\`AB\`) toggle — intelligently adapts replacement case (ALL CAPS → ALL CAPS, Capitalized → Capitalized, lowercase → lowercase)
- **Replace** — replaces the currently selected match and moves to next
- **Replace Selected** — replaces only the specific matches selected via checkbox
- **Replace All** — replaces all matches with confirmation before proceeding

The pane width is adjustable — drag the left edge to resize. Press <kbd>Ctrl+F</kbd> again or click the close button to dismiss.`,
  },
  {
    id: "scene-numbers",
    title: "Scene Numbers",
    category: "Writing Tools",
    tags: ["scene numbers", "renumber", "#", "clear"],
    relatedIds: ["scene-headings", "export-pdf"],
    content: `The Command Palette provides two scene number commands:

- **Renumber Scene Headings** — Appends sequential \`#1#\`, \`#2#\`, etc. to every scene heading (removes existing numbers first). Prompts for confirmation.
- **Clear Scene Numbers** — Removes all \`#...#\` markers from scene headings. Prompts for confirmation.

Scene numbers display in the editor margins and as badges in the Outline Navigator. PDF export can include them on the left side or mirrored on both sides.`,
  },

  // ===== WORKSPACE & VIEWS =====
  {
    id: "activity-bar",
    title: "Activity Bar",
    category: "Workspace & Views",
    tags: ["activity bar", "sidebar", "tabs", "icons"],
    relatedIds: ["outline-navigator", "sidebar-panels", "zen-mode", "quick-settings", "command-palette"],
    content: `The Activity Bar is the vertical tool strip on the left edge of the window. Click an icon to open that sidebar panel; click it again to collapse it. The active panel is highlighted with your theme's accent color.

**Tabs available:**

| Group | Tab | Purpose | Requires .actone bundle? |
|-------|-----|---------|--------------------------|
| Content | Outline | Hierarchical scene cards with filter & sort | No |
| Content | Scripts | Multi-script bundle manager | Yes (hidden for plain .fountain) |
| Content | Notepad | Freeform outline / notes | Yes |
| Tools | Markers | List of \`[[marker …]]\` notes | No |
| Tools | Tasks | To-do checklist | Yes |
| Tools | Snapshots | Version history & restore | No |
| Tools | Sprint | Writing timer, history & leaderboard | No |
| Tools | Parking | Temporary text storage | Yes |

For plain \`.fountain\` files, only the **Outline** tab is shown in the Activity Bar. Other tabs are unlocked when working with an \`.actone\` bundle.

**Bottom dock:** Access **Quick Settings** (gear icon) and toggle **Zen Mode**.

For character data, statistics, and analysis charts, open the **X-Ray Analysis** window from the Status Bar bar-chart icon or Command Palette — see \`xray-analysis\`.`,
  },
  {
    id: "outline-navigator",
    title: "Outline Navigator",
    category: "Workspace & Views",
    tags: ["outline", "navigator", "sidebar", "tree", "hierarchy"],
    relatedIds: ["sections", "synopsis", "scene-reorder", "activity-bar", "scene-highlighting", "storylines"],
    content: `The Outline sidebar displays a structured overview of your screenplay organized as scene cards. Features:

- Click any card to scroll the editor directly to that scene.
- **Card anatomy:** scene number badge, heading, synopsis, and active character or storyline tags.
- Collapsible section headers let you organize acts and sequences.
- Keyboard navigation: use <kbd>↑</kbd>/<kbd>↓</kbd> to move, <kbd>←</kbd>/<kbd>→</kbd> to collapse/expand sections, and <kbd>Enter</kbd> to jump to a scene.
- **Search filter** at the top lets you instantly search scenes by keyword, location, or character.
- Filter scenes by color or storyline tags to isolate specific plot threads.
- Customize outline font size (Small, Normal, Large) from the header menu.
- Drag-and-drop scene reordering allows you to restructure scenes visually.

For prose documents (\`.md\`), the panel switches to **Table of Contents** mode listing Markdown headings.`,
  },
  {
    id: "scene-jump-palette",
    title: "Instant Scene Jump Palette (Ctrl+J)",
    category: "Workspace & Views",
    tags: ["scene jump", "jump to scene", "ctrl+j", "quick jump", "navigation", "palette", "fuzzy search"],
    relatedIds: ["outline-navigator", "command-palette", "scene-headings"],
    content: `Press <kbd>Ctrl+J</kbd> (or select **"Jump to Scene..."** from the Command Palette) to open the instant Scene Jump Palette.
    
Designed for speed and uninterrupted writing flow, it lets screenwriters and prose authors jump anywhere in their script in milliseconds.

### Fast Fuzzy Search Options
You can type any combination of search terms:
- **Scene Number**: Type \`14\`, \`#14\`, or \`14A\` to jump directly to that specific scene.
- **Prefix / Setting**: Type \`INT\`, \`EXT\`, or \`I/E\` to filter interior or exterior scenes.
- **Location**: Type keywords like \`COFFEE SHOP\`, \`APARTMENT\`, \`HIGHWAY\`, or \`BEACH\`.
- **Time of Day**: Type \`DAY\`, \`NIGHT\`, \`DAWN\`, \`EVENING\`, or \`CONTINUOUS\`.
- **Storylines & Synopses**: Search for plot arc tags or synopsis beats (e.g. \`ChaseArc\` or \`informant\`).
- **Prose / Markdown Headings**: When editing a Markdown document, the palette automatically indexes and searches chapters and headings (\`# Chapter 1\`, \`## Beat A\`).

### Keyboard Navigation
- <kbd>↑</kbd> and <kbd>↓</kbd>: Navigate through matched scenes.
- <kbd>Enter</kbd>: Instantly jump to and center the selected scene in the editor.
- <kbd>Esc</kbd>: Close the palette and return focus smoothly to the editor.`,
  },
  {
    id: "sidebar-panels",
    title: "Sidebar Panels Overview",
    category: "Workspace & Views",
    tags: ["sidebar", "panels", "workspace", "bundle"],
    relatedIds: ["activity-bar", "outline-navigator", "actone-bundle", "xray-analysis"],
    content: `ActOne provides several sidebar panels accessible from the **Activity Bar** (vertical icon strip on the left). Click an icon to open the corresponding panel; click again to close the sidebar. Press <kbd>Ctrl+\\</kbd> to toggle the sidebar or switch directly into Outline View from any open right pane.

**Mutual Pane Exclusivity:** To keep your writing space focused and uncluttered, only one pane (Left Sidebar or Right Pane) is active at a time. Opening a sidebar panel closes any active right-side panel, and vice versa.

| Panel | Icon | Purpose | Requires .actone? |
|-------|------|---------|-------------------|
| Outline | List | Hierarchical tree of sections, scenes, synopses | No |
| Scripts | Books | Multi-script bundle manager | Yes |
| Notepad | Note+ | Freeform outline and notes | Yes |
| Markers | Bookmark | List of \`[[marker …]]\` inline notes | No |
| Tasks | Checkbox | To-do checklist for revisions | Yes |
| Snapshots | Camera | Version history with restore | No |
| Sprint | Timer | Countdown writing timer with history | No |
| Parking | Archive | Temporary text clipboard | Yes |

Panels that require the .actone bundle are hidden for plain \`.fountain\` files. Use <kbd>Ctrl+Shift+S</kbd> to save as a bundle and unlock them. Panel widths are persisted across sessions and animate smoothly via natural deceleration curves.

**Character and statistical analysis** is available through the **X-Ray Analysis** window — open it from the bar-chart icon in the Status Bar or via Command Palette → "Open X-Ray Analysis…". See the \`xray-analysis\` article for details.`,

  },
  {
    id: "notepad",
    title: "Document Notepad",
    category: "Workspace & Views",
    tags: ["notepad", "notes", "brainstorm", "outline", "markdown", "prose"],
    relatedIds: ["prose-markdown-editor", "sidebar-panels", "actone-bundle"],
    content: `A rich Markdown & Prose text area in the sidebar (Activity Bar → note-with-plus icon) for jotting down outline notes, beat sheets, character ideas, or draft goals. Features real-time Markdown inline preview, stepped blockquote indicator bars, and smart list indentation. Content persists inside \`.actone\` bundles. The Notepad tab is hidden for plain \`.fountain\` files — save as a bundle via <kbd>Ctrl+Shift+S</kbd> to unlock it.`,
  },
  {
    id: "prose-markdown-editor",
    title: "Prose & Markdown Editing",
    category: "Workspace & Views",
    tags: ["prose", "markdown", "lists", "blockquotes", "formatting", "indentation", "notes"],
    relatedIds: ["markdown-overview", "markdown-lists", "markdown-blockquotes", "markdown-tables", "notepad"],
    content: `ActOne's Prose & Markdown editor provides an intuitive, formatted Markdown editing experience with live inline decorations:

### Always-Visible Syntax Highlighting
Markdown syntax characters remain clearly visible and styled with subtle contrasting colors:
- **Headers**: \`# Header 1\`, \`## Header 2\`, \`### Header 3\`
- **Emphasis**: \`**bold**\`, \`*italic*\`, \`~~strikethrough~~\`
- **Code**: \`\`inline code\`\`
- **Links**: \`[Link Text](https://example.com)\`

### Images Not Supported
Image embeds (\`![alt](url)\`) are not supported in ActOne Screenplay — there is no image insertion in the prose editor, and image markdown is not rendered in the editor or exported PDF.

### Stepped Blockquote Left Rail
- Typing \`>\`, \`>>\`, or \`>>>\` generates a solid stepped colored indicator bar on the left.
- Each nesting level precisely matches the width of the \`>\` syntax markers (\`1ch\` per depth level), with the \`>\` markers embedded cleanly inside the rail.
- **Smart Nesting**: Typing \`>\` on an empty blockquote line automatically collapses spaces and groups the arrows together (\`>> \`, \`>>> \`).
- **Enter Continuation**: Pressing <kbd>Enter</kbd> maintains the current blockquote depth. Pressing <kbd>Enter</kbd> on an empty blockquote line (or double-Enter) clears the prefix and exits to a fresh line.

### Lists & Smart Indentation
- **Unordered Lists**: Type \`- \`, \`* \`, or \`+ \` to start a bulleted list.
- **Ordered Lists**: Type \`1. \` to start a numbered list.
- **Tab to Sub-Item**: Pressing <kbd>Tab</kbd> indents the list item by 2 spaces and starts a sub-item (automatically resetting numbered sub-items to start at \`1.\`).
- **Shift-Tab / Enter to Parent Item**: Pressing <kbd>Shift-Tab</kbd> or pressing <kbd>Enter</kbd> on an empty sub-item un-indents back to the parent level and restores sequential numbering (e.g. continuing from \`2. Second item\` to \`3. Third item\`).
- **Blockquote Nesting via Tab**: Pressing <kbd>Tab</kbd> inside a blockquote increases depth (\`>\` → \`>>\`), while <kbd>Shift-Tab</kbd> decreases depth.`,
  },
  {
    id: "xray-character-data",
    title: "Character Data",
    category: "Workspace & Views",
    tags: ["characters", "gender", "tracker", "dialogue counts", "xray"],
    relatedIds: ["xray-analysis", "character-names", "statistics-overview"],
    content: `Character tracking and gender data live inside the **X-Ray Analysis** window:

1. Open X-Ray (Status Bar bar-chart icon, or Command Palette → "Open X-Ray Analysis…").
2. Switch to the **Characters** mode at the top of the X-Ray window.
3. The list shows every character in the script with their dialogue line count, gender, and role, sorted by frequency.
4. Click a row to edit gender and role inline; changes are persisted to the \`.actone\` bundle's \`characters.json\`.

Gender data also feeds the **Dialogue by Gender** chart in X-Ray's Statistics mode (4 rows: male, female, non-binary, unknown).`,
  },
  {
    id: "statistics-overview",
    title: "Script Statistics",
    category: "Workspace & Views",
    tags: ["stats", "statistics", "word count", "pages", "locations"],
    relatedIds: ["xray-analysis", "status-bar", "sidebar-panels"],
    content: `Script statistics are available in two places:

**1. Status Bar (bottom of the editor):**
- **Scenes** — count of scene headings (hidden on small screens).
- **Words** — total word count, formatted with locale separators (hidden on small screens).
- **Page** — "Page: currentPage of totalPages" (always visible), updated as you move your cursor.

**2. X-Ray Analysis window (Status Bar bar-chart icon or Command Palette → "Open X-Ray Analysis…"):**

- **Statistics mode:** Dialogue vs Action ratio, day vs night pie charts, top locations, and scene length distribution.
- **Timing Report mode:** Estimated screen durations per scene, with cumulative runtimes.
- **Pacing Chart mode:** Line/area chart of Dialogue vs Action per scene. Hold <kbd>Ctrl</kbd> + scroll to zoom; pan horizontally when zoomed in.

X-Ray data updates live as you type.`,
  },
  {
    id: "xray-analysis",
    title: "X-Ray Screenplay Analyzer",
    category: "Workspace & Views",
    tags: ["xray", "x-ray", "analysis", "timing", "connections", "pacing"],
    relatedIds: ["statistics-overview", "xray-character-data", "character-names"],
    content: `The X-Ray window is a comprehensive screenplay analysis tool. Open it via the bar-chart icon on the right side of the **Status Bar** (bottom of the editor) or Command Palette → "Open X-Ray Analysis…". It is a live-updating window with several analysis modes:

- **Statistics:** View dialogue vs action ratios, day vs night pie charts, top locations, and scene length distribution counts.
- **Timing Report:** See estimated screen durations per scene (calculated by word count and pacing), along with cumulative runtimes. Scene headings are sanitized to display only clear, capitalized locations.
- **Characters:** View and edit character details (gender and role) in a data-dense list, outside of the secondary details modal.
- **Connections:** Analyze character interactions via two analytical modes:
  - **Network Graph:** A circular node diagram linking characters who speak in the same scenes. Click a node to view single character co-occurrences.
  - **Ctrl+Click Double Selection:** Hold <kbd>Ctrl</kbd> (or <kbd>Cmd</kbd>) and click a second character node to show connection data and shared scenes between both characters.
  - **Matrix Heatmap:** A grid map of characters where cell colors reflect interaction frequency. Set column headers style to fit the window with proportional sizing.
- **Pacing Chart:** A line/area chart showing Dialogue vs Action pacing per scene. 
  - **Fit-to-Window:** Reacts to window resizing by default to fit the space.
  - **Scroll and Zoom:** Hold <kbd>Ctrl</kbd> + scroll your mouse wheel on the chart to zoom in (up to 500%) or zoom out. Zooming in lets you pan the pacing chart horizontally.`,
  },
  {
    id: "tasks",
    title: "To-Do Tasks",
    category: "Workspace & Views",
    tags: ["tasks", "todo", "checklist", "revisions"],
    relatedIds: ["sidebar-panels", "sprint-timer"],
    content: `The Tasks panel helps you track screenplay revisions, polish passes, and to-do items:

- Type a task in the input field and press <kbd>Enter</kbd> or click the add button.
- Click the circle icon or press <kbd>Space</kbd>/<kbd>Enter</kbd> to toggle completion (moves completed items to a collapsible section).
- Keyboard navigation: use <kbd>↑</kbd>/<kbd>↓</kbd> to select, <kbd>Enter</kbd>/<kbd>Space</kbd> to toggle, and <kbd>Delete</kbd>/<kbd>Backspace</kbd> to remove.
- Right-click selected text in the editor → **Create Task** to add it directly as a new task.
- Tasks are saved automatically with your project.`,
  },
  {
    id: "sprint-timer",
    title: "Writing Sprint Timer",
    category: "Workspace & Views",
    tags: ["sprint", "timer", "writing", "wpm", "countdown"],
    relatedIds: ["tasks", "sidebar-panels", "statistics-overview"],
    content: `The Sprint panel provides a focused countdown timer to motivate writing sessions:

- **Preset durations**: Choose from **5, 15, 25, 45, or 60 minutes**, or type any custom duration in minutes.
- **Start Sprint**: Click to begin your timed writing sprint.
- **Live tracking**: Displays a progress ring, remaining time, words written, and live words-per-minute (WPM), with options to finish or cancel.
- The Status Bar shows a live countdown and speed tracker while a sprint is active.

**History tab:** Review past sprint sessions with word count, date, duration, WPM, and script name.

**Leaderboard tab:** Top 10 sprints ranked by word count with Gold, Silver, and Bronze badges.

**Stats banner:** Highlights your Personal Best WPM and Total Words Sprinted across sessions.`,
  },
  {
    id: "snapshots",
    title: "Snapshots (Version History)",
    category: "Workspace & Views",
    tags: ["snapshots", "version", "backup", "history", "restore"],
    relatedIds: ["sidebar-panels", "settings-overview"],
    content: `The Snapshots panel saves point-in-time copies of your screenplay for easy rollback. Enable via Settings → Snapshots.

**Creating Snapshots:**
- **Manual**: Add an optional comment and tag in the panel header, then click **New Snapshot**.
- **Auto-snapshot**: Enable in Settings to take automatic snapshots at regular intervals (1–60 min).
- **On save**: Automatically snapshots your screenplay every time you save.

**Managing Snapshots:**
- Each snapshot shows the date/time, file size, comment, and tag (MANUAL, SAVE, AUTO, or custom).
- Filter by tag type using the tag buttons at the top.
- Three-dot menu on each snapshot:
  - **Restore** — Replaces the current script with the snapshot. A safety snapshot is taken first so you never lose pending work.
  - **Open as File** — Opens the snapshot content in a separate read-only tab for comparison.
  - **Delete** — Removes the snapshot permanently.

Click **Open Snapshots Folder** to browse saved versions directly in your system file manager.`,
  },
  {
    id: "parking",
    title: "Text Parking",
    category: "Workspace & Views",
    tags: ["parking", "clipboard", "text storage", "temporary"],
    relatedIds: ["sidebar-panels", "context-menu"],
    content: `The Parking panel works as a temporary clipboard for storing dialogue snippets, cut scenes, and stray ideas:

- Select text in the editor and click "Park Selection" to store it (cuts from editor).
- Click a parked card to re-insert the text at the cursor position and remove it from parking.
- Right-click → **Park Selection** stores text and removes it from the editor in one step.
- Keyboard navigation: <kbd>↑</kbd>/<kbd>↓</kbd> to select, <kbd>Enter</kbd> to insert.
- Individual delete (X) button on each parked item.

Parked text is saved automatically with your project.`,
  },
  {
    id: "markers-list",
    title: "Markers List",
    category: "Workspace & Views",
    tags: ["markers", "notes", "inline", "filter"],
    relatedIds: ["notes-markers", "sidebar-panels"],
    content: `The Markers sidebar displays all inline \`[[marker …]]\` notes from your screenplay:

- **Search field** — filter notes by text across descriptions and scene context.
- **Filter by Color** — filter notes by color category to isolate specific revision passes.
- Each item displays the line number, scene heading, description, and scene context.
- Click any card to jump the editor directly to that note.
- Keyboard navigation: <kbd>↑</kbd>/<kbd>↓</kbd> to move, <kbd>Enter</kbd> to jump.`,
  },
  {
    id: "scripts-manager",
    title: "Scripts Manager (Multi-Document Projects)",
    category: "Workspace & Views",
    tags: ["scripts", "prose", "multi-script", "project", "bundle", "manage"],
    relatedIds: ["actone-bundle", "sidebar-panels"],
    content: `The Scripts sidebar lets you manage multiple documents — Screenplays (tagged <span style="font-weight:700;">SCRIPT</span>) and Prose documents (tagged <span style="font-weight:700;">PROSE</span>) — inside a single .actone project:

- **Add**: "+" menu creates a new Screenplay (\`.fountain\`) or Prose document (\`.md\`).
- **Import**: Download menu opens native file dialog to import Screenplays or Markdown Prose files.
- **Rename**: Double-click a document name for inline edit, or select three-dot menu → **Rename**; press <kbd>Enter</kbd> to save, <kbd>Escape</kbd> to cancel. All per-document metadata (todos, notepad, parked items, character genders, and production tags) is automatically preserved and migrated.
- **Duplicate**: Three-dot menu → Duplicate creates a copy with a unique name and auto-selects the name for renaming.
- **Reorder**: Drag-and-drop documents by the left drag handle within the list, or use the three-dot menu → Move Up / Move Down.
- **Delete**: Three-dot menu → Delete (with confirmation). Automatically cleans up document metadata. If all documents in a project are deleted, the project gracefully enters the Landing Pad state.
- Click a document card to load it into the editor. The Status Bar shows the active document name — click it to quickly switch.`,
  },
  {
    id: "zen-mode",
    title: "Zen Mode (Distraction-Free)",
    category: "Workspace & Views",
    tags: ["zen mode", "fullscreen", "distraction free", "focus"],
    relatedIds: ["activity-bar", "hide-syntax", "typewriter-mode", "focus-mode"],
    content: `Press <kbd>Ctrl+Alt+Enter</kbd> to toggle Zen Mode. This hides all toolbars, sidebars, and status indicators, expanding the editor into a completely distraction-free full-screen writing view. Zoom shortcuts (<kbd>Ctrl+=</kbd>, <kbd>Ctrl+-</kbd>) and Search (<kbd>Ctrl+F</kbd>) remain fully functional in Zen Mode.`,
  },
  {
    id: "context-menu",
    title: "Editor Context Menu",
    category: "Workspace & Views",
    tags: ["right click", "context menu", "menu"],
    relatedIds: ["scene-highlighting", "transform-case", "parking", "notes-markers"],
    content: `Right-click anywhere in the editor for quick access:

- **Selection Stats** (if text selected): word count and character count.
- **Cut / Copy / Paste** — standard clipboard operations.
- **Highlight Scene** → 7 colors: Red, Orange, Yellow, Green, Blue, Purple, Pink, plus Clear.
- **Drop Marker** → submenu with 11 colors (Blue, Brown, Cyan, Green, Magenta, Orange, Pink, Purple, Red, Yellow, Default Orange). Prompts for a description.
- **Format** → Bold, Italic, Underline, Highlight.
- **Transform Case** → UPPERCASE, Title Case, lowercase.
- **Look Up Word** → Google search selection in default browser.
- **Create Task** → adds selected text as a to-do item.
- **Park Selection** → cuts selected text and stores in Parking sidebar.`,
  },
  {
    id: "status-bar",
    title: "Status Bar",
    category: "Workspace & Views",
    tags: ["status bar", "info", "stats", "mode"],
    relatedIds: ["statistics-overview", "sprint-timer", "scripts-manager"],
    content: `The Status Bar at the bottom of the window displays essential manuscript and project indicators:

**Left group (Metrics):**
- **Words** — Total word count of the active document.
- **Page** — "Page: currentPage of totalPages", updated continuously as you move your cursor.
- When text is selected, the count of selected words appears.

**Center group (Document Selector):**
- Displays the active script name — click to quickly switch between documents in your project.

**Right group (Utilities & Status):**
- **Muse AI indicator** — displays AI status and provides one-click access.
- **Active Sprint** — displays a live countdown timer and current words-per-minute when a sprint is running.
- **Save Indicator** — shows whether changes are saved.
- **Scenes** — total scene heading count.`,
  },
  {
    id: "file-tabs",
    title: "File Tabs",
    category: "Workspace & Views",
    tags: ["tabs", "files", "multi-tab", "close"],
    relatedIds: ["open-file", "new-project", "scripts-manager"],
    content: `Open multiple projects simultaneously as tabs in the header bar:

- **Project Tabs:** The active project tab is clearly highlighted, with an indicator dot if there are unsaved changes.
- **Close button:** Click the X icon on any tab, or press <kbd>Alt+Q</kbd> to close the active project.
- Right-click a tab for **Close**, **Close Others**, or **Close All** (prompts to save any modified files).
- Scroll horizontally through tabs using the mouse wheel on the tab bar.
- Keyboard navigation: press <kbd>Ctrl+Tab</kbd> / <kbd>Ctrl+PageDown</kbd> (next tab) or <kbd>Ctrl+Shift+Tab</kbd> / <kbd>Ctrl+PageUp</kbd> (previous tab).
- **New tab button (\`+\`):** Click to create a new project (<kbd>Ctrl+N</kbd>).`,
  },
  {
    id: "quick-settings",
    title: "Quick Settings Menu",
    category: "Workspace & Views",
    tags: ["quick settings", "gear", "activity bar"],
    relatedIds: ["activity-bar", "settings-overview", "interface-scale", "editor-zoom", "theme-manager"],
    content: `The gear icon at the bottom of the Activity Bar opens the Quick Settings menu for immediate adjustments:

**View & Scale**
- Editor Zoom slider (50%–400%).
- "Reset Zoom" button (resets editor zoom to 100%).

**Editor Preferences**
- Typewriter Mode toggle.
- Hide Fountain Markup toggle.

**Theme**
- Theme color swatches showing editor, sidebar, and accent colors. Click any swatch to switch themes instantly.
- "Manage Themes…" link to open the Theme Manager.

**Layout & Page**
- Paper Size toggle: Letter / A4.

**Full Settings** opens the complete Settings window.`,
  },

  // ===== PRODUCTION FEATURES =====
  {
    id: "scene-highlighting",
    title: "Scene Highlighting (Color Coding)",
    category: "Production Features",
    tags: ["highlight", "color", "scene", "color code"],
    relatedIds: ["notes-markers", "outline-navigator"],
    content: `Right-click a scene heading and choose **Highlight Scene** → pick a color (Red, Orange, Yellow, Green, Blue, Purple, Pink) or **Clear Highlight** to remove it. Color is stored as \`[[color name]]\` on the scene heading line. Hex codes also work: \`[[#ff0000]]\`

**7 supported named colors:** red, orange, yellow, green, blue, purple, pink.

Highlighted scenes show a colored left border in the editor, a colored dot in the Outline Navigator, and are exported as color-tagged elements in FDX format. The Outline Navigator's filter popover lets you filter by scene color with count badges.`,
  },
  {
    id: "notes-markers",
    title: "Color Markers & Notes",
    category: "Production Features",
    tags: ["markers", "notes", "[[ ]]", "inline comments", "color"],
    relatedIds: ["markers-list"],
    content: `Insert inline notes anywhere using double-bracket syntax: \`[[marker color: description]]\`

**Example:** \`[[marker red: Fix description here]]\`

**11 supported marker colors:** blue, brown, cyan, green, magenta, orange (default), pink, purple, red, yellow, none. Hex codes also work: \`[[marker #ff6600: Note]]\`

Use the right-click menu → **Drop Marker** to insert markers without remembering syntax. View and filter all markers in the Markers sidebar (filter by text or color). Markers are visible in the editor with a colored indicator but are stripped from Fountain exports.`,
  },
  {
    id: "storylines",
    title: "Storyline Tags",
    category: "Production Features",
    tags: ["storyline", "plot", "tag", "arc"],
    relatedIds: ["scene-highlighting", "outline-navigator"],
    content: `Tag scene headings with storyline labels using \`[[storyline Label]]\` syntax on a heading line. Multiple storylines are comma-separated: \`[[storyline Plot A, Romance]]\`

Storyline labels appear as tags in the Outline Navigator for each scene. The Outline Navigator lets you filter by storyline to isolate specific narrative threads.`,
  },
  {
    id: "structure-templates",
    title: "Structure Templates",
    category: "Production Features",
    tags: ["template", "structure", "three act", "save the cat", "beat sheet"],
    relatedIds: ["sections", "outline-navigator"],
    content: `Open the Command Palette → "Import Structure Template" to browse and insert predefined screenplay structures. 8 built-in templates:

1. **Three-Act Structure** (10 beats) — Classical Western filmmaking.
2. **Save the Cat!** (15 beats) — Blake Snyder's beat sheet.
3. **The Hero's Journey** (11 beats) — Joseph Campbell's monomyth.
4. **The Story Circle** (6 beats) — Dan Harmon's story circle.
5. **Freytag's Pyramid** (5 beats) — Gustav Freytag's dramatic arc.
6. **John Truby's 7 Key Steps** — From "The Anatomy of Story".
7. **Michael Hauge's 6 Stage Journey** (10 beats) — Inner + outer journey.
8. **The Sequence Approach** (8 beats) — Frank Daniel's 8 sequences.

The import modal shows a detailed preview of each beat. Choose insertion mode: **Insert at Cursor**, **Append to End**, or **Overwrite** (with confirmation). Templates insert as \`## Beat\` section headers and \`= Description\` synopsis lines.`,
  },
  {
    id: "scene-reorder",
    title: "Scene Drag-and-Drop Reordering",
    category: "Production Features",
    tags: ["reorder", "drag", "drop", "scene", "outline"],
    relatedIds: ["outline-navigator", "structure-templates"],
    content: `In the Outline Navigator, drag scenes by the grab handle to reorder them. A visual insertion indicator shows where the scene will land, and your screenplay text and formatting update automatically.`,
  },

  // ===== FILES & PROJECTS =====
  {
    id: "actone-bundle",
    title: "ActOne Bundle Format (.actone)",
    category: "Files & Projects",
    tags: ["actone", "bundle", "zip", "portable"],
    relatedIds: ["scripts-manager", "sidebar-panels", "save"],
    content: `The **.actone** format packages your entire project into a single portable file:

- **Document Files**: All screenplay (\`.fountain\`) and prose (\`.md\`) text documents.
- **Character Profiles & Genders**: Character notes and tracking data.
- **Task Checklists**: To-do revision items per document.
- **Document Notepad**: Research notes and scratchpads.
- **Parked Snippets**: Cut scenes and parked ideas.
- **Sprint History**: Writing sprint analytics and statistics.
- **Production Tags**: Scene breakdown tags and color coding.
- **Muse AI Chat**: Dedicated AI conversation history per project.
- **Workspace Settings**: Project-specific preferences.

Older project bundle versions are automatically recognized and seamlessly updated upon save.`,
  },
  {
    id: "save",
    title: "Saving Projects",
    category: "Files & Projects",
    tags: ["save", "save as", "ctrl+s", "autosave", "project"],
    relatedIds: ["actone-bundle", "file-tabs", "auto-save"],
    content: `<kbd>Ctrl+S</kbd> saves the active project. For .actone projects, this saves all documents, notes, tasks, and settings. For plain .fountain files, it writes the Fountain text directly.

<kbd>Ctrl+Shift+S</kbd> opens Save Project As, allowing you to save as .actone (recommended for all features) or .fountain.

When closing the app, ActOne checks all open projects for unsaved changes and prompts you to save, discard, or cancel.`,
  },
  {
    id: "title-page-editor",
    title: "Title Page Editor",
    category: "Files & Projects",
    tags: ["title page", "cover", "author", "draft date"],
    relatedIds: ["export-pdf", "actone-bundle"],
    content: `Open the Command Palette → "Edit Title Page" to set your screenplay's metadata. Two views:

**Form View:** Fields for Title, Author, Credit, Source, Contact (multi-line), and Draft Date.

**Fountain View:** Raw Fountain title page syntax in a text area. Changes sync bidirectionally with the Form view.

Fields are stored in standard Fountain title page format (\`Title:\`, \`Author:\`, \`Credit:\`, \`Source:\`, \`Contact:\`, \`Draft date:\`). The title page appears in PDF exports. "Apply to Document" merges the edited title page back into the full screenplay text.`,
  },

  // ===== EXPORT =====
  {
    id: "export-overview",
    title: "Export Overview",
    category: "Export",
    tags: ["export", "pdf", "fountain", "fdx", "print"],
    relatedIds: ["export-pdf", "export-fountain", "export-fdx"],
    content: `Press <kbd>Ctrl+P</kbd> or open the Command Palette → "Export…" to open the Export dialog. ActOne supports three export formats (PDF, Fountain, and Final Draft FDX), each with custom options. Export is fast, high-quality, and runs completely offline on your device.`,
  },
  {
    id: "export-pdf",
    title: "PDF Export",
    category: "Export",
    tags: ["pdf", "print", "export"],
    relatedIds: ["export-overview", "export-fountain", "theme-manager"],
    content: `Export your screenplay as an industry-standard, professionally formatted PDF. Options:

- **Include Title Page** — Export the title page if defined.
- **Bold Scene Headings** — Make scene headings bold.
- **Scene Numbers** — Off, Left Side Only, or Mirror on Both Sides.
- **Font** — Courier Prime or Courier Prime Sans.
- **Include Sections** — Render section headers.
- **Include Synopsis** — Render synopsis lines.
- **Script Fonts** — Language-specific font selection for international scripts.
- **Element Formatting** — Custom bold/italic/underline toggles per element.
- **Watermarks** — Add header, footer, or center text/image watermarks with custom opacity.

Paper Size (Letter or A4) is inherited from Settings. PDF includes proper page numbering, dialogue indentation, dual dialogue columns, and smart page breaks with orphan and widow protection.`,
  },
  {
    id: "export-fountain",
    title: "Fountain Export",
    category: "Export",
    tags: ["fountain", "export", "plain text"],
    relatedIds: ["export-overview", "actone-bundle"],
    content: `Exports a clean .fountain file with all app-specific tags stripped (\`[[marker …]]\`, \`[[color …]]\`, \`[[storyline …]]\`, settings block, etc.). Options:

- Include Title Page.
- Include Sections.
- Include Synopsis.`,
  },
  {
    id: "export-fdx",
    title: "FDX (Final Draft) Export",
    category: "Export",
    tags: ["fdx", "final draft", "fade in", "compatibility"],
    relatedIds: ["export-overview"],
    content: `Export your screenplay as Final Draft XML (.fdx) for compatibility with Final Draft, Fade In, and other professional screenwriting applications. Scene colors are preserved using Final Draft's color format. No toggle options — the title page is always included; sections and synopses are stripped.`,
  },
  // ===== SETTINGS & CUSTOMIZATION =====
  {
    id: "spellcheck",
    title: "Spellcheck",
    category: "Settings & Customization",
    tags: ["spellcheck", "dictionary", "language", "typo", "words"],
    relatedIds: ["settings-overview", "editor-context-menu", "status-bar"],
    content: `ActOne includes an optional offline spellcheck engine. It is disabled by default so you can enable it when you want spelling assistance without changing screenplay-specific capitalization.

**Enable it:** Use Settings → Spellcheck, the Command Palette (<kbd>Ctrl+K</kbd>), or the language indicator in the Status Bar.

**Languages:** English is bundled with the application. Other available dictionaries can be downloaded from Settings → Spellcheck and are cached for offline use.

**Corrections:** Right-click a flagged word to choose a suggestion, **Add to Dictionary**, or **Ignore**. Added words persist across sessions; ignored words apply only to the current session.

Screenplay terms, scene headings, character names, transitions, and other Fountain elements are excluded from normal spelling checks.`,
  },
  {
    id: "window-state",
    title: "Window Size and Position",
    category: "Workspace & Views",
    tags: ["window", "size", "position", "maximize", "desktop"],
    relatedIds: ["welcome-screen", "settings-overview"],
    content: `The desktop application remembers the main editor window's size, position, and maximized state. The previous geometry is restored when ActOne starts. This is managed by the native desktop shell and does not require a project file or account.`,
  },
  {
    id: "quick-guide",
    title: "Quick Guide (F1)",
    category: "Getting Started",
    tags: ["quick guide", "f1", "shortcuts", "syntax"],
    relatedIds: ["keyboard-shortcuts", "command-palette"],
    content: `Press <kbd>F1</kbd> to open the Quick Guide. The guide has two tabs:

- **Shortcuts:** The current keyboard shortcut registry, including file actions, navigation, editor commands, and zoom controls.
- **Syntax Reference:** The current Fountain syntax registry, including scene headings, characters, transitions, actions, shots, lyrics, centered text, dual dialogue, sections, synopses, markers, storylines, and scene colors.

The Quick Guide is generated from the same registries used by the application, so its shortcut and syntax entries stay aligned with the editor.`,
  },
  {
    id: "settings-overview",
    title: "Settings Overview",
    category: "Settings & Customization",
    tags: ["settings", "ctrl+,", "configuration"],
    relatedIds: ["theme-manager", "auto-save", "font-paper", "interface-scale", "editor-settings"],
    content: `Press <kbd>Ctrl+,</kbd> or use the Command Palette → "Open Settings…" to open the Settings window. It has five tabs: General, Editor, Spellcheck, Snapshots, and Muse.

**General:** Paper Size (Letter / A4), Icon Style, Auto-Save toggle and interval, and Reset Settings.

**Editor:** Font Style (Courier Prime / Courier Prime Sans), Editor Zoom (50%–400%), Typewriter Mode, Autocomplete, Smart Quotes, Auto-Match Parentheses, Auto (CONT'D), Hide Fountain Markup, Line Focus, and Syntax Colors.

**Spellcheck:** Enable spellcheck, Active Language selection, **Download More Languages**, Installed Languages list, and Personal Dictionary management with custom words.

**Snapshots:** Enable Automated Snapshots, Save Location folder picker, project snapshot management, and **Open Snapshots Folder**.

**Muse:** Configure AI providers, model selection, translation languages, and custom instructions.

Quick Settings are also available from the Activity Bar gear icon for common adjustments without opening the full window.`,
  },
  {
    id: "theme-manager",
    title: "Theme Manager & Custom Themes",
    category: "Settings & Customization",
    tags: ["theme", "colors", "dark", "light", "custom"],
    relatedIds: ["settings-overview", "font-paper"],
    content: `ActOne ships with **17 built-in themes** organized into sections, with per-family adaptive variants. Each section has a shared design language:

| Section | Theme | Mode | Description |
|---------|-------|------|-------------|
| CLASSIC | Adaptive | Auto | Classic Light/Dark by system preference |
| CLASSIC | Classic Light | Light | Clean light theme |
| CLASSIC | Classic Dark | Dark | Clean dark theme |
| CATPPUCCIN | Catppuccin Adaptive | Auto | Catppuccin Latte/Mocha by system preference |
| CATPPUCCIN | Catppuccin Latte | Light | Soft light with purple accents |
| CATPPUCCIN | Catppuccin Mocha | Dark | Rich dark with purple accents |
| PITCH | Pitch Adaptive | Auto | Pitch Light/Dark by system preference |
| PITCH | Pitch Light | Light | Pure white e-ink style |
| PITCH | Pitch Dark | Dark | Pure black background with grey tones |
| PASTEL | Sunrise | Light | Warm cream with coral accents |
| PASTEL | Sunset | Dark | Deep warm brown with coral accents |
| PASTEL | Mint | Light | Pale mint with green accents |
| PASTEL | Forest | Dark | Deep forest green with green accents |
| PASTEL | Rose | Light | Soft blush with rose accents |
| PASTEL | Berry | Dark | Deep berry with rose accents |
| PASTEL | Ocean | Dark | Deep teal blue |
| PASTEL | Honey | Light | Warm golden cream |
| PASTEL | Plum | Dark | Dark plum purple |
| PASTEL | Sky | Light | Light pastel blue |
| PASTEL | Slate | Dark | Dark blue-grey |

**Adaptive** variants automatically switch between their family's light and dark themes based on your system's appearance setting (<code>prefers-color-scheme</code>). Each family (Classic, Catppuccin, Pitch) has its own adaptive option. The transition happens instantly — no refresh needed.

Quick-switch between any theme from the **Quick Settings** menu (gear icon in the Activity Bar) — a theme grid with 2×2 color cubes organized by section. The active theme is highlighted with a primary-colored border.

**Create your own themes** via Quick Settings → "Manage Themes…". Pick 5 core colors (Accent, Button, Text, Sidebar, Editor), choose Dark/Light mode, name it, and see a live preview.

**17 built-in themes** are available as clickable starting points in the creation form. Custom themes appear under a "CUSTOM" section in the Theme Manager.

---

### Warm Craft Aesthetic

ActOne is crafted with a warm, tactile, literary aesthetic designed to keep you focused and inspired:

- **Harmonious Visuals**: Clean cards, floating panels, and modern controls keep your workspace organized and clutter-free.
- **Comfortable Contrast**: Carefully calibrated light and dark themes reduce eye strain during long writing sessions.
- **Adaptive Lighting**: Automatically matches your system appearance or allows instant switching to suit your writing environment.
- **Distraction-Free Focus**: Thoughtful design elements guide your attention directly to your script and story structure.`,
  },
  {
    id: "font-paper",
    title: "Font & Paper Settings",
    category: "Settings & Customization",
    tags: ["font", "courier prime", "paper", "letter", "a4"],
    relatedIds: ["settings-overview", "export-pdf"],
    content: `Two settings available in Settings → General and Editor:

**Font Style:** **Courier Prime** (serif, traditional screenplay look) or **Courier Prime Sans** (sans-serif, clean modern look). Also switchable via Command Palette. Default: Courier Prime Sans.

**Paper Size:** **US Letter** or **A4** (Standard). This affects PDF export formatting (A4: 58 lines/page, Letter: 54 lines/page) and editor page width. Also switchable via Quick Settings. Default: A4.`,
  },
  {
    id: "interface-scale",
    title: "Interface Scaling & Display DPI",
    category: "Settings & Customization",
    tags: ["scale", "ui size", "zoom", "dpi", "display"],
    relatedIds: ["settings-overview", "editor-zoom"],
    content: `Interface scaling is handled automatically by your operating system's native display scaling and DPI settings, ensuring crisp text rendering, flawless caret placement, and artifact-free UI scaling across Windows and Linux.

To scale screenplay text inside the editor canvas independently of the UI chrome, use **Editor Zoom**:
- Press <kbd>Ctrl+=</kbd> to zoom in
- Press <kbd>Ctrl+-</kbd> to zoom out
- Press <kbd>Ctrl+0</kbd> to reset zoom to 100%

You can also adjust the Editor Zoom slider in the Quick Settings menu (gear icon in the Activity Bar) or under **Settings → Editor**.`,
  },
  {
    id: "auto-save",
    title: "Auto-Save",
    category: "Settings & Customization",
    tags: ["autosave", "save", "interval"],
    relatedIds: ["save", "settings-overview"],
    content: `Toggle auto-save in Settings → General and choose an interval: 30 seconds, 1 minute, 2 minutes, or 5 minutes. Default: 1 minute. Only triggers for files that have an existing file path and have unsaved changes.`,
  },
  {
    id: "editor-settings",
    title: "Editor Preferences",
    category: "Settings & Customization",
    tags: ["editor", "preferences", "autocomplete", "quotes", "parentheses"],
    relatedIds: ["settings-overview", "autocomplete", "smart-quotes", "auto-parentheses", "typewriter-mode", "hide-syntax", "focus-mode"],
    content: `The Editor tab in Settings controls:

- **Font Style**: Courier Prime (Serif) or Courier Prime Sans.
- **Editor Zoom**: 50%–400% slider (step 10).
- **Typewriter Mode**: Keep active line centered.
- **Character/Scene Autocomplete**: Inline ghost text suggestions.
- **Smart Quotes**: Auto-convert to curly quotes.
- **Auto-Match Parentheses**: Auto-insert closing \`)\`.
- **Auto (CONT'D)**: Automatically append virtual \`(CONT'D)\` tags when characters speak consecutively.
- **Hide Fountain Markup**: Clean reading view (hide prefixes on non-active lines).
- **Focus Mode**: Dim all lines except the active cursor line.`,
  },
  // ===== AI & MUSE =====
  // ===== AI & MUSE =====
  {
    id: "muse-overview",
    title: "Muse AI Feature Overview",
    category: "AI & Muse",
    tags: ["muse", "muse go", "ai", "assistant", "overview", "help"],
    relatedIds: ["muse-configure", "muse-chat"],
    content: `**Muse** is ActOne's integrated AI feature suite. The right sidebar companion, **Muse Go!**, provides an intelligent conversational assistant for discussing, exploring, and analyzing your screenplay.

**How to open Muse Go!:**
- Press \`Alt+M\`.
- Open Command Palette (\`Ctrl+K\`) → select **"Show Muse Go!"** (visible when Muse is configured).
- The Muse Go! panel opens on the right side of your workspace.

**Key features:**
- **Conversational Screenplay Q&A**: Ask questions about your story, character arcs, scene flow, and dialogue.
- **Intelligent Scene Context**: Muse Go! automatically finds and reads only the scenes relevant to your question (e.g. "Summarize scenes with John") without sending your entire manuscript every time.
- **Look up & Synonyms**: Right-click words in the editor to look up definitions and synonyms in Muse Go!.
- **Per-script history**: Each screenplay maintains its own conversation sessions across your writing workflow.
- **Real-time streaming**: Watch responses generate smoothly in real time.`,
  },
  {
    id: "muse-configure",
    title: "Configuring Muse (AI Providers)",
    category: "AI & Muse",
    tags: ["muse", "ai", "configure", "setup", "provider", "api", "openai", "ollama"],
    relatedIds: ["muse-overview", "settings-overview"],
    content: `Before using Muse Go!, you can configure an AI provider in **Settings** (\`Ctrl+,\`) → **Muse** tab.

**Supported Providers:**

**1. OpenAI-compatible API** — Use any compatible chat-completion endpoint (OpenAI, OpenRouter, Groq, DeepSeek, LocalAI, vLLM).
  - **Provider**: Select "OpenAI API".
  - **Configure Providers**: Click "Configure Providers" to manage multiple API endpoints.
    - Click **"Add API"** to add endpoints with custom Name, Endpoint URL, API Key, and Model name.
    - Select your preferred active API.

**2. Ollama (Local)** — Run local models entirely on your device.
  - **Provider**: Select "Ollama (Local)".
  - **Ollama URL**: Defaults to \`http://localhost:11434\`.
  - **Model**: Select from models detected on your local Ollama server.

**Privacy & Workspace Integration:**
- When Muse is disabled ("None"), all Muse indicators and buttons remain completely hidden from your interface.`,
  },
  {
    id: "muse-chat",
    title: "Using Muse Go! Chat",
    category: "AI & Muse",
    tags: ["muse", "muse go", "chat", "conversation", "history", "streaming"],
    relatedIds: ["muse-overview", "muse-configure"],
    content: `The **Muse Go!** panel is your dedicated conversational companion:

**Asking questions:**
- Type in the "Message Muse Go!..." composer and press \`Enter\` to send.
- Press \`Shift+Enter\` to insert a newline.
- Press \`Escape\` or click the Stop button to cancel streaming.

**Intelligent character & scene queries:**
- Ask about specific characters: *"What does John do across his scenes?"* — Muse Go! intelligently slices only the scenes where John appears.
- Ask about specific scenes: *"What happens in scenes 3 to 5?"* — Muse Go! loads and analyzes only those scenes.

**Chat session management:**
- Click the **clock icon** to view, switch, and manage past chat sessions for the current screenplay.
- Click the **+ icon** to start a fresh conversation.
- Click the **trash icon** to clear messages in the active session.`,
  },
  {
    id: "muse-translate",
    title: "Whole Document Translation",
    category: "AI & Muse",
    tags: ["translate", "language", "whole document", "background", "multilingual", "muse"],
    relatedIds: ["muse-overview", "muse-configure"],
    content: `ActOne allows you to translate an entire screenplay or prose document to any supported language without disrupting your writing workflow.

### How it Works:
1. Right-click or use the document menu → select **Translate Whole Script**.
2. Configure your options in the modal:
   - **Target Language:** Choose from 18 supported languages including English, Spanish, French, German, Italian, Portuguese, Hindi, Tamil, Telugu, Kannada, Malayalam, Japanese, Chinese, Korean, Arabic (RTL), Russian, Turkish, and Thai.
   - **Elements & Tone:** Choose which screenplay elements to translate (Dialogue, Action, Scene Headings, Parentheticals, Transitions) and pick custom phrasing tones (Natural/Conversational, Literal, or Casual).
   - **Custom Instructions:** Provide optional per-document translation guidance (e.g., dialect registers, character idioms, cultural context).
   - **Character Names:** Option to keep character names unchanged to prevent proper noun mistranslation.
   - **AI Model:** Select your preferred local (Ollama) or remote API model.
3. ActOne duplicates your document into a target script (e.g., \`MyScript-Tamil\`) and runs a pre-flight connection check before starting.
4. **Scene-by-Scene Engine:** ActOne translates scene by scene with complete narrative context rather than isolated line batches. Long scenes are adaptively partitioned at character boundaries to maintain context window stability.
5. The progress window displays the active scene heading, part count for long scenes, real-time status (including provider rate-limit wait countdowns), percentage bar, time remaining estimates, and a live streaming preview.
6. Click **"Run in Background"** to dismiss the progress window anytime and keep writing in other scripts.
7. If any scenes fail after automatic retries, the completion screen gives you a **"Retry Failed Scenes"** button to re-run them with one click.
8. Once complete, click **"Open Translated Script"** to view your translated screenplay.`,
  },
  {
    id: "muse-quick-model-switcher",
    title: "Quick AI Model Switcher",
    category: "AI & Muse",
    tags: ["model switcher", "quick switch", "ai model", "palette", "keyboard shortcut"],
    relatedIds: ["muse-configure", "muse-overview"],
    content: `You can instantly switch active AI models without navigating through the full Settings window.

### How to Use:
1. Press <kbd>Alt+Shift+M</kbd> or open the Command Palette (<kbd>Ctrl+K</kbd>) and choose **"Switch AI Model"**.
2. A streamlined, fast model chooser popup appears showing:
   - All configured OpenAI-compatible custom API models.
   - Locally detected Ollama models.
   - Quick options to **Disable AI** or open **Configure Models** in Settings.
3. Use your keyboard arrow keys (<kbd>↑</kbd> / <kbd>↓</kbd>), <kbd>Home</kbd>, <kbd>End</kbd>, <kbd>PageUp</kbd>, or <kbd>PageDown</kbd> to navigate, and press <kbd>Enter</kbd> to select your desired model immediately.
4. When closed with <kbd>Esc</kbd> or upon model selection, editor focus and cursor viewport position are automatically restored.`,
  },
];

export const categories = [
  "Getting Started",
  "Fountain Syntax",
  "Markdown Syntax",
  "Writing Tools",
  "Workspace & Views",
  "Production Features",
  "Files & Projects",
  "Export",
  "Settings & Customization",
  "AI & Muse",
];
