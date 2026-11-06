# UrAI writing companion

The chat footer switches between discovered Ollama models and saved OpenAI-compatible entries using the shared provider settings. The menu opens above the picker. Assistant replies use a soft bubble with an UrAI tag and render Markdown with GFM support. Rust filters tool protocol blocks echoed by the model, and the pane also filters them when rendering older transcripts. Original screenplay excerpts retain their plain-text formatting.

The pane supplies ActOne's computed statistics for explicit statistics requests. Rust ranks and returns those results and handles paginated scene, dialogue, and text lookups against the approved live draft. The lookup loop detects duplicate calls and asks for an answer using the evidence already available. When the transcript exceeds the model budget, Rust includes chronological excerpts of earlier writer turns alongside recent messages. Excerpts are derived from the saved transcript at request time. The frontend batches streamed text updates to one update per animation frame.

UrAI helps with brainstorming, understanding screenplay context, translation, and rephrasing. The desktop application runs inference orchestration in Rust; React handles interaction and editor previews. It does not autonomously author or modify screenplays.

`UrAIChatPane` connects assistant-ui to the existing Rust bridge for conversation, streaming, cancellation, retry, and history. It reads the active editor buffer after screenplay access is granted and renders scene references as navigation buttons. An explicit whole-screenplay request starts Rust indexing. Scene summaries are stored by document, provider, model, printed label, and source text. An overview is reused only for an identical scene sequence. A new explicit read after an edit reuses completed unchanged scenes. See `URAI-CHAT-TASKS.md` at the project root for progress and desktop verification.

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

Chat asks permission before screenplay access. Permission is held in panel memory and resets when the document or provider destination changes or the panel closes. The frontend reads the active CodeMirror document through a script-scoped registration and falls back to the active file text. The approved scene corpus is passed to Rust for local lookups, with raw Fountain text, parsed dialogue, scene labels, and line ranges. Provider prompts contain the evidence retrieved for the current request. Title-page text and project notes are outside the corpus.

Conversation replay is scoped to script, session, destination, and screenplay permission. A change in retrieved scenes or a live edit keeps eligible chat history. The last selected session is saved with the transcript. Rust budgets recent messages and older writer excerpts separately from screenplay evidence.

Rust is the durable history authority on desktop. Loads return a revision and writes commit atomically against that revision. A stale window receives a conflict instead of replacing another window's history. The pane keeps a projection for rendering and serializes its pending writes. Browser previews use local storage.

The History menu exposes a delete action for each conversation. Confirmation checks the active document identity. Deleting the selected conversation selects the next saved conversation or creates an empty one if the history is empty.

Rust coordinates the live desktop reply. It accumulates provider text, filters reasoning markup, collects scene sources and tool progress, and emits request-scoped `urai-turn` snapshots with run status. The completed snapshot also travels with the command response. The pane replaces its projected reply with each snapshot and owns composer input, conversation selection, and transcript save scheduling.

The desktop pane sends scene references to the Rust resolver before generation. Numbered requests, including ordinal wording such as “the 16th scene,” use the printed label. A draft with no printed labels uses scene order. Mixed drafts require a printed match for numbered requests. The resolver also handles ranges, the cursor, and prior-scene references. Rust emits verified source references and coverage for editor navigation. Large source reads use bounded evidence extraction across every part or return an explicit budget error.

A direct request to read or show one scene renders its original Fountain locally in the transcript. Follow-up analysis uses the current source and a short reference to the earlier display. For model-assisted screenplay lookups, Rust buffers responses until it can distinguish tool calls from prose, including JSON fences preceded by a short model preamble.

## Provider contract

Commands: `urai_chat`, `urai_transform`, `urai_cancel`, `urai_run_job`, `urai_pause_job`, `urai_load_job`, `urai_load_sessions`, `urai_save_sessions`, `urai_store_secret`, `urai_read_secret`.

Ollama uses `/api/chat`, its native schema format and explicit context/output limits. Existing discovery commands remain in `ollama.rs`. OpenAI uses Chat Completions with native structured output for transformations; other compatible endpoints receive a JSON instruction and undergo the same application validation. Model-specific optional parameters are omitted for reasoning-model families.

Incomplete streams return an error. Cancellation drops the in-flight future, including connection and read waits. Streaming events are emitted only to the calling window and correlated by request ID. Plain conversation streams immediately. Rust buffers screenplay-assisted replies to separate lookup JSON from model prose. Chat supports scene reads, batch reads and comparisons, heading and location search, literal text search, speaker-specific dialogue search, and statistics. The bounded lookup loop keeps the original question in each generation. Statistics reuse live X-Ray and screenplay pagination, with per-scene page spans defined as pages touched. The pane displays scene links and provides read-only screenplay access.

Estimates use UTF-8 length plus an allowance for non-ASCII characters. Provider-reported input/output usage replaces estimates when available. Recent history is bounded, with local extractive memory for longer conversations.

## Transformations

The input is a sequence of stable IDs, text, kind and speaker. Results must include every requested ID exactly once with nonempty single-line text. Order is irrelevant. Invalid output receives one format-repair attempt and then fails explicitly. Original blank lines and protected character cues stay outside inline generation. The frontend parses the proposed document and rejects suggestions that change element types.

Inline actions open a preview showing destination and a choice of selected text alone or nearby context. Generate, try again, accept, stop and discard are explicit. Acceptance checks the complete source document revision and applies one transaction. Source text is never replaced during generation.

Document translation preserves duplication/name, model/language choice, element/tone selection, instructions, character-name preference, and saved preferences. Dual-dialogue lines are included when dialogue is selected. Native batches are limited by scene, element count and estimated token size. Each committed batch is checkpointed before its progress event. Retry/resume reads the saved original elements, skips completed IDs and verifies the endpoint. The frontend also rejects recovery when target text differs from the last checkpoint. The active translation target is read-only while running or paused.

Checkpoints and conversations are local plaintext application data. API secrets use the native credential store; existing encrypted entries migrate when successfully read/saved. On Linux, an unlocked Secret Service is required. Flatpak explicitly permits `org.freedesktop.secrets`. Existing archives load the previous chat entry; new archives use `urai.json`.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml --locked`. Tests cover native wire decoding, HTTP request/error handling, permissions, budgets, keyed results, checkpoint recovery, preview acceptance/stale revisions, bridge cleanup and archive compatibility.

See `docs/URAI-TASKS.md` for actual completed checks and remaining platform/real-model verification. Passing mock/fixture tests does not establish linguistic quality. No live model is bundled. Test with representative local and OpenAI models, and review Tamil/mixed-language samples with a fluent reader before asserting production translation quality.

## Local indexing

An explicit whole-screenplay request starts the Rust indexing job. It summarizes bounded source parts using the selected provider and stores completed scene summaries and overviews in application data. Output-limit failures retry the affected part with more output headroom within the model's context budget. A retry skips unchanged scenes with valid checkpoints. An overview requires a matching ordered scene corpus. The indexing request returns the saved overview directly. Follow-up requests use a bounded overview and can retrieve original passages for quotes and detailed questions.

## Translation setup

Whole-document setup starts the translation job directly from Start Translation. There is no glossary generation or review step. The modal passes the writer's trimmed custom instructions to `runTranslationJob`; native job checkpoints retain those instructions for resume/retry. The native job processes sequential batches within scene boundaries, with at most eight elements per provider request and a context-based input budget. Successful batches are checkpointed for resume/retry.
