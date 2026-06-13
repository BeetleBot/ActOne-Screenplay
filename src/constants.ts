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
  SHOW_PAGE_NUMBERS: "actone-show-page-numbers",
  SHOW_PAGE_SEPARATORS: "actone-show-page-separators",
  AUTO_SAVE_ENABLED: "actone-auto-save-enabled",
  AUTO_SAVE_INTERVAL: "actone-auto-save-interval",
  ACTIVE_SPRINTS: "actone-active-sprints",
  SPRINT_HISTORY: "actone-sprint-history",
} as const;

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 300;
export const ZOOM_DEFAULT = 100;
export const ZOOM_STEP = 10;
export const SCALE_MIN = 75;
export const SCALE_MAX = 150;
export const SCALE_DEFAULT = 100;

export const PILL_RADIUS = "9999px";

export const FOCUS_DELAY_MS = 50;
export const TYPEWRITER_SCROLL_DELAY_MS = 50;
export const TYPEWRITER_INITIAL_SCROLL_DELAY_MS = 100;
export const DEBOUNCE_PAGE_BREAKS_MS = 1000;

export const MAX_RECENT_FILES = 10;

export const EDITOR_WINDOW_WIDTH = 1000;
export const EDITOR_WINDOW_HEIGHT = 700;
export const EDITOR_WINDOW_TIMEOUT_MS = 5000;

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 800;
export const ACTIVITY_BAR_WIDTH = 48;

export const FOCUS_TRAP_DELAY_MS = 30;
export const DBL_CLICK_THRESHOLD_MS = 400;
export const ARROW_SCROLL_AMOUNT = 40;
export const PAGE_SCROLL_RATIO = 0.8;

export const DRAG_GHOST_Z_INDEX = 10000;
export const DRAG_HANDLE_Z_INDEX = 99999;
export const RESIZE_HANDLE_Z_INDEX = 99998;

export const AUTO_SAVE_INTERVALS = [30000, 60000, 120000, 300000] as const;

export const DEFAULT_AUTO_SAVE_INTERVAL = 60000;
