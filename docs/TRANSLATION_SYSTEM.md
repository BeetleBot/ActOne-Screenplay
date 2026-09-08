# Translation System & Progress Modal Architecture

## 1. Overview
The **Translation System** in ActOne provides whole-script and selection-based screenwriting translation powered by local (Ollama) and cloud (OpenAI-compatible) LLMs. It is designed to preserve Fountain screenplay formatting, maintain full scene context for natural dialogue translation, prevent character name corruption, survive provider rate limits, and execute scene-by-scene with adaptive chunking.

---

## 2. Architecture & Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                       UI Layer                              │
│  - ScriptsView (Project Pane Context Menu)                  │
│  - ScriptEditor (Editor Context Menu)                       │
│  - TranslateDocumentModal (Setup & Real-time Progress Modal)│
│  - StatusBar (Bottom-left in-flight indicator)              │
└──────────────────────────────┬──────────────────────────────┘
                                │ Dispatches Job
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 translationEngine.ts                        │
│  - Pre-flight AI connection health check                    │
│  - AST & Fountain Line Classifier (Preserves Syntax)        │
│  - Scene Segmentation (Heading-to-Heading units)            │
│  - Adaptive Chunking (Splits scenes >35 lines at character cues)
│  - Custom Per-Document Instruction injection                │
│  - Element Selection (Heading, Action, Dialogue, etc.)      │
│  - Character & Proper Noun Glossary Extractor               │
│  - Tolerant line-by-line response parsing                   │
│  - Auto-throttling & HTTP 429 RateLimit backoff with UI countdown
│  - Per-Scene Failure Tracking & Manual Retry Support        │
└──────────────────────────────┬──────────────────────────────┘
                                │ Streams Chunks
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Provider Layer                          │
│  - Ollama (Local LLM e.g. Gemma 2 9B, Mistral, Llama, Qwen) │
│    ↳ Rust proxy forwards num_predict (max_tokens) & num_ctx │
│  - OpenAI-compatible (Groq, OpenAI, OpenRouter, DeepSeek)   │
│    ↳ HTTP 429 detection & Retry-After header parsing        │
└──────────────────────────────┘
```

---

## 3. Detailed Workflow: How Translation Works

### Step 1: Pre-flight Verification
Before duplicating the screenplay or starting the translation loop, the engine issues a fast test probe ("Translate to English: Hello") with a 10-second timeout. If the AI model or endpoint is misconfigured or offline, the modal surfaces the exact connection error immediately without creating duplicate or dirty files.

### Step 2: Scene Segmentation & Adaptive Chunking
Instead of decontextualized arbitrary batches of lines, ActOne segments the screenplay into **natural scenes**:
* **Scene Boundaries:** Every `LineType.heading` marks a scene boundary. Any translatable lines before the first heading are grouped as a "Preamble".
* **Adaptive Chunking:** If a scene exceeds 35 translatable lines, the engine automatically splits it at the nearest character-cue boundary (`LineType.character`). Each part receives the scene heading context and is tracked with part numbers (e.g. `(Part 2 of 3)`).

### Step 3: Natural Prompting & Character Name Preservation
* Prompts provide the scene heading, the characters active in that scene, any user-provided custom instructions, and the clean screenplay lines.
* **Tolerant Parsing:** Output is parsed line-by-line without demanding brittle synthetic delimiter schemes (such as `N|text`). If the model provides fewer lines, original text is preserved gracefully.
* **Character Name Preservation:** Character names are detected from the AST and protected from translation. Leading `@` symbols are stripped when passed to prompt glossaries, and prompt rules strictly forbid models from prepending `@` to character names in action descriptions or dialogue lines.
* **Syntax Normalization & Cleaners:** 
  - Automatically strips model-generated enclosing quotation marks (`"..."`, `'...'`, `“...”`) from dialogue lines.
  - Automatically strips accidental enclosing parentheses `(...)` from action lines to prevent improper Fountain parenthetical parsing.
  - Normalizes Fountain escape prefixes (`!`, `.`, `>`, `(`, `)`) to prevent double-wrapping.
  - **Cross-Lingual Script Sanitizer:** Detects and removes foreign script bleeding (such as CJK/Japanese glyphs or neighboring Indic scripts like Telugu leaking into Tamil translations).
* A sanity guard ensures dialogue lines that accidentally start with scene headings are rejected.

### Step 4: Auto-Throttling, Rate-Limit Recovery & Retries
* **Auto-throttle:** Sequential scene translation begins with a 1-second delay between scenes and decreases down to 500ms on successive completions.
* **HTTP 429 Handling:** When a provider emits HTTP 429, the `RateLimitError` captures the `Retry-After` header. The engine pauses execution, switches the modal to a waiting state (`⏳ Rate limited — waiting Xs`), and safely resumes when the delay expires.
* **Network Recovery:** Transient socket drops or provider hiccups trigger up to 3 automatic retries with exponential backoff.
* **Manual Scene Retry:** Unresolved scenes are tracked by index. The completion screen provides a **"Retry Failed Scenes"** button to re-run only the failed scenes.

---

## 4. UI & Modal Enhancements

### TranslateDocumentModal (`src/components/TranslateDocumentModal.tsx`)
1. **Custom Instructions Field:** Free-form text input in setup mode for project-specific instructions (e.g., dialect registers, character idioms). Persisted with "Remember my settings".
2. **Accurate Element Selection:** Mapped directly to `LineType` enum values (Dialogue, Action, Headings, Parentheticals, Transitions).
3. **Rich Scene Progress:** Real-time indicator showing active scene heading, split part numbers, countdown timers for rate-limited providers, percentage bar, and remaining time estimates.
4. **Live Streaming Preview:** Displays real-time streaming line preview in the progress modal.
5. **Post-Completion Summary:** Shows translated scene count, failed scene count, elapsed time, and scene-level retry actions.
