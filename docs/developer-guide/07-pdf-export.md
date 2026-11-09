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
  ├─ build_font_system() → FontSystem with bundled fonts + system fonts
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

## Prose export styles

`src/constants/proseExportStyles.ts` defines the five prose export choices; `src-tauri/src/pdf/prose/styles.rs` owns their rendering metrics. Keep IDs synchronized. Classic (Literata) is the UI/exporter default; Manuscript uses Courier Prime, Treatment uses Source Serif 4, Modern uses Inter, and Literary uses EB Garamond. Styles set the body size, side margins, line leading, heading sizes, and main-heading alignment. Measurement and rendering share those metrics, including residual blocks that cross pages.

`export_prose_pdf` and `generate_prose_pdf_bytes` accept optional `proseStyle` and use the same exporter. A selected preset supplies its own font rather than inheriting the screenplay editor font. Invalid IDs fall back to Classic metrics. Paper size, script fallbacks, and watermarks remain independent.

`get_prose_page_breaks` runs the Classic exporter on a blocking worker and returns one-based source block lines for pages after the first. StatusBar requests this after a debounce; document/text/paper changes invalidate earlier results. Counts match the generated Classic PDF, including wrapping and Markdown blocks, rather than estimating pages from source lines. Page navigation is at block granularity: a paragraph, table, or list spanning multiple pages repeats its source line. Footnotes are appended as endnotes and map to the end of the document. While calculation is pending the prose total shows an ellipsis.

Static regular/bold/italic/bold-italic fonts reside in `public/fonts/prose/`, with each upstream OFL license. `shared.rs` embeds them into the native font catalog; `fonts.css` registers browser faces. `scripts/bundle-prose-fonts.py` regenerates static instances from Google Fonts using fonttools, fixing optical size to 12 where available. Courier Prime continues using the existing bundle. The PDF subsets embed actual shaped faces so preview and recipients do not need local fonts installed.

Validation: `cargo test --manifest-path src-tauri/Cargo.toml --locked --test prose_styles` checks embedded family names, actual page counts, layout differences, and byte parity between regular export and pagination generation. Set `ACTONE_PROSE_STYLE_SAMPLES` to an output directory to retain sample PDFs for visual inspection.

### Prose images

Standalone Markdown image paragraphs containing imported `data:image/png;base64,...`, `data:image/jpeg;base64,...`, or `data:image/webp;base64,...` references become image blocks. The editor's image import/bundle codecs restore these data URLs before export; PDF rendering does not fetch URLs or read arbitrary image paths. Mixed inline image references retain alt text. Image decode errors fail the export rather than silently omitting a picture.

Images preserve aspect ratio and use `min(content_width / pixel_width, printable_height / pixel_height, 0.75)` as their point scale (96 px/in, no upscaling). They are centered, fit within each preset's side margins, and move intact to the next page when necessary. JPEG orientation is applied before sizing. The decoder bounds encoded input length, dimensions, and allocation. The same measurement and rendering path handles preview, saved PDF, and Classic pagination. Table header shading and cell padding also vary by preset. Modern uses Inter with 32 pt bold H1; all presets have individual heading sizes.

### Style spacing

Preset metrics independently control paragraph gaps, object gaps, and heading space before/after. Heading margins collapse against the previous block's trailing gap. Source blank-line counts are ignored. Manuscript follows the traditional 12 pt Courier double-spaced model with zero added paragraph gaps and half-inch first-line indents on continuing narrative paragraphs; tables use compact leading. Literary uses smaller first-line indents with no added paragraph gap. Classic, Treatment, and Modern use balanced spaced paragraphs. Image/table/code containers retain clear separation. Text coordinates represent line-box tops, including table cells and markers. `extra_source_blank_lines_do_not_change_pdf_spacing` compares exported bytes for different source whitespace counts across all five presets.

Formatting references: William Shunn's manuscript guide (https://www.shunn.net/format/pdf/ManuscriptFormat_Classic_WilliamShunn.pdf), Scrivener compile formats (https://www.literatureandlatte.com/blog/how-to-customize-compile-formats-in-scrivener-for-ipad-and-iphone), and Reedsy's manuscript guide (https://reedsy.com/studio/resources/book-manuscript-format/). Image/table spacing is an ActOne design choice; manuscript guidance primarily concerns narrative text.
