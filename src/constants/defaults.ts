import { STORAGE_KEYS } from "../constants";

export const DEFAULTS: Record<string, string | number | boolean> = {
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
  [STORAGE_KEYS.HIDE_SYNTAX_ENABLED]: false,
  [STORAGE_KEYS.HIDE_TAGS_ENABLED]: false,
  [STORAGE_KEYS.LINE_FOCUS_ENABLED]: false,

  [STORAGE_KEYS.AUTO_SAVE_ENABLED]: true,
  [STORAGE_KEYS.AUTO_SAVE_INTERVAL]: 300000,

  [STORAGE_KEYS.SNAPSHOTS_ENABLED]: true,
  [STORAGE_KEYS.SNAPSHOT_LOCATION]: "project",
  [STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH]: "",
  [STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED]: true,
  [STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL]: 5,
  [STORAGE_KEYS.SNAPSHOT_ON_SAVE]: true,
  [STORAGE_KEYS.SNAPSHOT_MAX_RETENTION]: 10,
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
