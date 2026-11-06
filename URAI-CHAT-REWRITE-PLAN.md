# UrAI chat rewrite implementation plan

Status — The new pane is active. See the [task tracker](URAI-CHAT-TASKS.md) for implemented work, remaining Rust ownership work, and release checks.

Date — 6 November 2026

## Intended experience

A simple chat pane for discussing the active screenplay. The writer can ask about a scene, talk through an idea, request a whole-screenplay read, and ask about screenplay statistics. Conversation resumes naturally after closing the pane or reopening the project.

Rust owns the backend wherever practical. assistant-ui supplies the React chat components and interaction primitives, styled to match ActOne. A thin Tauri adapter connects the interface to the Rust conversation service and the active editor. Screenplay access is read-only.

The pane contains a title, New chat, History, a message list, and a composer with Send and Stop. Responses can include small scene links. Provider configuration lives in Settings. One quiet status line describes ongoing work. The rewrite removes the separate indexing button, pin controls, token footers, tool logs, and scene-note management from the chat interface. Snapshot comparison is outside this plan.

## Architecture decisions

- Put provider communication, tool execution, scene resolution, search, index jobs, context budgeting, conversation compaction, and durable storage in Rust.
- Use the active editor buffer as the current screenplay source, including edits waiting for the normal save or parse cycle.
- Send document identity and revision with editor updates. Rust maintains a document snapshot and rejects stale or mismatched requests. Introduce incremental updates only if measurements justify them.
- Reuse existing Rust Fountain parsing and analysis where available. Verify parity against the editor, Characters, pagination, and X-Ray before moving remaining calculations. Keep a narrow adapter for any calculation whose authoritative implementation still lives in the frontend until parity is established.
- Keep model output untrusted. Validate tool names and arguments against one small JSON protocol. Read tools receive access only to the approved screenplay snapshot. Script content and retrieved data cannot grant permissions or introduce tools.
- Stream typed events for reply text, activity, sources, completion, cancellation, and errors. Correlate every event with its conversation and request. Tool protocol text is processed by the backend before rendering.
- Use assistant-ui for the message list, composer, reply rendering, and conversation controls. Style its primitives with ActOne's existing theme tokens and use MUI for surrounding app controls where appropriate.
- Start the integration with assistant-ui's ExternalStoreRuntime. Rust owns canonical conversations and durable history. A small frontend store projects Rust events into the message state consumed by assistant-ui. UI callbacks send commands through Tauri. Define ownership explicitly so a reply cannot be appended or persisted twice.
- Keep provider credentials, model requests, tool execution, context management, and indexing in Rust. The frontend adapter handles presentation and command delivery.
- Pin the selected assistant-ui version after the prototype passes and retain its required license notices. Verify its current APIs, React compatibility, and desktop WebView behavior during the prototype.

The integration approach follows assistant-ui's custom backend documentation. ExternalStoreRuntime accepts application-owned messages and callbacks, which fits a Rust-owned conversation service. The prototype below must verify the Tauri adapter and interaction behavior. [Custom runtime documentation](https://www.assistant-ui.com/docs/runtimes/custom/overview)

## Phase 1 — Prototype assistant-ui with Rust and establish contracts

### Work

1. Audit the current chat entry points, storage, providers, parsing, statistics, and editor integration. Use current code as the authority.
2. Define Rust types for documents, revisions, conversations, messages, source references, tool requests, and streamed events.
3. Separate a stable scene reference, its printed label, and its position in the current draft. Define how references are re-resolved after scene edits and moves.
4. Define numbered lookup behavior. Both “scene 16” and “the 16th scene” mean the scene printed as 16 whenever any scene has a printed number. Use position only in completely unnumbered drafts. Mixed drafts require a printed match. Report missing or duplicate labels clearly.
5. Define the screenplay-sharing permission and destination boundary. A provider change requires an explicit decision before earlier protected content is transmitted to that destination.
6. Create a synthetic screenplay containing scenes 15, 15A, and 16, repeated headings, long dialogue, multilingual text, and a title page.
7. Build a small assistant-ui pane connected to Rust through Tauri commands and events. Implement the frontend state projection and callbacks for Send, Stop, Retry, and selecting a conversation.
8. Prove streaming, cancellation, error recovery, and conversation loading first with controlled Rust responses, then with a configured provider and synthetic content. Check listener cleanup when the pane closes or the conversation changes.
9. Apply ActOne's typography, spacing, colors, and motion to the prototype. Check narrow panes, long replies, keyboard input, and scrolling on Windows and Linux. Expose only the controls required by the intended experience.

