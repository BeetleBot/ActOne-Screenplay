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
    relatedIds: ["new-screenplay", "open-file", "recent-files"],
    content: `When you launch ActOne with no files open, the Welcome screen appears. From here you can:

- **New Project** — Create a blank untitled screenplay. In standalone mode this opens a new editor window.
- **Open Project** — Browse for a \`.fountain\`, \`.txt\`, or \`.actone\` file via the native file dialog.
- **Templates** — Import a screenplay structure template (Three-Act, Save the Cat, Hero's Journey, etc.).
- **Help Guide** — Opens the Help Wiki window with searchable documentation.
- **Recent Projects** — Quick-open recently used files (up to 6 displayed). Click the X to remove from the list. Stored in localStorage (up to 10 entries).

**Footer actions:**
- **Help** — Opens the Help Wiki window with searchable documentation.
- **Discord** — Opens the ActOne Discord invite in your default browser.
- **Quick Settings** (gear icon) — Open the settings sidebar to switch themes, adjust scale, and more.
- **App version** — Build number, useful when reporting bugs.

The Welcome screen also shows a rotating random writing quote from famous screenwriters.`,
  },
  {
    id: "new-screenplay",
    title: "Creating a New Screenplay",
    category: "Getting Started",
    tags: ["new", "create", "untitled"],
    relatedIds: ["welcome-screen", "open-file", "file-tabs"],
    content: `Press <kbd>Ctrl+N</kbd> or open the Command Palette (<kbd>Ctrl+K</kbd>) and choose "New Screenplay" to create a new untitled tab. You can have multiple tabs open simultaneously. Each new file is created as a single-script .actone bundle.`,
  },
  {
    id: "open-file",
    title: "Opening Files",
    category: "Getting Started",
    tags: ["open", "file", "fountain", "actone", "txt"],
    relatedIds: ["welcome-screen", "new-screenplay", "file-tabs", "recent-files"],
    content: `Press <kbd>Ctrl+O</kbd> or use the Command Palette (<kbd>Ctrl+K</kbd>) → "Open Screenplay…" to open .fountain, .txt, or .actone files via the native file dialog.

When launched from the command line, ActOne accepts file paths as arguments. The app also listens for OS-level file-open events (e.g., double-clicking a .fountain or .actone file).`,
  },
  {
    id: "recent-files",
    title: "Recent Files",
    category: "Getting Started",
    tags: ["recent", "history", "quick open"],
    relatedIds: ["open-file", "welcome-screen"],
    content: `The Welcome screen shows your most recently opened files (up to 6) as clickable chips. Click one to re-open it. Hover and click the X to remove an entry from the list. Recent files are stored in localStorage (up to 10 entries). In Tauri, stale entries are auto-validated against the filesystem on startup.`,
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts Reference",
    category: "Getting Started",
    tags: ["shortcuts", "keys", "hotkeys", "keyboard"],
    relatedIds: ["command-palette"],
    content: `ActOne is designed for keyboard-driven writing. Below is the complete list of shortcuts.

**File Operations**

| Action | Shortcut |
|--------|----------|
| New screenplay tab | <kbd>Ctrl+N</kbd> |
| Open file | <kbd>Ctrl+O</kbd> |
| Save | <kbd>Ctrl+S</kbd> |
| Save as | <kbd>Ctrl+Shift+S</kbd> |
| Close active tab | <kbd>Alt+Q</kbd> |
| Export dialog | <kbd>Ctrl+P</kbd> |
| Next tab | <kbd>Ctrl+Tab</kbd> / <kbd>Ctrl+PageDown</kbd> |
| Previous tab | <kbd>Ctrl+Shift+Tab</kbd> / <kbd>Ctrl+PageUp</kbd> |

**Editing & Formatting**

| Action | Shortcut |
|--------|----------|
| Undo | <kbd>Ctrl+Z</kbd> |
| Redo | <kbd>Ctrl+Y</kbd> |
| Cut | <kbd>Ctrl+X</kbd> |
| Copy | <kbd>Ctrl+C</kbd> |
| Paste | <kbd>Ctrl+V</kbd> |
| Select all | <kbd>Ctrl+A</kbd> |
| Bold (\`**\`) | <kbd>Ctrl+B</kbd> |
| Italic (\`*\`) | <kbd>Ctrl+I</kbd> |
| Underline (\`_\`) | <kbd>Ctrl+U</kbd> |
| Clean screenplay spaces | <kbd>Shift+Alt+C</kbd> |
| Cycle line prefixes | <kbd>Tab</kbd> |
| Accept autocomplete ghost | <kbd>Tab</kbd> |
| Force autocomplete dropdown | <kbd>ArrowDown</kbd> |

**View & Navigation**

| Action | Shortcut |
|--------|----------|
| Toggle Find & Replace | <kbd>Ctrl+F</kbd> |
| Toggle sidebar | <kbd>Ctrl+\\\\</kbd> |
| Command palette | <kbd>Ctrl+K</kbd> |
| Settings | <kbd>Ctrl+,</kbd> |
| Toggle Zen Mode | <kbd>Ctrl+Alt+Enter</kbd> |
| Focus editor | <kbd>Escape</kbd> |
| Open help guide | <kbd>F1</kbd> |
| Zoom in | <kbd>Ctrl+=</kbd> |
| Zoom out | <kbd>Ctrl+-</kbd> |
| Reset zoom | <kbd>Ctrl+0</kbd> |`,
  },
  {
    id: "command-palette",
    title: "Command Palette",
    category: "Getting Started",
    tags: ["commands", "palette", "ctrl+k", "search"],
    relatedIds: ["keyboard-shortcuts"],
    content: `Press <kbd>Ctrl+K</kbd> to open the Command Palette. Type to filter commands across six categories:

**File:** New Screenplay, Open Screenplay, Save, Save As, Close Active File, Export.

**Edit:** Undo, Redo, Cut, Copy, Paste, Find/Search, Replace.

**View:** Toggle Sidebar, Switch Sidebar Tab (Outline / Notepad), Typewriter Mode, Zen Mode, Focus Mode, Zoom In / Zoom Out / Reset Editor Scale, Reset Interface Scale, Show/Hide Fountain Markup, Show/Hide Tags, Open X-Ray Analysis, Show Snapshots.

**Format:** Tag Manager, Edit Title Page, Import Structure Template, Renumber Scene Headings, Clear Scene Numbers.

**Settings:** Open Settings, Set Font (Courier Prime / Courier Prime Sans), Set Paper Size (Letter / A4), Theme Manager.

**Help:** Help Guide, Interactive Tutorial, Fountain Syntax Guide, Report a Bug.

Each command shows its keyboard shortcut when available. Navigate with arrow keys and press Enter to execute. Press Escape to close. Available even when modals are open.`,
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
    content: `Keeps your active editing line vertically centered on screen. As you type, the page scrolls around your line instead of your cursor moving down. Uses a CodeMirror ViewPlugin that measures cursor position relative to the container center on every document change. Toggle via Quick Settings in the Activity Bar, the Command Palette, or Settings → Editor.`,
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
    id: "editor-zoom",
    title: "Editor Zoom",
    category: "Writing Tools",
    tags: ["zoom", "font size", "ctrl+=", "ctrl+-"],
    relatedIds: ["typewriter-mode", "interface-scale"],
    content: `Zoom the editor text from **50% to 400%** using <kbd>Ctrl+=</kbd> (zoom in), <kbd>Ctrl+-</kbd> (zoom out), and <kbd>Ctrl+0</kbd> (reset to 100%). Step size is 10%. Also adjustable via Quick Settings slider or Settings → Editor → Editor Zoom. Persisted in localStorage.`,
  },
  {
    id: "transform-case",
    title: "Transform Case",
    category: "Writing Tools",
    tags: ["uppercase", "lowercase", "title case", "case"],
    relatedIds: ["inline-formatting"],
    content: `Right-click a selection and choose Transform Case to convert between UPPERCASE, Title Case, or lowercase. Useful for normalizing character names and scene headings.

- **UPPERCASE**: All caps via \`toUpperCase()\`
- **Title Case**: First letter of each word capitalized
- **lowercase**: All lowercase via \`toLowerCase()\``,
  },
  {
    id: "look-up",
    title: "Look Up Word",
    category: "Writing Tools",
    tags: ["look up", "google", "search", "research"],
    relatedIds: ["context-menu"],
    content: `Right-click any selected word and choose "Look Up" to search it on Google in your default browser via Tauri's opener API. Quick for researching terms, names, or locations without leaving ActOne. Falls back to \`window.open\` outside Tauri.`,
  },
  {
    id: "search-replace",
    title: "Search & Replace",
    category: "Writing Tools",
    tags: ["search", "replace", "ctrl+f", "regex", "preserve case"],
    relatedIds: ["look-up"],
    content: `Press <kbd>Ctrl+F</kbd> to open the Find & Replace pane on the right side of the editor. Features:

- **Find input** — auto-populates from selected text when opened
- **Match Case** (\`Aa\`) toggle — case-sensitive search
- **Whole Word** (\`\\b\`) toggle — match only whole words
- **Regex** (\`.*\`) toggle — treat search as regular expression
- **Match counter** — shows \`currentMatch/totalMatches\` with prev/next arrows
- **Results list** — all matches shown with scene name context and line preview; click any result to jump to it in the editor
- **Close** — \`×\` button in the pane header or <kbd>Esc</kbd>
- **Enter** — jump to next match; <kbd>Shift+Enter</kbd> — jump to previous match

All matches are highlighted inline in the editor with a yellow background.

**Replace** (collapsible section):

- **Replace input** — text field for replacement
- **Preserve Case** (\`AB\`) toggle — intelligently adapts replacement case (ALL CAPS → ALL CAPS, Capitalized → Capitalized, lowercase → lowercase)
- **Replace** — replaces the currently selected match and moves to next
- **Replace Selected** — replaces only the specific match selected via checkbox in the results list
- **Replace All** — replaces all matches with confirmation before proceeding

The pane width is adjustable — drag the left edge of the pane to resize. Press <kbd>Ctrl+F</kbd> again or click the close button to dismiss.`,
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
    content: `The Activity Bar on the left side of the window provides access to all sidebar panels. Click an icon to open that view; click again to close the sidebar. An accent-colored left indicator bar shows which panel is active.

**Tabs available:**

| Tab | Purpose | Requires .actone bundle? |
|-----|---------|--------------------------|
| Outline | Hierarchical tree of sections, scenes, synopses | No |
| Scripts | Multi-script bundle manager | Yes (hidden for plain .fountain) |
| Notepad | Freeform outline / notes | Yes |
| Markers | List of \`[[marker …]]\` notes | No |
| Tasks | To-do checklist | Yes |
| Snapshots | Version history & restore | No |
| Sprint | Writing timer & history | No |
| Parking | Temporary text storage | Yes |

For plain \`.fountain\` files, only the **Outline** tab is shown in the Activity Bar. Other tabs are hidden (not shown with a banner).

The bottom of the Activity Bar has a **Command Palette** button (magnifying-glass icon, <kbd>Ctrl+K</kbd>) and a **Quick Settings** button (gear icon).

For character data, statistics, and analysis charts, open the **X-Ray Analysis** window from the Status Bar bar-chart icon or Command Palette — see \`xray-analysis\`.`,
  },
  {
    id: "outline-navigator",
    title: "Outline Navigator",
    category: "Workspace & Views",
    tags: ["outline", "navigator", "sidebar", "tree", "hierarchy"],
    relatedIds: ["sections", "synopsis", "scene-reorder", "activity-bar", "scene-highlighting", "storylines"],
    content: `The Outline sidebar (first tab) displays a hierarchical tree of your sections (\`#\`), scenes (headings), and synopses (\`=\`). Features:

- Click an item to scroll the editor to that line.
- Collapsible section headers — click the chevron, double-click, or use <kbd>←</kbd>/<kbd>→</kbd> to expand/collapse.
- Keyboard navigation: <kbd>↑</kbd><kbd>↓</kbd> to move, <kbd>←</kbd><kbd>→</kbd> to collapse/expand sections, <kbd>Enter</kbd> to jump to line.
- Search/filter field to find items by text.
- Visibility toggles: show/hide **Sections**, **Scenes**, **Synopses**, and **Storylines**.
- Color filter popover: filter by scene color with count badges, "Clear All" to reset.
- Storyline filter popover: filter by storyline label with count badges.
- Scene color dots, scene number badges, and storyline chips displayed per item.
- Outline font size: Small / Normal / Large (persisted in localStorage).
- Drag-and-drop scene reordering (six-dot grab handle).`,
  },
  {
    id: "sidebar-panels",
    title: "Sidebar Panels Overview",
    category: "Workspace & Views",
    tags: ["sidebar", "panels", "workspace", "bundle"],
    relatedIds: ["activity-bar", "outline-navigator", "actone-bundle", "xray-analysis"],
    content: `ActOne provides several sidebar panels accessible from the **Activity Bar** (vertical icon strip on the left). Click an icon to open the corresponding panel; click again to close the sidebar.

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

Panels that require the .actone bundle are hidden for plain \`.fountain\` files. Use <kbd>Ctrl+Shift+S</kbd> to save as a bundle and unlock them.

**Character and statistical analysis** is available through the **X-Ray Analysis** window — open it from the bar-chart icon in the Status Bar or via Command Palette → "Open X-Ray Analysis…". See the \`xray-analysis\` article for details.`,
  },
  {
    id: "notepad",
    title: "Document Notepad",
    category: "Workspace & Views",
    tags: ["notepad", "notes", "brainstorm", "outline"],
    relatedIds: ["sidebar-panels", "actone-bundle"],
    content: `A freeform text area in the sidebar (Activity Bar → note-with-plus icon) for jotting down outline notes, beat sheets, character ideas, or draft goals. Content persists inside .actone bundles. The Notepad tab is hidden (not shown with a banner) for plain \`.fountain\` files — save as a bundle via <kbd>Ctrl+Shift+S</kbd> to unlock it.`,
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
    content: `The Tasks panel helps you track screenplay revisions and to-do items:

- Type a task in the input and press <kbd>Enter</kbd> or click the add button to add it.
- Click the circle icon or press <kbd>Space</kbd>/<kbd>Enter</kbd> to toggle completion (moves to collapsible "Completed (N)" section with strikethrough text).
- Keyboard navigation: <kbd>↑</kbd><kbd>↓</kbd> to select, <kbd>Enter</kbd>/<kbd>Space</kbd> to toggle, <kbd>Delete</kbd>/<kbd>Backspace</kbd> to remove.
- Right-click selected text in the editor → **Create Task** to add it as a new task.
- Each task has an individual delete (X) button.

Persists in .actone bundles as \`todos\` in settings.`,
  },
  {
    id: "sprint-timer",
    title: "Writing Sprint Timer",
    category: "Workspace & Views",
    tags: ["sprint", "timer", "writing", "wpm", "countdown"],
    relatedIds: ["tasks", "sidebar-panels", "statistics-overview"],
    content: `The Sprint panel provides a countdown writing timer to boost productivity:

- **Preset durations**: 5, 15, 25, 45, 60 minutes — click pill buttons to set.
- **Custom duration**: Text field for 1–999 minutes.
- **Active sprint**: Circular progress indicator, remaining time (MM:SS), words written so far (net from sprint start), live WPM calculation.
- **Finish Sprint** — saves session to history. **Cancel** — discards session.
- Status bar shows active sprint with remaining time and WPM.

**History tab:** All completed sprints with word count, date, duration, WPM, and file name. Delete individual entries or "Clear Global History".

**Leaderboard tab:** Top 10 sprints ranked by word count with Gold (#1, \`#d4af37\`), Silver (#2, \`#c0c0c0\`), Bronze (#3, \`#cd7f32\`) badges.

**Stats banner:** Personal Best WPM and Total Words Sprinted.

Sprint data syncs to .actone bundles and localStorage.`,
  },
  {
    id: "snapshots",
    title: "Snapshots (Version History)",
    category: "Workspace & Views",
    tags: ["snapshots", "version", "backup", "history", "restore"],
    relatedIds: ["sidebar-panels", "settings-overview"],
    content: `The Snapshots panel saves point-in-time copies of your screenplay for easy rollback. Enable via Settings → Snapshots.

**Creating Snapshots:**
- **Manual**: Add an optional comment and tag in the panel header, then click "New Snapshot".
- **Auto-snapshot**: Enable in Settings to take snapshots at regular intervals (1–60 min).
- **On save**: Automatically snapshot every time you save the file.

**Managing Snapshots:**
- Each snapshot shows the date/time, file size, comment, and a colored tag (MANUAL, SAVE, AUTO, or custom).
- Filter by tag type using the clickable pills (MANUAL / SAVE / AUTO / custom tags).
- Three-dot menu on each snapshot:
  - **Restore** — replaces the current file with the snapshot. A fresh snapshot is taken first so you never lose your current state.
  - **Open as File** — opens the snapshot content as a separate read-only tab.
  - **Delete** — removes the snapshot permanently.

**Storage:**
- **Project folder** (.snapshots/ subdirectory in the same folder as the .actone file) — default.
- **App data folder** (platform-specific application data directory).
- **Custom folder** — choose any location on your filesystem.
- Max auto-snapshots retention: 5–100 (default 20). Oldest auto-snapshots are pruned when the limit is exceeded.

Snapshots are stored as separate files with metadata in \`snapshots_index.json\`. The panel also has an "Open Snapshots Folder" button to browse stored files directly.`,
  },
  {
    id: "parking",
    title: "Text Parking",
    category: "Workspace & Views",
    tags: ["parking", "clipboard", "text storage", "temporary"],
    relatedIds: ["sidebar-panels", "context-menu"],
    content: `The Parking panel works as a temporary clipboard for storing text snippets:

- Select text in the editor and click "Park Selection" to store it (cuts from editor).
- Click a parked card to re-insert at cursor and auto-remove it.
- Right-click → **Park Selection** stores text and deletes it from the editor.
- Keyboard navigation: <kbd>↑</kbd><kbd>↓</kbd> to select, <kbd>Enter</kbd> to insert.
- Individual delete (X) button on each card.
- Empty state shows instructional text.

Persists in .actone bundle settings.`,
  },
  {
    id: "markers-list",
    title: "Markers List",
    category: "Workspace & Views",
    tags: ["markers", "notes", "inline", "filter"],
    relatedIds: ["notes-markers", "sidebar-panels"],
    content: `The Markers sidebar shows all \`[[marker …]]\` notes from your script. Features:

- Filter by text search (matches description and scene context).
- Color filter popover: lists all marker colors in use with count badges; click to filter.
- Each item shows: colored dot, scene number badge (if available), marker description text, storyline chips, scene context (italic), and line number.
- Click a marker to scroll the editor to its position.
- Keyboard navigation: <kbd>↑</kbd><kbd>↓</kbd> to move, <kbd>Enter</kbd> to jump.`,
  },
  {
    id: "scripts-manager",
    title: "Scripts Manager (Multi-Script Bundles)",
    category: "Workspace & Views",
    tags: ["scripts", "multi-script", "bundle", "manage"],
    relatedIds: ["actone-bundle", "sidebar-panels"],
    content: `The Scripts sidebar lets you manage multiple Fountain scripts inside a single .actone bundle (hidden for plain .fountain files):

- **Add**: "+" button creates a new "Untitled" script. **Import**: download icon opens native file dialog for .fountain/.txt files.
- **Rename**: Double-click a script name for inline edit; press <kbd>Enter</kbd> to save, <kbd>Escape</kbd> to cancel.
- **Duplicate**: Three-dot menu → Duplicate creates a copy with a unique name and auto-selects the name for renaming.
- **Reorder**: Drag-and-drop scripts within the list, or use the three-dot menu → Move Up / Move Down.
- **Delete**: Three-dot menu → Delete (with confirmation). Last script cannot be deleted.
- Click a script name to load it into the editor. The Status Bar shows the active script name — click it to quickly switch.`,
  },
  {
    id: "zen-mode",
    title: "Zen Mode (Distraction-Free)",
    category: "Workspace & Views",
    tags: ["zen mode", "fullscreen", "distraction free", "focus"],
    relatedIds: ["activity-bar", "hide-syntax", "typewriter-mode", "focus-mode"],
    content: `Press <kbd>Ctrl+Alt+Enter</kbd> to toggle Zen Mode. This hides the Header Bar, Activity Bar, Sidebar, and Status Bar with staggered collapse animations, expanding the editor into a distraction-free view. Uses Tauri fullscreen API with HTML5 Fullscreen API as fallback outside Tauri. Zoom shortcuts (<kbd>Ctrl+=</kbd>, <kbd>Ctrl+-</kbd>) and Search (<kbd>Ctrl+F</kbd>) still work in Zen Mode.`,
  },
  {
    id: "context-menu",
    title: "Editor Context Menu",
    category: "Workspace & Views",
    tags: ["right click", "context menu", "menu"],
    relatedIds: ["scene-highlighting", "tag-manager", "transform-case", "parking", "notes-markers"],
    content: `Right-click anywhere in the editor for quick access. Press <kbd>Ctrl</kbd> while right-clicking for **Quick Tag Mode** (direct access to production tags without the submenu).

**Normal mode:**

- **Selection Stats** (if text selected): word count and character count.
- **Cut / Copy / Paste** — standard clipboard (disabled without selection).
- **Tag** → submenu with 15 production categories: Cast (Character), Prop, VFX, SFX (Special Effect), Camera, Animal, Extras, Vehicle, Costume, Makeup, Music, Sound, Stunt, Set Design, Other. If cursor is on an existing tag, shows **Remove Tag**.
- **Highlight Scene** → 7 colors: Red, Orange, Yellow, Green, Blue, Purple, Pink, plus Clear.
- **Drop Marker** → submenu with 11 colors (Blue, Brown, Cyan, Green, Magenta, Orange, Pink, Purple, Red, Yellow, Default Orange). Prompts for a description.
- **Format** → Bold, Italic, Underline.
- **Transform Case** → UPPERCASE, Title Case, lowercase.
- **Look Up Word** → Google search selection.
- **Create Task** → adds selected text as a to-do item.
- **Park Selection** → cuts selected text and stores in Parking sidebar.

**Quick Tag Mode (<kbd>Ctrl</kbd>+right-click):**

Shows clickable colored dots for each category. Click a dot to tag the selected text directly without navigating a submenu. If the cursor is already on a tagged word, shows a "Remove" option.`,
  },
  {
    id: "status-bar",
    title: "Status Bar",
    category: "Workspace & Views",
    tags: ["status bar", "info", "stats", "mode"],
    relatedIds: ["statistics-overview", "sprint-timer", "scripts-manager"],
    content: `The Status Bar at the bottom of the window shows left-aligned and right-aligned info:

**Left side:**
- **Script Name** — clickable to switch scripts in multi-script bundles.
- **Save Status** — "Saving…" spinner or "Saved" checkmark (auto-hides after 2 seconds).

**Right side:**
- **Active Sprint** (when running): colored dot + "Sprint: MM:SS / Nm (WPM)".
- **Scenes** — count of scene headings (hidden on small screens).
- **Words** — total word count (hidden on small screens).
- **Page** — "Page: currentPage of totalPages" (always visible).

In Zen Mode, the Status Bar collapses to height 0 with a transition.`,
  },
  {
    id: "file-tabs",
    title: "File Tabs",
    category: "Workspace & Views",
    tags: ["tabs", "files", "multi-tab", "close"],
    relatedIds: ["open-file", "new-screenplay", "scripts-manager"],
    content: `Open multiple scripts simultaneously in tabs in the header bar. Features:

- **Dirty indicator**: a circular dot appears when unsaved changes exist (primary colored for active tab, text-secondary for inactive).
- Close with <kbd>Alt+Q</kbd>, click the X, or middle-click the tab header.
- Right-click a tab for **Close / Close Others / Close All** (dirty files prompt a Save & Close / Discard / Cancel dialog).
- Scroll horizontally through tabs using the mouse wheel on the tab bar.
- Navigate: <kbd>Ctrl+Tab</kbd> / <kbd>Ctrl+PageDown</kbd> (next), <kbd>Ctrl+Shift+Tab</kbd> / <kbd>Ctrl+PageUp</kbd> (previous). Both wrap around.
- "+" button at the end creates a new untitled tab.`,
  },
  {
    id: "quick-settings",
    title: "Quick Settings Menu",
    category: "Workspace & Views",
    tags: ["quick settings", "gear", "activity bar"],
    relatedIds: ["activity-bar", "settings-overview", "interface-scale", "editor-zoom", "theme-manager"],
    content: `The gear icon at the bottom of the Activity Bar opens the Quick Settings menu with:

**View & Scale**
- Interface Scale slider (75%–300%, step 5).
- Editor Zoom slider (50%–400%, step 10).
- "Reset View" button (sets zoom + scale to 100%).

**Editor Preferences**
- Typewriter Mode toggle.
- Hide Fountain Markup toggle.

**Theme**
- Theme color swatch grid — each theme shown as a 2×2 color cube (editor, sidebar, accent, dropdown). Click any swatch to switch instantly.
- "Manage Themes…" link to open the Theme Manager modal.

**Layout & Page**
- Paper Size toggle: Letter / A4.

**Full Settings** link at the bottom opens the full Settings modal.`,
  },

  // ===== PRODUCTION FEATURES =====
  {
    id: "scene-highlighting",
    title: "Scene Highlighting (Color Coding)",
    category: "Production Features",
    tags: ["highlight", "color", "scene", "color code"],
    relatedIds: ["tag-manager", "notes-markers", "outline-navigator"],
    content: `Right-click a scene heading and choose **Highlight Scene** → pick a color (Red, Orange, Yellow, Green, Blue, Purple, Pink) or **Clear Highlight** to remove it. Color is stored as \`[[color name]]\` on the scene heading line. Hex codes also work: \`[[#ff0000]]\`

**7 supported named colors:** red, orange, yellow, green, blue, purple, pink.

Highlighted scenes show a colored left border in the editor, a colored dot in the Outline Navigator, and are exported as color-tagged elements in FDX format. The Outline Navigator's filter popover lets you filter by scene color with count badges.`,
  },
  {
    id: "tag-manager",
    title: "Tag Manager",
    category: "Production Features",
    tags: ["tag", "breakdown", "props", "cast", "vfx", "production"],
    relatedIds: ["scene-highlighting", "notes-markers", "context-menu"],
    content: `Tag production elements directly in your script without cluttering the text. Select text, right-click → **Tag**, and choose a category (or <kbd>Ctrl</kbd>+right-click for Quick Tag Mode):

**15 categories:** Cast (Character), Prop, VFX, SFX (Special Effect), Camera, Animal, Extras, Vehicle, Costume, Makeup, Music, Sound, Stunt, Set Design, Other.

Character names are automatically detected and tagged as Cast. Tags are serialized in .actone bundles as \`production_tags.json\`.

Open the **Tag Manager** (Command Palette → "Open Tag Manager…") with two tabs:

- **Tag Reports** — Two views:
  - **Scene by Scene**: a dense table showing all scenes with their tags in category columns. Filter by category and search by scene or tag name. Click any tag to jump directly to that scene. Export the breakdown as CSV.
  - **List by Tag**: accordion list grouped by category → definition → scene list. Each definition shows its usage count and clickable scene entries.
- **Edit Tags** — Browse all tag definitions organized by category. Select a definition to view a detail panel with rename (inline text field + save/cancel), two-click delete confirmation, and a table of all tagged scenes with clickable navigation.

Quick-tag from the editor with <kbd>Ctrl</kbd>+right-click to bypass the tag type menu.`,
  },
  {
    id: "notes-markers",
    title: "Color Markers & Notes",
    category: "Production Features",
    tags: ["markers", "notes", "[[ ]]", "inline comments", "color"],
    relatedIds: ["markers-list", "tag-manager"],
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

Storyline labels appear as uppercase pill badges in the Outline Navigator per scene. The Outline Navigator's filter popover lets you filter by storyline with count badges.`,
  },
  {
    id: "structure-templates",
    title: "Structure Templates",
    category: "Production Features",
    tags: ["template", "structure", "three act", "save the cat", "beat sheet"],
    relatedIds: ["tag-manager", "sections", "outline-navigator"],
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
    content: `In the Outline Navigator, drag scenes by the six-dot grab handle to reorder them. A floating blue ghost follows your cursor and a 2px blue insertion indicator line shows where the scene will land. The editor text updates automatically to reflect the new scene order via \`reorderScenes()\` which manipulates the raw Fountain text and re-parses — all formatting is preserved.`,
  },

  // ===== FILES & PROJECTS =====
  {
    id: "actone-bundle",
    title: "ActOne Bundle Format (.actone)",
    category: "Files & Projects",
    tags: ["actone", "bundle", "zip", "portable"],
    relatedIds: ["scripts-manager", "sidebar-panels", "save"],
    content: `The **.actone** format is a ZIP archive (using the \`fflate\` library) that packages everything together. While standard .fountain files only save raw script text, .actone bundles include:

- All script files as plain \`.fountain\` text inside the archive.
- Character gender assignments (\`characters.json\`).
- Task checklists (\`todos.json\`).
- Notepad contents (\`notepad.json\`).
- Sprint session history (\`sprint_data.json\`).
- Marker categories (\`marker.json\`).
- Production tags and definitions (\`production_tags.json\`).
- Parked text snippets (\`parking.json\`).
- A manifest (\`fountain.json\`) mapping script names to their archive filenames.`,
  },
  {
    id: "save",
    title: "Saving Files",
    category: "Files & Projects",
    tags: ["save", "save as", "ctrl+s", "autosave"],
    relatedIds: ["actone-bundle", "file-tabs", "auto-save"],
    content: `<kbd>Ctrl+S</kbd> saves the active file. For .actone bundles, this packs all scripts and settings into a ZIP archive. For plain .fountain files, it writes the Fountain text directly.

<kbd>Ctrl+Shift+S</kbd> opens the native Save As dialog. You can save as .actone (recommended for full features) or .fountain.

When the Tauri window close is requested, ActOne checks all open files for unsaved changes and prompts you to save, discard, or cancel.`,
  },
  {
    id: "title-page-editor",
    title: "Title Page Editor",
    category: "Files & Projects",
    tags: ["title page", "cover", "author", "draft date"],
    relatedIds: ["export-pdf", "actone-bundle"],
    content: `Open the Command Palette → "Edit Title Page" to set your screenplay's metadata. Two views:

**Form View:** Fields for Title, Author, Credit, Source, Contact (multi-line, 3 rows), and Draft Date.

**Fountain View:** Raw Fountain title page syntax in a monospace text area. Changes sync bidirectionally with the Form view.

Fields are stored in standard Fountain title page format (\`Title:\`, \`Author:\`, \`Credit:\`, \`Source:\`, \`Contact:\`, \`Draft date:\`). The title page appears in PDF exports. "Apply to Document" merges the edited title page back into the full screenplay text.`,
  },

  // ===== EXPORT =====
  {
    id: "export-overview",
    title: "Export Overview",
    category: "Export",
    tags: ["export", "pdf", "fountain", "fdx", "print"],
    relatedIds: ["export-pdf", "export-fountain", "export-fdx"],
    content: `Press <kbd>Ctrl+P</kbd> or open the Command Palette → "Export…" to open the Export dialog. ActOne supports three export formats, each with format-specific options. The export is handled by the Rust backend for native performance.`,
  },
  {
    id: "export-pdf",
    title: "PDF Export",
    category: "Export",
    tags: ["pdf", "print", "export"],
    relatedIds: ["export-overview", "export-fountain", "theme-manager"],
    content: `Export your screenplay as a professionally formatted PDF using the krilla and cosmic-text Rust engine. Options:

- **Include Title Page** — export the title page if defined.
- **Bold Scene Headings** — make scene headings bold.
- **Scene Numbers** — Off, Left Side Only, or Mirror on Both Sides.
- **Font** — Courier Prime or Courier Prime Sans.
- **Include Sections** — render \`#\` section headers.
- **Include Synopsis** — render \`=\` synopsis lines.
- **Script Fonts** — per-script language font detection with a system font picker for multi-script bundles.
- **Element Formatting** — per-element B/I/U toggles for Scene Heading, Action, Character, Parenthetical, Dialogue, Lyrics, Transition, Shot, and Centered Text.
- **Watermark Options** — Header watermark (text + opacity), Footer watermark (text + opacity), Center watermark (text or image type with image path browser, grayscale toggle, opacity slider; accepts PNG/JPG/BMP/GIF/WebP).

Paper Size (Letter or A4) is inherited from Settings. PDF includes page numbering after the title page and proper screenplay formatting (dialogue indentation, dual dialogue columns, right-aligned transitions, smart page breaks with orphan/widow protection).`,
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
    id: "settings-overview",
    title: "Settings Overview",
    category: "Settings & Customization",
    tags: ["settings", "ctrl+,", "configuration"],
    relatedIds: ["theme-manager", "auto-save", "font-paper", "interface-scale", "editor-settings"],
    content: `Press <kbd>Ctrl+,</kbd> or use the Command Palette → "Open Settings…" to open the Settings dialog. Two tabs:

**General:** Visual Theme, Paper Size (Letter / A4), Interface Scale (75%–300%), Auto-Save toggle and interval.

**Editor:** Font Style (Courier Prime / Courier Prime Sans), Editor Zoom (50%–400%), Typewriter Mode, Autocomplete, Smart Quotes, Auto-Match Parentheses, Hide Fountain Markup, Focus Mode.

Quick Settings are also available from the Activity Bar gear icon for common adjustments without opening the full modal.`,
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

**17 built-in themes** are available as clickable starting points in the creation form. Custom themes appear under a "CUSTOM" section in the Theme Manager.`,
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
    title: "Interface Scale",
    category: "Settings & Customization",
    tags: ["scale", "ui size", "zoom", "dpi"],
    relatedIds: ["settings-overview", "editor-zoom"],
    content: `Adjust the entire UI from **75% to 300%** in 5% increments via the Quick Settings slider or Settings → General → Interface Scale. All dialogs and modals respect this scaling so they never overflow on small screens. Persisted in localStorage.`,
  },
  {
    id: "auto-save",
    title: "Auto-Save",
    category: "Settings & Customization",
    tags: ["autosave", "save", "interval"],
    relatedIds: ["save", "settings-overview"],
    content: `Toggle auto-save in Settings → General and choose an interval: 30 seconds, 1 minute, 2 minutes, or 5 minutes. Default: 1 minute. Only triggers for files that have an existing file path and have unsaved changes. Uses \`setInterval\` with refs to avoid stale closures.`,
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
- **Hide Fountain Markup**: Clean reading view (hide prefixes on non-active lines).
- **Focus Mode**: Dim all lines except the active cursor line.`,
  },
];

export const categories = [
  "Getting Started",
  "Fountain Syntax",
  "Writing Tools",
  "Workspace & Views",
  "Production Features",
  "Files & Projects",
  "Export",
  "Settings & Customization",
];
