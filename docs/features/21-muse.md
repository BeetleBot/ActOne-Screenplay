# Muse AI Assistant

**Added:** v0.4.0
**Components:** `MusePanel.tsx`, `AIChatComposer.tsx`, `AIChatMessage.tsx`, `FountainBlock.tsx`
**Hooks:** `useAIChat.ts`, `usePromptConfig.ts`
**Files:** `src/components/MusePanel.tsx`, `src/hooks/useAIChat.ts`, `src/hooks/usePromptConfig.ts`, `src/lib/aiProviders.ts`, `src/components/ai/`

Muse is ActOne's built-in AI screenwriting assistant — a chat-based interface that connects to OpenAI-compatible APIs or local Ollama models. It provides conversational help, scene generation, document Q&A, term lookup, and synonym suggestions.

---

## Architecture

### Provider Layer (`src/lib/aiProviders.ts`)

Two provider implementations:

```
AIProvider (interface)
├── OpenAICompatibleProvider — generic OpenAI-compatible chat completion API
└── OllamaProvider — local Ollama instance via /api/chat
```

Both implement the `AIProvider` interface:

```typescript
interface AIProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}
```

- Messages use `{ role: "system" | "user" | "assistant", content: string }` format.
- Streaming is handled via SSE (OpenAI) or JSON-lines (Ollama) with `onChunk` callback.
- The `system` prompt is passed via `options.system`, prepended as a `system`-role message.
- Endpoint URLs are used as-is — no `/chat/completions` is appended automatically.

### Config Layer (`src/hooks/usePromptConfig.ts`)

`usePromptConfig()` is a `useSyncExternalStore`-based hook that reads all AI configuration from localStorage keys:

