import { createTheme, type ThemeOptions } from '@mui/material/styles';

export type ThemeId = 'adaptive' | 'catppuccin-adaptive' | 'pitch-adaptive' | 'catppuccin-latte' | 'catppuccin-mocha' | 'light' | 'dark' | 'pitch-white' | 'pitch-black' | 'sunrise' | 'sunset' | 'mint' | 'forest' | 'rose' | 'berry' | 'ocean' | 'honey' | 'plum' | 'sky' | 'slate';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  editor: string;
  text: string;
  accent: string;
  sidebar: string;
  button: string;
  selectionText: string;
  selectionBg: string;
  dropdown: string;
  dropdownText: string;
  border: string;
  textSecondary: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  desc: string;
  isDark: boolean;
  colors: ThemeColors;
  category: "classic" | "catppuccin" | "pitch" | "pastel" | "other" | "custom";
}

export interface ThemeCategory {
  label: string;
  category: string;
  adaptiveId?: string;
}

export const ADAPTIVE_THEME_META: Record<string, {
  label: string;
  splitLightBg: string;
  splitLightDot: string;
  splitDarkBg: string;
  splitDarkDot: string;
  swatchColors: [string, string, string, string];
}> = {
  adaptive: {
    label: "Adaptive",
    splitLightBg: "#EEEEEE",
    splitLightDot: "#555555",
    splitDarkBg: "#101010",
    splitDarkDot: "#555555",
    swatchColors: ["#EEEEEE", "#101010", "#555555", "#555555"],
  },
  "catppuccin-adaptive": {
    label: "Catppuccin Adaptive",
    splitLightBg: "#e6e9ef",
    splitLightDot: "#8839ef",
    splitDarkBg: "#181825",
    splitDarkDot: "#cba6f7",
    swatchColors: ["#eff1f5", "#181825", "#8839ef", "#cba6f7"],
  },
  "pitch-adaptive": {
    label: "Pitch Adaptive",
    splitLightBg: "#ffffff",
    splitLightDot: "#000000",
    splitDarkBg: "#000000",
    splitDarkDot: "#9a9996",
    swatchColors: ["#ffffff", "#000000", "#000000", "#9a9996"],
  },
};

export const THEME_CATEGORIES: ThemeCategory[] = [
  { label: "CLASSIC", category: "classic", adaptiveId: "adaptive" },
  { label: "CATPPUCCIN", category: "catppuccin", adaptiveId: "catppuccin-adaptive" },
  { label: "PITCH", category: "pitch", adaptiveId: "pitch-adaptive" },
  { label: "PASTEL", category: "pastel" },
];

export function deriveAllColors(colors: {
  editor: string;
  text: string;
  accent: string;
  sidebar: string;
  button: string;
}, isDark: boolean, overrides?: Partial<Pick<ThemeColors, 'border' | 'textSecondary' | 'dropdown' | 'dropdownText' | 'selectionBg' | 'selectionText'>>): ThemeColors {
  return {
    editor: colors.editor,
    text: colors.text,
    accent: colors.accent,
    sidebar: colors.sidebar,
    button: colors.button,
    selectionText: overrides?.selectionText ?? colors.text,
    selectionBg: overrides?.selectionBg ?? (isDark
      ? `rgba(${hexToRgbStr(colors.accent)}, 0.25)`
      : `rgba(${hexToRgbStr(colors.accent)}, 0.20)`),
    dropdown: overrides?.dropdown ?? colors.sidebar,
    dropdownText: overrides?.dropdownText ?? colors.text,
    border: overrides?.border ?? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'),
    textSecondary: overrides?.textSecondary ?? (isDark ? 'rgba(255,255,255,0.54)' : 'rgba(0,0,0,0.54)'),
  };
}

