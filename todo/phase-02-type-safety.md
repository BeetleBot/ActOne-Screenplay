# Phase 2 — Type Safety

## Goal
Remove escape hatches that hide real bugs, making the codebase self-documenting and catching errors at compile time.

---

### 2.1 Remove `#![allow(dead_code)]` in pdf/mod.rs

**Technical**: The blanket allow hides ~10 unused functions. Remove it and either delete the dead functions or add `#[allow(dead_code)]` on individual items with documented rationale.

**Layman**: A "shut up about errors" flag for an entire file is masking problems we should know about. Each unused function should either be deleted or have a clear reason for existing.

---

### 2.2 Replace `as any` Casts (~39 locations)

**Technical**: Focus on context files and Icons first where `any` bypasses the most valuable type checking. Replace with proper interfaces, generics, or type assertions.

**Layman**: "Trust me bro" casts undermine TypeScript's whole purpose. Fixing these means the compiler can actually catch real bugs.

---

### 2.3 Add `forceConsistentCasingInFileNames` to tsconfig

**Technical**: Windows is case-insensitive for filenames; Linux is case-sensitive. Without this flag, imports that differ only in case work on Windows but fail silently on Linux. Enabling this catches the mismatch at compile time.

**Layman**: Windows doesn't care if you write `import Foo` vs `import foo`, but Linux does. This setting catches those mismatches before they reach users.
