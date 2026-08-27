# ActOne Agent Instructions

## Overview

Cross-platform screenplay editor (Windows WebView2 & Linux webkitgtk) using React 19, TS, MUI 9, CodeMirror 6, Tauri v2, Vite 7, Vitest 4.

## Core Rules & Conventions

- **Source of Truth**: Current source code is authoritative over docs/TODOs. Read `docs/` ONLY when necessary (e.g. before major architecture/public behavior changes).
- **UI Guidelines**: Do NOT use left-side vertical colored accent lines/bars on scene items in Outline View or lists.
- **React/TS**: Use named exports, `interface` for objects, `type` for unions. Store cross-event state in React state + `useRef`. Icons belong in `src/components/Icons.tsx`. Fonts are bundled in `fonts.css`.
- **Tauri & Cross-Platform**: Guard Tauri API calls with `typeof window !== "undefined" && "__TAURI_INTERNALS__" in window`. Use `Path`/`PathBuf` in Rust. Normalize `\r\n` to `\n` on text read. Use `e.key` and `e.ctrlKey || e.metaKey` for keyboard shortcuts.
- **Muse AI**: Tools defined in `src/lib/aiTools.ts` & `src/hooks/useAIChat.ts`. Single JSON tool protocol. Treat model input/output as untrusted.
- **Updating Help Articles and Docuemntation:** After every feature addition / removal / changes, please update the `docs/` and  `src\data\helpArticles.tsx` accordingly if needed.
- **Test Suites:** After every feature addition / removal / changes, please add / update tests for them.

## Design System

`docs/DESIGN.md` is the canonical design reference (tokens, themes, components, layout patterns). `src/theme/muiTheme.ts` + `src/index.css` are the runtime sources of truth — keep them in sync.

## Commands

```bash
# Frontend: npm test | npm run typecheck | npm run lint | npm run build
# Rust: cargo test --manifest-path src-tauri/Cargo.toml --locked
```