export const themes: ThemeConfig[] = [
  {
    id: "light",
    name: "Classic Light",
    desc: "Clean light theme",
    isDark: false,
    category: "classic",
    colors: deriveAllColors({
      editor: "#EEEEEE",
      text: "#101010",
      accent: "#555555",
      sidebar: "#E2E4E8",
      button: "#555555",
    }, false),
  },
  {
    id: "dark",
    name: "Classic Dark",
    desc: "Clean dark theme",
    isDark: true,
    category: "classic",
    colors: deriveAllColors({
      editor: "#101010",
      text: "#CCCCCC",
      accent: "#555555",
      sidebar: "#161719",
      button: "#555555",
    }, true),
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    desc: "Soft light theme with purple accents",
    isDark: false,
    category: "catppuccin",
    colors: deriveAllColors({
      editor: "#eff1f5",
      text: "#4c4f69",
      accent: "#8839ef",
      sidebar: "#e6e9ef",
      button: "#8839ef",
    }, false, {
      border: "#bcc0cc",
      textSecondary: "#6c6f85",
    }),
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    desc: "Rich dark theme with purple accents",
    isDark: true,
    category: "catppuccin",
    colors: deriveAllColors({
      editor: "#11111b",
      text: "#cdd6f4",
      accent: "#cba6f7",
      sidebar: "#181825",
      button: "#cba6f7",
    }, true),
  },
  {
    id: "pitch-white",
    name: "Pitch Light",
    desc: "Pure white e-ink style, only black and white",
    isDark: false,
    category: "pitch",
    colors: deriveAllColors({
      editor: "#ffffff",
      text: "#000000",
      accent: "#000000",
      sidebar: "#f4f4f6",
      button: "#000000",
    }, false),
  },
  {
    id: "pitch-black",
    name: "Pitch Dark",
    desc: "Pure black background with grey tones",
    isDark: true,
    category: "pitch",
    colors: deriveAllColors({
      editor: "#000000",
      text: "#deddda",
      accent: "#9a9996",
      sidebar: "#101012",
      button: "#c3c3c3",
    }, true),
  },

  {
    id: "sunrise",
    name: "Sunrise",
    desc: "Warm pastel cream with soft coral accents",
    isDark: false,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#fffaf0",
      text: "#221510",
      accent: "#e88a6a",
      sidebar: "#fff5ee",
      button: "#e88a6a",
    }, false),
  },
  {
    id: "sunset",
    name: "Sunset",
    desc: "Deep warm brown with soft coral accents",
    isDark: true,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#1a1012",
      text: "#f7f0ea",
      accent: "#e88a6a",
      sidebar: "#24161a",
      button: "#e88a6a",
    }, true),
  },
  {
    id: "mint",
    name: "Mint",
    desc: "Pale mint pastel with soft green accents",
    isDark: false,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#f0faf2",
      text: "#16241c",
      accent: "#7ec89e",
      sidebar: "#eef8f2",
      button: "#7ec89e",
    }, false),
  },
  {
    id: "forest",
    name: "Forest",
    desc: "Deep forest green with soft green accents",
    isDark: true,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#101a14",
      text: "#f0faf4",
      accent: "#7ec89e",
      sidebar: "#16241e",
      button: "#7ec89e",
    }, true),
  },
  {
    id: "rose",
    name: "Rose",
    desc: "Soft blush pastel with rose accents",
    isDark: false,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#fdf0f4",
      text: "#24181a",
      accent: "#e89eb8",
      sidebar: "#faf0f2",
      button: "#e89eb8",
    }, false),
  },
  {
    id: "berry",
    name: "Berry",
    desc: "Deep berry with rose accents",
    isDark: true,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#1a1016",
      text: "#faf0f4",
      accent: "#e89eb8",
      sidebar: "#24161e",
      button: "#e89eb8",
    }, true),
  },
  {
    id: "ocean",
    name: "Ocean",
    desc: "Deep teal blue pastel",
    isDark: true,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#0e1a28",
      text: "#eaf4f8",
      accent: "#4ecdc4",
      sidebar: "#12202e",
      button: "#4ecdc4",
    }, true),
  },
  {
    id: "honey",
    name: "Honey",
    desc: "Warm golden cream pastel",
    isDark: false,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#fefaf0",
      text: "#241e14",
      accent: "#e8c87e",
      sidebar: "#fcf6ea",
      button: "#e8c87e",
    }, false),
  },
  {
    id: "plum",
    name: "Plum",
    desc: "Dark plum purple pastel",
    isDark: true,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#1e1428",
      text: "#f6eefc",
      accent: "#c89ed4",
      sidebar: "#261a32",
      button: "#c89ed4",
    }, true),
  },
  {
    id: "sky",
    name: "Sky",
    desc: "Light pastel blue",
    isDark: false,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#f0f6fe",
      text: "#141e2c",
      accent: "#7eace8",
      sidebar: "#eaf2fc",
      button: "#7eace8",
    }, false),
  },
  {
    id: "slate",
    name: "Slate",
    desc: "Dark blue-grey pastel",
    isDark: true,
    category: "pastel",
    colors: deriveAllColors({
      editor: "#12161e",
      text: "#ecf0f6",
      accent: "#8a9eb8",
      sidebar: "#181e28",
      button: "#8a9eb8",
    }, true),
  },
];

