# Phase 4 — Polish

## Goal
Tidy up code quality, build configuration, and developer experience.

---

### 4.1 Replace console.warn/error with Structured Logger

**Technical**: ~12 `console.warn`/`console.error` calls scattered across production code. Create a lightweight logger module that can be toggled/enhanced without touching every call site.

**Layman**: Console logs are scattered everywhere. A real logger means we can control verbosity, add timestamps, or route to a file without hunting down each one.

---

### 4.2 Extract HelpModal Article Data (~450 lines)

**Technical**: `HelpModal.tsx` embeds ~450 lines of help article data inline. Extract to a separate data file (e.g., `src/data/helpArticles.ts`).

**Layman**: The help modal has a novel's worth of text mixed in with its component logic. Move the text to its own file so editing help content doesn't risk breaking the UI.

---

### 4.3 Bump TypeScript Target to ES2022

**Technical**: `tsconfig.json` targets `ES2020`. WebView2 (Windows) and modern webkitgtk (Linux) support `ES2022` natively. Bumping the target produces smaller, faster output by using native syntax.

Also add `vite.config.ts` build target: `build.target = "es2022"`.

**Layman**: Compiling to an older JS version means more code and slower performance. The browsers our app runs on support modern JS, so use it.

---

### 4.4 Refactor 585-line `generate_pdf()` Function

**Technical**: `pdf/export/pdf.rs:174-759` is one monolithic function. Split into focused sub-functions: page setup, scene rendering, dialogue rendering, page break handling.

**Layman**: A 585-line function does everything — set up pages, render scenes, handle dialogue, break pages. Split it into small focused pieces that are testable independently.

---

### 4.5 Add Lint + Typecheck Scripts

**Technical**: Add `"lint": "eslint src/"`, `"typecheck": "tsc --noEmit"`, and ESLint flat config to package.json. Currently no lint or typecheck exists.

**Layman**: There's no way to check for code quality or type errors with a single command. Add lint and type-check scripts so CI (and devs) can validate the codebase.
