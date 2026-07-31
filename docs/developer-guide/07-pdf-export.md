# PDF Export Engine

The PDF engine is the most complex part of ActOne, written in Rust using **krilla 0.7** for PDF generation and **cosmic-text 0.12** for text shaping and layout.

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
| Noto Sans Tamil (×2) | Regular, Bold | Tamil |
| Mukta (×2) | Regular, Bold | Hindi/Devanagari |
| Noto Sans Telugu (×2) | Regular, Bold | Telugu |
| Hind Guntur (×2) | Regular, Bold | Telugu |
| Noto Sans Malayalam (×2) | Regular, Bold | Malayalam |
| Baloo Chettan 2 (×2) | Regular, Bold | Malayalam |
| Noto Sans Kannada (×2) | Regular, Bold | Kannada |
| Baloo Tamma 2 (×2) | Regular, Bold | Kannada |
| Noto Sans Bengali (×2) | Regular, Bold | Bengali |
| Hind Siliguri (×2) | Regular, Bold | Bengali |
| Mukta Vaani (×2) | Regular, Bold | Gujarati |
| Hind Vadodara (×2) | Regular, Bold | Gujarati |
| Mukta Mahee (×2) | Regular, Bold | Gurmukhi |
| Baloo Paaji 2 (×2) | Regular, Bold | Gurmukhi |
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

### CSV

Simple CSV export of scene data (number, heading, page, etc.).

## Watermarks

Configurable watermarks with:
- **Header text** — centered at top, configurable opacity
- **Footer text** — centered at bottom, configurable opacity
- **Center image or text** — scaled to max 300×300 or rotated 45 degrees, configurable opacity
