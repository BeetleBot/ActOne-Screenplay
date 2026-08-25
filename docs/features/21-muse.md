# Muse AI Assistant

**Added:** v0.4.0

**Components:** `MusePanel.tsx`, `AIChatComposer.tsx`, `AIChatMessage.tsx`, `FountainBlock.tsx`

**Hooks:** `useAIChat.ts`, `usePromptConfig.ts`

**Implementation:** `src/lib/aiProviders.ts`, `src/lib/aiTools.ts`

Muse is ActOne's built-in AI screenwriting assistant. It connects to an OpenAI-compatible endpoint or an Ollama server and provides screenplay-aware chat, structured screenplay analysis, Fountain drafting, scene tagging, project-note updates, character-profile updates, and X-Ray navigation.

Muse is optional. ActOne does not provide a hosted AI service or a default model. The user supplies the provider, endpoint, credentials, and model.

## Opening Muse

Muse is opened from the main editor by:

- Pressing `Alt+M`.
- Clicking the Muse indicator at the far right of the status bar.
- Opening the right pane through the existing workspace controls.

The status-bar indicator behaves as follows:

- Green means a provider other than `none` is configured. Clicking it toggles the Muse pane.
- Red means the provider is `none`. Clicking it opens Settings on the Muse tab.

The Command Palette currently provides general settings and editor commands. It does not provide dedicated `Open Muse Pane` or `Open Muse Settings` commands.

## Provider Layer

The provider interface is defined in `src/lib/aiProviders.ts`:

```typescript
interface AIProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}
```

### OpenAI-compatible provider

`OpenAICompatibleProvider` sends a streamed request to the configured endpoint:

- The endpoint is used as entered. ActOne does not append `/chat/completions`.
- The configured API key is sent as a Bearer token when present.
- Responses are read as Server-Sent Events.
- Content deltas are forwarded to the chat UI through `onChunk`.
- The request uses the configured model, temperature, and a 4096-token response limit.

The endpoint must be compatible with the request and streamed response shape expected by `OpenAICompatibleProvider`.

### Ollama provider

In Tauri desktop mode, `OllamaProvider` routes chat through Rust commands in `src-tauri/src/ollama.rs`:

- `ollama_check` checks server availability.
- `ollama_list_models` reads `/api/tags`.
- `ollama_chat` streams `/api/chat` responses through Tauri events.
- `cancel_ollama_chat` marks a session as cancelled.

In browser development mode, the provider calls `${ollamaUrl}/api/chat` directly. Model discovery calls `${ollamaUrl}/api/tags`.

The default Ollama URL is `http://localhost:11434`.

## Configuration

`usePromptConfig()` reads the active configuration from localStorage and updates through `notifyConfigChange()`.

| Setting | Storage key | Meaning |
|---|---|---|
| Provider | `actone-prompt-provider` | `none`, `ollama`, or `openai-compatible` |
| Ollama model | `actone-prompt-model` | Selected Ollama model name |
| Ollama URL | `actone-prompt-ollama-url` | Base URL for the Ollama server |
| API endpoint | `actone-prompt-api-endpoint` | OpenAI-compatible endpoint, used as-is |
| API key | `actone-prompt-api-key` | Bearer credential for the active API entry |
| API model | `actone-prompt-api-model` | Model identifier for the active API entry |
| API list | `actone-prompt-api-list` | JSON array of named API entries |
| System prompt | `actone-prompt-system-prompt` | General Muse instructions and personality |
| Chat temperature | `actone-prompt-chat-temp` | Chat response temperature, default `0.7` |
| Rephrase temperature | `actone-prompt-rephrase-temp` | Selection rephrase temperature, default `0.1` |
| Translation temperature | `actone-prompt-translate-temp` | Translation temperature, default `0.1` |
| Rephrase presets | `actone-prompt-rephrase-presets` | Named selection-rephrase instructions |
| Translation languages | `actone-prompt-translate-languages` | Languages shown in the editor menu |
| Translation prompt | `actone-prompt-translate-prompt` | Whole-script and selection translation instructions |

The legacy storage keys `actone-prompt-writescene-instructions`, `actone-prompt-q-instructions`, `actone-prompt-synonyms-instructions`, and `actone-prompt-lookup-instructions` exist in `STORAGE_KEYS` and defaults but are not currently read by `usePromptConfig()` or applied by the chat composer.

## Provider Settings

The standalone Settings window has a Muse tab:

