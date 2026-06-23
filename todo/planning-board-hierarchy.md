# Planning Board — Hierarchy Specification

## Document Structure (Fountain)

The script is parsed into a hierarchy of outline elements. Three levels:

```
SECTION  (depth 1, e.g. # ACT 1)
├── PRE-SUBSECTION AREA: scenes not under any subsection
├── SUBSECTION (depth 2, e.g. ## The Beginning)
│   ├── Scene heading (INT. HOUSE - DAY)
│   │   ├── Action / dialogue / etc. (non-outline content)
│   │   ├── = Synopsis line (attached to scene)
│   │   └── ...
│   ├── Scene heading (EXT. STREET - NIGHT)
│   └── ...
├── SUBSECTION (depth 2, e.g. ## The Middle)
│   └── ...
└── (no orphan scenes below subsections)
```

## Board Layout

Each section renders as a **column** (`.column` class, 300px wide, scrollable).

```
┌─────────────────────────────────────┐
│  SECTION HEADER                     │  ← editable title, synopses
│  = Section synopsis                 │     add synopsis button
│  + synopsis                         │
├─────────────────────────────────────┤
│  PRE-SUBSECTION SCENES (top area)   │  ← only shown when section has
│  ├─ Scene A (INT. KITCHEN)          │     orphanScenes.length > 0
│  ├─ Scene B (EXT. GARDEN)           │
│  └─ [drop zone]                     │  ← append: inserts before first
│                                     │       subsection heading line
├─────────────────────────────────────┤
│  ┌─ SUBSECTION: Morning ──────────┐ │
│  │  Scene 1 (INT. HOUSE)          │ │
│  │  Scene 2 (EXT. STREET)         │ │
│  │  [drop zone]                   │ │
│  └────────────────────────────────┘ │
│  ┌─ SUBSECTION: Afternoon ────────┐ │
│  │  Scene 3 (INT. CAR)            │ │
│  │  [drop zone]                   │ │
│  └────────────────────────────────┘ │
│                                     │
│  [Add Scene]  [Add Sub-section]     │  ← inserts at end of section
└─────────────────────────────────────┘
```

### Uncategorized Column

When scenes exist outside any section (before first `#` heading), render an
additional "Scenes" column with its own drop zone.

```
┌─────────────────────────────────────┐
│  Scenes                             │
│  ├─ Uncat Scene 1                   │
│  ├─ Uncat Scene 2                   │
│  └─ [drop zone]                     │
└─────────────────────────────────────┘
```

## Hierarchy Rules

### Rule 1: No orphan scenes below a subsection

If a section has at least one `## Subsection`, every scene below that
subsection MUST belong to the most recent subsection. Scenes before the
first subsection — between `# Section` and `## Subsection` — are the
only valid pre-subsection ("orphan") scenes.

```
# ACT 1                 ← section starts
INT. HOUSE - DAY        ← pre-subsection scene (valid orphan)

## Morning              ← subsection starts
INT. KITCHEN            ← belongs to Morning
EXT. GARDEN             ← belongs to Morning

## Evening              ← subsection starts  
INT. BEDROOM            ← belongs to Evening
                        ← Can NOT have a scene here that is orphan
```

### Rule 2: Drop zone at section bottom

- If section has **no subsections**: drop zone at bottom appends to section
- If section has **subsections**: drop zone at bottom does NOT exist.
  The last subsection's drop zone is the final drop target.

### Rule 3: Moving scenes out of a subsection

A scene can only move **upward** out of a subsection:
- Into the pre-subsection area (above the first `##`)
- Into another section (cross-column drop)
- Into another subsection (lateral move)

It cannot move downward into a void between subsections.

### Rule 4: Cross-section drops

Dragging a scene card into another section's column:
- If dropped into a subsection zone → becomes part of that subsection
- If dropped into the pre-subsection zone → goes before first subsection
- If section has no subsections → appends to end of section

## Drop Zones

Each of these is a valid drop target:

| Visual area | Accepts | Inserts at |
|---|---|---|
| Between scene cards (edge) | scene-card | Before/after target scene |
| Pre-subsection `[drop zone]` | scene-card | Before first subsection heading |
| Subsection `[drop zone]` | scene-card | End of that subsection's scene list |
| Uncategorized `[drop zone]` | scene-card | End of uncategorized list |
| Between section columns | scene-card | N/A (cross-section handoff) |

## Visual Indicators

When dragging over a drop target:

- **Between cards**: Animated margin (gap) appears — cards above/below
  spread apart to show insertion point. Use `mt`/`mb` transitions.
- **At drop zone**: Zone widens/glows with primary color background tint.
- **Dragged card**: Original card becomes invisible (opacity: 0). Ghost
  overlay follows cursor at the grab offset.

## Implementation Notes

- `moveSceneToContainer()` handles container-level drops (pre-sub area,
  subsection end, uncategorized) by line-splicing the raw document text.
- Card-to-card drops handle line-level reorder by inserting before/after
  the target scene's heading line.
- After any drop, `setRawText()` triggers full re-parse via `parsedDoc`,
  which rebuilds the board blocks.
- The hierarchy is enforced by **where the drop zone renders** and
  **where `moveSceneToContainer` inserts**, not by post-hoc validation.
