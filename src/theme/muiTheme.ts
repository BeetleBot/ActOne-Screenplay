import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { PILL_RADIUS } from '../constants';

export type ThemeId = 'light' | 'dark' | 'sepia' | 'charcoal';

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
    name: "Studio Light",
    desc: "Clean light theme",
    isDark: false,
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
    name: "Midnight",
    desc: "Clean dark theme",
    isDark: true,
    colors: deriveAllColors({
      editor: "#111416",
      text: "#e2e2e6",
      accent: "#a0caff",
      sidebar: "#1a1c1e",
      button: "#a0caff",
    }, true),
  },
  {
    id: "sepia",
    name: "Warm Sepia",
    desc: "Comfortable cream colors for writing",
    isDark: false,
    colors: deriveAllColors({
      editor: "#f4ecd8",
      text: "#433422",
      accent: "#b45309",
      sidebar: "#eadcb9",
      button: "#b45309",
    }, false),
  },
  {
    id: "charcoal",
    name: "Matrix Charcoal",
    desc: "Dark charcoal with neon green accents",
    isDark: true,
    colors: deriveAllColors({
      editor: "#1a1a1a",
      text: "#e0e0e0",
      accent: "#10b981",
      sidebar: "#262626",
      button: "#10b981",
    }, true),
  }
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

function getEditorVars(t: ThemeConfig) {
  const c = t.colors;
  return {
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

export function createActOneTheme(t: ThemeConfig) {
  const c = t.colors;
  const editorVars = getEditorVars(t);

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
          },
          list: {
            paddingTop: '4px',
            paddingBottom: '4px',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '12.5px',
            paddingTop: '3px',
            paddingBottom: '3px',
            paddingLeft: '8px',
            paddingRight: '8px',
            minHeight: '26px',
            borderRadius: '6px',
            margin: '1px 4px',
            '& .MuiListItemText-primary': {
              fontSize: '12.5px',
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
      MuiSelect: {
        styleOverrides: {
          select: {
            backgroundColor: c.dropdown,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: '12px' },
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
