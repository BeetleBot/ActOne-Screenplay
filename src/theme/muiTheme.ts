import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { PILL_RADIUS } from '../constants';

export type ThemeId = 'adaptive' | 'light' | 'dark' | 'pitch-black' | 'pitch-white' | 'noir' | 'ocean' | 'sunset' | 'forest' | 'lavender';

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
  category: "classic" | "pitch" | "other" | "custom";
}

export function deriveAllColors(colors: {
  editor: string;
  text: string;
  accent: string;
  sidebar: string;
  button: string;
}, isDark: boolean): ThemeColors {
  return {
    editor: colors.editor,
    text: colors.text,
    accent: colors.accent,
    sidebar: colors.sidebar,
    button: colors.button,
    selectionText: colors.text,
    selectionBg: isDark
      ? `rgba(${hexToRgbStr(colors.accent)}, 0.25)`
      : `rgba(${hexToRgbStr(colors.accent)}, 0.20)`,
    dropdown: isDark ? '#242628' : '#ffffff',
    dropdownText: colors.text,
    border: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    textSecondary: isDark ? 'rgba(255,255,255,0.54)' : 'rgba(0,0,0,0.54)',
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
      editor: "#ffffff",
      text: "#1a1c1e",
      accent: "#0061a4",
      sidebar: "#f5f5f5",
      button: "#0061a4",
    }, false),
  },
  {
    id: "dark",
    name: "Classic Dark",
    desc: "Clean dark theme",
    isDark: true,
    category: "classic",
    colors: deriveAllColors({
      editor: "#111416",
      text: "#e2e2e6",
      accent: "#a0caff",
      sidebar: "#1a1c1e",
      button: "#a0caff",
    }, true),
  },
  {
    id: "pitch-black",
    name: "Pitch Black",
    desc: "Pure black background with grey tones",
    isDark: true,
    category: "pitch",
    colors: deriveAllColors({
      editor: "#000000",
      text: "#deddda",
      accent: "#9a9996",
      sidebar: "#000000",
      button: "#c3c3c3",
    }, true),
  },
  {
    id: "pitch-white",
    name: "Pitch White",
    desc: "Pure white e-ink style, only black and white",
    isDark: false,
    category: "pitch",
    colors: deriveAllColors({
      editor: "#ffffff",
      text: "#000000",
      accent: "#000000",
      sidebar: "#ffffff",
      button: "#000000",
    }, false),
  },
  {
    id: "noir",
    name: "Noir",
    desc: "Dark with gold accents",
    isDark: true,
    category: "other",
    colors: deriveAllColors({
      editor: "#111416",
      text: "#e2e2e6",
      accent: "#c8a05c",
      sidebar: "#1a1a1e",
      button: "#c8a05c",
    }, true),
  },
  {
    id: "ocean",
    name: "Ocean",
    desc: "Deep blue with teal accents",
    isDark: true,
    category: "other",
    colors: deriveAllColors({
      editor: "#0a1628",
      text: "#e0f0ff",
      accent: "#4ecdc4",
      sidebar: "#0d1b2a",
      button: "#4ecdc4",
    }, true),
  },
  {
    id: "sunset",
    name: "Sunset",
    desc: "Warm cream with coral accents",
    isDark: false,
    category: "other",
    colors: deriveAllColors({
      editor: "#fffaf5",
      text: "#2d1b14",
      accent: "#e8634a",
      sidebar: "#fff5ee",
      button: "#e8634a",
    }, false),
  },
  {
    id: "forest",
    name: "Forest",
    desc: "Dark green with spring green accents",
    isDark: true,
    category: "other",
    colors: deriveAllColors({
      editor: "#162416",
      text: "#d4e6d4",
      accent: "#7ec850",
      sidebar: "#1a2e1a",
      button: "#7ec850",
    }, true),
  },
  {
    id: "lavender",
    name: "Lavender",
    desc: "Soft purple with violet accents",
    isDark: false,
    category: "other",
    colors: deriveAllColors({
      editor: "#faf7ff",
      text: "#2a1a3e",
      accent: "#b088d6",
      sidebar: "#f5f0ff",
      button: "#b088d6",
    }, false),
  },
];

const shared: ThemeOptions = {
  typography: {
    fontFamily: "var(--font-ui)",
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
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

function getEditorVars(t: ThemeConfig, appScale: number) {
  const c = t.colors;
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
    '--text-editor-heading': c.accent,
    '--text-editor-character': c.text,
    '--text-editor-dialogue': c.text,
    '--text-editor-parenthetical': c.textSecondary,
    '--text-editor-action': c.text,
    '--text-editor-transition': c.accent,
    '--text-editor-shot': c.accent,
    '--text-editor-meta': c.textSecondary,
    '--editor-cursor': c.text,

    '--scene-color-blue': '#2196f3',
    '--scene-color-brown': '#795548',
    '--scene-color-cyan': '#00bcd4',
    '--scene-color-green': '#4caf50',
    '--scene-color-magenta': '#e91e63',
    '--scene-color-orange': '#ff9800',
    '--scene-color-pink': '#e91e63',
    '--scene-color-purple': '#9c27b0',
    '--scene-color-red': '#f44336',
    '--scene-color-yellow': '#ffeb3b',

    '--cat-cast': '#00bcd4',
    '--cat-prop': '#ff9800',
    '--cat-vfx': '#9c27b0',
    '--cat-sfx': '#795548',
    '--cat-camera': '#00ffcc',
    '--cat-animal': '#ffeb3b',
    '--cat-extras': '#e91e63',
    '--cat-vehicle': '#008080',
    '--cat-costume': '#ffc0cb',
    '--cat-makeup': '#4caf50',
    '--cat-music': '#808000',
    '--cat-sound': '#ff6666',
    '--cat-stunt': '#2196f3',
    '--cat-setDesign': '#daa520',
    '--cat-other': '#9e9e9e',

    '--gender-male': '#0081ef',
    '--gender-female': '#fa6fc1',
    '--gender-nonbinary': '#b520da',
    '--gender-unknown': '#969696',
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

export function createActOneTheme(t: ThemeConfig, appScale: number) {
  const c = t.colors;
  const editorVars = getEditorVars(t, appScale);

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
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: PILL_RADIUS },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: '10px', outline: 'none', '&:focus-visible': { outline: 'none' } },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: '10px',
            backgroundColor: c.dropdown,
            color: c.dropdownText,
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            padding: '4px 0',
          },
          list: {
            paddingTop: 0,
            paddingBottom: 0,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '12px',
            paddingTop: '5px',
            paddingBottom: '5px',
            paddingLeft: '10px',
            paddingRight: '10px',
            minHeight: '28px',
            borderRadius: '6px',
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
          root: { borderRadius: '12px' },
        },
      },
      MuiSelect: {
        defaultProps: {
          MenuProps: {
            slotProps: {
              paper: { sx: { mt: '2px' } },
            },
          },
        },
        styleOverrides: {
          root: {
            fontSize: '12px',
            borderRadius: '6px',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            backgroundColor: c.dropdown,
            '&:hover': { backgroundColor: 'action.hover' },
            '&.Mui-focused': { backgroundColor: 'action.hover' },
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
          },
        },
      },
    },
  });
}
