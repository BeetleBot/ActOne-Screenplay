# Markers and Tags Implementation Plan (Beat-Style)

This document outlines the strategy for implementing a comprehensive Markers and Tags system in ActOne, inspired by the feature set and data structures found in the Beat screenwriting app.

## Feature Overview

ActOne will support two primary types of annotations:
1. **Fountain-Native Annotations:** Inline markers and scene coloring using standard Fountain note syntax.
2. **Production Tagging:** A specialized tagging system for tracking production elements (Cast, Props, VFX, etc.) across the script.

---

## 1. Fountain-Native Annotations

These are stored directly within the script text and follow the standard Fountain philosophy.

### Markers
- **Syntax:** `[[marker color: description]]` or `[[marker: description]]`.
- **Behavior:** 
  - Appear in the **Navigator Sidebar** as outline elements.
  - The sidebar entry will use the specified color.
  - Clicking a marker scrolls the editor to its location.
- **Checklist:**
  - [ ] Support custom hex colors and standard names (red, blue, green, etc.).
  - [ ] Add "Drop Marker" to the command palette and context menu.
  - [ ] Highlight markers in the editor with distinct styling.

### Scene Coloring
- **Syntax:** `[[color]]` (e.g., `[[pink]]`, `[[#ff00ff]]`) at the end of a scene heading or on the line immediately following it.
- **Behavior:**
  - Colors the scene's segment in the **Timeline View**.
  - Colors the scene's title in the **Navigator Sidebar**.
  - Colors the scene's **Index Card**.
- **Checklist:**
  - [ ] Improve parser to reliably associate color tags with their respective scenes.
  - [ ] Add color picker to the Navigator and Index Card views.

---

## 2. Production Tagging System

A professional tagging system based on the categories used in Beat. This allows for detailed breakdown and tracking of elements.

### Tag Categories
ActOne will adopt the exact 15 categories from Beat:

| Category | Key | Color | Icon (Heroicon equivalent) |
| :--- | :--- | :--- | :--- |
| **Cast (Character)** | `cast` | Cyan | `UserIcon` |
| **Prop** | `prop` | Orange | `BriefcaseIcon` |
| **VFX** | `vfx` | Purple | `SparklesIcon` |
| **SFX (Special Effect)** | `sfx` | Brown | `FireIcon` |
| **Camera** | `camera` | Mint | `CameraIcon` |
| **Animal** | `animal` | Yellow | `BugAntIcon` (or similar) |
| **Extras** | `extras` | Magenta | `UsersIcon` |
| **Vehicle** | `vehicle` | Teal | `TruckIcon` |
| **Costume** | `costume` | Pink | `ShoppingBagIcon` |
| **Makeup** | `makeup` | Green | `PaintBrushIcon` |
| **Music** | `music` | Olive | `MusicalNoteIcon` |
| **Sound** | `sound` | Rose | `SpeakerWaveIcon` |
| **Stunt** | `stunt` | Blue | `ShieldCheckIcon` |
| **Set Design** | `setDesign` | Goldenrod | `HomeIcon` |
| **Other (Generic)** | `other` | Gray | `TagIcon` |

### Tagging Mode
- **Functionality:** A dedicated toggle in the UI that changes the editor to a "Production Breakdown" state.
- **UX:** 
  - Selecting text in this mode opens a **Tagging Popover**.
  - Includes a search bar with **fuzzy matching (Levenshtein distance)** to find existing definitions.
  - Allows one-click creation of new definitions.
- **Visuals:** Tagged ranges are underlined in the editor with the color of their category.

### Tag Manager
- **Functionality:** A central dashboard to manage the production breakdown.
- **Features:**
  - View all tag definitions grouped by category.
  - Edit definition names and types.
  - **Merge Tags:** Combine multiple definitions into one (e.g., merge "John D." and "John Doe").
  - **Usage Tracking:** See which scenes a specific tag appears in.

### Data Structure (.actone Bundle)
Rather than cluttering the Fountain file, tagging data will be stored in the `.actone` format bundle.

**File:** `tags.json`
```json
{
  "tags": [
    { 
      "range": [1024, 5], 
      "type": "cast", 
      "definitionId": "uuid-123",
      "sceneId": "scene-abc"
    }
  ],
  "definitions": [
    { 
      "id": "uuid-123", 
      "name": "John Doe", 
      "type": "cast",
      "colorOverride": null 
    }
  ]
}
```

### Checklist
- [ ] **Data Model:** Define TypeScript interfaces for `Tag`, `TagDefinition`, and `TagCategory`.
- [ ] **Bundle Integration:** Add logic to read/write `tags.json` within the `.actone` bundle.
- [ ] **Tagging Mode UI:**
  - [ ] Main toolbar toggle for "Tagging Mode".
  - [ ] `TaggingPopover` with search and category selection.
- [ ] **Tag Manager Modal:**
  - [ ] Category-based listing.
  - [ ] Edit/Delete/Merge functionality.
- [ ] **Editor Integration:**
  - [ ] CodeMirror extension for non-destructive underlining of tagged ranges.
  - [ ] Hover tooltips on tagged text showing the definition name and category.
- [ ] **Navigator/Timeline:**
  - [ ] Filter scenes by specific production tags.
  - [ ] "Breakdown" sidebar view to see all tags in the current scene.
- [ ] **Export:** Option to export a "Production Breakdown" report (CSV/PDF).

---

## 3. Advanced Filtering & Analysis

- [ ] **Scene Breakdown:** Show all tags associated with a scene in a "Breakdown" panel.
- [ ] **Filter View:** Allow filtering the entire script view to only show scenes containing specific tags (e.g., "Show all scenes with 'VFX' tags").
- [ ] **Export:** Ensure tags can be optionally included or excluded during PDF/Final Draft export.