const shared: ThemeOptions = {
  typography: {
    fontFamily: 'var(--font-ui, "Inter", sans-serif)',
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiTooltip: {
      defaultProps: {
        enterDelay: 1000,
        enterNextDelay: 1000,
        arrow: true,
      },
    },
  },
  shape: { borderRadius: 6 },
  transitions: {
    duration: { shortest: 120, shorter: 200, short: 300 },
  },
};

function hexToRgbStr(hex: string): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

function getEditorVars(t: ThemeConfig, appScale: number, fountainColorsEnabled: boolean = false) {
  const c = t.colors;
  const isCatppuccinLatte = t.id === 'catppuccin-latte';
  const isCatppuccinMocha = t.id === 'catppuccin-mocha';
  const cursorColor = t.isDark ? "%23FFFFFF" : "%23000000";
  const mouseCursorSvg = `url('data:image/svg+xml;utf8,<svg width="22" height="22" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path fill="${cursorColor}" d="M5 2a.5.5 0 0 1 .5-.5c.862 0 1.573.287 2.06.566.174.099.321.198.44.286.119-.088.266-.187.44-.286A4.165 4.165 0 0 1 10.5 1.5a.5.5 0 0 1 0 1c-.638 0-1.177.213-1.564.434a3.49 3.49 0 0 0-.436.294V7.5H9a.5.5 0 0 1 0 1h-.5v4.272c.1.08.248.187.436.294.387.221.926.434 1.564.434a.5.5 0 0 1 0 1 4.165 4.165 0 0 1-2.06-.566A4.561 4.561 0 0 1 8 13.65a4.561 4.561 0 0 1-.44.285 4.165 4.165 0 0 1-2.06.566.5.5 0 0 1 0-1c.638 0 1.177-.213 1.564-.434.188-.107.335-.214.436-.294V8.5H7a.5.5 0 0 1 0-1h.5V3.228a3.49 3.49 0 0 0-.436-.294A3.166 3.166 0 0 0 5.5 2.5.5.5 0 0 1 5 2zm3.352 1.355zm-.704 9.29z"/></svg>') 11 11, text`;
  return {
    '--app-scale': `${appScale}%`,
    '--bg-app': c.editor,
    '--bg-sidebar': c.sidebar,
    '--bg-editor-wrapper': c.editor,
    '--bg-editor': 'transparent',
    '--bg-dropdown': c.dropdown,
    '--border-color': c.border,
    '--button-color': c.button,
    '--text-main': c.text,
    '--text-muted': c.textSecondary,
    '--text-secondary': c.textSecondary,
    '--accent-color': c.accent,
    '--accent-rgb': hexToRgbStr(c.accent),
    '--selection-bg': c.selectionBg,
    '--selection-text': c.selectionText,
    '--dropdown-text': c.dropdownText,
    '--titlebar-bg': c.sidebar,
    '--text-editor-heading': fountainColorsEnabled ? c.accent : c.text,
    '--text-editor-character': fountainColorsEnabled ? `color-mix(in srgb, ${c.accent} 80%, ${c.text})` : c.text,
    '--text-editor-dialogue': c.text,
    '--text-editor-parenthetical': fountainColorsEnabled ? `color-mix(in srgb, ${c.accent} 55%, ${c.text})` : c.textSecondary,
    '--text-editor-action': c.text,
    '--text-editor-transition': fountainColorsEnabled ? `color-mix(in srgb, ${c.accent} 90%, ${c.text})` : c.text,
    '--text-editor-shot': fountainColorsEnabled ? `color-mix(in srgb, ${c.accent} 90%, ${c.text})` : c.text,
    '--text-editor-meta': fountainColorsEnabled ? `color-mix(in srgb, ${c.accent} 45%, ${c.text})` : c.textSecondary,
    '--text-editor-section': fountainColorsEnabled ? c.accent : c.text,
    '--editor-cursor': c.text,
    '--editor-mouse-cursor': mouseCursorSvg,

    '--prose-editor-fg': c.text,
    '--prose-editor-fg-muted': c.textSecondary,
    '--prose-editor-fg-faint': `color-mix(in srgb, ${c.text} 40%, transparent)`,
    '--prose-editor-border': c.border,
    '--prose-editor-accent': c.accent,
    '--prose-editor-accent-bright': c.accent,
    '--prose-editor-accent-soft': `color-mix(in srgb, ${c.accent} 40%, transparent)`,
    '--prose-editor-link': c.accent,
    '--prose-editor-link-hover': `color-mix(in srgb, ${c.accent} 80%, ${c.text})`,
    '--prose-editor-code-bg': `color-mix(in srgb, ${c.text} 6%, transparent)`,
    '--prose-editor-bg': 'transparent',
    '--prose-editor-bg-panel': c.editor,
    '--prose-editor-bg-surface': c.sidebar,
    '--prose-editor-selection-bg': c.selectionBg,

    '--scene-color-blue': isCatppuccinLatte ? '#1e66f5' : isCatppuccinMocha ? '#89b4fa' : '#2196f3',
    '--scene-color-brown': isCatppuccinLatte ? '#dd7878' : isCatppuccinMocha ? '#f2cdcd' : '#795548',
    '--scene-color-cyan': isCatppuccinLatte ? '#04a5e5' : isCatppuccinMocha ? '#89dceb' : '#00bcd4',
    '--scene-color-green': isCatppuccinLatte ? '#40a02b' : isCatppuccinMocha ? '#a6e3a1' : '#4caf50',
    '--scene-color-magenta': isCatppuccinLatte ? '#ea76cb' : isCatppuccinMocha ? '#f5c2e7' : '#e91e63',
    '--scene-color-orange': isCatppuccinLatte ? '#fe640b' : isCatppuccinMocha ? '#fab387' : '#ff9800',
    '--scene-color-pink': isCatppuccinLatte ? '#ea76cb' : isCatppuccinMocha ? '#f5c2e7' : '#e91e63',
    '--scene-color-purple': isCatppuccinLatte ? '#8839ef' : isCatppuccinMocha ? '#cba6f7' : '#9c27b0',
    '--scene-color-red': isCatppuccinLatte ? '#d20f39' : isCatppuccinMocha ? '#f38ba8' : '#f44336',
    '--scene-color-yellow': isCatppuccinLatte ? '#df8e1d' : isCatppuccinMocha ? '#f9e2af' : '#ffeb3b',

    '--cat-cast': isCatppuccinLatte ? '#04a5e5' : isCatppuccinMocha ? '#89dceb' : '#00bcd4',
    '--cat-prop': isCatppuccinLatte ? '#fe640b' : isCatppuccinMocha ? '#fab387' : '#ff9800',
    '--cat-vfx': isCatppuccinLatte ? '#8839ef' : isCatppuccinMocha ? '#cba6f7' : '#9c27b0',
    '--cat-sfx': isCatppuccinLatte ? '#dd7878' : isCatppuccinMocha ? '#f2cdcd' : '#795548',
    '--cat-camera': isCatppuccinLatte ? '#179299' : isCatppuccinMocha ? '#94e2d5' : '#00ffcc',
    '--cat-animal': isCatppuccinLatte ? '#df8e1d' : isCatppuccinMocha ? '#f9e2af' : '#ffeb3b',
    '--cat-extras': isCatppuccinLatte ? '#ea76cb' : isCatppuccinMocha ? '#f5c2e7' : '#e91e63',
    '--cat-vehicle': isCatppuccinLatte ? '#209fb5' : isCatppuccinMocha ? '#74c7ec' : '#008080',
    '--cat-costume': isCatppuccinLatte ? '#7287fd' : isCatppuccinMocha ? '#b4befe' : '#ffc0cb',
    '--cat-makeup': isCatppuccinLatte ? '#40a02b' : isCatppuccinMocha ? '#a6e3a1' : '#4caf50',
    '--cat-music': isCatppuccinLatte ? '#df8e1d' : isCatppuccinMocha ? '#f9e2af' : '#808000',
    '--cat-sound': isCatppuccinLatte ? '#d20f39' : isCatppuccinMocha ? '#f38ba8' : '#ff6666',
    '--cat-stunt': isCatppuccinLatte ? '#1e66f5' : isCatppuccinMocha ? '#89b4fa' : '#2196f3',
    '--cat-setDesign': isCatppuccinLatte ? '#fe640b' : isCatppuccinMocha ? '#fab387' : '#daa520',
    '--cat-other': isCatppuccinLatte ? '#9ca0b0' : isCatppuccinMocha ? '#9399b2' : '#9e9e9e',

    '--gender-male': isCatppuccinLatte ? '#1e66f5' : isCatppuccinMocha ? '#89b4fa' : '#0081ef',
    '--gender-female': isCatppuccinLatte ? '#ea76cb' : isCatppuccinMocha ? '#f5c2e7' : '#fa6fc1',
    '--gender-nonbinary': isCatppuccinLatte ? '#8839ef' : isCatppuccinMocha ? '#cba6f7' : '#b520da',
    '--gender-unknown': isCatppuccinLatte ? '#9ca0b0' : isCatppuccinMocha ? '#9399b2' : '#969696',
  };
}

