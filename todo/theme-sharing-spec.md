# Specification: Custom Theme Sharing (.actheme vs. Visual PNG Card)

This document outlines the detailed technical implementation specs for adding custom theme sharing to ActOne. It details two approaches: the standard text-based `.actheme` file format, and a premium visual PNG Theme Card format that embeds theme configuration inside image metadata.

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

### 2. Rust Backend Implementation (`src-tauri/src/lib.rs`)

Add these commands to open and save theme files:

```rust
use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn save_theme_dialog(content: String, default_name: String) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("ActOne Theme", &["actheme"])
        .set_file_name(&default_name)
        .save_file()?;
    
    let mut file_path = file;
    file_path.set_extension("actheme");
    
    let path_str = file_path.to_string_lossy().to_string();
    if fs::write(&file_path, content).is_ok() {
        Some(path_str)
    } else {
        None
    }
}

#[tauri::command]
fn import_theme_dialog() -> Option<serde_json::Value> {
    let file = rfd::FileDialog::new()
        .add_filter("ActOne Theme", &["actheme"])
        .pick_file()?;
        
    let path_str = file.to_string_lossy().to_string();
    let content = fs::read_to_string(&file).ok()?;
    
    Some(serde_json::json!({
        "path": path_str,
        "content": content
    }))
}
```

Make sure to register these in your `tauri::Builder` inside `run()`:
```rust
.invoke_handler(tauri::generate_handler![
    save_theme_dialog,
    import_theme_dialog,
    // other handlers...
])
```

### 3. React Frontend Validation & Integration

When importing, the frontend must validate the shape to prevent code injection or crashes:

```typescript
interface CustomTheme {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    editor: string;
    text: string;
    accent: string;
    sidebar: string;
    button: string;
  };
}

function validateTheme(data: any): data is Omit<CustomTheme, 'id'> {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.name !== 'string' || data.name.trim().length === 0) return false;
  if (typeof data.isDark !== 'boolean') return false;
  
  const colors = data.colors;
  if (!colors || typeof colors !== 'object') return false;
  
  const requiredColors = ['editor', 'text', 'accent', 'sidebar', 'button'];
  const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  
  for (const key of requiredColors) {
    if (typeof colors[key] !== 'string' || !hexColorRegex.test(colors[key])) {
      return false;
    }
  }
  return true;
}

// In ThemeManagerWindow:
const handleImportTheme = async () => {
  try {
    const result = await invoke<{ path: string; content: string } | null>("import_theme_dialog");
    if (!result) return;
    
    const parsed = JSON.parse(result.content);
    if (!validateTheme(parsed)) {
      alert("Invalid theme file structure.");
      return;
    }
    
    const newTheme: CustomTheme = {
      id: "theme-" + Math.random().toString(36).substring(2, 9),
      name: parsed.name,
      isDark: parsed.isDark,
      colors: parsed.colors,
    };
    
    // Add to state and save
    const updated = [...customThemes, newTheme];
    setCustomThemes(updated);
    engineSetTheme({ customThemes: JSON.stringify(updated) });
  } catch (err) {
    console.error("Theme import failed", err);
    alert("Failed to parse theme file.");
  }
};
```

---

## Option B: Visual PNG Theme Card (Embedded Metadata)

This approach creates a visually appealing preview card of the theme in PNG format and encodes the configuration payload inside custom metadata chunks.

### 1. PNG `tEXt` Chunk Helper Specifications
A PNG file consists of a signature followed by series of chunks. A `tEXt` chunk stores unstructured text data matching a key.
Structure of a `tEXt` chunk:
- **Chunk Length** (4 bytes, Big-Endian)
- **Chunk Type** (4 bytes, ASCII `"tEXt"`)
- **Keyword** (1-79 bytes, ISO-8859-1 text, null-terminated)
- **Text** (Remaining bytes, ISO-8859-1 text, containing the stringified theme JSON)
- **CRC** (4 bytes, cyclic redundancy check computed on the type and data fields)

Here is a complete, dependency-free TypeScript implementation for chunk reading/writing:

