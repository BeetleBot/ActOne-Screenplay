# Refactoring Plan

## Phase 1: Backend (Rust) - Fix Warnings
- [x] Fix `clippy` warnings in `src-tauri/src/pdf/export/pdf.rs` (collapsible `if`)
- [x] Fix `clippy` warnings in `src-tauri/src/pdf/rich_string.rs` (wrong `self` convention on `to_uppercase`)
- [x] Fix `clippy` warnings in `src-tauri/src/structures.rs` (collapsible `if`)
- [x] Fix `clippy` warnings in `src-tauri/src/lib.rs` (collapsible `if`, redundant `Ok(_)` pattern matching, too many arguments)

## Phase 2: Backend (Rust) - Break down monolithic files
- [x] Refactor `src-tauri/src/pdf/export/pdf.rs` (extract layout, title page, elements logic)
- [x] Refactor `src-tauri/src/pdf/parser.rs` (extract parsing logic for different block types)
- [ ] Refactor `src-tauri/src/pdf/rich_string.rs` (separate data structures from rendering calculations)

## Phase 3: Frontend (React) - Break down monolithic files
- [ ] Refactor `src/context/AppContext.tsx` (split into `FileContext`, `EditorContext`, `SettingsContext`)
- [ ] Refactor `src/components/FountainEditor.tsx` (extract CodeMirror setup to custom hooks)
- [ ] Refactor `src/App.tsx` (extract `MainLayout` and `ModalManager`)
