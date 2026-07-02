import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { PILL_RADIUS } from '../constants';

export type ThemeId = 'adaptive' | 'light' | 'dark' | 'pitch-black' | 'pitch-white' | 'sunrise' | 'ocean' | 'blush' | 'mauve' | 'lilac' | 'sage' | 'mint' | 'teal' | 'butter' | 'plum';

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
    id: "pitch-white",
    name: "Pitch Light",
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
    id: "pitch-black",
    name: "Pitch Dark",
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
    id: "sunrise",
    name: "Sunrise",
    desc: "Warm cream with coral accents",
    isDark: false,
    category: "other",
    colors: deriveAllColors({
      editor: "#fffaf5",
      text: "#221510",
      accent: "#e8634a",
      sidebar: "#fff5ee",
      button: "#e8634a",
    }, false),
  },
  {
    id: "ocean",
    name: "Ocean",
    desc: "Deep blue with teal accents",
    isDark: true,
    category: "other",
    colors: deriveAllColors({
      editor: "#0a1628",
      text: "#f0f7ff",
      accent: "#4ecdc4",
      sidebar: "#0d1b2a",
      button: "#4ecdc4",
    }, true),
  },
  {
    id: "blush",
    name: "Blush",
    desc: "Soft peachy pastel with rose accents",
    isDark: false,
    category: "other",
    colors: deriveAllColors({
      editor: "#fdf6f0",
      text: "#24181a",
      accent: "#e8a0b4",
      sidebar: "#faf0ec",
      button: "#e8a0b4",
    }, false),
  },
  {
    id: "mauve",
    name: "Mauve",
    desc: "Dark pastel purple with soft lavender accents",
    isDark: true,
    category: "other",
    colors: deriveAllColors({
      editor: "#1a1628",
      text: "#faf8fc",
      accent: "#c4a8e8",
      sidebar: "#221e32",
      button: "#c4a8e8",
    }, true),
  },
  {
    id: "lilac",
    name: "Lilac",
    desc: "Soft purple pastel with violet accents",
    isDark: false,
    category: "other",
    colors: deriveAllColors({
      editor: "#f8f6fe",
      text: "#1c1a29",
      accent: "#b8a9e8",
      sidebar: "#f4f0fc",
      button: "#b8a9e8",
    }, false),
  },
  {
    id: "sage",
    name: "Sage",
    desc: "Dark pastel sage with soft green accents",
    isDark: true,
    category: "other",
    colors: deriveAllColors({
      editor: "#16201a",
      text: "#f3faf6",
      accent: "#88c8a0",
      sidebar: "#1a2e24",
      button: "#88c8a0",
    }, true),
  },
  {
    id: "mint",
    name: "Mint",
    desc: "Soft mint pastel with teal accents",
    isDark: false,
    category: "other",
    colors: deriveAllColors({
      editor: "#f2faf5",
      text: "#17241e",
      accent: "#7ec8a8",
      sidebar: "#eef8f2",
      button: "#7ec8a8",
    }, false),
  },
  {
    id: "teal",
    name: "Teal",
    desc: "Dark pastel teal with mint accents",
    isDark: true,
    category: "other",
    colors: deriveAllColors({
      editor: "#121e24",
      text: "#f3fbfd",
      accent: "#7ec8d8",
      sidebar: "#182830",
      button: "#7ec8d8",
    }, true),
  },
  {
    id: "butter",
    name: "Butter",
    desc: "Warm cream pastel with amber accents",
    isDark: false,
    category: "other",
    colors: deriveAllColors({
      editor: "#fefcf0",
      text: "#242018",
      accent: "#e8d07e",
      sidebar: "#fcf8ea",
      button: "#e8d07e",
    }, false),
  },
  {
    id: "plum",
    name: "Plum",
    desc: "Dark pastel plum with soft rose accents",
    isDark: true,
    category: "other",
    colors: deriveAllColors({
      editor: "#241620",
      text: "#fbf2f8",
      accent: "#d4a0c0",
      sidebar: "#2e1a28",
      button: "#d4a0c0",
    }, true),
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

function getEditorVars(t: ThemeConfig, appScale: number, fountainColorsEnabled: boolean = true) {
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

export function createActOneTheme(t: ThemeConfig, appScale: number, fountainColorsEnabled: boolean = true) {
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
          root: { borderRadius: PILL_RADIUS },
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
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: '10px',
            outline: 'none',
            border: '1px solid',
            borderColor: c.border,
            boxShadow: 'none',
            '&:focus-visible': { outline: 'none' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiPopover: {
        defaultProps: {
          slotProps: {
            paper: {
              sx: {
                border: '1px solid',
                borderColor: c.border,
                boxShadow: 'none',
                backgroundImage: 'none',
              },
            },
          },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
      },
      MuiMenu: {
        defaultProps: {
          slotProps: {
            paper: {
              sx: {
                border: '1px solid',
                borderColor: c.border,
                boxShadow: 'none',
              },
            },
          },
        },
        styleOverrides: {
          paper: {
            borderRadius: '8px',
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
          root: {
            borderRadius: '6px',
            backgroundColor: c.dropdown,
            '& fieldset': { border: 'none' },
            '&:hover': { backgroundColor: 'action.hover' },
            '&.Mui-focused': {
              backgroundColor: c.dropdown,
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
            borderRadius: '4px',
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
            borderRadius: 11,
            border: '1px solid',
            borderColor: c.border,
            backgroundColor: 'transparent',
            opacity: 1,
          },
          thumb: {
            boxShadow: 'none',
            width: 14,
            height: 14,
            borderRadius: 7,
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
