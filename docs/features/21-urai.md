# UrAI writing companion

UrAI helps with brainstorming, understanding screenplay context, translation, and rephrasing. The desktop application runs inference orchestration in Rust; React handles interaction and editor previews. It does not autonomously author or modify screenplays.

## Architecture

- `src-tauri/src/urai/mod.rs`: window-scoped commands, cancellation registry, bounded read-tool loop.
- `provider.rs`: shared HTTP client, Ollama NDJSON and compatible Chat Completions SSE, incremental UTF-8, terminal-state validation, provider usage and errors.
- `types.rs`: document context contracts, explicit scope enforcement and conservative token estimates.
- `transform.rs`: keyed translation/rephrase results with exact coverage validation and one bounded format repair.
- `jobs.rs`: scene-based batches, rate-limit waits, pause/cancel, atomic checkpoints and original-source retries.
- `credentials.rs`: Windows Credential Manager / Linux Secret Service through keyring. Credentials are never saved in translation checkpoints.
- `storage.rs`: native conversation files keyed by document identity.
- `src/lib/urai.ts`: typed Tauri bridge; no browser inference fallback.
- `useAIChat.ts`: UI conversation state, legacy history import, destination/scope fingerprints, streaming and read-tool activity.
- `UrAITransform.tsx`: selected-text transformations with animated highlights and revision-safe automatic application for screenplay/prose.
- `translationEngine.ts`: Fountain analysis and native-job UI projection. Native work-item IDs remain authoritative across retries.

## Context and privacy contract

Chat asks permission before screenplay access. Permission is held in panel memory and resets on document/provider changes or revocation. Manual scene selection has been removed. After permission, local retrieval selects original scenes for specific scene numbers or matching questions; broad questions use cached summaries. Context and token configuration live in the header gear popover. Rust checks scope again before constructing prompts or returning tool results. No index of unshared scenes is included. Title-page/contact information and project notes are not automatically attached.

Each turn has a SHA-256 fingerprint of destination and exact shared context. Changing scope, shared source, or endpoint excludes prior turns from the next request. Older chats without provenance remain visible but are not automatically retransmitted. The UI explains that changing sharing starts fresh model context.

Full sharing means all parsed screenplay scenes, not the complete project bundle. A scene-less prose document uses selected-text sharing. Explicit budget errors ask writers to share less or set their model's supported limit; the service never silently truncates the current source/request.

## Provider contract

Commands: `urai_chat`, `urai_transform`, `urai_cancel`, `urai_run_job`, `urai_pause_job`, `urai_load_job`, `urai_load_sessions`, `urai_save_sessions`, `urai_store_secret`, `urai_read_secret`.

Ollama uses `/api/chat`, its native schema format and explicit context/output limits. Existing discovery commands remain in `ollama.rs`. OpenAI uses Chat Completions with native structured output for transformations; other compatible endpoints receive a JSON instruction and undergo the same application validation. Model-specific optional parameters are omitted for reasoning-model families.

Incomplete/truncated streams are errors, never successful replacements. Cancellation drops the in-flight future, including connection/read waits. Streaming events are emitted only to the calling window and correlated by request ID. Ordinary chat streams immediately; potential tool JSON is buffered until classified. Read tools are bounded to four generations and approved context. Existing TypeScript project-action handlers remain available to application integrations; the assistant does not invoke mutation tools.

Estimates use UTF-8 length plus an allowance for non-ASCII characters. They are budgeting estimates rather than exact tokenizer counts. Provider-reported input/output usage replaces estimates when available. Recent history is bounded; context/instructions/latest question and output allowance must fit. There is no model-generated summary cache in this version.

## Transformations

The input is a sequence of stable IDs, text, kind and speaker. Results must include every requested ID exactly once with nonempty single-line text. Order is irrelevant. Invalid output receives one format-repair attempt and then fails explicitly. Original blank lines and protected character cues stay outside inline generation. The frontend parses the proposed document and rejects suggestions that change element types.

Inline actions open a preview showing destination and a choice of selected text alone or nearby context. Generate, try again, accept, stop and discard are explicit. Acceptance checks the complete source document revision and applies one transaction. Source text is never replaced during generation.

Document translation preserves duplication/name, model/language choice, element/tone selection, instructions, character-name preference, and saved preferences. Dual-dialogue lines are included when dialogue is selected. Native batches are limited by scene, element count and estimated token size. Each committed batch is checkpointed before its progress event. Retry/resume reads the saved original elements, skips completed IDs and verifies the endpoint. The frontend also rejects recovery when target text differs from the last checkpoint. The active translation target is read-only while running or paused.

Checkpoints and conversations are local plaintext application data. API secrets use the native credential store; existing encrypted entries migrate when successfully read/saved. On Linux, an unlocked Secret Service is required. Flatpak explicitly permits `org.freedesktop.secrets`. Existing archives load the previous chat entry; new archives use `urai.json`.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml --locked`. Tests cover native wire decoding, HTTP request/error handling, permissions, budgets, keyed results, checkpoint recovery, preview acceptance/stale revisions, bridge cleanup and archive compatibility.

See `docs/URAI-TASKS.md` for actual completed checks and remaining platform/real-model verification. Passing mock/fixture tests does not establish linguistic quality. No live model is bundled. Test with representative local and OpenAI models, and review Tamil/mixed-language samples with a fluent reader before asserting production translation quality.

## Local indexing

The header index button batches each scene into at most 2,200 Unicode code points and asks the selected Ollama model for a short summary through the Rust chat transport. Completed scenes are checkpointed in localStorage with their original text, keyed by document, provider endpoint, and model. Pause/restart skips unchanged completed scenes; edits invalidate affected scenes. This cache is local plaintext and includes screenplay text. Retrieval uses scene numbers and lexical matching; summaries are model-generated reference data, not verified facts. Explicit scene requests retrieve original text. Oversized context is bounded in Rust and coverage is reported through activity and assistant instructions. Semantic embeddings and exhaustive multi-pass whole-story analysis are not implemented.

## Translation glossary

Whole-document setup first prepares a model-generated glossary using bounded 2,400-code-point source batches and a rolling glossary capped at 2,400 code points. The writer can edit the result before starting translation. Explicit custom instructions take precedence. The reviewed glossary is embedded in native job instructions, so resume/retry uses its checkpointed version. Generation is cancellable and source/model/language changes invalidate the draft. This additional preparation costs model calls and can miss details through rolling compression; it is not a verified character database.

Glossary output requests reserve 1,200 tokens and ask for at most 120 words. A token-limit failure is retried once with a 2,048-token reserve and an eight-entry instruction; other failures remain explicit. Setup uses dense element rows and wrapping preference controls; glossary progress/review remains within the dialog scroll area.