- Select `None`, `Ollama`, or `OpenAI API`.
- Use **Configure Providers** to manage named OpenAI-compatible entries.
- An API entry contains a name, endpoint, API key, and model.
- Selecting an API entry copies its endpoint, key, and model to the active flat configuration keys.
- Ollama settings contain a base URL and a model selector populated from the server.
- Chat, rephrase, and translation temperatures are configured separately.
- **Custom Instructions** edits the general system prompt, rephrase presets, and translation prompt.
- Fountain syntax rules are shown in Settings and are automatically added to relevant writing and editor prompts.

Small local models may not reliably follow Fountain rules or structured tool-call instructions. Larger local models or capable remote models generally perform better for multi-scene analysis and tool execution.

## Chat Sessions

`useAIChat()` manages sessions for the active file:

```typescript
useAIChat(
  getParsedDoc,
  filePath,
  activeFileId,
  activeLineNumber,
  replaceSceneText,
  updateSettings,
  openXrayWindow,
  scriptFileName,
)
```

Each session contains:

```typescript
interface ChatTurn {
  id: number;
  role: "user" | "assistant";
  content: string;
  display?: string;
  thinking?: string;
  toolCalls?: ToolCallStep[];
  timestamp?: number;
  model?: string;
  tokens?: number;
}
```

The chat hook:

1. Loads sessions from a file-specific localStorage key.
2. Adds the user turn and an empty assistant turn.
3. Builds a system prompt from Muse instructions and the parsed screenplay.
4. Streams a provider response into the assistant turn.
5. Detects tool calls and may execute a tool loop for up to eight iterations.
6. Adds tool results to the next model request.
7. Displays tool steps and pending scene drafts in the assistant message.

Chat storage uses `actone_ai_chat::<normalized-file-path>`. Unsaved documents use the active file ID in the key. Sessions are local to the current frontend storage context.

The `.actone` bundle format has a `muse.json` entry, but the current chat hook reads and writes localStorage rather than synchronizing its live sessions with bundle `promptChats`. Do not promise that chat history travels with a bundle until that synchronization is implemented.

## Screenplay Context

When a parsed screenplay is available, Muse receives:

- A structured screenplay index from `buildScreenplayIndex()`.
- Scene IDs, headings, line ranges, and detected characters.
- The scene around the current editor line when available.
- Current todo and parking data.
- Saved character profiles for the active script.
- Fountain syntax rules for writing-oriented prompts.
- The advertised tool declarations from `MUSE_TOOLS`.

Context is built from the current parsed document, but the current implementation does not attach a document revision or content hash to a request. Async agent mutations must therefore be treated carefully and must not be described as stale-safe.

## Composer Behavior

`AIChatComposer` is a pill-shaped input (container `20px` radius with `1px` divider border, focus ring `0 0 0 2px accent-mix`, focus `primary.main` border). The textarea is borderless inside the pill; the send button is a `20px` circular pill (primary) with tactile scale feedback (`scale(1.04)` on hover, `0.96` on press):

- `Enter` sends the message.
- `Shift+Enter` inserts a newline (history navigation for prior prompts in this session: `↑`/`↓`).
- `Escape` stops an active generation.
- The send button becomes a stop button while streaming; disabled state uses `action.disabledBackground`.
- The composer is disabled when the provider is `none`.

The composer does not implement `@` command autocomplete or command mode. Users should write requests in normal language.

## Tool Protocol

The current protocol is JSON/text based. The model is instructed to emit a `tool_call` fenced block, but the parser also accepts bare JSON, repaired JSON, and pseudo-call syntax for compatibility with weaker models.

The parser functions are `parseToolCall()` and `parseAllToolCalls()` in `src/hooks/useAIChat.ts`. Tool declarations are stored in `MUSE_TOOLS` and execution is handled by `executeToolCall()` in `src/lib/aiTools.ts`.

The model output, screenplay text, notes, and tool arguments are untrusted input. Tool names and arguments should be validated before execution. The current implementation does not provide a universal approval dialog for mutations.

### Advertised tools

