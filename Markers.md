# Markers and Production Tagging Implementation Plan

This document outlines the strategy for implementing a comprehensive Markers and Tags system in ActOne.

## Feature Overview

ActOne will support two primary types of annotations:
1. **Fountain-Native Annotations:** Inline markers and scene coloring using standard Fountain note syntax. (Currently Implemented)
2. **Production Tagging:** A specialized tagging system for tracking production elements (Cast, Props, VFX, etc.) across the script without polluting the raw text. (Planned)

---

## 1. Fountain-Native Annotations (Implemented)

These are stored directly within the script text and follow the standard Fountain philosophy using double-bracket syntax `[[ ]]`.

### Markers
- **Syntax:** `[[marker color: description]]` or `[[color]]`.
- **Behavior:** 
  - Appear in the **Outline/Navigator Sidebar** as outline elements.
  - The sidebar entry will use the specified color (e.g., `[[marker red: Fix this scene]]`).
  - Clicking a marker scrolls the editor to its location.
- **Checklist:**
  - [x] Support custom hex colors and standard names (red, blue, green, etc.).
  - [x] Highlight markers in the editor with distinct styling (`.cm-fountain-marker`).
  - [x] Autocomplete dropdown when typing `[[` (suggesting color templates and existing markers).
  - [x] Dedicated Marker sidepane to search and inspect all markers (excluding scene coloring).
  - [ ] Add "Drop Marker" to the command palette and context menu.

### Scene Coloring
- **Syntax:** `[[color name]]` (e.g., `[[color pink]]`, `[[color #ff00ff]]`) following a scene heading.
- **Behavior:**
  - Colors the scene's segment in the **Outline View**.
  - Colors the scene's title in the **Navigator Sidebar**.
- **Checklist:**
  - [x] Parser reliably associates color tags with their respective scenes.
  - [ ] Add color picker UI to the Navigator and Index Card views.

---

## 2. Production Tagging System (Planned)

A professional tagging system that allows for detailed breakdown and tracking of elements without cluttering the raw Fountain text. 

### Tag Categories
ActOne will support 15 standard production categories:

| Category | Key | Color | Icon |
| :--- | :--- | :--- | :--- |
| **Cast (Character)** | `cast` | Cyan | `UserIcon` |
| **Prop** | `prop` | Orange | `BriefcaseIcon` |
| **VFX** | `vfx` | Purple | `SparklesIcon` |
| **SFX (Special Effect)** | `sfx` | Brown | `FireIcon` |
| **Camera** | `camera` | Mint | `CameraIcon` |
| **Animal** | `animal` | Yellow | `BugAntIcon` |
| **Extras** | `extras` | Magenta | `UsersIcon` |
| **Vehicle** | `vehicle` | Teal | `TruckIcon` |
| **Costume** | `costume` | Pink | `ShoppingBagIcon` |
| **Makeup** | `makeup` | Green | `PaintBrushIcon` |
| **Music** | `music` | Olive | `MusicalNoteIcon` |
| **Sound** | `sound` | Rose | `SpeakerWaveIcon` |
| **Stunt** | `stunt` | Blue | `ShieldCheckIcon` |
| **Set Design** | `setDesign` | Goldenrod | `HomeIcon` |
| **Other (Generic)** | `other` | Gray | `TagIcon` |

### Data Structure (`.actone` Bundle)
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

### Execution Phases & Checklist

#### Phase 1: Data Model & File I/O
- [ ] Define TypeScript interfaces for `TagInstance`, `TagDefinition`, and `TagCategory`.
- [x] Update `FileContext.tsx` to handle separate `marker.json` and `production_tags.json` saving/loading within the `.actone` bundle.

#### Phase 2: Editor Integration (CodeMirror)
- [ ] Build a CodeMirror extension for non-destructive underlining of tagged ranges.
- [ ] Implement hover tooltips on tagged text showing the definition name and category.

#### Phase 3: Tagging Mode UI
- [ ] Add a main toolbar toggle for "Tagging Mode".
- [ ] Build a `TaggingPopover` that appears when text is selected.
  - [ ] Include search with fuzzy matching (Levenshtein distance) to find existing definitions.
  - [ ] Allow one-click creation of new definitions.

#### Phase 4: Tag Manager Dashboard
- [ ] Create a central dashboard (Modal or new Sidebar Tab) to manage the production breakdown.
- [ ] View all tag definitions grouped by category.
- [ ] Edit/Delete tag definitions.
- [ ] **Merge Tags:** Combine multiple definitions into one (e.g., merge "John D." and "John Doe").
- [ ] **Usage Tracking:** See which scenes a specific tag appears in.

#### Phase 5: Advanced Filtering & Export
- [ ] **Scene Breakdown:** Show all tags associated with a scene in a "Breakdown" panel.
- [ ] **Filter View:** Allow filtering the entire script view to only show scenes containing specific tags (e.g., "Show all scenes with 'VFX' tags").
- [ ] **Export:** Export a "Production Breakdown" report (CSV/PDF) and optionally include/exclude tags during standard PDF export.
