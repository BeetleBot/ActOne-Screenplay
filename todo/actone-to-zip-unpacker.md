# .actone to .zip Unpacker App

## Background

Due to WhatsApp renaming `.actone` files to `.actone.zip` (because the file starts with ZIP magic bytes `PK\x03\x04`), we moved the `ACT1` magic identifier from the end of the file to the beginning (see `src/utils/actone.ts`).

This means `.actone` files can no longer be renamed to `.zip` and extracted manually.

## Goal

Create a **separate standalone app** that converts `.actone` files to `.zip` for manual extraction.

## What the unpacker does

1. User provides an `.actone` file (via drag-drop or file dialog)
2. App reads the file bytes
3. Strips the 4-byte `ACT1` magic from the start
4. Saves the remaining bytes as a `.zip` file alongside the original (or prompts for save location)
5. User can then extract the `.zip` to get `.fountain` files, `settings.json`, `characters.json`, etc.

## Distribution options

### Option A: Single-page HTML (easiest)
A standalone `.html` file that uses `fflate` (or native JS `Uint8Array`) to strip the magic and trigger a download. No install needed — works in any browser.

### Option B: Simple Tauri app
A minimal Tauri app with the same logic, distributed as a small `.exe`/AppImage. Could be sold or offered free alongside ActOne.

### Option C: CLI tool
A small Rust CLI that takes `actone-to-zip input.actone` and produces `input.zip`.

## Technical notes

- Magic bytes: `ACT1` = `[0x41, 0x43, 0x54, 0x31]`
- After stripping the first 4 bytes, the remaining data is a standard ZIP archive readable by any ZIP tool
- The unpacker does NOT need `fflate` or any ZIP library — it just removes the prefix and renames the file
- For a browser-based (HTML) version: `input.slice(4)` on the `Uint8Array`, then create a download link with `type: "application/zip"` and `.zip` extension

## Not needed

- The unpacker doesn't need to know about ActOne internals (settings, manifest, etc.)
- It's purely a format converter: `.actone` → `.zip`
- All the complexity stays inside ActOne itself (which already handles both old end-magic and new start-magic formats in `unpackActoneBundle`)
