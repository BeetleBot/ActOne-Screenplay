# UrAI Rust implementation

Scope: brainstorming, screenplay context, translation, and rephrasing. Preserve existing UI actions, provider configuration, preferences, and conversations. No autonomous screenplay authoring.

## Completion checklist

- [x] 1. Feature inventory and regression fixtures: every existing feature mapped.
- [ ] 2. Rust providers, credentials, streaming, cancellation: provider and transport tests; Windows/Linux verification recorded separately.
- [x] 3. Document contracts, context permissions, token budgets: outgoing requests respect scope.
- [x] 4. Shared transformation engine and inline previews: screenplay and prose; revision-safe accept/discard.
- [x] 5. Full-document translation and recovery: restart/resume/retry preserve completed work.
- [x] 6. Rust chat, tools, sessions, model switching: feature parity and scoped reads.
- [ ] 7. Evaluation and documentation: automated regression results and real-model/language review recorded separately.
- [x] 8. Retire old AI paths: no uncovered feature or active dependency remains.

## Existing feature inventory

| Area | Preserved behavior | Verification |
| --- | --- | --- |
| Chat | streaming, stop/Escape, retry, errors/copy, new/select/delete/clear sessions, titles, metadata | hook and UI tests |
| Composer | Enter/Shift+Enter, IME, input history, resizing, scroll | UI tests |
| Context | scene/ranges, characters, cursor, selection, full screenplay | Rust permission/budget tests |
| Rendering | Markdown, Fountain, copy/insert, reviewed proposals, activity | component tests |
| Providers | disabled, Ollama URL/discovery, named API entries/custom endpoints, model palette | adapter and UI tests |
| Instructions | custom system, presets, translation prompt, languages, task temperatures | configuration and request tests |
| Inline | lookup/synonyms, screenplay/prose rephrase/translate | transformation and preview tests |
| Whole document | duplicate/name/language/model, selected elements/tones, custom instructions, names, preferences | job tests |
| Progress | scene/part, preview, timing, rate limits, pause/resume/stop/background, failures/retry/open | job and UI tests |
| Project tools | read/search/stats/characters/locations/title/bookmarks; existing reviewed project actions | scoped tool tests |
| Compatibility | archive chat entry, saved providers/presets/history, shortcuts, RTL/fonts/themes | migration and regression tests |

## Verification log

- Baseline: 99 relevant frontend tests passed before implementation.
- UrAI rename: 53 frontend tests, TypeScript checks, and multilingual Rust stream regression passed.
- User-modified `Test-Files/Interstellar.actone` is outside the implementation changes.
- Real provider quality and Linux runtime checks are pending; they must not be represented as completed by mocked tests.

- Rust core: 9 tests passed for permission boundaries, budgets, UTF-8, completion, and keyed transformations.
- Frontend integration: 48 focused tests passed.
- Native credential dependency downloaded and compiled; Linux runtime verification remains pending.

- Inline preview regression: acceptance applies one edit; stale-document acceptance is refused.
- Real HTTP integration: two transport tests passed against a temporary local server (no production endpoint).
- Added Windows/Linux CI matrix and an opt-in live Tamil translation evaluation. CI execution and bilingual quality review remain pending.
- No running Ollama service or OPENAI_API_KEY was available during implementation. No live provider quality claims are made.

- Full frontend suite: 1,021 passed; 10 skipped. Production build passed. Lint: zero errors (existing warning baseline retained).
- Full Windows Rust suite: 182 unit tests and 7 doc tests passed. Separate real Windows Credential Manager create/read/delete regression passed using a temporary test entry.
- Stage 2 implementation and Windows verification are complete; Linux runtime gate remains pending CI execution.
- Stage 7 documentation and automated checks are complete; live model evaluation and bilingual quality review remain pending.
- Stages 5/6: native checkpoints, prior-revision recovery, destination checks, scoped read tools, native conversations and provider switching implemented and regression-tested.
- Stage 8: frontend inference providers and old Rust generation/cancellation paths retired; model discovery and existing application helpers retained.

- Follow-up: permission-gated automatic scene lookup, local Ollama scene indexing with cached checkpoints, header settings gear, and automatic inline transforms implemented. Focused frontend: 12 passed; Rust context: 4 passed. Live linguistic quality and Linux runtime remain pending.
