# Testing

ActOne uses **Vitest** with **jsdom** for all frontend tests.

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npx vitest

# With coverage
npx vitest --coverage
```

## Test Configuration

**`vitest.config.ts`**: jsdom environment, global test APIs, CSS disabled. Setup file `src/test-setup.ts` mocks `__TAURI_INTERNALS__` for Tauri API stubs.

## Test Structure

Tests are co-located with source files:

```
src/
├── parser/
│   ├── FountainParser.ts
│   └── parser.test.ts
├── editor/
│   ├── fountainSyntax.ts
│   ├── fountainSyntax.test.ts
│   ├── inlineAutocomplete.ts
│   ├── inlineAutocomplete.test.ts
│   └── useCodeMirror.test.ts
├── context/
│   ├── FileContext.tsx
│   ├── FileContext.test.tsx
│   ├── UIContext.test.tsx
│   ├── SprintContext.test.tsx
│   └── ...
├── components/
│   ├── OutlineView.tsx
│   ├── OutlineView.test.tsx
│   ├── ExportModal.test.tsx
│   └── ...
└── utils/
    ├── actone.test.ts
    ├── text.test.ts
    ├── window.test.ts
    └── perScriptSettings.test.ts
```

Approximately **25 test files** covering frontend, editor, parser, contexts, components, and utilities.

## Rust Backend Tests

Rust tests are embedded in source files (`#[cfg(test)]` modules):

- `pdf/fdx.rs` — 15 tests covering FDX export
- `pdf/fadein.rs` — 17 tests covering FadeIn export
- `pdf/parser/mod.rs` — 12 preprocessor tests, 25+ end-to-end parsing tests
- `pdf/rich_string/parser.rs` — 24 emphasis parsing tests
- `pdf/rich_string/tokenizer.rs` — 5 delimiter tokenizer tests

```bash
cd src-tauri && cargo test
```

## Test Patterns

### Frontend Component Tests

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("ComponentName", () => {
  it("renders correctly", () => {
    render(<Component />);
    expect(screen.getByText("expected text")).toBeDefined();
  });
});
```

### Context Tests

Context tests wrap components in provider trees and assert state changes via exposed actions.

### Parser Tests

Parser tests feed Fountain text and assert the resulting element types and positions:
```typescript
it("parses scene heading", () => {
  const result = parse("INT. HOUSE - DAY");
  expect(result.elements[0].type).toBe("SceneHeading");
});
```

### Rust Tests

```rust
#[test]
fn test_export() {
    let screenplay = parse("INT. HOUSE - DAY\n\nAction line.");
    let result = export(screenplay);
    assert!(result.contains("<ParagraphType>Scene Heading</ParagraphType>"));
}
```