```typescript
// Helper to calculate CRC-32 (required for valid PNG structure)
const makeCRCTable = () => {
  let c;
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }
  return crcTable;
};
const crcTable = makeCRCTable();

const calculateCRC = (buf: Uint8Array): number => {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
};

/**
 * Injects a tEXt metadata chunk into a raw PNG byte array.
 * Typically inserted right after the initial IHDR chunk.
 */
export function injectPngTextMetadata(pngBytes: Uint8Array, key: string, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const valBytes = encoder.encode(value);
  
  // Data layout: Keyword (null-terminated) + Text Value
  const dataSize = keyBytes.length + 1 + valBytes.length;
  const chunkBytes = new Uint8Array(4 + 4 + dataSize + 4); // Length(4) + Type(4) + Data(dataSize) + CRC(4)
  
  // 1. Length (Big-Endian)
  const view = new DataView(chunkBytes.buffer);
  view.setUint32(0, dataSize);
  
  // 2. Type "tEXt"
  chunkBytes.set(encoder.encode("tEXt"), 4);
  
  // 3. Keyword + Null Byte + Value
  chunkBytes.set(keyBytes, 8);
  chunkBytes[8 + keyBytes.length] = 0; // null separator
  chunkBytes.set(valBytes, 8 + keyBytes.length + 1);
  
  // 4. Calculate CRC (on Type + Data fields)
  const crcInput = chunkBytes.subarray(4, 8 + dataSize);
  const crc = calculateCRC(crcInput);
  view.setUint32(8 + dataSize, crc);

  // Find insert position: Right after IHDR chunk
  // IHDR chunk: Signature (8 bytes) + IHDR length (4 bytes) + IHDR type (4 bytes) + IHDR data (13 bytes) + IHDR CRC (4 bytes) = 33 bytes
  const insertIndex = 33;
  
  const result = new Uint8Array(pngBytes.length + chunkBytes.length);
  result.set(pngBytes.subarray(0, insertIndex), 0);
  result.set(chunkBytes, insertIndex);
  result.set(pngBytes.subarray(insertIndex), insertIndex + chunkBytes.length);
  
  return result;
}

/**
 * Extracts tEXt metadata values from a PNG byte array.
 */
export function extractPngTextMetadata(pngBytes: Uint8Array, targetKey: string): string | null {
  const view = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 8; // Skip PNG Signature
  
  while (offset < pngBytes.length) {
    if (offset + 8 > pngBytes.length) break;
    const length = view.getUint32(offset);
    const type = decoder.decode(pngBytes.subarray(offset + 4, offset + 8));
    
    if (type === "IEND") break;
    
    if (type === "tEXt") {
      const chunkData = pngBytes.subarray(offset + 8, offset + 8 + length);
      // Find null separator
      let nullIndex = -1;
      for (let i = 0; i < chunkData.length; i++) {
        if (chunkData[i] === 0) {
          nullIndex = i;
          break;
        }
      }
      
      if (nullIndex !== -1) {
        const keyword = decoder.decode(chunkData.subarray(0, nullIndex));
        if (keyword === targetKey) {
          return decoder.decode(chunkData.subarray(nullIndex + 1));
        }
      }
    }
    
    offset += 12 + length; // Skip Length(4) + Type(4) + Data(length) + CRC(4)
  }
  
  return null;
}
```

### 2. Export Card Flow (Canvas Generation)
When exporting, the app will generate a visual card layout:

```typescript
const generateThemeCardBlob = (themeName: string, colors: any): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;

    // 1. Background (Editor Color)
    ctx.fillStyle = colors.editor;
    ctx.fillRect(0, 0, 600, 400);

    // 2. Sidebar representation
    ctx.fillStyle = colors.sidebar;
    ctx.fillRect(0, 0, 180, 400);

    // 3. Highlight/Accent circles
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(350, 150, 60, 0, Math.PI * 2);
    ctx.fill();

    // 4. Accent text & UI accents (Button Color)
    ctx.fillStyle = colors.button;
    ctx.fillRect(240, 260, 220, 45); // Representing an active button

    ctx.fillStyle = colors.text;
    ctx.font = "bold 24px var(--font-ui)";
    ctx.fillText(themeName, 210, 80);

    ctx.font = "italic 14px var(--font-ui)";
    ctx.fillText("ActOne Theme Card", 210, 110);
    
    // Watermark
    ctx.fillStyle = colors.text;
    ctx.font = "10px var(--font-ui)";
    ctx.fillText("DRAG TO IMPORT IN ACTONE", 450, 380);

    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
};
```

Combining the blob generation and injecting the metadata:
```typescript
const handleExportThemeCard = async (theme: CustomTheme) => {
  const blob = await generateThemeCardBlob(theme.name, theme.colors);
  const arrayBuffer = await blob.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);
  
  // Inject metadata
  const payload = JSON.stringify({ name: theme.name, isDark: theme.isDark, colors: theme.colors });
  const finalBytes = injectPngTextMetadata(rawBytes, "ActOneTheme", payload);
  
  // Send via Tauri dialog (requires rust command accepting binary vectors)
  await invoke("save_file_binary", { 
    path: `${theme.name}.png`, 
    bytes: Array.from(finalBytes) 
  });
};
```

---

## Conclusion & Integration Roadmap

1. **Phase 1: Backend Dialogs**: Modify `lib.rs` to expose the dialog options.
2. **Phase 2: Text-Based Sharing**: Wire up `.actheme` importing and exporting to confirm baseline functionality.
3. **Phase 3: PNG Card Generation**: Implement the offscreen canvas layout and PNG chunk parser helpers in JS/TS.
4. **Phase 4: Drag & Drop Support**: Add a drag-and-drop file drop handler to the theme window to allow users to load PNG files simply by dragging them into the theme selector layout.
