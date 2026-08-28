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
│  - TranslationProgressModal (Real-time Progress Window)      │
│  - StatusBar (Bottom-left in-flight indicator)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ Dispatches Job
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 translationEngine.ts                        │
│  - AST & Fountain Line Classifier (Preserves Syntax)        │
│  - Character & Proper Noun Glossary Extractor               │
│  - Numbered Tagging ([1], [2], ...) & Hallucination Guard   │
│  - Concurrency Pool (p-limit, 3 parallel workers)           │
│  - Exponential Backoff Retrier (3 attempts + jitter)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Streams Chunks
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Provider Layer                          │
│  - Ollama (Local LLM e.g. Mistral-Nemo, Qwen, Llama)         │
│  - OpenAI-compatible (Groq, OpenAI, OpenRouter, etc.)       │
└──────────────────────────────┘
```

---

## 3. Detailed Workflow: How Translation Works

### Step 1: AST Analysis & Line Classification
Before sending any text to the AI, the source script is parsed line-by-line using `parseScreenplay`:
* **Non-Translatable Lines (Preserved As-Is):**
  * Scene Headings (`INT.`, `EXT.`, `.SLUGLINE`)
  * Character Cues (`@CHARACTER` or `CHARACTER (V.O.)`)
  * Transitions (`> FADE IN:`, `CUT TO:`)
  * Sections & Page Breaks (`#`, `===`)
  * Title Page metadata (`Title:`, `Author:`)
* **Translatable Lines (Sent to AI):**
  * Action descriptions (`!`)
  * Dialogue lines
  * Parentheticals (`(whispering)`)
  * Synopses (`=`)
  * Centered text (`> <`)

### Step 2: Character Name & Glossary Extraction
To prevent LLMs from translating proper nouns (e.g. translating "Baker" or "Rose" into literal non-English nouns):
* All unique character names are collected from the script's AST.
* An explicit glossary rule is injected into the system prompt:
  ```text
  DO NOT TRANSLATE THESE CHARACTER NAMES & PROPER NOUNS (keep their exact original spelling):
  [JOHN, SARAH, ROSE, BAKER, ...]
  ```

### Step 3: Indexed Batch Tagging (`[1]`, `[2]`, `[3]`)
Translatable lines are grouped into batches of 20 lines. To prevent line-shifting or local LLM hallucinations (e.g. when a model skips lines or attempts to "continue" the scene):
* Lines are tagged: `[1] The postman smiles.`, `[2] This will go far. Mark it urgent.`
* The output is matched strictly by tag `[1]`, `[2]` rather than raw line index.
* A sanity guard checks if a hallucinated scene heading (`INT.`, `EXT.`) was returned for a dialogue line and rejects it if so.

### Step 4: Parallel Batch Concurrency (3 Workers)
* Instead of running 100 batches sequentially (which took several minutes), batches are executed using an asynchronous concurrency pool with a concurrency limit of 3.
* Reduces overall translation time by **~65%–75%**.

### Step 5: Automatic Exponential Backoff Retries
* If an individual batch encounters a network drop, timeout, or rate limit error (HTTP 429/500/503), it automatically retries up to **3 times** with exponential backoff (`1000ms`, `2000ms`, `4000ms` + random jitter) before failing.

---

## 4. UI & Modal Enhancements

### TranslationProgressModal (`src/components/TranslationProgressModal.tsx`)
1. **Simplified Language Display:** Shows clean, natural language names (e.g., `French`, `Tamil`, `Japanese`) instead of raw technical codes.
2. **Synchronized In-Flight Batch Range:**
   * **Modal:** Displays `Translating Batches 1–3 of 13...` alongside the percentage.
   * **Status Bar:** Matches dynamically with `Translating parts 1–3 of 13 to Tamil...`.
3. **Controls:**
   * **Stop Button:** Cleanly aborts the `AbortController` and halts all in-flight workers.
   * **Pause / Resume Button:** Uses a reactive state loop to pause async workers safely.
   * **Run in Background / Done:** Closes the modal while translation continues in the background, updating the project pane.
4. **Visual Polish:**
   * Replaced low-contrast animations with an opacity pulse animation.
   * Renders AI engine details (`Ollama (Local) • model-name` or `OpenAI API`).
   * Displays completion summary with total lines translated and elapsed seconds upon finish.
