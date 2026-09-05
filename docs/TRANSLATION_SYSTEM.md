# Translation System & Progress Modal Architecture

## 1. Overview
The **Translation System** in ActOne provides whole-script and selection-based screenwriting translation powered by local (Ollama) and cloud (OpenAI-compatible) LLMs. It is designed to preserve Fountain screenplay formatting, prevent character name corruption, survive network glitches, and execute high-speed multi-batch translations in parallel.

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
│  - AST & Fountain Line Classifier (Preserves Syntax)        │
│  - Element Selection (Heading, Action, Dialogue, etc.)      │
│  - Character & Proper Noun Glossary Extractor               │
│  - Numbered Tagging (1|Line text) & Context Injection       │
│  - Full-response parsing per batch                          │
│  - Concurrency Pool (p-limit: 2 cloud, 1 Ollama)            │
│  - Automatic Per-Batch Retries (up to 5 attempts)           │
│  - Per-Line Failure Tracking & Manual Retry Support         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Streams Chunks
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Provider Layer                          │
│  - Ollama (Local LLM e.g. Mistral-Nemo, Qwen, Llama)        │
│  - OpenAI-compatible (Groq, OpenAI, OpenRouter, etc.)       │
└──────────────────────────────┘
```

---

## 3. Detailed Workflow: How Translation Works

### Step 1: AST Analysis & Line Classification
Before sending any text to the AI, the source script is parsed line-by-line using `parseScreenplay`:
* **Non-Translatable Lines (Preserved As-Is):**
  * Scene Headings (`INT.`, `EXT.`, `.SLUGLINE`) (unless user checks Headings)
  * Character Cues (`@CHARACTER` or `CHARACTER (V.O.)`)
  * Transitions (`> FADE IN:`, `CUT TO:`) (unless user checks Transitions)
  * Sections & Page Breaks (`#`, `===`)
  * Title Page metadata (`Title:`, `Author:`)
* **Translatable Lines (Sent to AI based on element toggles):**
  * Action descriptions (`!`)
  * Dialogue lines
  * Parentheticals (`(whispering)`)
  * Synopses (`=`)
  * Centered text (`> <`)
  * Shots (`!!`)

### Step 2: Character Name & Glossary Extraction
To prevent LLMs from translating proper nouns (e.g. translating "Baker" or "Rose" into literal non-English nouns):
* All unique character names are collected from the script's AST.
* An explicit glossary rule is injected into the system prompt:
  ```text
  PRESERVE CHARACTER NAMES: [JOHN, SARAH, ROSE, BAKER, ...]
  ```

### Step 3: Batch Execution & Robust Parsing
Translatable lines are grouped into batches (20 lines for cloud providers, 10 lines for Ollama):
* Lines are formatted with plain text delimiters: `1|Line text`, `2|Line text`
* Preceding scene context (2-3 lines) is included as non-translatable reference.
* Language examples and native script guidance are injected into the prompt.
* Parsing runs after receiving the full response for each batch to avoid mid-stream corruption.
* A sanity guard checks if a hallucinated scene heading (`INT.`, `EXT.`) was returned for a dialogue line and rejects it.

### Step 4: Automatic Retries & Manual Recovery
* If any numbered lines are missing from a batch output or if a network glitch occurs, the engine automatically retries up to **5 times** with backoff for the missing lines.
* If lines remain unparsed after 5 attempts, they are recorded as failed lines.
* The modal reports the exact count of failed lines and provides a **Retry Failed Lines** button for manual user trigger.

---

## 4. UI & Modal Enhancements

### TranslateDocumentModal (`src/components/TranslateDocumentModal.tsx`)
1. **Accurate Element Selection:** Mapped directly to `LineType` enum values (Dialogue, Action, Headings, Parentheticals, Transitions).
2. **Expanded Languages:** English, Spanish, French, German, Italian, Portuguese, Hindi, Tamil, Telugu, Kannada, Malayalam, Japanese, Chinese, Korean, Arabic (RTL), Russian, Turkish, Thai.
3. **Live Streaming Preview:** Displays real-time streaming line preview in the progress modal.
4. **Honest Progress Tracking:** Per-batch completion count and accurate line numbers.
5. **Post-Completion Summary:** Shows translated line count, failed line count, elapsed time, and a manual Retry button when applicable.