### Completion gate

The first reviewable milestone is a working assistant-ui pane backed by Rust. It streams a response, stops generation, retries an error, and loads a conversation without duplicate messages or lingering event listeners. Contract tests cover label resolution, missing and duplicate labels, document identity, stale revisions, and unauthorized access. A scene-16 request resolves correctly even when 15A occupies position 16. Record any integration blockers before building further features.

## Phase 2 — Complete the assistant-ui pane and Rust conversation service

### Work

1. Extend the validated assistant-ui prototype into the minimal interface described above. Match the existing theme tokens, typography, keyboard behavior, and reduced-motion preferences.
2. Implement the Rust conversation service and atomic local persistence. Store the selected conversation per screenplay and flush committed messages reliably.
3. Support ordinary conversation with streaming, Stop, Retry, and plain-language errors. Keep the original question available throughout each request.
4. Correlate replies with the originating conversation so switching scripts or chats cannot attach a response to the wrong place.
5. Batch the frontend projection of Rust events to keep typing and scrolling responsive. Use assistant-ui's scrolling primitives where they meet the required behavior. Follow new replies only when the writer is already near the bottom.
6. Start the rewrite in a separate conversation store with empty history. Handle unsaved documents becoming saved projects and project renames for conversations created in the rewrite.

### Completion gate

A conversation survives closing the pane and restarting the app. Stop cancels a pending provider request. Retry avoids duplicate committed messages. Script switching during generation preserves conversation ownership. Narrow panes and long messages remain readable in light and dark themes.

## Phase 3 — Implement predictable scene reading

### Work

1. Implement a Rust read-scenes tool with validated references and revision-aware source access.
2. Route clear scene requests directly to the tool. “Read scene 16 and summarise it” fetches scene 16 before generation, then gives the model the source and the question.
3. Distinguish showing original text from discussing it. A request for the original scene can display the source directly. A summary or analysis request produces a conversational answer grounded in that source.
4. Track the scenes being discussed. Resolve “that scene,” “this scene,” and “the next scene” using the conversation or cursor as appropriate. Ask a short clarification when the reference is ambiguous.
5. Return source references with the response and render them through an assistant-ui message component. Clicking a scene link re-resolves the current scene before navigating to it.
6. Refresh changed source for follow-up questions. When a change happens during generation, identify that the answer used an earlier revision rather than silently substituting different text.

### Completion gate

Test “read 16th scene and summarise me,” then “why does she leave?” against the 15A fixture. Verify the correct source, unsaved edits, reopening the chat, multi-scene requests, and edits during generation. Test through the actual pane and Rust boundary.

## Phase 4 — Add whole-screenplay reading on request

### Work

1. Implement a Rust index job invoked by an explicit whole-screenplay request such as “Read my whole screenplay.”
2. Read every scene in bounded parts, preserving scene references. Persist per-scene summaries and source fingerprints, then build a story overview with references back to those scenes.
3. Show one progress line such as “Reading screenplay · 24 of 80 scenes,” with Stop available throughout.
4. Checkpoint completed work atomically. A later explicit request can resume an interrupted job. An interrupted index retains an incomplete status.
5. Reuse the completed index. Mark changed scenes stale and refresh relevant stale entries during subsequent authorized discussion. A broad request that requires a full refresh should state that work before starting it.
6. Keep the index tied to screenplay identity, source revision, and provider provenance. Check sharing permissions before sending summaries to another destination.
7. Retrieve original passages for quotations and detailed claims. Track source coverage separately from generated summaries.

### Completion gate

