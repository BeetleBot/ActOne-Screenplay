# UrAI chat rewrite tasks

- [x] Confirm direction: assistant-ui with a Rust backend and fresh conversation history.
- [x] Add the pinned assistant-ui dependency.
- [x] Build the Phase 1 pane and connect Send, Stop, Retry, and History through the existing Rust bridge.
- [x] Give the new pane its own history namespace.
- [x] Verify streaming, Stop, Retry, and history isolation with automated tests.
- [x] Make the new pane the only UrAI entry point and remove the old pane.
- [x] Update the help and developer docs for the active pane.
- [ ] Verify Phase 1 in the desktop app with a live provider and check both supported platforms.
- [x] Phase 2 — redesign the pane using ActOne theme tokens and connect history, streaming, Stop, and Retry to the existing Rust bridge.
- [x] Phase 2 — carry fresh history across an active document's save or path change when the destination has no history.
- [x] Phase 3 — connect the live editor buffer, printed scene lookup, follow-ups, and clickable scene references.
- [x] Phase 4 — add explicit whole-screenplay reading, progress, Rust checkpoints, and overview reuse for the current draft.
- [ ] Verify phases 2–4 in the desktop app. See the manual checklist below.
- [x] Move desktop scene resolution to Rust using references from the current editor buffer.
- [x] Move desktop reply assembly, source and tool progress, and run status to Rust. The pane projects request-scoped snapshots.
- [x] Make Rust authoritative for durable desktop history and reject stale writes from another window.
- [x] Smoke-test the installed Ollama model with a synthetic screenplay prompt.
- [x] Phase 5 — connect screenplay search and ActOne statistics to the new pane. Resolve quoted searches in Rust and stop repeated model lookups.
- [x] Phase 6 — budget long chats in Rust, preserve earlier writer excerpts, and batch text updates by animation frame.
- [ ] Phase 6 — measure responsiveness with a live model and representative feature-length drafts.
- [x] Phase 7 — remove the superseded chat components and browser-side indexing hook.
- [x] Phase 7 — pass the full frontend and Rust suites, TypeScript, lint, and production build. Rerun the affected chat tests after the final quoted-search change.
- [ ] Phase 7 — run the release conversation with local and remote models and verify the desktop layout on Windows and Linux.

The local `gemma2:2b` model answered a synthetic scene question through Ollama. End-to-end desktop verification remains open. Rust owns durable history, index jobs, search and statistics lookups, context budgeting, and provider requests. ActOne's editor and analysis code supplies scene data and statistics. `useAIChat` still coordinates live turns for the pane.

## Manual verification before release

- [ ] Open UrAI in a narrow pane in light and dark themes. Check the header, History dropdown, close button, message bubbles, and composer. Tab through the controls and check that focus is visible.
- [ ] Send a message, scroll up while the reply streams, and stop it. Force a provider error and retry. Check that the prompt appears only once.
- [ ] Create two chats, select one from History, restart ActOne, and confirm the selected chat and its messages return. Save an unsaved draft while its pane is open and check that its chat carries forward.
- [ ] Open a draft with `15A` and `16`. Ask “Read the 16th scene,” then “Why does she leave?” Check that scene 16 is used and its button opens the correct heading.
- [ ] Edit scene 16 without saving and ask about the changed line. Edit it again while a reply is streaming and check the earlier-revision notice.
- [ ] Request “Read my whole screenplay.” Check the access prompt and progress line. Stop after a few scenes, repeat the request, and check that the completed scenes are reused. Restart ActOne and repeat to verify that checkpoints persisted.
- [ ] Ask a whole-story follow-up. Edit one scene, explicitly request another whole read, and check that the changed scene is processed and the completed unchanged scenes are reused.
- [ ] Switch scripts or providers while UrAI is working. Verify that stale replies stay out of the other script's chat and that the new provider needs screenplay access before receiving text.
- [ ] Ask UrAI to find an exact line in quotes. Open a returned scene and verify the line is present. Compare longest speech and scene page-span results against ActOne's analysis for the same draft.
- [ ] In a long conversation, establish a writer decision, add a correction, and continue after restarting ActOne. Check that UrAI respects both the correction and the active screenplay. Check that typing, scrolling, and Stop stay responsive.
