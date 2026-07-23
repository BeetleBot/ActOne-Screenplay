# ActOne Agentic AI — Implementation Plan

## Why

Currently, the AI can only **talk** — it generates text responses that the user manually copies and acts on. Agentic AI means the AI can **do things in the app** directly: tag characters, highlight props, reorder scenes, insert drafts, and more. The AI reads and understands the screenplay, then manipulates it.

The goal is **not** to replicate command palette actions (export, save, zoom). Those are already one click away. The goal is **intelligent work** that requires understanding the script's content and structure — things that would take a human hours of manual effort.

---

## Architecture Overview

The AI already emits structured output (` ```fountain ` fence for scene drafts). We extend this same pattern with `<actone>` XML action blocks.

### Data flow

```
User: "Tag all the props in my script"

  → useAIChat.send() called with action="chat"
  → AI streams response text containing:
      "I found these props in your script:
       - a revolver (scene 2)
       - a badge (scene 4)
       - a letter (scene 7)
       - handcuffs (scene 12)

       <actone name="identifyAndTag">
         <entities>
           <entity><name>revolver</name><category>prop</category></entity>
           <entity><name>badge</name><category>prop</category></entity>
           <entity><name>letter</name><category>prop</category></entity>
           <entity><name>handcuffs</name><category>prop</category></entity>
         </entities>
       </actone>"

  → After streaming completes, post-processing step:
    1. parseActions() extracts <actone> blocks → action objects
    2. executeAction() runs the handler:
       a. For each entity, search the full document text for all occurrences
       b. Compute character-offset ranges [startPos, length] for each match
       c. Build ProdTagItem[] + ProdDef[] entries
       d. Dispatch updateTagsEffect to CodeMirror (highlights appear)
       e. Persist via updateSettings() (tags survive save/reload)
    3. stripActions() removes <actone> blocks from display content
    4. Action result summary appended to AI response

  → User sees:
      "I found these props in your script:
       - a revolver (scene 2)
       - a badge (scene 4)
       ...

       ✅ Tagged 4 props (12 total occurrences)"
```

---

## Action Format

XML tags embedded in the AI response text. Works with ANY AI provider (Ollama, LM Studio, OpenAI-compatible) — no function calling dependency.

### Single action

```xml
<actone name="actionName">
  <paramName>value</paramName>
</actone>
```

### Multiple actions

```xml
<actone name="identifyAndTag">
  <entities>
    <entity><name>Buzzaria</name><category>cast</category></entity>
    <entity><name>Honeydew</name><category>cast</category></entity>
    <entity><name>revolver</name><category>prop</category></entity>
    <entity><name>badge</name><category>prop</category></entity>
  </entities>
</actone>
```

### Action blocks are invisible to the user

The `<actone>` blocks are:
- Parsed and executed during post-processing
- Stripped from the content rendered in the chat UI
- Replaced with a compact status summary

---

## Phase 1: Core Infrastructure

### Files to create

#### 1. `src/lib/actionSystem/types.ts`

Defines all types for the action system.

```ts
import type { EditorView } from "@codemirror/view";
import type { SettingsUpdater } from "../../context/FileContext";

// ── Parsed action from an <actone> block ──
export interface ActoneAction {
  name: string;
  params: Record<string, any>;
}

// ── Handler context — tools the handler can use ──
export interface ActionContext {
  editorView: EditorView | null;
  updateSettings: SettingsUpdater;
  insertAtCursor: (text: string) => void;
  scrollToLine: (lineIndex: number) => void;
  getFullDoc: () => string;
  getParsedLines: () => any[];
  getScriptFileName: () => string;
  setAiStatus: (msg: string | null) => void;
}

// ── Handler result ──
export interface ActionResult {
  actionName: string;
  success: boolean;
  summary: string;
  details?: string;
}

// ── Handler function signature ──
export type ActionHandler = (
  params: Record<string, any>,
  context: ActionContext,
) => Promise<ActionResult>;
```

#### 2. `src/lib/actionSystem/parser.ts`

Parses `<actone>` blocks from AI response text.

```ts
const ACTONE_RE = /<actone\s+name="([^"]+)"\s*>([\s\S]*?)<\/actone>/g;

