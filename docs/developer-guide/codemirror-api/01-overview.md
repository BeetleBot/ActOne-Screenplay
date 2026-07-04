# CodeMirror 6 Integration Overview

ActOne's editor is built on **CodeMirror 6**, a highly extensible code editor framework. The integration consists of:

- **`useCodeMirror.ts`** — React hook managing editor lifecycle, extensions, and state
- **`fountainSyntax.ts`** — Custom StateField for Fountain line-type classification + decorations
- **`inlineAutocomplete.ts`** — Ghost-text autocomplete ViewPlugin
- **`emptyLineSelection.ts`** — ViewPlugin for blank line interaction

## Extension Architecture

```typescript
// Static extensions (always present)
const staticExtensions = [
    history(),                        // Undo/redo
    keymap.of([...defaultKeymap]),    // Default keybindings
    highlightSpecialChars(),
    drawSelection(),
    highlightActiveLine(),
    // ... more static extensions
];

// Dynamic extensions (via compartments for runtime toggling)
const compartments = {
    theme: new Compartment(),         // Light/dark theme
    fontSize: new Compartment(),      // Font size
    keymap: new Compartment(),        // Custom keybindings
    language: new Compartment(),      // Fountain syntax
    typewriter: new Compartment(),    // Typewriter scroll
    readOnly: new Compartment(),      // Read-only mode
    placeholder: new Compartment(),   // Placeholder text
};
```

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@codemirror/state` | ^6 | Editor state, StateField, StateEffect |
| `@codemirror/view` | ^6 | EditorView, ViewPlugin, decorations |
| `@codemirror/commands` | ^6 | Default keybindings, undo/redo |
| `@codemirror/language` | ^6 | Language support, syntax highlighting |
| `@codemirror/autocomplete` | ^6 | Autocomplete framework |
| `@codemirror/search` | ^6 | Search/replace panel |
