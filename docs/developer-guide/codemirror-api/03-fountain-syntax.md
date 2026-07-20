# Fountain Syntax Extension

**File:** `src/editor/fountainSyntax.ts` (~480 lines)

A custom CodeMirror 6 `StateField` that provides real-time Fountain line-type classification and syntax highlighting decorations.

## StateField

```typescript
const fountainSyntaxField = StateField.define<FountainState>({
    create(state): FountainState { /* ... */ },
    update(value, transaction): FountainState { /* ... */ },
});
```

### FountainState

```typescript
interface FountainState {
    lineTypes: LineType[];           // Per-line classification
    sceneHeadings: SceneHeading[];   // Extracted scene headings
    markers: MarkerInfo[];           // Line markers
    decorations: DecorationSet;      // Visual decorations
}
```

### LineType Enum (25+ values)

| Value | CSS Class | Description |
|-------|-----------|-------------|
| `SceneHeading` | `cm-fountain-heading` | Scene headers |
| `Action` | `cm-fountain-action` | Description |
| `Character` | `cm-fountain-character` | Character cues |
| `Dialogue` | `cm-fountain-dialogue` | Dialogue text |
| `Parenthetical` | `cm-fountain-parenthetical` | Wrylies |
| `Transition` | `cm-fountain-transition` | CUT TO: |
| `Lyrics` | `cm-fountain-lyrics` | Song lyrics |
| `CenteredText` | `cm-fountain-centered` | Centered text |
| `Shot` | `cm-fountain-shot` | Camera shots |
| `Section` | `cm-fountain-section` | Section headers |
| `Synopsis` | `cm-fountain-synopsis` | Synopsis lines |
| `PageBreak` | `cm-fountain-pagebreak` | Page breaks |
| `Boneyard` | `cm-fountain-boneyard` | Comments |
| `Note` | `cm-fountain-note` | Annotations |
| `Marker` | `cm-fountain-marker` | Margin markers |
| `SceneNumber` | `cm-fountain-scene-number` | Scene numbers |
| `ForcedAction` | `cm-fountain-forced-action` | !-prefixed action |
| `ForcedHeading` | `cm-fountain-forced-heading` | .-prefixed heading |
| `ForcedCharacter` | `cm-fountain-forced-character` | @-prefixed character |
| `ForcedTransition` | `cm-fountain-forced-transition` | >-prefixed transition |

## Decoration System

The StateField creates decorations (visual styling) for:

1. **Line backgrounds** — color-coded by line type (e.g., scene headings get a subtle tint)
2. **Scene numbers** — right-aligned gutter decorations with primary color
3. **Markers** — colored circles in the gutter margin
4. **Color tags** — scene colors rendered as colored left borders
5. **Boneyard/Notes** — dimmed, italic styling for hidden/note content

## Integration with Theme

Fountain colors are derived from the active theme's `fountainColors` palette:

```typescript
const fountainColors = {
    [LineType.SceneHeading]:   theme.fountainColors.heading,
    [LineType.Character]:      theme.fountainColors.character,
    [LineType.Dialogue]:       theme.fountainColors.dialogue,
    [LineType.Action]:         theme.fountainColors.action,
    [LineType.Transition]:     theme.fountainColors.transition,
    [LineType.Lyrics]:         theme.fountainColors.lyrics,
    [LineType.CenteredText]:   theme.fountainColors.centered,
    [LineType.Section]:        theme.fountainColors.section,
    [LineType.Synopsis]:       theme.fountainColors.synopsis,
    [LineType.Boneyard]:       theme.fountainColors.boneyard,
    [LineType.Note]:           theme.fountainColors.note,
    [LineType.Marker]:         theme.fountainColors.marker,
    [LineType.SceneNumber]:    theme.fountainColors.sceneNumber,
};
```

## Theme CSS

The extension generates per-theme CSS via a `Compartment`:

```css
.cm-fountain-heading { color: var(--fountain-heading); font-weight: bold; }
.cm-fountain-character { color: var(--fountain-character); text-transform: uppercase; }
.cm-fountain-dialogue { color: var(--fountain-dialogue); }
.cm-fountain-action { color: var(--fountain-action); }
.cm-fountain-transition { color: var(--fountain-transition); text-transform: uppercase; }
.cm-fountain-parenthetical { color: var(--fountain-parenthetical); }
.cm-fountain-lyrics { color: var(--fountain-lyrics); font-style: italic; }
.cm-fountain-centered { color: var(--fountain-centered); text-align: center; }
.cm-fountain-shot { color: var(--fountain-shot); font-weight: bold; }
.cm-fountain-section { color: var(--fountain-section); font-weight: bold; }
.cm-fountain-synopsis { color: var(--fountain-synopsis); font-style: italic; }
.cm-fountain-boneyard { color: var(--fountain-boneyard); font-style: italic; opacity: 0.6; }
.cm-fountain-note { color: var(--fountain-note); }
.cm-fountain-marker { color: var(--fountain-marker); }
.cm-fountain-scene-number { color: var(--fountain-scene-number); }
.cm-fountain-forced-heading { color: var(--fountain-heading); font-weight: bold; }
.cm-fountain-forced-character { color: var(--fountain-character); text-transform: uppercase; }
.cm-fountain-forced-transition { color: var(--fountain-transition); text-transform: uppercase; }
.cm-fountain-forced-action { color: var(--fountain-action); }
```
