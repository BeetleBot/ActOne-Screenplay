# PDF Export Engine

The PDF engine is the most complex part of ActOne, written in Rust using **krilla 0.7** for PDF generation and **cosmic-text 0.12** for text shaping and layout.

## Live export preview

ExportWindow opens as a separate resizable, maximized Tauri webview (`/?modal=export`) on Windows and Linux. A ready/document event handshake transfers the active script, settings, and UI font/paper selection, including unsaved text. Reopening export reuses and focuses that window with the current document. The export label has the same capabilities as other utility windows. Navigation and settings occupy the left 40%; the scrollable PDF preview occupies the right 60%. PDF.js renders bytes from the existing `generate_pdf_bytes` / `generate_prose_pdf_bytes` commands, using the same arguments as the final export. Settings changes refresh automatically after a 80 ms debounce. PDF.js uses one worker for the export session, warmed in parallel with native generation. A session cache retains up to three recent PDF byte buffers (16 MiB total); image watermarks bypass it so edits to the source image are reflected. The Rust exporters share a cached font catalog with independent shaping state; newly installed system fonts become available after restarting the app. Native requests are serialized and superseded results are ignored. Pages render near the viewport and fit the available width by default. Preview zoom ranges from 50% to 200% in 25% steps; Fit width resets to 100%. Zoom redraws existing pages without calling the native generator and enables horizontal scrolling when needed. Preview generation does not open a save dialog or write a file.

The preview loads the PDF.js legacy renderer and matching legacy worker to provide compatibility polyfills for WebKitGTK. Native Linux testing is still required for the supported runtime versions.

## Pipeline

```
Fountain Text
  │
  ▼
Rust Fountain Parser (src-tauri/src/pdf/parser/)
  │
  ▼
Screenplay AST (src-tauri/src/pdf/screenplay.rs)
  │
  ▼
PdfExporter (src-tauri/src/pdf/export/pdf.rs)
  ├─ build_font_system() → FontSystem with 44 embedded fonts + system fonts
  ├─ generate_pdf() → page-by-page rendering
  │   ├─ Orphan/widow protection
  │   ├─ Sentence-boundary splitting
  │   ├─ Dialogue (MORE)/(CONT'D) continuation
  │   ├─ Dual dialogue column layout
  │   ├─ Scene numbers (left/mirror/off)
  │   ├─ Scene colors
  │   ├─ Watermarks (header/footer/center text or image)
  │   └─ PDF outline (bookmarks from scene headings)
  │
  ▼
krilla Document → bytes
```

## Page Layout (`layout.rs`)

### Paper Sizes

| Size | Width (pt) | Height (pt) |
|------|-----------|-------------|
| US Letter | 612.0 | 792.0 |
| A4 | 595.0 | 842.0 |

### Margins (industry standard)

