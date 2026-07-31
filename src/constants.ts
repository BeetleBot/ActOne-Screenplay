export const STORAGE_KEYS = {
  RECENT_FILES: "actone-recent-files",
  OUTLINE_FONT_SIZE: "actone-outline-font-size",
  CUSTOM_THEMES: "actone-custom-themes",
  THEME_ID: "actone-theme-id",
  FONT_FAMILY: "actone-font-family",
  TYPEWRITER_MODE: "actone-typewriter-mode",
  PAPER_SIZE: "actone-paper-size",
  ZOOM_LEVEL: "actone-zoom-level",
  APP_SCALE: "actone-app-scale",
  AUTOCOMPLETE_ENABLED: "actone-autocomplete-enabled",
  SMART_QUOTES_ENABLED: "actone-smart-quotes-enabled",
  MATCH_PARENTHESES_ENABLED: "actone-match-parentheses-enabled",
  AUTO_SAVE_ENABLED: "actone-auto-save-enabled",
  AUTO_SAVE_INTERVAL: "actone-auto-save-interval",
  ACTIVE_SPRINTS: "actone-active-sprints",
  SPRINT_HISTORY: "actone-sprint-history",
  HIDE_SYNTAX_ENABLED: "actone-hide-syntax-enabled",
  HIDE_TAGS_ENABLED: "actone-hide-tags-enabled",
  LINE_FOCUS_ENABLED: "actone-line-focus-enabled",
  LOW_POWER_MODE: "actone-low-power-mode",
  SNAPSHOTS_ENABLED: "actone-snapshots-enabled",
  SNAPSHOT_LOCATION: "actone-snapshot-location",
  SNAPSHOT_CUSTOM_PATH: "actone-snapshot-custom-path",
  SNAPSHOT_AUTO_ENABLED: "actone-snapshot-auto-enabled",
  SNAPSHOT_AUTO_INTERVAL: "actone-snapshot-auto-interval",
  SNAPSHOT_ON_SAVE: "actone-snapshot-on-save",
  SNAPSHOT_MAX_RETENTION: "actone-snapshot-max-retention",
  FOUNTAIN_COLORS_ENABLED: "actone-fountain-colors-enabled",
  RIGHT_PANE_WIDTH: "actone-right-pane-width",
  LAST_EXPORT_DIR: "actone-last-export-dir",
  APP_ICON: "actone-app-icon",
  ICON_STYLE: "actone-icon-style",
  PROMPT_PROVIDER: "actone-prompt-provider",
  PROMPT_MODEL: "actone-prompt-model",
  PROMPT_SYSTEM_PROMPT: "actone-prompt-system-prompt",
  PROMPT_REPHRASE_PROMPT: "actone-prompt-rephrase-prompt",
  PROMPT_REPHRASE_PRESETS: "actone-prompt-rephrase-presets",
  PROMPT_CHAT_TEMP: "actone-prompt-chat-temp",
  PROMPT_REPHRASE_TEMP: "actone-prompt-rephrase-temp",
  PROMPT_TRANSLATE_LANGUAGES: "actone-prompt-translate-languages",
  PROMPT_TRANSLATE_PROMPT: "actone-prompt-translate-prompt",
  PROMPT_TRANSLATE_TEMP: "actone-prompt-translate-temp",
  PROMPT_API_ENDPOINT: "actone-prompt-api-endpoint",
  PROMPT_API_KEY: "actone-prompt-api-key",
  PROMPT_API_MODEL: "actone-prompt-api-model",
  PROMPT_API_LIST: "actone-prompt-api-list",
  PROMPT_OLLAMA_URL: "actone-prompt-ollama-url",
  PROMPT_WRITESCENE_INSTRUCTIONS: "actone-prompt-writescene-instructions",
  PROMPT_Q_INSTRUCTIONS: "actone-prompt-q-instructions",
  PROMPT_SYNONYMS_INSTRUCTIONS: "actone-prompt-synonyms-instructions",
  PROMPT_LOOKUP_INSTRUCTIONS: "actone-prompt-lookup-instructions",
} as const;

