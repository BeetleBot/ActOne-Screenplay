# Tag Manager

The Tag Manager window (`?modal=tag-manager`, 1100x700 resizable) provides CRUD management for production tags and categories.

## Production Categories (15)

ActOne defines 15 built-in production tag categories:

| Category Key | Label | Usage |
|-------------|-------|-------|
| `cast` | Cast (Character) | Character appearances |
| `prop` | Prop | Physical objects |
| `vfx` | VFX | Visual effects |
| `sfx` | SFX (Special Effect) | Special effects |
| `camera` | Camera | Camera directions |
| `animal` | Animal | Animal performers |
| `extras` | Extras | Background performers |
| `vehicle` | Vehicle | Vehicles in scenes |
| `costume` | Costume | Wardrobe items |
| `makeup` | Makeup | Makeup effects |
| `music` | Music | Music cues |
| `sound` | Sound | Sound design |
| `stunt` | Stunt | Stunt work |
| `setDesign` | Set Design | Set elements |
| `other` | Other (Generic) | Uncategorized |

Each category has a distinct color (CSS custom properties `--cat-*`).

## Features

### Tags
- Create named tags with optional colors
- Assign tags to text ranges in the editor via right-click context menu or Ctrl+right-click (Quick Tag)
- Tags stored in `production_tags.json` in the `.actone` bundle
- Supports per-script tag sets in multi-script bundles

### Tag Categories
- All 15 categories shown in the Tag Manager
- Tags auto-populate from the Cast category when characters are detected
- Collapsible category groups

### Quick Tag
`Ctrl+right-click` on selected text in the editor opens a quick-tag submenu showing all 15 categories. Selecting a category creates a tag with the selected text as the tag name.

## Interface

The Tag Manager opens as a separate Tauri WebviewWindow with event-based communication to the main window:
- **Event `modal:tag-manager:ready`**: Main window responds with settings and parsed doc
- **Event `modal:tag-manager:scroll-to`**: Tag Manager requests scroll to a tagged line
- **Event `modal:tag-manager:update-settings`**: Tag Manager sends rename/delete/remove-all actions
- Tags can be renamed or deleted; deleting a definition removes all associated tags
