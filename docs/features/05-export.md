# Export

`Ctrl+P` opens the Export Modal with multiple format options.

## PDF Export

Professional-grade screenplay PDF generation using ActOne's custom krilla + cosmic-text engine.

### Configuration Options

**Page:**
- Paper size: US Letter or A4
- Font family: Courier Prime, Courier Prime Sans, or system fonts
- Per-element formatting (bold/italic/underline for each element type)
- Mirror scene numbers: Off, Left side only, Mirror (both sides)
- Include/exclude: sections, synopses, title page, scene colors
- Start each scene on a new page: forces a page break before every scene heading

**Watermarks:**
- Header text (centered, top)
- Footer text (centered, bottom)
- Center text or image (rotated 45 degrees or scaled)
- Configurable opacity for each watermark layer
- Font size and color for text watermarks
- Image watermark selector (PNG/JPG/BMP)

**Page Numbering:**
- Right-aligned page numbers with leading dot
- Title page is isolated (no number)

### Industry-Standard Layout

- 1.5" left margin, 1" top/bottom, 1" right (Letter)
- 60-character line width (6")
- Proper dialogue indentation
- Dual dialogue side-by-side columns
- Scene number placement
- Orphan/widow protection
- Sentence-boundary splitting for multi-page paragraphs
- (MORE) and (CONT'D) dialogue continuation

## Final Draft Export (.fdx)

Exports to Final Draft XML format, the industry-standard screenplay exchange format.

Features:
- All element types preserved
- Scene colors
- Dual dialogue
- Centered text
- Title page with proper positioning
- Empty lines for positioning

## FadeIn Export (.fadein)

Exports to the Open Screenplay Format v50, usable by FadeIn and other professional screenwriting software.

Features:
- Full style definitions (7 built-in styles)
- Character, location, and transition lists
- Revision colors
- UUID-based document identification
- Packaged as ZIP archive

## Fountain Export (.fountain)

Saves the raw Fountain text as a standalone `.fountain` file (extracting from `.actone` bundle if applicable).

## Remember Last Export Directory

The app remembers the last directory you exported to. When you export again (PDF, Fountain, FDX, or FadeIn), the file dialog opens in the same directory you used last time, making repeated exports to the same location more convenient. The last-used directory is persisted across app restarts.

## CSV Export (.csv)

Exports a spreadsheet-compatible breakdown of all scenes:
- Scene number
- Scene heading
- Page number
- Character list
- Word count per scene
- Scene color

### Watermark Settings Persistence

The watermark configuration (header/footer/center opacity and grayscale) is saved to the document settings whenever you close the watermark dialog — whether via X, Done, or clicking outside the panel. All three close paths persist the full configuration.

## FDX Scene Color Encoding

Scene colors in FDX export are written as standard 6-hex `RRGGBB` codes for compatibility with Final Draft and other screenwriting software.
