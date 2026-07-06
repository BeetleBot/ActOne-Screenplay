# Specification: Custom Theme Sharing (.actheme vs. Visual PNG Card)

This document outlines the technical implementation details for adding custom theme sharing to ActOne. It details two approaches: the standard text-based `.actheme` file format, and a premium visual PNG Theme Card format that embeds theme configuration inside image metadata.

---

## Option A: Standard `.actheme` File (JSON)

This is the standard approach using a structured JSON payload with a custom file extension (`.actheme`).

### 1. Data Schema
The shared file is a plain text JSON file containing the essential properties of a custom theme.

```json
{
  "$schema": "https://actone.app/schemas/theme.v1.json",
  "name": "Midnight Retro",
  "isDark": true,
  "colors": {
    "editor": "#121314",
    "text": "#e0e0e0",
    "accent": "#ff3366",
    "sidebar": "#1b1c1e",
    "button": "#ff3366"
  }
}
```

### 2. Export Workflow
1. User clicks the **Export** button next to a custom theme in the Theme Manager.
2. The frontend serializes the theme metrics into a formatted JSON string.
3. The frontend invokes a Tauri Rust command `save_theme_dialog(content, default_name)`.
4. Tauri opens the native file dialog filtered for `.actheme` extensions.
5. Tauri writes the file to the chosen path on disk.

### 3. Import Workflow
1. User clicks the **Import** button in the Custom Themes panel.
2. The frontend invokes a Tauri Rust command `import_theme_dialog()`.
3. Tauri opens the native file dialog filtered for `.actheme` extensions.
4. If a file is picked, Tauri reads its contents as a string and returns it to the frontend.
5. The frontend parses the JSON and validates the schema:
   - Validates that `name` is a non-empty string.
   - Validates that `isDark` is a boolean.
   - Validates that `colors` contains all five required keys (`editor`, `text`, `accent`, `sidebar`, `button`) as valid hex strings.
6. Upon validation success, it creates a unique ID (e.g., `theme-uuid`), appends it to the global `customThemes` array, saves it to `localStorage`, and updates the engine state.

---

## Option B: Visual PNG Theme Card (Embedded Metadata)

This is a premium, shareable approach. It generates a beautifully styled PNG image card representing the theme. The theme's raw JSON data is hidden directly inside the PNG's metadata chunks (specifically a PNG `tEXt` chunk), allowing users to share the image visually on social media or forums.

### 1. PNG Metadata Concept
PNG files are composed of structured chunks (e.g., `IHDR`, `IDAT`, `IEND`). The PNG specification allows custom textual metadata chunks called `tEXt` chunks. 
- A `tEXt` chunk stores key-value pairs of plain text (e.g., Keyword: `"ActOneTheme"`, Text: `{...}`).
- This allows us to pack the raw theme JSON string into the image file itself without altering the visible image pixels.

### 2. Export Workflow (Generating the Card)
1. **Render Preview Card on Canvas**:
   - Create an offscreen HTML5 `<canvas>` element (e.g., 600x400 pixels).
   - Draw a stylized layout showing:
     - The custom theme name in its typography.
     - Swatches or mockups showing the `editor` background, `sidebar` background, `text` color, and `accent` highlight.
     - A small "ActOne Theme Card" brand watermark.
2. **Convert Canvas to Blob**:
   - Call `canvas.toBlob(blob => { ... }, 'image/png')`.
3. **Embed Theme JSON**:
   - Using a lightweight PNG chunk helper (or writing a simple array buffer manipulation script), inject a `tEXt` chunk:
     - **Keyword**: `ActOneTheme`
     - **Value**: Compressed or raw JSON payload of the theme.
4. **Save File via Tauri**:
   - Send the modified binary array buffer to a Tauri Save Dialog command to write it to disk as `${themeName}.png`.

### 3. Import Workflow (Reading the Card)
1. **User Action**:
   - The user can import by clicking **Import** and selecting the PNG file, or by dragging and dropping the PNG file directly into the Custom Themes panel.
2. **Read Binary Buffer**:
   - Retrieve the file's binary array buffer using a standard file reader or Tauri's read binary API.
3. **Parse PNG Chunks**:
   - Search the array buffer for the `tEXt` chunk identifier.
   - Read the keyword. If it matches `ActOneTheme`, parse the associated text value.
4. **Validation and Import**:
   - Parse the extracted JSON string and run the same validation suite as Option A.
   - Append the theme to the custom themes list.

---

## Comparison Summary

| Metric | Option A: `.actheme` File | Option B: Visual PNG Card |
| :--- | :--- | :--- |
| **User Experience** | Clean, developer-oriented, standard utility. | Premium, visually satisfying, highly shareable. |
| **Implementation Complexity** | **Low**. Uses simple JSON parsing and basic Tauri dialog handlers. | **Medium**. Requires canvas drawing logic and PNG binary chunk injection/parsing. |
| **Shareability** | Low. Sharing a raw configuration file on social media is less engaging. | **High**. Sharing an image preview of the actual theme is highly engaging. |
| **Robustness** | **High**. Near-zero chance of corruption or parsing failures. | **Medium**. Compression, resizing, or social media CDNs converting the image to JPEG may strip metadata. |

### Recommendation
Implementing **Option A (`.actheme` JSON)** first provides a robust, zero-friction foundation. **Option B (Visual PNG Cards)** can be built on top of Option A as an optional, high-fidelity export feature (e.g., "Export as Image Card") using the same JSON parser.