export function parseActions(text: string): ActoneAction[] {
  const actions: ActoneAction[] = [];
  let match: RegExpExecArray | null;
  ACTONE_RE.lastIndex = 0;
  while ((match = ACTONE_RE.exec(text)) !== null) {
    const name = match[1];
    const inner = match[2].trim();
    const params = xmlToParams(inner);
    actions.push({ name, params });
  }
  return actions;
}

export function stripActions(text: string): string {
  return text.replace(/<actone[\s\S]*?<\/actone>/g, "").trim();
}
```

**Helper:** `xmlToParams(innerXml: string)` — parses simple XML into a nested object using regex (no full XML parser needed — the structure is always shallow). Handles:
- `<key>value</key>` → `{ key: "value" }`
- `<entities><entity><name>X</name><category>Y</category></entity></entities>` → `{ entities: [{ name: "X", category: "Y" }] }`

#### 3. `src/lib/actionSystem/registry.ts`

Maps action names to handler functions. One-stop shop for registering new actions.

```ts
import type { ActionHandler } from "./types";
import { handleIdentifyAndTag } from "./handlers";

const registry: Record<string, ActionHandler> = {
  "identifyAndTag": handleIdentifyAndTag,
};

export function getHandler(name: string): ActionHandler | null {
  return registry[name] ?? null;
}

export async function executeAction(
  action: { name: string; params: Record<string, any> },
  context: ActionContext,
): Promise<ActionResult> {
  const handler = getHandler(action.name);
  if (!handler) {
    return {
      actionName: action.name,
      success: false,
      summary: `Unknown action: "${action.name}"`,
    };
  }
  return handler(action.params, context);
}
```

#### 4. `src/lib/actionSystem/handlers.ts`

All action implementations. Initially just `identifyAndTag` — the core feature.

##### `handleIdentifyAndTag`

What the AI sends:
```xml
<actone name="identifyAndTag">
  <entities>
    <entity><name>Buzzaria</name><category>cast</category></entity>
    <entity><name>revolver</name><category>prop</category></entity>
    <entity><name>badge</name><category>prop</category></entity>
  </entities>
  <sceneId></sceneId>
