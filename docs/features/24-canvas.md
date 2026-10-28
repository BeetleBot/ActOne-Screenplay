# Canvas

Canvas mode hides Markers, Sprint, Parking, and Snapshots from the activity bar. Switching to Canvas while one is active selects Project instead; sidebar rendering also guards against opening these panels through other entry points.

Image-export-specific styles map its filename field, setting labels, headings, buttons, preview border, and control spacing to ActOne tokens. The preview retains the actual artwork colors and transparency checkerboard. Dialog layout stacks on narrow windows.

Ctrl/Command+P routes through the application shortcut handler to the active Canvas image-export dialog. Screenplay and prose documents retain the application export window.

Canvas creation appears as a full row in the empty-project landing action list and uses the same body typography as other document types in the add menu. Canvas import is not exposed in the UI.

The library trigger and library contents are disabled in ActOne. Requests to open the default library sidebar are closed through the editor API. Search remains available. Dialog switch inputs remain transparent so ActOne field styling does not obscure the upstream toggle thumb.

The entire editor UI, including portalled menus and dialogs, maps upstream surface, accent, text, input, and selection tokens to ActOne CSS variables. Drawing fonts and artwork are unaffected. The Canvas menu contains image export and clear actions. Project saving and document management use ActOne controls. Standalone Canvas import and export are not exposed.

Canvas dialogs, including image export, use ActOne surface, typography, border, radius, focus, and shadow tokens via scoped overrides in canvas.css. These selectors target the upstream modal root because dialogs are portalled outside the workspace. Upstream dialog functionality and drawing appearance remain intact.

Canvas embeds the upstream Excalidraw React editor, lazy loaded by Workspace. The product name is Canvas. The editor keeps its drawing and interaction implementation and default hand-drawn styles. ActOne supplies project save/import/export menu items and inherits the application light/dark mode. Collaboration and hosted-service links are not provided.

Document type is `canvas`; files use `.excalidraw` and standard Excalidraw JSON for interchange. Canvas documents use the lightweight document shell, bypassing Fountain parsing and screenplay pagination. Rename and duplicate retain the extension.

CanvasEditor buffers snapshots in refs, ignores selection-only changes, and publishes serialized changes after 400 ms idle. Pending-editor registration flushes before saving, switching, and closing documents. Project archive compression uses fflate's asynchronous worker implementation. Fonts are bundled under public/canvas-assets/fonts with their supplied notices. Update these files when updating the pinned editor dependency.

Bundle format 4 adds format.json and Canvas documents; project.json remains an array. Image binaries live at assets/<encoded-document-path>/<encoded-file-id>. The stored Canvas JSON replaces dataURL with actoneAsset; unpack restores data URLs before opening the editor. Export uses portable JSON with embedded images. Missing referenced assets fail opening rather than silently dropping pictures.

Older bundles are loaded using existing legacy readers and written in the current format. Existing automatic legacy upgrade also recognizes bundles without format.json. Older applications should not edit projects containing Canvas documents because they do not understand the new document type.
