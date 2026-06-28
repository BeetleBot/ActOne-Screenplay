# Fade In (.fadein) Export Implementation Plan

## Research Summary

- The `.fadein` file is a **ZIP archive** containing a single `document.xml` file
- The XML is **Open Screenplay Format (OSF) 2.0**
- Converting from the existing ⁠Screenplay⁠ AST is straightforward since we already have FDX export as a template
- Reference implementation: https://github.com/rsdoiel/osf (Go library) + scripttool

## Files to Create/Modify

### 1. Add `zip` dependency to `src-tauri/Cargo.toml`
Add `zip = "2"` to `[dependencies]`.

### 2. Create `src-tauri/src/pdf/fadein.rs` — OSF XML generation
Modeled after `fdx.rs`. Contains:
- OSF XML template constant
- `escape_xml()` — XML string escaping
- `rich_to_fadein_text()` — Converts `RichString` to `<text bold="1" italic="1" underline="1">` elements
- `dialogue_to_fadein()` — Converts Dialogue (character → parenthetical → dialogue lines) to `<para>` blocks
- `element_to_fadein()` — Converts each `Element` variant to OSF `<para>` blocks:
  - `Heading` → `<para bookmark="Scene Heading"><text>...</text></para>`
  - `Action` → `<para bookmark="Action"><text>...</text></para>`
  - `Dialogue` → dispatches to `dialogue_to_fadein()`
  - `DualDialogue` → both character paras then both dialogue lines
  - `Lyrics` → `<para bookmark="Lyrics"><text>~...</text></para>`
  - `Transition` → `<para bookmark="Transition"><text>...</text></para>`
  - `CenteredText` → `<para bookmark="Action" alignment="Center"><text>...</text></para>`
  - `Section { text, depth }` → `<para bookmark="Outline N"><text>...</text></para>`
  - `Shot` → `<para bookmark="Shot"><text>...</text></para>`
  - `Synopsis` → skipped
  - `PageBreak` → skipped
- `build_title_page()` — Converts TitlePage to `<titlepage>` section
- `build_settings()` — Creates `<settings>` with US Letter defaults
- `pub fn export(screenplay: &Screenplay) -> String` — Main function
- Unit tests (matching fdx.rs test pattern)

### 3. Create `src-tauri/src/pdf/fadein_pack.rs` — ZIP packaging
- `pub fn pack(xml: &str) -> Vec<u8>` — Wraps XML into a .fadein ZIP
  - Creates a `std::io::Cursor<Vec<u8>>` with `ZipWriter`
  - Adds `document.xml` entry with `store` compression
  - Returns the bytes

### 4. Update `src-tauri/src/pdf/mod.rs`
- Add `mod fadein;` and `mod fadein_pack;`
- Add `pub use self::fadein::export as export_to_fadein;`

### 5. Update `src-tauri/src/lib.rs`
- Add `export_fadein` Tauri command (follows `export_fdx` pattern):
  ```rust
  #[tauri::command]
  fn export_fadein(fountain_text: String) -> Option<String> {
      let file = rfd::FileDialog::new()
          .add_filter("Fade In File", &["fadein"])
          .save_file()?;
      let screenplay = pdf::parse(&fountain_text);
      let fadein_xml = pdf::export_to_fadein(&screenplay);
      let packed = pdf::fadein_pack::pack(&fadein_xml);
      if fs::write(&file, &packed).is_ok() {
          return Some(file.to_string_lossy().to_string());
      }
      None
  }
  ```
- Add `generate_fadein_bytes` command for browser fallback:
  ```rust
  #[tauri::command]
  fn generate_fadein_bytes(fountain_text: String) -> Vec<u8> {
      let screenplay = pdf::parse(&fountain_text);
      let fadein_xml = pdf::export_to_fadein(&screenplay);
      pdf::fadein_pack::pack(&fadein_xml)
  }
  ```
- Register both in `invoke_handler`

### 6. Update `src/components/ExportModal.tsx`
- Change `ExportFormat` type to include `"fadein"`: `type ExportFormat = "pdf" | "fountain" | "fdx" | "fadein";`
- Add `handleExportFadeIn()` handler:
  ```typescript
  const handleExportFadeIn = async () => {
    try {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        await invoke("export_fadein", { fountainText: rawText });
      } else {
        const bundleName = filePath
          ? filePath.split(/[/\\]/).pop()?.replace(/\.(actone|fountain|txt)$/i, "") || "Untitled"
          : "Untitled";
        const scriptSuffix = isBundle ? `_${activeScriptName}` : "";
        const blob = new Blob([rawText], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bundleName}${scriptSuffix}.fadein`;
        a.click();
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch (e) {
      logger.error("export", "handleExportFadeIn failed", e);
    }
  };
  ```
- Add "Fade In" `ToggleButton` in the format group
- Add info panel for fadein format (between FDX and Fountain panels)
- Wire up in `handleExport()` dispatch

## Implementation Order
1. Cargo.toml — add zip dependency
2. fadein.rs — core OSF XML exporter
3. fadein_pack.rs — ZIP wrapper
4. mod.rs — module registration
5. lib.rs — Tauri commands
6. ExportModal.tsx — frontend integration
7. Build + test — verify everything compiles and works
