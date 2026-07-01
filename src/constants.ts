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
  SNAPSHOTS_ENABLED: "actone-snapshots-enabled",
  SNAPSHOT_LOCATION: "actone-snapshot-location",
  SNAPSHOT_CUSTOM_PATH: "actone-snapshot-custom-path",
  SNAPSHOT_AUTO_ENABLED: "actone-snapshot-auto-enabled",
  SNAPSHOT_AUTO_INTERVAL: "actone-snapshot-auto-interval",
  SNAPSHOT_ON_SAVE: "actone-snapshot-on-save",
  SNAPSHOT_MAX_RETENTION: "actone-snapshot-max-retention",
} as const;

export const PILL_RADIUS = "9999px";

export const MAX_RECENT_FILES = 10;

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
