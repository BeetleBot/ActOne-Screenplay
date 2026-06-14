# Plan: Markdown File Support in ActOne Bundles

## Goal
Add markdown (.md) file support alongside fountain (.fountain) in actone bundles, with a VSCode-style Project pane featuring folders.

## Constraints
- No new npm/rust dependencies — write custom markdown syntax highlighter in-house
- Rename "Scripts" → "Project" throughout the UI
- Four modes: Fountain Only, Fountain+ActOne, Markdown Only, Markdown+ActOne (mixable in one bundle)
- Add dropdown: "Screenplay" (.fountain) and "Notes" (.md)
- Project pane shows bare name + extension tag (no icons), VSCode-style tree with folders
- Right-click context menus on files, folders, and empty space for CRUD operations
- Editor component stays named "Editor" (not FountainEditor, not ScriptEditor)
- Clean readable document style for future markdown PDF export
- Auto-convert old v1 actone bundles to new v2 format on save

## Proposed Implementation Outline

### Phase 1: Core Data Model Changes

#### 1.1. `src/utils/actone.ts` — ScriptInfo & Bundle Format
- Add `FileType = "fountain" | "markdown"` type
- Update `ScriptInfo`:
  - Remove `fileName` field
  - Add `type: FileType`
  - Add `folder: string` (empty string = root level)
- Define v2 bundle format with `project.json` manifest:
  ```json
  { "version": 2, "folders": ["Research", "Characters"], "files": [{ "name": "Act 1", "type": "fountain", "folder": "" }] }
  ```
- Content stored as index-based keys (`"0"`, `"1"`, `"2"`...) — decouples display name from storage
- `getContentKey(i)` helper: returns `String(i)`
- `packActoneBundle(scripts, settings, folders)` — takes third `folders` param
- `unpackActoneBundle(data, defaultName)`: detect v1 via `fountain.json` → auto-convert to v2
- `detectType(name)`: infer type from extension (.md → markdown, .fountain/.txt → fountain)

#### 1.2. `src/utils/index.ts`
- Export `FileType` type

#### 1.3. `src/utils/actone.test.ts`
- Update `makeScripts` helper for new `ScriptInfo` shape (no `fileName`, add `type`/`folder`)
- Update legacy bundle test
- Update bundle format test to check `project.json`

---

### Phase 2: Markdown Syntax Highlighter