function cssVarBlock(vars: Record<string, string>) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n    ');
}

export function mixHex(color1: string, color2: string, weight: number): string {
  let h1 = color1.replace('#', '');
  let h2 = color2.replace('#', '');
  if (h1.length === 3) h1 = h1.split('').map(x => x + x).join('');
  if (h2.length === 3) h2 = h2.split('').map(x => x + x).join('');

  const r1 = parseInt(h1.substring(0, 2), 16);
  const g1 = parseInt(h1.substring(2, 4), 16);
  const b1 = parseInt(h1.substring(4, 6), 16);

  const r2 = parseInt(h2.substring(0, 2), 16);
  const g2 = parseInt(h2.substring(2, 4), 16);
  const b2 = parseInt(h2.substring(4, 6), 16);

  const r = Math.round(r1 * weight + r2 * (1 - weight));
  const g = Math.round(g1 * weight + g2 * (1 - weight));
  const b = Math.round(b1 * weight + b2 * (1 - weight));

  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

export function deriveThemeBg(accent: string, isDark: boolean): string {
  return isDark ? mixHex(accent, "#000000", 0.08) : mixHex(accent, "#ffffff", 0.03);
}

export function createActOneTheme(t: ThemeConfig, appScale: number, fountainColorsEnabled: boolean = false) {
  const c = t.colors;
  const editorVars = getEditorVars(t, appScale, fountainColorsEnabled);

  return createTheme({
    ...shared,
    palette: {
      mode: t.isDark ? 'dark' : 'light',
      primary: { main: c.accent },
      background: {
        default: c.editor,
        paper: c.sidebar,
      },
      text: {
        primary: c.text,
        secondary: c.textSecondary,
      },
      divider: c.border,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          body {
            ${cssVarBlock(editorVars)}
          }
        `,
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
          disableTouchRipple: true,
        },
      },
      MuiButton: {
        defaultProps: {
          disableRipple: true,
          disableTouchRipple: true,
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 6,
            textTransform: 'none',
            fontWeight: 600,
            transition: 'all 0.15s ease-in-out',
          },
          contained: {
            background: `linear-gradient(180deg, ${c.accent} 0%, color-mix(in srgb, ${c.accent} 85%, #000) 100%)`,
            border: '1px solid',
            borderColor: `color-mix(in srgb, ${c.accent} 75%, #000)`,
            boxShadow: 'inset 0 1.5px 0px rgba(255, 255, 255, 0.12), 0 1px 2px rgba(0, 0, 0, 0.15)',
            color: '#fff',
            '&:hover': {
              background: `linear-gradient(180deg, color-mix(in srgb, ${c.accent} 93%, #fff) 0%, color-mix(in srgb, ${c.accent} 93%, #000) 100%)`,
              borderColor: `color-mix(in srgb, ${c.accent} 85%, #000)`,
              boxShadow: 'inset 0 1.5px 0px rgba(255, 255, 255, 0.18), 0 2px 4px rgba(0, 0, 0, 0.2)',
            },
            '&:active': {
              background: `color-mix(in srgb, ${c.accent} 85%, #000)`,
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
            },
            '&.MuiButton-colorInherit': {
              background: `linear-gradient(180deg, ${c.button} 0%, color-mix(in srgb, ${c.button} 85%, #000) 100%)`,
              borderColor: `color-mix(in srgb, ${c.button} 80%, #000)`,
              color: c.text,
              boxShadow: 'inset 0 1.5px 0px rgba(255, 255, 255, 0.08), 0 1px 2px rgba(0, 0, 0, 0.15)',
              '&:hover': {
                background: `linear-gradient(180deg, color-mix(in srgb, ${c.button} 93%, #fff) 0%, color-mix(in srgb, ${c.button} 93%, #000) 100%)`,
                borderColor: `color-mix(in srgb, ${c.button} 80%, #000)`,
              },
            },
          },
          outlined: {
            backgroundColor: 'transparent',
            border: '1px solid',
            borderColor: c.border,
            color: c.text,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            '&:hover': {
              borderColor: c.accent,
              backgroundColor: `color-mix(in srgb, ${c.accent} 8%, transparent)`,
              color: c.text,
            },
          },
          text: {
            color: c.textSecondary,
            '&:hover': {
              backgroundColor: 'action.hover',
              color: c.text,
            },
          },
        },
      },
      MuiIconButton: {
        defaultProps: {
          disableRipple: true,
          disableTouchRipple: true,
        },
      },
      MuiToggleButton: {
        defaultProps: {
          disableRipple: true,
          disableTouchRipple: true,
        },
      },
      MuiTextField: {
        defaultProps: {
          slotProps: {
            input: {
              autoComplete: "off"
            }
          }
        }
      },
      MuiDialog: {
        defaultProps: {
          transitionDuration: 0,
        },
        styleOverrides: {
          paper: {
            borderRadius: 12,
            outline: 'none',
            border: '1px solid',
            borderColor: c.border,
            boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.25)',
            '&:focus-visible': { outline: 'none' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', borderRadius: 8 },
        },
      },
      MuiPopover: {
        defaultProps: {
          slotProps: {
            paper: {
              sx: {
                borderRadius: '8px',
                border: '1px solid',
                borderColor: c.border,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                backgroundImage: 'none',
                backgroundColor: c.dropdown,
                color: c.dropdownText,
              },
            },
          },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true, enterDelay: 0, leaveDelay: 0 },
      },
      MuiMenu: {
        defaultProps: {
          slotProps: {
            paper: {
              sx: {
                borderRadius: '8px',
                border: '1px solid',
                borderColor: c.border,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              },
            },
          },
        },
        styleOverrides: {
          paper: {
            borderRadius: 8,
            backgroundColor: c.dropdown,
            color: c.dropdownText,
            padding: '4px 0',
          },
          list: {
            paddingTop: 0,
            paddingBottom: 0,
          },
        },
      },
      MuiMenuItem: {
        defaultProps: {
          disableRipple: true,
          disableTouchRipple: true,
        },
        styleOverrides: {
          root: {
            fontSize: '12px',
            paddingTop: '5px',
            paddingBottom: '5px',
            paddingLeft: '10px',
            paddingRight: '10px',
            minHeight: '28px',
            borderRadius: 6,
            margin: '2px 6px',
            transition: 'background-color 0.1s',
            '&.Mui-selected': {
              backgroundColor: 'action.selected',
            },
            '&.Mui-selected:hover': {
              backgroundColor: 'action.selected',
            },
            '& .MuiListItemText-primary': {
              fontSize: '12px',
            },
            '& .MuiListItemText-secondary': {
              fontSize: '10.5px',
              marginLeft: '8px',
            },
            '& .MuiListItemIcon-root': {
              minWidth: '24px',
              color: 'inherit',
            },
            '& .MuiSvgIcon-root': {
              fontSize: '16px',
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '12px',
            color: 'text.secondary',
            '&.Mui-focused': {
              color: 'primary.main',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            backgroundColor: c.dropdown,
            border: '1px solid',
            borderColor: c.border,
            transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
            '& fieldset': { border: 'none' },
            '&:hover': { 
              backgroundColor: 'action.hover',
              borderColor: 'text.secondary',
            },
            '&.Mui-focused': {
              backgroundColor: c.dropdown,
              borderColor: c.accent,
              boxShadow: `0 0 0 1px ${c.accent} inset`,
            },
          },
          notchedOutline: {
            border: 'none',
          },
        },
      },
      MuiInput: {
        styleOverrides: {
          root: {
            '&:before, &:after': { display: 'none' },
          },
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: {
            '&:before, &:after': { display: 'none' },
          },
        },
      },
      MuiSelect: {
        defaultProps: {
          MenuProps: {
            slotProps: {
              paper: { sx: { mt: '2px', borderRadius: '8px' } },
            },
          },
        },
        styleOverrides: {
          root: {
            fontSize: '12px',
            borderRadius: 6,
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            backgroundColor: c.dropdown,
            '&:hover': { backgroundColor: 'action.hover' },
            '&.Mui-focused': {
              backgroundColor: c.dropdown,
              boxShadow: `0 0 0 1px ${c.accent} inset`,
            },
          },
          select: {
            padding: '7.2px 10px',
          },
          icon: {
            color: 'text.secondary',
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            backgroundColor: c.dropdown,
            color: c.dropdownText,
            borderRadius: 8,
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            height: 2,
            padding: '13px 0',
            color: c.accent,
          },
          rail: {
            opacity: 0.24,
            backgroundColor: c.border,
          },
          track: {
            height: 2,
            border: 'none',
          },
          thumb: {
            width: 12,
            height: 12,
            boxShadow: 'none',
            border: '1.5px solid',
            borderColor: c.accent,
            backgroundColor: c.dropdown,
            transition: 'transform 0.15s, box-shadow 0.15s',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: `0 0 0 6px color-mix(in srgb, ${c.accent} 16%, transparent)`,
            },
            '&.Mui-active': {
              transform: 'scale(1.15)',
              boxShadow: `0 0 0 8px color-mix(in srgb, ${c.accent} 20%, transparent)`,
            },
          },
          valueLabel: {
            backgroundColor: c.dropdown,
            color: c.text,
            border: '1px solid',
            borderColor: c.border,
            borderRadius: 4,
            fontSize: '10px',
            padding: '2px 6px',
            boxShadow: 'none',
          },
          mark: {
            backgroundColor: c.border,
            height: 6,
            width: 1,
          },
          markActive: {
            backgroundColor: c.accent,
            opacity: 0.6,
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            padding: 6,
          },
          track: {
            borderRadius: 10,
            border: '1px solid',
            borderColor: c.border,
            backgroundColor: 'transparent',
            opacity: 1,
          },
          thumb: {
            boxShadow: 'none',
            width: 14,
            height: 14,
            borderRadius: 8,
            backgroundColor: c.textSecondary,
            transition: 'transform 0.18s, background-color 0.18s',
          },
          switchBase: {
            padding: 9,
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                backgroundColor: c.accent,
                borderColor: c.accent,
                opacity: 1,
              },
              '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
              },
            },
            '&.Mui-focusVisible .MuiSwitch-thumb': {
              boxShadow: `0 0 0 6px color-mix(in srgb, ${c.accent} 16%, transparent)`,
            },
          },
        },
      },
    },
  });
}