| Margin | Value |
|--------|-------|
| Top | 72pt (1") |
| Bottom | 72pt (1") |
| Left | 108pt (1.5") |
| Right | `page_width - 540pt` (variable to keep content width at 432pt / 6") |

### Element Indentation

| Element | Left Margin | Width |
|---------|------------|-------|
| Scene Heading / Action | 108pt (1.5") | 432pt (6") |
| Dialogue Character | 266.4pt (3.7") | 144pt (2") |
| Dialogue Parenthetical | 223.2pt (3.1") | ~172.8pt (2.4") |
| Dialogue Text | 180pt (2.5") | 252pt (3.5") |
| Dual Dialogue (left) | 144pt (2") | 288pt (4") |
| Dual Dialogue (right) | `page_width/2 + 36pt` | to right margin |

## Text Shaping (`elements.rs`)

### Font Architecture

Three tiers of fonts:
1. **41 embedded fonts** compiled into the binary via `include_bytes!`
2. **System fonts** loaded via cosmic-text's fontdb
3. **User-specified script font overrides** (`script_fonts: HashMap<String, String>`)

### Embedded Fonts

| Family | Styles | Coverage |
|--------|--------|----------|
| Courier Prime | Regular, Bold, Italic, BoldItalic | Screenplay standard |
| Courier Prime Sans | Regular, Bold, Italic, BoldItalic | Screenplay standard (sans) |
| Mukta Malar (×2) | Regular, Bold | Tamil |
| Mukta (×2) | Regular, Bold | Hindi / Devanagari |
| Hind Guntur (×2) | Regular, Bold | Telugu |
| Baloo Chettan 2 (×2) | Regular, Bold | Malayalam |
| Baloo Tamma 2 (×2) | Regular, Bold | Kannada |
| Hind Siliguri (×2) | Regular, Bold | Bengali |
| Hind Vadodara (×2) | Regular, Bold | Gujarati |
| Baloo Paaji 2 (×2) | Regular, Bold | Gurmukhi / Punjabi |
| Baloo Bhaina 2 (×2) | Regular, Bold | Oriya |
| Noto Sans Symbols 2 | Regular | Fallback symbols |

### Script Detection

The engine detects text scripts by Unicode range and assigns appropriate fonts:
- **English/Latin**: Courier Prime or Courier Prime Sans
- **Indic scripts**: Auto-detected (Tamil, Devanagari, Telugu, etc.) and mapped to bundled fonts
- **Neutral characters** (spaces, punctuation): Inherit from surrounding text

### RichString Processing

Text is parsed into `RichString` — a sequence of `Element { text, attributes }` where attributes include:
- **BOLD**
- **ITALIC**
- **UNDERLINE**
- **SANS** (switches to Courier Prime Sans)

Bold/italic/underline is parsed from Fountain markup (`*italic*`, `**bold**`, `_underline_`) following CommonMark delimiter rules.

## Pagination Algorithm

### Orphan/Widow Protection

- A scene heading must never be the last line on a page
- Must leave at least **2 lines** of the subsequent block on the same page as a heading
- Dialogue blocks must keep character cue with at least one line of text
- Action paragraphs must leave at least 2 lines on the current page and 2 on the next

### Dialogue Continuation

When dialogue splits across pages:
1. `(MORE)` is appended to the fragment on the current page
2. Character name + `(cont'd)` is printed at the top of the next page

### Sentence Splitting

When paragraphs must split mid-element, the engine prefers sentence boundaries (`.`, `?`, `!`). Falls back to word-level splitting for very long sentences.

### Dual Dialogue

Side-by-side dialogue is rendered in two columns:
1. Save vertical baseline (Y position)
2. Render left column, measure height
3. Reset to baseline
4. Render right column, measure height
5. Advance to `max(height_left, height_right)`

## Other Export Formats

### Final Draft (`.fdx`)

`src-tauri/src/pdf/fdx.rs` (396 lines) — Exports to Final Draft XML format:
- Maps all Element types to FDX paragraph types
- Handles scene colors, dual dialogue, centered text
- Generates title page with proper positioning
- 15 unit tests

### FadeIn (`.fadein`)

`src-tauri/src/pdf/fadein.rs` (708 lines) — Exports to FadeIn's Open Screenplay Format v50:
- Full style definitions (7 built-in styles)
- Character/location/transition lists
- Revision colors
- Packaged as ZIP via `fadein_pack.rs`
- 17 unit tests

## Watermarks

Configurable watermarks with:
- **Header text** — centered at top, configurable opacity
- **Footer text** — centered at bottom, configurable opacity
- **Center image or text** — scaled to max 300×300 or rotated 45 degrees, configurable opacity

Scene headings are recognized even when action follows immediately without a blank line. Trailing scene numbers (`#1#`, `#1A#`) and scene color tags are extracted as metadata in either order; the syntax is not printed in the heading.

Export startup uses the shared WindowLoading component, displaying the transparent ActOne SVG mark with a breathing pulse while the window receives its document. The mark follows the theme text color and disables its animation for reduced-motion preferences. No loading text is displayed.

## Desktop project paths and Flatpak access

Existing project paths retain their exact extension case; POSIX paths are compared case-sensitively, while drive-letter and backslash UNC paths use Windows comparisons. Only suggested new filenames are normalized.

In Flatpak, opening a project or choosing Save As calls `prepare_project_path` before any bundle upgrade or write. It checks sibling-file creation; if blocked, a portal directory picker requests access. Existing projects must match the selected file's device and inode. New destinations cannot overwrite an existing file in a different granted folder. Cancellation stops the operation. The granted path is retained for subsequent saves and sibling snapshots. No blanket filesystem permissions are added. Test this flow on native Linux outside Documents, including cancellation, a wrong folder, save, reopen and snapshots; Windows unit tests cannot verify portal grants.