#### 2.1. `src/editor/markdownSyntax.ts` (new file)
- No external dependencies (custom implementation using `@codemirror/state` and `@codemirror/view`)
- `StateField` + `DecorationSet` approach (same pattern as fountainSyntax.ts)
- Cover these line types with CSS classes:
  - `# Heading 1` → `cm-md-h1`
  - `## Heading 2` → `cm-md-h2`
  - `### Heading 3` → `cm-md-h3`
  - `> Blockquote` → `cm-md-blockquote`
  - ``` code fences → `cm-md-code-block`, `cm-md-code-fence-open`
  - `---` HR → `cm-md-hr`
  - `- List item` → `cm-md-list`
  - Paragraph → `cm-md-paragraph`
- Inline decorations:
  - **Bold** (`**text**`) → `cm-md-bold` + `cm-md-syntax` on markers
  - *Italic* (`*text*`) → `cm-md-italic` + `cm-md-syntax`
  - ~~Strikethrough~~ (`~~text~~`) → `cm-md-strikethrough` + `cm-md-syntax`
  - `Inline code` → `cm-md-inline-code`
  - [Links](url) → `cm-md-link` + `cm-md-link-url`
- Export `markdownHighlightField` (StateField)

---

### Phase 3: Editor Integration

#### 3.1. `src/editor/useCodeMirror.ts`
- Import `markdownHighlightField` from markdownSyntax.ts
- Add `activeScriptType` parameter/ref to hook
- Use `languageCompartment` to dynamically swap extensions:
  - Fountain: `keymap.of([...fountain keys...]), fountainHighlightField, autocompletion(...), hoverTooltip(...)`
  - Markdown: `[markdownHighlightField]` only (no fountain-specific keymaps/autocomplete/tooltips)
- On `activeScriptType` change: `view.dispatch({ effects: languageCompartment.reconfigure(newExtensions) })`

#### 3.2. `src/editor/index.ts`
- Export `markdownHighlightField`

---

### Phase 4: Context (FileContext)

#### 4.1. `src/context/FileContext.tsx`
- Add `FileType` import
- Add state:
  - `activeScriptType: FileType` — derived from `scripts[activeScriptIndex].type`
  - `folders: string[]` — stored in bundle
- Add operations:
  - `addFolder(name)` — append to folders array
  - `renameFolder(oldName, newName)` — update folder name in `folders` + all scripts in that folder
  - `deleteFolder(name)` — remove from folders, clear folder on scripts
  - `moveScriptToFolder(index, folder)` — assign script to folder
- Update `addScript(name?, type?)` — accept optional type param
- Update `renameScript(index, newName)` — detect type from extension (`.md` or `.fountain`)
- Update `packActoneBundle` calls to pass folders
- v1→v2 backward compat: detect `fountain.json` in zip, convert to v2 on load
- Standalone .md file support: detect `.md` extension on open, treat as single-script bundle with `type: "markdown"`

---

### Phase 5: UI — Project View

#### 5.1. `src/components/ProjectView.tsx` (rename from ScriptsView.tsx)
- Rename component: `ScriptsView` → `ProjectView`
- Title: "Scripts" → "Project"
- Build `flatItems` array for tree rendering:
  - Sort folders alphabetically, show with ▶ icon
  - Files grouped under folders at depth 1, root files at depth 0
- Each file row shows:
  - Drag handle (grab cursor)
  - File name (plain text, no icon)
  - Extension tag badge: `.fountain` or `.md` (small grey pill)
  - Three-dot menu button
- Extension tag: <0.7rem, muted color, `bgcolor: "action.hover"`, `borderRadius: "3px"`
- Right-click context menus:
  - **Empty space**: "New Screenplay", "New Notes", "New Folder"
  - **Folder**: "New Screenplay", "New Notes", "Rename Folder", "Delete Folder"
  - **File**: "Rename", "Move to Folder" > (submenu with folder list + "Root"), "Delete"
- "New Screenplay" / "New Notes" triggers `addScript(name, type)` directly (no dialog for type — context menu choice determines it)
- "New Folder" → inline prompt or dialog for folder name
- Drag-and-drop reorder: restore existing drag logic (reorder within flat list)
- Drag-and-drop into folders: drop on folder item moves file into that folder
- Drag-and-drop out of folders: drag to root area or above/below folder removes file from folder

#### 5.2. `src/components/SidebarViews.tsx`
- Replace import: `ScriptsView` → `ProjectView`
- Route tab `"scripts"` → `"project"`
- Render `<ProjectView />`

#### 5.3. `src/components/index.ts`
- Replace `FountainEditor` export → `Editor`
- Replace `ScriptsView` export → `ProjectView`

---

### Phase 6: UI — Editor

#### 6.1. `src/components/Editor.tsx` (rename from FountainEditor.tsx)
- Rename component: `FountainEditor` → `Editor`
- Add `activeScriptType` from context
- Conditional context menu:
  - When `activeScriptType === "fountain"`: show all existing menu items (Tag, Highlight Scene, Drop Marker, Format, Transform Case, etc.)
  - When `activeScriptType === "markdown"`: hide Tag, Highlight Scene, Drop Marker, Remove Tag; keep Cut/Copy/Paste, Format, Transform Case, Look Up, Create Task, Park Selection

---

### Phase 7: UI — Layout Components

#### 7.1. `src/components/layout/ActivityBar.tsx`
- Change tab entry: `{ id: "scripts", ... }` → `{ id: "project", title: "Project" }`

#### 7.2. `src/components/layout/StatusBar.tsx`
- Import `activeScriptType` from context
- Show `activeScriptName.md` or `activeScriptName.fountain` based on type
- Dropdown menu lists `script.name + (script.type === "markdown" ? ".md" : ".fountain")`

#### 7.3. `src/components/layout/Workspace.tsx`
- Import `Editor` instead of `FountainEditor`

---

### Phase 8: Styles

#### 8.1. `src/index.css`
- Add markdown syntax CSS classes after existing fountain styles:
  ```css
  .cm-md-h1 { font-size: 1.5em; font-weight: 700; ... }
  .cm-md-h2 { font-size: 1.25em; font-weight: 600; ... }
  .cm-md-h3 { font-size: 1.1em; font-weight: 600; ... }
  .cm-md-blockquote { border-left: 3px solid var(--accent-color); padding-left: 1em; font-style: italic; color: var(--text-muted); }
  .cm-md-code-block { font-family: monospace; background: rgba(0,0,0,0.04); border-radius: 4px; padding: 0.5em 1em; white-space: pre; }
  .cm-md-inline-code { font-family: monospace; background: rgba(0,0,0,0.04); border-radius: 3px; padding: 0.1em 0.3em; }
  .cm-md-hr { border-top: 2px solid var(--border-color); margin: 1em 0; }
  .cm-md-list { margin-left: 1.5em; }
  .cm-md-paragraph { margin: 0.3em 0; }
  .cm-md-code-fence-open { font-family: monospace; color: var(--text-muted); }
  .cm-md-bold { font-weight: 700; }
  .cm-md-italic { font-style: italic; }
  .cm-md-strikethrough { text-decoration: line-through; }
  .cm-md-syntax { opacity: 0.35; }
  .cm-md-link { color: var(--accent-color); text-decoration: underline; }
  .cm-md-link-url { color: var(--text-muted); font-size: 0.85em; opacity: 0.7; }
  ```

---

### Phase 9: Verification

- `npm run test` — all existing tests pass (after updating for new ScriptInfo shape)
- `npx tsc --noEmit` — zero errors
- `npx vite build` — production build succeeds
- Manual testing: create bundle, add screenplay + notes files, verify folder tree, drag-drop, context menus, editor switching
