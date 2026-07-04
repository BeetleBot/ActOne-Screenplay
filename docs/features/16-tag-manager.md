# Tag Manager

The Tag Manager window (`?modal=tag-manager`) provides CRUD management for production tags and categories.

## Features

### Tags
- Create named tags with optional colors
- Assign tags to scenes via right-click context menu or outline view
- Filter outline view by tag
- Tags saved in `production_tags.json` in the `.actone` bundle

### Tag Categories
- Organize tags into categories
- Collapsible category groups in the tag manager

### Use Cases
- Production breakdown tagging (LOCATION, PROP, CAST, etc.)
- Genre classification
- Revision tracking
- Scene type categorization (ACTION, DIALOGUE, MONTAGE, etc.)

## Interface

The Tag Manager opens as a separate Tauri WebviewWindow with:
- Category list on the left
- Tags within the selected category on the right
- Add / Edit / Delete actions for both categories and tags
- Color picker for tag colors
- Quick-tag menu via `Ctrl+right-click` in the editor