| Tool | Behavior |
|---|---|
| `read_scene` | Reads a scene by its ordinal index |
| `search_script` | Searches screenplay lines and returns matching scenes and lines |
| `get_character_scenes` | Lists scenes and co-stars for a character |
| `get_location_breakdown` | Lists scenes whose heading contains a location query |
| `get_screenplay_stats` | Returns line, word, page, scene, action, dialogue, and speaking-role statistics |
| `search_character_dialogue` | Searches dialogue for a named character |
| `read_active_cursor_context` | Returns lines around the active editor line |
| `read_title_page` | Returns parsed title-page lines |
| `replace_scene` | Creates a pending Fountain replacement draft for review |
| `add_project_todo` | Adds a todo through the current settings updater |
| `add_parking_note` | Adds a parking note through the current settings updater |
| `read_project_todos` | Reads todo data from current document settings |
| `read_parking_lot` | Reads parking data from current document settings |
| `tag_scene` | Adds color or storyline markers to a scene heading and applies the edit |
| `update_character_profile` | Creates or updates X-Ray character profile data |
| `read_character_profiles` | Reads saved character profiles for the active script |
| `open_xray_window` | Opens the X-Ray window or dispatches its fallback event |

The implementation also contains a `read_script_bookmarks` handler, but it is not currently included in `MUSE_TOOLS` and should not be treated as an advertised model capability until registered.

### Mutating tool behavior

- `replace_scene` returns a pending draft. The user can inspect the Fountain block and apply it from the review card.
- `tag_scene` modifies the scene heading through `replaceSceneText()`.
- `add_project_todo` and `add_parking_note` update settings immediately when an updater is available.
- `update_character_profile` updates character profile and gender settings immediately when an updater is available.
- `open_xray_window` changes application UI state by opening another window.

Plain Fountain files do not persist ActOne metadata such as todos, parking items, and character profiles in the Fountain text. Extended metadata is intended for `.actone` bundles.

## Message Rendering

`AIChatMessage` renders:

- User messages as right-aligned Markdown bubbles.
- Assistant messages as Markdown with a Muse header.
- `<think>` blocks as collapsible thinking content when returned by a model.
- Tool calls as a collapsible step list.
- Pending scene replacements as `FountainBlock` review cards.
- Fenced `fountain` blocks as formatted Fountain blocks.
- Copy controls for assistant content and errors.

`FountainBlock` supports copying the Fountain text and inserting it at the editor cursor. Pending replacement blocks additionally support applying the proposed scene through the editor callback.

## Editor AI Actions Outside Chat

The editor context menu provides separate AI actions:

- Look up selected text.
- Request synonyms for selected text.
- Rephrase selected text using a configured preset.
- Translate selected text using a configured language.
- Translate the whole script when no text is selected.

These operations use the configured provider but are separate from the Muse chat tool loop.

## Privacy and Persistence

- Provider configuration, including API keys, is stored in localStorage by the current implementation.
- Chat prompts may include screenplay text, index data, notes, parking data, and character profiles.
- OpenAI-compatible requests are sent to the configured endpoint.
- Ollama requests are sent to the configured Ollama server.
- Users should not assume screenplay content remains local when a remote provider is selected.
- `muse.json` is read and written by the `.actone` pack/unpack utilities, but live chat sessions are currently localStorage-backed.

See `PRIVACY.md` for the application's current data-transmission policy and `docs/api-reference/01-frontend-hooks.md` for the exported hook and provider APIs.

## Planned Agentic Work

The following are planned, not implemented:

- Universal approval and diff previews for every mutation.
- Strict runtime schemas for tool arguments.
- Revision-safe editor transactions.
- Stable scene anchors and stale-request rejection.
- Evidence-based continuity analysis and production breakdown workflows.

The current implementation contract is documented in this feature guide, the frontend AI API reference, and `PRIVACY.md`. Muse requests and tool results must be treated as untrusted model input.

## Related Files

| File | Purpose |
|---|---|
| `src/components/MusePanel.tsx` | Main chat panel and model selector |
| `src/components/ai/AIChatComposer.tsx` | Plain chat input and streaming controls |
| `src/components/ai/AIChatMessage.tsx` | Message, thinking, tool-step, and draft rendering |
| `src/components/ai/FountainBlock.tsx` | Fountain copy, insert, and apply controls |
| `src/hooks/useAIChat.ts` | Sessions, prompt construction, streaming, and tool loops |
| `src/hooks/usePromptConfig.ts` | Reactive provider configuration and model lookup |
| `src/lib/aiProviders.ts` | OpenAI-compatible and Ollama provider implementations |
| `src/lib/aiTools.ts` | Tool declarations and execution handlers |
| `src/utils/sceneIndexer.ts` | Structured screenplay index used by Muse |
| `src/components/layout/StatusBar.tsx` | Muse status indicator |
| `src/components/SettingsWindow.tsx` | Provider, model, temperature, and prompt settings |
| `src/utils/actone.ts` | Bundle metadata and `muse.json` compatibility |