| Key | Storage Key | Description |
|-----|------------|-------------|
| provider | `actone-prompt-provider` | `"none"`, `"openai-compatible"`, or `"ollama"` |
| model | `actone-prompt-model` | Ollama model name |
| apiEndpoint | `actone-prompt-api-endpoint` | OpenAI-compatible endpoint URL |
| apiKey | `actone-prompt-api-key` | API key for authentication |
| apiModel | `actone-prompt-api-model` | Model name for OpenAI-compatible provider |
| systemPrompt | `actone-prompt-system-prompt` | Custom system prompt (Muse personality) |
| chatTemp | `actone-prompt-chat-temp` | Temperature for chat (default 0.7) |
| rephrasePrompt | `actone-prompt-rephrase-prompt` | Prompt for rephrase action |
| rephraseTemp | `actone-prompt-rephrase-temp` | Temperature for rephrase (default 0.1) |
| ollamaUrl | `actone-prompt-ollama-url` | Ollama server URL (default http://localhost:11434) |
| writeSceneInstructions | `actone-prompt-writescene-instructions` | Custom instructions for @write-scene |
| qInstructions | `actone-prompt-q-instructions` | Custom instructions for @q |
| synonymsInstructions | `actone-prompt-synonyms-instructions` | Custom instructions for @synonyms |
| lookupInstructions | `actone-prompt-lookup-instructions` | Custom instructions for @lookup |

Config changes are propagated via `notifyConfigChange()` which triggers all `useSyncExternalStore` listeners.

### Chat Layer (`src/hooks/useAIChat.ts`)

`useAIChat(filePath, activeFileId)` manages per-file chat sessions:

- **Sessions**: Each file can have multiple chat sessions. Sessions are stored in localStorage keyed by `actone_ai_chat::<normalized-path>`.
- **Turns**: Each session has an array of `ChatTurn` objects (`{ id, role, content, display? }`).
- **Streaming**: Responses stream via the provider's `onChunk` callback, updating the assistant turn content in real-time.
- **System prompts**: Dynamically built based on the action type:
  - General chat: Muse personality + screenplay context + Fountain syntax rules
  - `@write-scene`: Muse personality + Fountain scene generation instructions
  - `@q`: Muse personality + document context
  - `@lookup`: Short definition focus
  - `@synonyms`: Word list focus
- **Post-processing**: For `@write-scene`, only content inside ` ```fountain ``` ` fences is kept.

---

## UI Components

### MusePanel (`src/components/MusePanel.tsx`)

The right-side chat panel. Layout:

```
┌──────────────────────────────┐
│ Muse  [New] [History] [Clear] │ ← Header bar
├──────────────────────────────┤
│                              │
│   Chat messages (scrollable) │
│   - User bubbles (right)     │
│   - Assistant messages (left)│
│   - Fountain blocks          │
│   - Error display + copy     │
│                              │
├──────────────────────────────┤
│ Provider dropdown            │ ← Bottom controls
│ Active Model dropdown        │
│ ┌───────────────────┐ [Send]│
│ │ Message Muse...    │       │ ← Composer
│ └───────────────────┘       │
└──────────────────────────────┘
```

Key features:
- **Chat history menu**: Clock icon opens a menu of past sessions per file. + icon creates a new session. Trash icon clears current session.
- **Provider/Model selectors**: Side-by-side dropdowns at the bottom. Provider switches between OpenAI API and Ollama. Model shows all configured API entries (OpenAI) or fetched models (Ollama).
- **Screenplay context**: The current document text is included in @q requests for document-aware answers.

### AIChatComposer (`src/components/ai/AIChatComposer.tsx`)

The chat input component with @command support:

- **@command autocomplete**: Type `@` to see a dropdown of available commands (write-scene, q, lookup, synonyms).
- **Mode indicator**: Once a command is selected, `@command` appears as a colored tag prefixing the input. Click it to cancel the command.
- **Keyboard shortcuts**: Enter to send, Shift+Enter for newline, Backspace on empty input to cancel command mode.
- **Send/Stop button**: Shows stop icon during streaming, send icon otherwise. Disabled when provider is "none".

### AIChatMessage (`src/components/ai/AIChatMessage.tsx`)

Renders individual chat turns:

- **User messages**: Right-aligned, primary color background, markdown rendered.
- **Assistant messages**: Full-width card with "MUSE" header, AutoAwesome icon, copy button (appears on hover), markdown body.
- **Fountain blocks**: ` ```fountain ``` ` fences are rendered as `FountainBlock` components with Courier Prime font, copy and insert buttons.
- **Typing indicator**: Bouncing dots animation during streaming response.
- **Error display**: Red border box with copy button for error messages.

### FountainBlock (`src/components/ai/FountainBlock.tsx`)

Renders Fountain-formatted text within assistant messages:
- Courier Prime monospace font
- Copy button to copy the Fountain text
- Insert button to place the text at cursor position in the editor

### RobotIcon (StatusBar)

The RobotIcon in `src/components/Icons.tsx` provides three SVG variants selected by `iconStyle` setting:
- **thin**: Light outline style
- **fill**: Solid fill style (default)
- **duotone**: Two-tone style

Placed on the right side of the Status Bar, borderless:
- **Green** when a provider is configured and ready
- **Red** when provider is "none" (click to open Muse settings)
- **Click behavior**: Disabled → `openSettingsWindow("muse")`, Enabled → toggle right pane

---

## Multi-API Management

File: `src/components/SettingsWindow.tsx`

Users can manage multiple API entries for the OpenAI-compatible provider:

```typescript
interface ApiEntry {
  id: string;        // crypto.randomUUID()
  name: string;      // User-friendly label (e.g. "API 1")
  endpoint: string;  // Base URL
  apiKey: string;    // Authentication key
  model: string;     // Model identifier
}
```

- Stored as JSON array in `actone-prompt-api-list` localStorage key.
- **Add API**: Creates a new empty entry and auto-selects it.
- **Edit**: Inline text fields for endpoint URL, API key, and model.
- **Select**: Click any entry card to activate it — syncs its values to the flat `apiEndpoint`/`apiKey`/`apiModel` keys.
- **Delete**: Removes entry; if it was the active one, selects the first remaining entry.
- **Active indicator**: Selected entry shows a primary-colored dot and border.
- Only entries with non-empty endpoint + key + model are functional; partial entries are stored but will not connect.

### Settings Tab (Muse Tab, index 3)

- Provider dropdown (none / OpenAI API / Ollama)
- "Configure Providers" button opens a nested dialog for API entry management
- Model selector (shows selected entry's model for OpenAI, or fetched models for Ollama)
- Temperature slider (0.0–1.0)
- "Custom Instructions" button opens a dialog to edit system prompts for each @command type
- Default system prompt defines Muse personality

---

## @Commands

| Command | Function | System Prompt Focus |
|---------|----------|-------------------|
| `@write-scene` | Generate a Fountain-formatted scene | Scene generation instructions |
| `@q` | Ask about the screenplay document | Document context + Q&A |
| `@lookup` | Define a term (1-2 sentences) | Brief definition |
| `@synonyms` | List alternative words (6-10) | Word list format |

### @write-scene Post-Processing

The response content is processed to extract only the ` ```fountain ``` ` fenced block:
1. If a ` ```fountain ` opening fence is found: extract content between it and the closing ` ``` ` fence.
2. If no closing fence: take everything from the opening fence onward.
3. If no fence at all: wrap the entire response in ` ```fountain … ``` `.

This ensures clean insertion of scene text into the editor.

---

## Persistence

| Data | Location | Key |
|------|----------|-----|
| Chat sessions | localStorage | `actone_ai_chat::<normalized-path>` |
| Provider config | localStorage | `actone-prompt-provider`, etc. |
| API list | localStorage | `actone-prompt-api-list` |
| API flat keys | localStorage | `actone-prompt-api-endpoint`, `-api-key`, `-api-model` |
| AI model preferences | localStorage | `actone-prompt-model` (Ollama), `actone-prompt-api-model` (OpenAI) |
| Muse.json in bundles | .actone archive | `muse.json` (legacy: `prompt.json`) |

### Bundle Compatibility (`.actone`)

The `.actone` bundle format uses `muse.json` as the key name. For backward compatibility:
- **Pack**: Writes to `muse.json`
- **Unpack**: Reads `muse.json` first; falls back to `prompt.json` for old bundles

---

## System Prompts

### Default Muse Personality

```text
Your name is Muse. You are a screenwriting AI assistant made by ActOne.
Your identity is Muse — not Gemma, not Google, not any other model.
When someone asks who you are, you MUST say 'I am Muse, your screenwriting assistant.'
Never break character. Never reveal you are based on another model.
This is your core identity. You are kind, intelligent, and concise.
You only say what matters.
```

This is enforced in both the default localStorage value (`defaults.ts`) and the inline fallback in `useAIChat.ts`.

### Fountain Syntax Rules

All general chat prompts include Fountain formatting rules (scene headings, action, character/dialogue, transitions, dual dialogue, etc.) to ensure the model generates valid Fountain syntax.

---

## Related Files

| File | Purpose |
|------|---------|
| `src/components/MusePanel.tsx` | Main chat panel UI |
| `src/components/ai/AIChatComposer.tsx` | Chat input with @command autocomplete |
| `src/components/ai/AIChatMessage.tsx` | Message bubble rendering |
| `src/components/ai/FountainBlock.tsx` | Fountain code block display |
| `src/hooks/useAIChat.ts` | Core chat logic (sessions, streaming, history) |
| `src/hooks/usePromptConfig.ts` | AI config management hook |
| `src/lib/aiProviders.ts` | Provider implementations (OpenAI, Ollama) |
| `src/constants.ts` | `ApiEntry` interface, `STORAGE_KEYS` for AI |
| `src/constants/defaults.ts` | Default config values |
| `src/components/Icons.tsx` | RobotIcon component |
| `src/components/layout/StatusBar.tsx` | Muse icon in status bar |
| `src/components/SettingsWindow.tsx` | Multi-API management UI |
| `src/components/CommandPalette.tsx` | "Toggle Muse" / "Open Muse" commands |
| `src/utils/actone.ts` | Bundle pack/unpack (muse.json) |
| `walkthrough.md` | End-user feature walkthrough (deprecated — see docs/) |