export const FOUNTAIN_SYNTAX_RULES = [
  "1. Scene Headings (Sluglines):",
  "   Scene headings define where and when a scene takes place.",
  "   - Rule: Must start with INT., EXT., INT/EXT., EXT/INT., or I/E..",
  "   - Alternative: You can also force a scene heading by starting the line with a single period '.', followed by text (e.g., .ON THE ROAD).",
  "   - Example: INT. COFFEE SHOP - DAY",
  "2. Action (Action Paragraphs):",
  "   Action describes what is happening in the scene.",
  "   - Rule: Any line of text that doesn't match any other screenplay element (like Character, Dialogue, etc.) is treated as Action.",
  "   - Example: John paces back and forth, tapping his fingers against the table.",
  "3. Characters & Dialogue Blocks:",
  "   Dialogue elements show who is talking and what they are saying. They must never have blank lines separating them.",
  "   - Character Name: Must be written in ALL CAPS, preceded by an empty line, and followed directly by dialogue on the next line (Example: JOHN).",
  "   - Parentheticals: Describes how the character speaks. It must start with '(' and end with ')' and be placed directly between the Character Name and Dialogue (Example: (whispering)).",
  "   - Dialogue: The actual text spoken by the character, placed directly beneath the Character name or Parenthetical.",
  "   - Example:",
  "     JOHN",
  "     (whispering)",
  "     Did you hear that?",
  "4. Transitions:",
  "   Transitions describe a visual change between scenes (e.g. cutting, fading).",
  "   - Rule: Must be in ALL CAPS and end in TO:. They must be preceded by and followed by a blank line.",
  "   - Alternative: You can force a transition by starting the line with a greater-than symbol '>' (e.g., > Fade out.).",
  "   - Example: CUT TO:",
  "5. Dual Dialogue:",
  "   When two characters speak simultaneously.",
  "   - Rule: Place a caret '^' at the end of the second Character name.",
  "   - Example:",
  "     JOHN",
  "     I'm ready.",
  "     MARY ^",
  "     Me too.",
  "6. Title Page (Metadata):",
  "   Fountain documents can start with a title page.",
  "   - Rule: Key-value pairs separated by colons (e.g. Title:, Author:) placed at the very top of the document. Multiple lines under a key should be indented. There should be no blank lines between metadata lines.",
  "   - Example:",
  "     Title: ACT ONE",
  "     Author: Writer Name",
  "     Source: Based on true events.",
  "7. Formatted Text (Bold, Italic, Underline):",
  "   You can style words within action or dialogue lines using markdown-like symbols:",
  "   - Italic: Wrap text in single asterisks (*italics*)",
  "   - Bold: Wrap text in double asterisks (**bold**)",
  "   - Underline: Wrap text in underscores (_underline_)",
  "   - Example: She walks **very slowly** toward the door.",
  "8. Line-by-Line & Structural Integrity:",
  "   - When rephrasing or writing script blocks, preserve the exact line breaks and paragraph separations.",
  "   - Do NOT introduce new blank lines, merge lines, or split single lines into multiple sections.",
  "   - Do NOT remove or modify formatting and list indicators such as bullets ('-'), forced shot overrides ('!!'), or synopsis markers ('='). Keep them intact on their respective lines.",
  "9. Punctuation Rules (No Dashes):",
  "   - Do NOT use dashes or hyphens (- or -- or —) unless they are part of a necessary compound word like 'co-working' or 'ten-year-old'. Use commas, full stops, or conjunctions (and, but, so) instead.",
  "10. Language Preservation:",
  "   - Rephrasing must NEVER change the language of the text. Rephrase exactly in the same language the user has written (e.g. if the input is in German, the output must be in German; if Hindi, Hindi, etc.)."
].join("\n");

export const PILL_RADIUS = "0px";

export const MAX_RECENT_FILES = 10;

export interface ApiEntry {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface Category {
  key: string;
  label: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { key: "cast", label: "Cast (Character)", color: "var(--cat-cast)" },
  { key: "prop", label: "Prop", color: "var(--cat-prop)" },
  { key: "vfx", label: "VFX", color: "var(--cat-vfx)" },
  { key: "sfx", label: "SFX (Special Effect)", color: "var(--cat-sfx)" },
  { key: "camera", label: "Camera", color: "var(--cat-camera)" },
  { key: "animal", label: "Animal", color: "var(--cat-animal)" },
  { key: "extras", label: "Extras", color: "var(--cat-extras)" },
  { key: "vehicle", label: "Vehicle", color: "var(--cat-vehicle)" },
  { key: "costume", label: "Costume", color: "var(--cat-costume)" },
  { key: "makeup", label: "Makeup", color: "var(--cat-makeup)" },
  { key: "music", label: "Music", color: "var(--cat-music)" },
  { key: "sound", label: "Sound", color: "var(--cat-sound)" },
  { key: "stunt", label: "Stunt", color: "var(--cat-stunt)" },
  { key: "setDesign", label: "Set Design", color: "var(--cat-setDesign)" },
  { key: "other", label: "Other (Generic)", color: "var(--cat-other)" }
];