Indexing begins only from an explicit request. Tests verify complete scene coverage, oversized scenes, cancellation, restart recovery, changed scenes, partial failure, and destination changes. A completed job accounts for every requested source part.

## Phase 5 — Add search and screenplay statistics

### Work

1. Implement a Rust search tool for exact dialogue, speaker names, scene headings, locations, and text. Return scene references and excerpts with bounded pagination.
2. Use the search results to fetch original scenes for questions about earlier events, continuity, character knowledge, and setup/payoff.
3. Implement a statistics tool using the same definitions as ActOne’s existing analysis. Cover characters, speeches, longest dialogue, scene page spans, locations, and X-Ray findings.
4. State measurement definitions where needed. A scene’s page span counts pages touched, and reading time is an estimate.
5. Keep multi-step lookup bounded. Preserve the original question, prevent repeated identical calls, and report any coverage limit when the backend reaches its budget.

### Completion gate

Compare tool results with ActOne’s Characters and X-Ray views on identical revisions. Test speaker filtering, long speeches, page boundaries, numbered labels, no matches, and search pagination. Requests to modify the screenplay have no executable write tool.

## Phase 6 — Make long conversations reliable and responsive

### Work

1. Retain recent exchanges verbatim and create a compact record of older discussion when approaching the model’s context limit.
2. Preserve writer decisions, unresolved questions, corrections, and scene references. Keep inferred story claims distinguishable from decisions made by the writer.
3. Store compaction boundaries and provenance so retry, restart, and provider changes cannot silently mix incompatible context. Retain the original transcript for local history.
4. Reserve context separately for the question, recent messages, older discussion, source evidence, and the answer. Recover from compaction failure without discarding the saved conversation.
5. Move substantial parsing, indexing, and storage work away from the UI thread. Cancel queued and active work promptly.
6. Measure local lookup time, typing responsiveness, scroll stability, time until the first visible status, and cancellation latency on representative drafts. Measure provider generation separately.

### Completion gate

A long conversation retains an early writer decision and a later correction after compaction and restart. A live edit updates follow-up evidence. Memory respects screenplay-sharing permissions. Slow providers and long documents leave typing, navigation, and Stop responsive.

## Phase 7 — Validate, migrate, and replace the old chat

### Work

1. Exercise the new pane with the writer’s configured local model and a supported remote provider using synthetic screenplay content. Test model-specific tool formatting, streaming, cancellation, and errors.
2. Perform visual checks on Windows and Linux, narrow and wide panes, light and dark themes, and keyboard-only interaction.
3. Verify fresh-history isolation and confirm conversations created during the rewrite survive the replacement.
4. Remove remaining obsolete chat-specific state and duplicate execution paths. The old pane is removed during Phase 1 so the new pane is the sole UrAI entry point.
5. Update developer documentation, user help, privacy descriptions, and any command references affected by the rewrite. Explain the final experience using writer-facing language.
6. Run the frontend test suite, TypeScript checks, lint, production build, and locked Rust tests. Record any intentionally skipped integration checks separately.

### Release gate

The following real conversation works from the normal app entry point.

1. “Read the 16th scene and summarise it.”
2. “Why does she leave?”
3. Edit the scene and ask “Does the change make her motivation clearer?”
4. Close and reopen the pane, then continue the discussion.
5. “Read my whole screenplay.”
6. “Where did I establish that she knows about the letter?”
7. “Which scene spans the most pages?”
8. Stop a slow reply and retry it.

Verify source numbering, current text, conversation continuity, index coverage, statistics, and read-only screenplay access. Automated tests establish behavior and data handling. Live-model evaluation establishes whether the actual replies and tool use are useful.

## Delivery order

Review the assistant-ui and Rust prototype at the end of phase 1. Complete phases 2–3 as the next milestone, providing persistent conversation and dependable scene discussion. Complete phases 4–5 next for whole-story discussion and analysis. Finish phases 6–7 before treating the rewrite as the production replacement.

The selected direction is assistant-ui for the chat interface and the existing Tauri Rust backend for the conversation service and screenplay tools. The phase-1 prototype validates their integration before the larger rewrite proceeds.
