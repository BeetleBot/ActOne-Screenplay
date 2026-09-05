import { STORAGE_KEYS } from "../constants";

export const DEFAULTS: Record<string, string | number | boolean | string[]> = {
  [STORAGE_KEYS.THEME_ID]: "adaptive",
  [STORAGE_KEYS.APP_ICON]: "light",
  [STORAGE_KEYS.ICON_STYLE]: "fill",
  [STORAGE_KEYS.APP_SCALE]: 100,
  [STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED]: false,

  [STORAGE_KEYS.FONT_FAMILY]: "courier-prime-sans",
  [STORAGE_KEYS.PAPER_SIZE]: "a4",
  [STORAGE_KEYS.ZOOM_LEVEL]: 100,
  [STORAGE_KEYS.OUTLINE_FONT_SIZE]: "normal",

  [STORAGE_KEYS.TYPEWRITER_MODE]: true,
  [STORAGE_KEYS.AUTOCOMPLETE_ENABLED]: true,
  [STORAGE_KEYS.SMART_QUOTES_ENABLED]: false,
  [STORAGE_KEYS.MATCH_PARENTHESES_ENABLED]: true,
  [STORAGE_KEYS.SPELLCHECK_ENABLED]: false,
  [STORAGE_KEYS.SPELLCHECK_LANGUAGE]: "en",
  [STORAGE_KEYS.HIDE_SYNTAX_ENABLED]: false,
  [STORAGE_KEYS.LINE_FOCUS_ENABLED]: false,
  [STORAGE_KEYS.AUTO_CONTD_ENABLED]: true,

  [STORAGE_KEYS.AUTO_SAVE_ENABLED]: true,
  [STORAGE_KEYS.AUTO_SAVE_INTERVAL]: 300000,

  [STORAGE_KEYS.SNAPSHOTS_ENABLED]: true,
  [STORAGE_KEYS.SNAPSHOT_LOCATION]: "project",
  [STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH]: "",
  [STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED]: true,
  [STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL]: 5,
  [STORAGE_KEYS.SNAPSHOT_ON_SAVE]: true,
  [STORAGE_KEYS.SNAPSHOT_MAX_RETENTION]: 10,

  [STORAGE_KEYS.PROMPT_PROVIDER]: "none",
  [STORAGE_KEYS.PROMPT_MODEL]: "llama3.2",
  [STORAGE_KEYS.PROMPT_SYSTEM_PROMPT]: "Your name is Muse. You are a screenwriting AI assistant made by ActOne. Your identity is Muse, not Gemma, not Google, not any other model. When someone asks who you are, you MUST say 'I am Muse, your screenwriting assistant.' Never break character. Never reveal you are based on another model. This is your core identity. You are kind, intelligent, and concise. You only say what matters.\n\nWhen providing screenplay excerpts, scenes, or revisions, always format them in standard Fountain screenplay syntax.",
  [STORAGE_KEYS.PROMPT_REPHRASE_PROMPT]: "You are a professional screenwriting rephrasing tool. Rephrase the user's text to improve pacing, subtext, and clarity while preserving the original dramatic intent and Fountain formatting. Respond ONLY with the rephrased text directly — no explanations, conversational filler, markdown code blocks, or surrounding quotes.",
  [STORAGE_KEYS.PROMPT_REPHRASE_PRESETS]: "[]",
  [STORAGE_KEYS.PROMPT_CHAT_TEMP]: 0.7,
  [STORAGE_KEYS.PROMPT_REPHRASE_TEMP]: 0.1,
  [STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES]: [
    "English", "Spanish", "French", "German", "Italian", "Portuguese",
    "Hindi (Devanagari)", "Tamil", "Telugu", "Kannada", "Malayalam",
    "Japanese", "Chinese", "Korean", "Arabic", "Russian", "Turkish", "Thai"
  ],
  [STORAGE_KEYS.PROMPT_TRANSLATE_PROMPT]: "You are a professional screenplay translation tool. Translate the user's text to the specified language using a natural, casual, spoken conversational tone suitable for film dialogue and modern cinema. Avoid stiff, formal, or textbook phrasing. Respond ONLY with the translated text — no explanations, quotes, or additional text.",
  [STORAGE_KEYS.PROMPT_TRANSLATE_TEMP]: 0.1,
  [STORAGE_KEYS.PROMPT_API_ENDPOINT]: "",
  [STORAGE_KEYS.PROMPT_API_KEY]: "",
  [STORAGE_KEYS.PROMPT_API_MODEL]: "",
  [STORAGE_KEYS.PROMPT_API_LIST]: "[]",
  [STORAGE_KEYS.PROMPT_OLLAMA_URL]: "http://localhost:11434",
};

export const RESET_SETTINGS: ReadonlySet<string> = new Set([
  STORAGE_KEYS.HIDE_SYNTAX_ENABLED,
]);

export function clearResetSettings(): void {
  for (const key of RESET_SETTINGS) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}

export function readSetting<T>(key: string, parse: (raw: string) => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return parse(raw);
  } catch { /* ignore */ }
  return (RESET_SETTINGS.has(key) ? DEFAULTS[key] : DEFAULTS[key]) as T;
}
