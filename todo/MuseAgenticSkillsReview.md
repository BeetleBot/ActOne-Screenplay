# Muse Agentic Skills Review

## Assessment

Muse is already partially agentic. It currently executes model-generated tools through `src/hooks/useAIChat.ts` and `src/lib/aiTools.ts`.

## Highest-Priority Improvements

### 1. Require approval before mutations

Model output can immediately modify todos, parking notes, scene headings, and character profiles. `parseToolCall()` also accepts bare JSON and pseudo-tool syntax.

Add tool risk levels:

- `read`: execute automatically
- `draft`: generate a proposal
- `write`: require explicit approval
- `destructive`: require approval plus confirmation

Every write should show the target, diff, affected scenes, and an Apply/Reject choice. This applies especially to `update_character_profile`, which is currently instructed to update every character even when unrelated to the user request.

Relevant files: `src/hooks/useAIChat.ts:183-249, 268-286, 471-535`, `src/lib/aiTools.ts:267-649`.

### 2. Replace heuristic tool parsing with one strict protocol

The current parser accepts fenced tool JSON, bare JSON objects, repaired JSON, and pseudo-calls.

This increases accidental execution and prompt-injection risk. Require one explicit structured format, validate arguments at runtime, reject unknown fields, and never execute tools from incomplete or failed streams.

### 3. Add document revision checks

Muse captures the document before generation and may apply changes after the user edits, switches files, or changes scripts.

Every request and proposal should include:

- `fileId`
- `scriptFileName`
- `scriptIndex`
- document revision or content hash
- stable scene anchor
- cursor position or line identity

Revalidate all of these immediately before applying a change. Reject stale proposals instead of silently modifying the wrong scene.

Relevant files: `src/hooks/useAIChat.ts:385-399`, `src/context/EditorContext.tsx:49-90`, `src/utils/sceneIndexer.ts:45-64`.

### 4. Use stable scene identifiers

Current tools call scenes by ordinal `id`, while Fountain also has explicit scene numbers. A screenplay with nonsequential scene numbers can be targeted incorrectly.

Give every scene an explicit stable identity containing:

- ordinal index
- Fountain scene number
- heading text
- line range
- generated stable ID

The model should receive both human-readable references and machine validation data.

### 5. Stop AI tools from bypassing per-script state

`add_project_todo` and `add_parking_note` write flat settings, while the application stores these per script. This can corrupt metadata in multi-script `.actone` bundles.

Expose typed domain operations such as:

- `addTodo(scriptFileName, todo)`
- `addParkingItem(scriptFileName, item)`
- `updateCharacterProfile(scriptFileName, profile)`
- `updateSceneMetadata(scriptFileName, sceneId, changes)`

Do not allow agent tools to mutate arbitrary settings objects.

Relevant files: `src/lib/aiTools.ts:456-505`, `src/context/ParkingContext.tsx`, `src/utils/perScriptSettings.ts`.

### 6. Create one transactional editor API

Scene replacement, tagging, rephrasing, and translation currently use different paths, captured ranges, and delayed timers.

Add a shared editor transaction service that provides:

- revision validation
- exact source-text validation
- atomic CodeMirror changes
- undo support
- preview generation
- clear failure results
- no timer-based application

### 7. Fix cancellation and request ownership

Muse chat and translation share one abort controller in `UIContext`. A delayed stream can also update the wrong file or session.

Use separate job IDs and abort controllers for chat, scene drafts, rephrase, translation, and agent actions.

Abort on unmount, check the request generation in every callback, and ignore stale results.

### 8. Bound context and tool output

Full history, screenplay indexes, notes, parking data, and profiles are sent repeatedly without token or size limits.

Add maximum conversation turns, maximum screenplay context, maximum tool calls per request, maximum result bytes, request timeouts, and response limits.

Use retrieval by scene, character, or search query instead of always sending everything.

### 9. Fix privacy and IPC boundaries

Muse sends screenplay data to remote providers, API keys are stored in `localStorage`, and Tauri HTTP permissions are broad. `PRIVACY.md` also contradicts current AI and crash-reporting behavior.

Add explicit AI-data consent, disclose remote transmission, restrict provider URLs, prefer OS-backed credential storage, and narrow Tauri capabilities. Never let Muse call arbitrary IPC or arbitrary URLs.

## Best New Muse Skills

### 1. Evidence-based screenplay Q&A

Return answers with scene, line, and quoted-text citations. Mark conclusions as explicit, inferred, or unknown.

### 2. Continuity checker

Detect character-name inconsistencies, prop disappearance, timeline conflicts, location changes, contradictory descriptions, and unresolved scene transitions. Keep it read-only initially.

### 3. Scene revision assistant

Generate a draft for a specific stable scene anchor, preserve heading and Fountain structure, show a diff, and require approval before applying.

### 4. Production breakdown assistant

Identify props, cast, vehicles, locations, costumes, makeup, VFX, SFX, stunts, and music. Show every matched occurrence and create reviewable production tags rather than globally matching words automatically.

### 5. Character bible builder

Generate profiles from quoted screenplay evidence. Separate facts from inference and update only selected characters after approval.

### 6. Story structure and pacing analyst

Compare scenes against structure templates, identify pacing problems, and propose outline changes without mutating the screenplay.

### 7. Controlled rewrite/search

Support replacements only when the user approves exact matches and the source text still matches the captured revision.

## Recommended Skill Contract

Each skill should declare:

- name and purpose
- read inputs
- write targets
- risk level
- runtime input schema
- evidence requirements
- preview format
- apply operation
- undo behavior
- idempotency rules
- document revision requirements
- failure and cancellation behavior

## Repository Readiness

Current verification:

- `npm run typecheck`: passed
- `npm test`: 38 files and 368 tests passed
- `npm run lint`: failed with 40 errors and 41 warnings
- `npm run format:check`: failed for 137 files
- No CI workflow currently verifies Windows and Linux

Before adding more agentic skills, implement approval, strict tool schemas, revision-safe transactions, per-script domain APIs, and the missing integration tests.

## Important Test Coverage To Add

Add tests for:

- malformed, partial, unknown, repeated, and multiple tool calls
- mutation approval and rejection
- stale document and stale scene proposals
- nonsequential Fountain scene numbers
- multi-script todo, parking, and profile persistence
- zero-based cursor handling
- provider streaming and cancellation races
- Unicode streaming through Ollama
- undoable CodeMirror mutations
- plain Fountain metadata behavior
- bundle save/reload of Muse history
