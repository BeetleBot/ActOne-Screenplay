# Scripts Feature — Implementation Plan (Revised)

## Core Concept
`.actone` bundles hold multiple named fountain files. A new **Scripts** tab in the sidebar lets users add, rename, delete, and switch between scripts. Each script is stored as `{name}.fountain` inside the ZIP bundle. A `fountain.json` manifest tracks order + name→file mapping.

---

## 1. Bundle Structure Change (`src/utils/actone.ts`)

### New ZIP layout
```
MyScreenplay.actone/
├── fountain.json              ← NEW: manifest (script order + name→file mapping)
├── Act One.fountain           ← NEW: user-named scripts
├── Act Two.fountain
├── settings.json              (unchanged)
├── characters.json            (unchanged)
├── todos.json                 (unchanged)
├── ... other metadata         (unchanged)
```

### `fountain.json` format
```json
[
  { "name": "Act One", "file": "Act One.fountain" },
  { "name": "Act Two", "file": "Act Two.fountain" }
]
```

### `unpackActoneBundle()` — modified
- Look for `fountain.json` in ZIP
- **Found**: read manifest, extract each `.fountain` file listed → build `ScriptInfo[]`
- **Not found (legacy)**: extract `document.fountain`, create one `ScriptInfo` with **name = bundle filename without extension** (e.g., `"MyScreenplay"`), file = `"document.fountain"`
- Return `{ scripts: ScriptInfo[], settings: {…} }`

### `packActoneBundle()` — modified
- Accept `{ scripts: ScriptInfo[], settings: {…} }`
- Write `fountain.json` + each `{fileName}.fountain` + all metadata files

### Type
```typescript
interface ScriptInfo {
  name: string;
  fileName: string;
  content: string;
  savedContent: string;
}
```

---

## 2. FileContext Extensions (`src/context/FileContext.tsx`)

### New state
- `scripts: ScriptInfo[]` — scripts in the active bundle
- `activeScriptIndex: number` — which script is loaded in editor

### New actions
- `setActiveScript(index)`: save current script content back to `scripts[i]`, load new script's content into `rawText`, re-parse
- `addScript(name?)`: append a new empty `ScriptInfo` to `scripts`
- `renameScript(index, newName)`: update `name` in scripts array + in `fountain.json` on next save
- `deleteScript(index)`: `confirm()` dialog, then remove from array

### Save logic
- `saveFile()`: update `scripts[activeScriptIndex].content` from current `rawText`, call `packActoneBundle(scripts, settings)`

### Initial bundle / empty state
- `newFile()`: when creating a new `.actone`, auto-create one empty script with name `"Untitled"`
- Legacy `.actone` without `fountain.json`: auto-upgraded on first save

---

## 3. ScriptsView Component (NEW: `src/components/ScriptsView.tsx`)

```
┌─────────────────────────────┐
│  Scripts             [+]    │
├─────────────────────────────┤
│  ▶ Act One            ⋮     │ ← active
│    Act Two            ⋮     │
│    Act Three          ⋮     │
├─────────────────────────────┤
│  [Export All Scripts]       │
└─────────────────────────────┘
```

- **List**: click to switch active script
- **[+]**: prompt for name → `addScript(name)`
- **⋮ menu per script**: "Rename" (inline/prompt), "Delete" (confirm modal)
- **Export All**: exports each script as `{bundleName}_{scriptName}.pdf` / `.fountain`
- **Gating**: only rendered when file is `.actone` (handled by ActivityBar filtering)

---

## 4. ActivityBar — New "Scripts" Tab (`src/components/layout/ActivityBar.tsx`)

- Add `{ id: "scripts", icon: <DescriptionIcon …>, title: "Scripts" }` as first tab
- `supportsExtended` filtering: `"scripts"` is only shown for `.actone` files (same as notepad/characters/todo/sprint/parking/markers)
- For non-`.actone` files: scripts tab is **hidden** (no banner, no entry)

---

## 5. SidebarViews — Route (`src/components/SidebarViews.tsx`)

```typescript
if (activeTab === "scripts") {
  return <ScriptsView />;
}
```

---

## 6. StatusBar — Script Switcher (`src/components/layout/StatusBar.tsx`)

### Display format (when bundle has scripts):
```
MyScreenplay.actone > Act One.fountain                                    Words: 4,200  Pages: 12
```

### Clickable dropup
- Clicking `MyScreenplay.actone > Act One.fountain` opens a **Menu** anchored upward:
  ```
  ┌─────────────────────────┐
  │  Act One.fountain   ✓   │  ← active
  │  Act Two.fountain       │
  │  Act Three.fountain     │
  └─────────────────────────┘
        ▲ click here
  ```
- Selecting a script from the menu calls `setActiveScript(index)`

### For non-bundle files:
Current behavior (words + pages only)

---

## 7. Export Changes (`src/components/ExportModal.tsx`)

### Universal Export
- Uses **currently active script's** content
- Suggested filename: `{bundleName}_{scriptName}.pdf` or `.fountain`
  - Example: `MyScreenplay_Act One.pdf`
- For non-bundle files: uses current filename (unchanged)

### Export All Scripts (from ScriptsView)
- Exports each script as a **separate file**
- Naming: `{bundleName}_{scriptName}.pdf` / `.fountain`
- **Fountain**: loop scripts, clean each, save individually via native dialog (or download in web mode)
- **PDF**: chain `export_pdf` calls sequentially for each script

---

## 8. File-by-File Change List

| File | Change |
|---|---|
| `src/utils/actone.ts` | Overhaul `unpackActoneBundle`/`packActoneBundle`: multi-script + `fountain.json` manifest + legacy compat |
| `src/context/FileContext.tsx` | Add `scripts[]`, `activeScriptIndex`, `setActiveScript`, `addScript`, `renameScript`, `deleteScript`; modify save logic; auto-create empty script on new bundle |
| `src/components/ScriptsView.tsx` | **NEW** — script list, add/rename/delete/export-all UI |
| `src/components/SidebarViews.tsx` | Add `"scripts"` route → `<ScriptsView>` |
| `src/components/layout/ActivityBar.tsx` | Add `"scripts"` tab (first position), filter with `supportsExtended` |
| `src/components/layout/StatusBar.tsx` | Show `{bundleName} > {scriptName}.fountain`, clickable dropup to switch scripts |
| `src/components/ExportModal.tsx` | Export uses active script; filename `{bundleName}_{scriptName}.{ext}` |

---

## 9. Implementation Order

1. **`actone.ts`** — multi-script pack/unpack + `fountain.json` + legacy compat
2. **`FileContext.tsx`** — script state + actions + save changes
3. **`ScriptsView.tsx`** — UI component
4. **`ActivityBar.tsx`** + **`SidebarViews.tsx`** — register scripts tab
5. **`StatusBar.tsx`** — script switcher dropup
6. **`ExportModal.tsx`** — active-script export + export-all logic
7. Test backward compat + new multi-script workflows

---

## 10. Edge Cases

| Case | Behavior |
|---|---|
| **Legacy `.actone` opened** | Single script auto-named after bundle file |
| **New `.actone` bundle** | Auto-creates one empty script named `"Untitled"` |
| **Delete last script** | Prevent deletion ("Bundle must have at least one script") |
| **Name conflict on add/rename** | Append ` (1)`, ` (2)` etc. |
| **Illegal filename chars** | Sanitize `<>:"/\|?*` from `fileName` on save |
| **Non-`.actone` file** | Scripts tab hidden entirely (same as other extended features) |
| **Export All — one fails** | Continue exporting remaining, report errors |
