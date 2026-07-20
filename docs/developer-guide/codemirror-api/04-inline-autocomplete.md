# Inline Autocomplete Extension

**File:** `src/editor/inlineAutocomplete.ts` (~430 lines)

A custom CodeMirror 6 `ViewPlugin` providing ghost-text autocomplete for screenplay elements.

## Architecture

```
User types text
  └─→ ViewPlugin.update() fires
  └─→ Check current line type via fountainSyntaxField
  └─→ Build suggestion list from:
      ├── Character names (from document + character list)
      ├── Location extensions (INT./EXT./INT./EXT, etc.)
      ├── Scene/section names (from document)
      └── Transition keywords (CUT TO:, FADE IN:, etc.)
  └─→ If single match: show ghost text widget
  └─→ If multiple matches: show dropdown (on Tab or arrow key)
```

## Ghost Text Widget

Renders a semi-transparent text decoration immediately following the cursor:

```typescript
class GhostTextWidget extends WidgetType {
    constructor(readonly text: string) {}

    eq(other: GhostTextWidget) { return other.text === this.text; }

    toDOM() {
        const span = document.createElement("span");
        span.className = "cm-ghost-text";
        span.textContent = this.text;
        return span;
    }
}
```

CSS: `.cm-ghost-text { opacity: 0.3; pointer-events: none; }`

## Autocomplete Sources

### Character Names

Collected from:
1. `characters.json` in the `.actone` bundle (canonical character list with gender)
2. All-uppercase lines in the document that match character cue patterns

### Location Extensions

From the scene heading definition:
- `INT.`, `EXT.`, `INT./EXT.`, `I.E.`, `EST.`
- Suggests based on what the user has typed so far

### Transition Keywords

Common screenplay transitions:
- `CUT TO:`, `FADE IN:`, `FADE OUT:`, `FADE TO BLACK.`
- `DISSOLVE TO:`, `SMASH CUT TO:`, `MATCH CUT TO:`

### Scene/Section Names

Collected from existing scene headings and section headers in the document.

## Interaction

| Key | Behavior |
|-----|----------|
| `Tab` | Accept ghost text suggestion |
| `Enter` | Accept ghost text suggestion |
| `ArrowDown` | Show dropdown with alternative suggestions |
| `Escape` | Dismiss suggestion |
| Any other key | Continue typing, recalculate suggestion |

## Edge Cases

- **No suggestion:** Widget is not rendered
- **Multiple matches:** Ghost text shows the best match; dropdown mode shows all
- **Document change:** Suggestion recalculated on every update
- **Wrong suggestion:** User continues typing and it disappears naturally
