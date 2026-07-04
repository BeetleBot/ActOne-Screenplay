# Font Commands

## `get_system_fonts`

Lists all font families available on the system.

```typescript
invoke<string[]>("get_system_fonts");
```

**Returns:** Alphabetically sorted array of font family names.

**Implementation:** Uses `cosmic-text` fontdb to scan system fonts, deduplicates family names.

---

## `get_fonts_for_script`

Returns recommended font families for a given script type (English or Indic).

```typescript
invoke<string[]>("get_fonts_for_script", { script: string });
```

**Parameters:**
- `script: string` — Script identifier (e.g., `"english"`, `"tamil"`, `"devanagari"`, etc.)

**Returns:** Sorted font families:
- **English:** Courier Prime Sans first, Courier Prime second, then rest alphabetically
- **Indic scripts:** Bundled Indic font families, plus `"___choose_other___"` sentinel

**Implementation:** Uses `FontCache` which scans system fonts and caches results per script type.

---

## `get_detected_scripts`

Detects which Indic scripts are present in the given text.

```typescript
invoke<string[]>("get_detected_scripts", { text: string });
```

**Parameters:**
- `text: string` — Text to analyze

**Returns:** Array of detected script identifiers:
- `"tamil"`, `"devanagari"`, `"telugu"`, `"kannada"`, `"malayalam"`, `"bengali"`, `"gujarati"`, `"gurmukhi"`, `"oriya"`

**Implementation:** Scans Unicode ranges for each script (e.g., Tamil: 0x0B80–0x0BFF).
