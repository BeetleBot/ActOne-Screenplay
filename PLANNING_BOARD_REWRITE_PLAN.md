# Planning Board Rewrite: Pointer Events DnD + UI Polish

## Problem

HTML5 Drag and Drop API is unreliable on Windows WebView2 — `dataTransfer`, custom MIME types, `dropEffect`, and `effectAllowed` can silently fail. The browser's DnD engine is implemented differently across WebView2 and webkitgtk.

## Solution

Replace HTML5 DnD with **Pointer Events** (`pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`), which work identically on both platforms. This is the same approach `react-beautiful-dnd` uses internally.

---

## Part 1: Pointer Events Drag & Drop

### Architecture

```
User pointer-down on draggable element
  └─→ setPointerCapture on board container
  └─→ store drag identity (id, type, title, color) in state + ref
  └─→ record pointer offset from element corner

User pointer-move (captured by board container)
  └─→ update pointer position ref (for auto-scroll)
  └─→ document.elementFromPoint(x, y) → find drop target
  └─→ if target changed → update dragOverId/dropPosition state
  └─→ update overlay position via ref (no re-render)

User pointer-up
  └─→ find drop target via elementFromPoint
  └─→ commit reorder via updateAllBlocks()
  └─→ clear all drag state
```

### Data Attributes (replacing event handlers)

Drop targets get `data-drop-id` and `data-drop-type` attributes:

| Element | `data-drop-id` | `data-drop-type` |
|---------|----------------|------------------|
| Board container | `"board"` | `"board"` |
| Section Paper | `section.id` | `"section"` |
| Column scroll container | `section.id` | `"section-scroll"` |
| Orphan scene Card | `scene.id` | `"scene"` |
| Subsection Box | `sub.id` | `"subsection"` |
| Subsection scene Card | `scene.id` | `"scene"` |
| Empty subsection container | `sub.id` | `"subsection-empty"` |

Draggable elements get `data-draggable-id`, `data-draggable-type`, `data-draggable-title`:

| Element | Attributes |
|---------|------------|
| Section Paper | `data-draggable-id={section.id}` `data-draggable-type="section"` |
| Subsection Box | `data-draggable-id={sub.id}` `data-draggable-type="subsection"` |
| Scene Card | `data-draggable-id={scene.id}` `data-draggable-type="scene"` |

### State Changes

**Remove these states:**
- (none removed, but they'll be driven differently)

**Keep:**
- `draggedItem` (id + type) — visible from draggedItem?.id === scene.id for opacity
- `dragOverId` — which element is being hovered
- `dropPosition` — "before" or "after"

**Add:**
- `dragOverlay` — { x, y, width, height, title, color } for the floating overlay element
- `isDragging` — boolean flag (derived from draggedItem !== null)
- `pointerStart` ref — { x, y } for drag threshold detection
- `overlayRef` — ref to overlay div for direct DOM manipulation

### Key Implementation Details

#### Drag Threshold
Don't start drag until pointer moves >5px from pointer-down position. Prevents accidental drags on click.

#### Pointer Capture
Call `boardRef.current.setPointerCapture(e.pointerId)` on pointer-down to ensure we receive all subsequent pointer events even outside the board.

#### Hit Testing
On each pointer-move: `document.elementFromPoint(e.clientX, e.clientY)` then `.closest('[data-drop-id]')`.

#### Auto-Scroll
Keep existing interval-based scroll logic. Update `dragScrollState` ref from pointer-move handler.

#### Drag Overlay
Render a fixed-position absolute overlay via React portal or inside the board container. Use `pointer-events: none` so it doesn't interfere with hit-testing. Update position via ref directly (not state) on each frame.

#### Drop Logic
Extract current `handleDrop` logic into a function that takes `(dragItem, targetId, targetType)` — reuse it from pointer-up handler.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/PlanningBoard.tsx` | Replace all HTML5 DnD props → data attributes + pointer event handlers + overlay rendering |

---

## Part 2: UI Polish ("Beautiful, Compact, Data Rich")

### Scene Cards — More Compact

| Change | Detail |
|--------|--------|
| Card height | 150 → 130px |
| Card padding | p: 1.5 → p: 1 (CardContent) |
| Title font | subtitle2 → body2 (smaller) |
| Synopsis area | max 2 lines with ellipsis |
| Gap between cards | 2 → 1.5 |

### Scene Cards — More Data Rich

| Change | Detail |
|--------|--------|
| Scene number badge | Already exists — keep as-is |
| Color dot | Replace border-left with smaller color dot (8px circle) beside title |
| Line count | Show "(N lines)" faintly below title |
| Add mini action buttons | Edit icon + Delete icon, appear on hover (opacity) |

### Section Columns — Compact

| Change | Detail |
|--------|--------|
| Section header padding | p: 2 → p: 1.5 |
| Section title | h6 → subtitle1 |
| Synopsis area | body2 → caption (smaller) |

### Subsection Cards — Compact

| Change | Detail |
|--------|--------|
| Subsection padding | p: 1.5 → p: 1 |
| Subsection title | subtitle2 → body2 |
| Synopsis | body2 → caption |

### Visual Polish

| Change | Detail |
|--------|--------|
| Card hover | Already exists but subtle — add slight lift + shadow |
| Section column shadow | elevation: 2 → keep |
| Drag overlay | Slight rotation (2deg), shadow, 85% opacity, primary border |
| Smoother placeholders | Already has animation — keep |
| Color dots on scene cards | 8px circle instead of 5px left border (saves space) |

---

## Implementation Order

1. Add data attributes to all droppable elements
2. Add data-draggable attributes to all draggable elements
3. Remove all HTML5 DnD props (draggable, onDrag*, onDrop*)
4. Add pointer event handlers on board container
5. Implement hit-testing in pointer-move
6. Implement drop commit in pointer-up
7. Add drag overlay rendering
8. Add drag threshold (5px)
9. Remove global dragend/mouseup/dragover window listeners
10. Run tests, verify
11. Apply UI polish (compact sizes, richer data display)
