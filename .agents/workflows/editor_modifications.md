---
description: 
---

# Workflow: Modifying the Editor or Parser

**Description**: Follow these steps when making changes to the CodeMirror editor or Fountain parser.

1. **Understand the Synchronous Parsing Constraint**:
   Read `docs/ARCHITECTURE.md` before proceeding. Never re-introduce Web Workers for parsing, as they silently fail in Linux Tauri release builds. All parsing must remain synchronous in `src/context/FileContext.tsx`.

2. **Modify the AST**:
   If adding a new syntax feature, modify `src/parser/FountainParser.ts`. Ensure your parsing rules check `trimmed` lines properly. 

3. **Update CodeMirror Effects**:
   Any changes to the editor UI or scrolling logic must be handled through CodeMirror `StateEffect` and dispatched via `viewRef.current.dispatch()`. Look at `src/editor/useCodeMirror.ts` for existing examples.

4. **Verify React Context Renders**:
   Ensure `setRawText` correctly updates `parsedDoc` in `FileContext.tsx`. Remember that components consuming `useAppContext()` (like `SidebarViews.tsx`) will re-render automatically when the AST changes.

5. **Test in Browser**:
   Run `npm run dev` to test your changes in the Vite dev server if needed. 

6. **Test in Tauri Build**:
   Run `npm run tauri build` to compile the app and test the final native desktop behavior, if asked.