</actone>
```

Handler pseudocode:

```ts
async function handleIdentifyAndTag(
  params: { entities?: { name: string; category: string }[]; sceneId?: string },
  context: ActionContext,
): Promise<ActionResult> {
  const { editorView, updateSettings, getFullDoc, getScriptFileName } = context;
  if (!editorView) {
    return { actionName: "identifyAndTag", success: false, summary: "Editor not available" };
  }

  const entities = params.entities ?? [];
  const doc = getFullDoc();
  const scriptFileName = getScriptFileName();

  // 1. Read current tags/definitions from editor state
  const tagState = editorView.state.field(tagStateField, false);
  const tags: ProdTagItem[] = [...(tagState?.tags ?? [])];
  const definitions: ProdDef[] = [...(tagState?.definitions ?? [])];
  const category = CATEGORIES.find(c => c.key === params.category); // keep for reference

  let taggedCount = 0;
  const seenDefinitions = new Map<string, ProdDef>();

  for (const entity of entities) {
    const { name, category } = entity;
    if (!name || !category) continue;

    // 2. Find or create a definition for this entity + category
    let def = definitions.find(
      (d) => d.name.toLowerCase() === name.toLowerCase() && d.type === category,
    );
    if (!def) {
      def = {
        id: "def-" + Math.random().toString(36).substring(2, 9),
        name: name,
        type: category,
        colorOverride: null,
      };
      definitions.push(def);
    }

    // 3. Find ALL occurrences of the entity name in the document
    //    Use word-boundary matching to avoid false positives
    const re = new RegExp(`\\b${escapeRegex(name)}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(doc)) !== null) {
      const start = m.index;
      const length = m[0].length;

      // 4. Skip if already tagged at this exact position
      const alreadyTagged = tags.some(
        (t) => t.range && t.range[0] === start && t.range[1] === length,
      );
      if (alreadyTagged) continue;

      // 5. Add tag
      tags.push({
        range: [start, length],
        type: category,
        definitionId: def.id,
        sceneId: params.sceneId ?? "",
      });
      taggedCount++;
    }
  }

  // 6. Dispatch to CodeMirror (highlights appear)
  editorView.dispatch({
    effects: updateTagsEffect.of({ tags, definitions }),
  });

  // 7. Persist to settings (survives save/reload)
  updateSettings((prev) => {
    const key = `productionTags`;
    const perScript = { ...(prev as any)?.[key] } ?? {};
    perScript[scriptFileName] = { tags, definitions };
    return { ...prev, [key]: perScript } as any;
  });

  const entityWord = entities.length === 1 ? "entity" : "entities";
  const occurrenceWord = taggedCount === 1 ? "occurrence" : "occurrences";
  return {
    actionName: "identifyAndTag",
    success: true,
    summary: `Tagged ${taggedCount} ${occurrenceWord} across ${entities.length} ${entityWord}`,
    details: entities.map((e) => `${e.category}: ${e.name}`).join(", "),
  };
}
```

**Edge cases handled:**
- Duplicate detection (skip if same position already tagged)
- Word-boundary matching (avoids "rapid" matching "rap" in "rapid")
- Case-insensitive matching
- Auto-creates definitions if not found
- Handles zero matches gracefully (just skips)
- Survives undo via CodeMirror's built-in inverted effects (already configured for `updateTagsEffect`)

#### 5. `src/components/ai/ActionBlock.tsx`

Small status display rendered in the chat message.

```tsx
interface ActionBlockProps {
  results: ActionResult[];
}

export function ActionBlock({ results }: ActionBlockProps) {
  if (results.length === 0) return null;
  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
      {results.map((r, i) => (
        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75, py: 0.25 }}>
          <Box
            component="span"
            sx={{
              width: 14, height: 14, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 700,
              bgcolor: r.success ? "success.main" : "error.main",
              color: "white",
            }}
          >
            {r.success ? "✓" : "✗"}
          </Box>
          <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
            {r.summary}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
```

---

## Phase 2: Wire into Existing Code

### Files to change

#### 6. `src/hooks/useAIChat.ts`

**Changes:**
1. Accept new optional `actionContext` parameter
2. After streaming + fountain fence post-processing, add action execution step

New signature:
```ts
export function useAIChat(
  getDocContext: () => string | null,
  filePath: string | null,
  activeFileId: string,
  actionContext?: ActionContext,  // ← NEW
) {
```

Modified `send()` post-processing (after line ~238):
```ts
const full = await provider.chat(history, { ... });

let finalContent = full;

// ── Existing: fountain fence handling ──
if (action === "write-scene") { ... }

// ── NEW: execute actions from the response ──
const actionResults: ActionResult[] = [];
if (actionContext) {
  const actions = parseActions(finalContent);
  for (const act of actions) {
    const result = await executeAction(act, actionContext);
    actionResults.push(result);
  }
  finalContent = stripActions(finalContent);
  if (actionResults.length > 0) {
    // Append results after a separator
    const summaryLines = actionResults
      .filter(r => r.success)
      .map(r => r.summary);
    if (summaryLines.length > 0) {
      finalContent += "\n\n---\n" + summaryLines.join("\n");
    }
  }
}

// ── Existing: update turn ──
updateActiveSessionTurns(...);
```

**Important:** The `actionContext` should be a stable ref to avoid re-creating the `send` callback every time the context changes. Use `useRef`:

```ts
const actionContextRef = useRef(actionContext);
actionContextRef.current = actionContext;
```

Then inside `send()`, use `actionContextRef.current` instead of the closure variable. This prevents unnecessary re-renders and callback changes.

#### 7. `src/components/PromptPanel.tsx`

**Changes:**
1. Import `useEditor()` for `editorView`, `updateSettings`
2. Import `useFile()` for `parsedDoc` (already imported), `scriptFileName`
3. Import `useUI()` for `setAiStatus` (already used by useAIChat internally)
4. Build `ActionContext` object and pass to `useAIChat`

Current:
```ts
const chat = useAIChat(getDocContext, filePath, activeFileId);
```

New:
```ts
const { editorView } = useEditor();
const { parsedDoc, scriptFileName } = useFile();
const { setAiStatus } = useUI();

const actionContext = useMemo<ActionContext>(() => ({
  editorView: editorViewRef.current, // use ref to avoid stale closures
  updateSettings,
  insertAtCursor: (text) => onInsertAtCursor?.(text),
  scrollToLine: (lineIndex) => {
    if (editorView) {
      try {
        const line = editorView.state.doc.line(lineIndex + 1);
        editorView.dispatch({
          selection: { anchor: line.from },
          effects: EditorView.scrollIntoView(line.from, { y: "center" }),
        });
        editorView.focus();
      } catch {}
    }
  },
  getFullDoc: () => parsedDoc.screenplayText ?? "",
  getParsedLines: () => parsedDoc.lines ?? [],
  getScriptFileName: () => scriptFileName ?? "",
  setAiStatus,
}), [editorView, updateSettings, onInsertAtCursor, parsedDoc, scriptFileName, setAiStatus]);

const chat = useAIChat(getDocContext, filePath, activeFileId, actionContext);
```

#### 8. `src/components/ai/AIChatMessage.tsx`

**Changes:**
1. Accept `actionResults?: ActionResult[]` prop
2. Render `ActionBlock` at the end of assistant messages if results exist

New interface:
```ts
interface AIChatMessageProps {
  turn: ChatTurn;
  pending?: boolean;
  onInsertAtCursor?: (text: string) => void;
  actionResults?: ActionResult[];  // ← NEW
}
```

In the assistant render section, after the markdown card:
```tsx
{/* NEW: action results */}
{actionResults && actionResults.length > 0 && (
  <ActionBlock results={actionResults} />
)}
```

#### 9. `src/components/PromptPanel.tsx` (update rendering)

Pass action results from the chat turns to `AIChatMessage`. We need to store action results per-turn. Options:
- (A) Add `actionResults?: ActionResult[]` to `ChatTurn` interface
- (B) Store them in a separate state/ref by turn ID

Option A is simplest:

```ts
export interface ChatTurn {
  id: number;
  role: "user" | "assistant";
  content: string;
  display?: string;
  actionResults?: ActionResult[];  // ← NEW
}
```

In `useAIChat.send()`, after executing actions:
```ts
updateActiveSessionTurns((prev) =>
  prev.map((turn) =>
    turn.id === assistantId
      ? { ...turn, content: finalContent, actionResults }
      : turn
  )
);
```

Then in the render loop:
```tsx
<AIChatMessage
  key={turn.id}
  turn={turn}
  actionResults={turn.actionResults}
  pending={chat.streaming && index === chat.turns.length - 1 && turn.role === "assistant" && !turn.content}
  onInsertAtCursor={handleInsert}
/>
```

---

## Phase 3: System Prompt Updates

### Changes in `useAIChat.ts`

For the `"chat"` action mode, add instructions about available actions to the system prompt:

```ts
} else {
  systemPrompt = [
    config.systemPrompt || "You are an AI assistant helping with screenwriting.",
    docContext ? `\n\nHere is the current document context:\n${docContext}` : "",
    `\n\nFollow these strict Fountain syntax rules:\n${FOUNTAIN_SYNTAX_RULES}`,
    "",

    // ── NEW: Agentic action instructions ──
    `AVAILABLE ACTIONS:

You can perform actions on the document by embedding <actone> blocks in your response.
These blocks are invisible to the user and will be executed automatically.

<actone name="identifyAndTag">
  <entities>
    <entity><name>Entity Name</name><category>cast|prop|vfx|sfx|camera|animal|extras|vehicle|costume|makeup|music|sound|stunt|setDesign|other</category></entity>
  </entities>
</actone>

Use this action when the user asks you to tag, mark, or categorize elements in their script.
The entity name must match exactly how it appears in the document text.
Search for ALL occurrences of the entity in the document (not just the first one).
`,
  ].join("\n");
}
```

The same instructions should also be appended for the other action modes (`write-scene`, `q`, `lookup`, `synonyms`) if appropriate — though tagging actions primarily make sense in general `"chat"` mode.

**Important:** When the user asks to "tag all props" or "tag all characters", the AI should:
1. Explain what it found (the prose response the user sees)
2. Emit `<actone name="identifyAndTag">` with all the entities

The AI should NOT tag parsed screenplay elements that are already structurally identified (Character names in CHARACTER elements) — only semantic entities in action lines, dialogue, etc.

---

## Action Catalog (MVP + Future)

### MVP — Phase 1

| Action | Purpose | AI input | What handler does |
|---|---|---|---|
| `identifyAndTag` | Tag entities by category | entity names + category keys | Searches doc, computes positions, dispatches `updateTagsEffect` |

### Future phases

| Action | Purpose | What handler does |
|---|---|---|
| `findAndTag` | Complex search (regex or semantic) | Uses regex or fuzzy matching |
| `addMarker` | Insert marker on scene | Finds scene heading, appends `[[marker color: desc]]` |
| `scrollToScene` | Navigate to a scene | `scrollToLine()` to scene heading |
| `insertText` | Insert text at cursor | `insertAtCursor()` |
| `replaceText` | Replace selected/identified text | `view.dispatch({ changes })` |
| `reorderScenes` | Move a scene block | `editorContext.reorderScenes()` |
| `addSceneNumbers` | Number scenes | `editorContext.autoAddSceneNumbers()` |
| `setSceneHighlight` | Color a scene | Finds heading, appends `[[color]]` |

---

## Testing Strategy

### Unit tests (vitest)

| File | What to test |
|---|---|
| `parser.test.ts` | `parseActions()` with valid XML, malformed XML, multiple actions, no actions |
| `parser.test.ts` | `stripActions()` leaves text intact, removes action blocks |
| `handlers.test.ts` | `handleIdentifyAndTag` with mock editorView, mock updateSettings |
| `registry.test.ts` | `getHandler()` returns correct handler, returns null for unknown |

### Integration

- The action system works across all AI providers (Ollama, LM Studio, API)
- Tags are undoable via Ctrl+Z (CodeMirror invertedEffects already set up)
- Tags survive file save/reload (updateSettings persists them)
- Action execution errors don't crash the chat (caught per-action)

---

## File Summary

| File | Status | Lines (est.) |
|---|---|---|
| `src/lib/actionSystem/types.ts` | NEW | 30 |
| `src/lib/actionSystem/parser.ts` | NEW | 60 |
| `src/lib/actionSystem/registry.ts` | NEW | 25 |
| `src/lib/actionSystem/handlers.ts` | NEW | 110 |
| `src/components/ai/ActionBlock.tsx` | NEW | 50 |
| `src/hooks/useAIChat.ts` | EDIT | +40 |
| `src/components/PromptPanel.tsx` | EDIT | +30 |
| `src/components/ai/AIChatMessage.tsx` | EDIT | +20 |
| **Total** | | **~365** |

---

## Implementation Order

1. **`types.ts`** — define interfaces so everything else can import them
2. **`parser.ts`** — parse + strip action blocks (test with vitest)
3. **`handlers.ts`** + **`registry.ts`** — implement `identifyAndTag` (the star feature)
4. **`ActionBlock.tsx`** — UI component for displaying results
5. **`useAIChat.ts`** — add action context param, post-processing step
6. **`PromptPanel.tsx`** — build action context from hooks, pass to useAIChat
7. **`AIChatMessage.tsx`** — display action results in the message
8. **System prompt update** — tell the AI about available actions
9. **Test** — verify end-to-end with a real LLM call
