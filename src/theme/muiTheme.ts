import { createTheme, type ThemeOptions } from '@mui/material/styles';

export type ThemeId =
  | 'material-baseline'
  | 'material-terracotta'
  | 'material-lavender'
  | 'material-eucalyptus'
  | 'material-indigo'
  | 'material-slate'
  | 'material-cyber'
  | 'material-botanical'
  | 'material-bordeaux'
  | 'material-amber';

export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  desc: string;
  isDark: boolean;
  colors: {
    bg: string;
    text: string;
    accent: string;
    sidebar: string;
  };
}

export const themes: ThemeConfig[] = [
  {
    id: "material-baseline",
    name: "Material Baseline",
    desc: "Vibrant blue and clean white",
    isDark: false,
    colors: { bg: "#fdfcff", text: "#1a1c1e", accent: "#0061a4", sidebar: "#f0f4f9" }
  },
  {
    id: "material-terracotta",
    name: "Material Terracotta",
    desc: "Warm earth and peach tones",
    isDark: false,
    colors: { bg: "#fffbff", text: "#2b1700", accent: "#a04000", sidebar: "#f7eee6" }
  },
  {
    id: "material-lavender",
    name: "Material Lavender",
    desc: "Playful lavender and violet pastel",
    isDark: false,
    colors: { bg: "#fffbfa", text: "#1d1622", accent: "#743f9c", sidebar: "#f4edf7" }
  },
  {
    id: "material-eucalyptus",
    name: "Material Eucalyptus",
    desc: "Fresh sage and botanical greens",
    isDark: false,
    colors: { bg: "#fbfdf8", text: "#1a1c19", accent: "#006d3a", sidebar: "#edf2ec" }
  },
  {
    id: "material-indigo",
    name: "Material Indigo",
    desc: "Classic oceanic indigo breeze",
    isDark: false,
    colors: { bg: "#fcfcff", text: "#191c1e", accent: "#3f51b5", sidebar: "#f0f2f5" }
  },
  {
    id: "material-slate",
    name: "Material Slate",
    desc: "Clean slate dark with neon teal",
    isDark: true,
    colors: { bg: "#111416", text: "#e2e2e6", accent: "#a0caff", sidebar: "#1a1c1e" }
  },
  {
    id: "material-cyber",
    name: "Material Cyber",
    desc: "True black with hot magenta glow",
    isDark: true,
    colors: { bg: "#0a0b10", text: "#e0e0e0", accent: "#ff007f", sidebar: "#141520" }
  },
  {
    id: "material-botanical",
    name: "Material Botanical",
    desc: "Deep mint teal and dark forest shadow",
    isDark: true,
    colors: { bg: "#0f1513", text: "#e1e3e0", accent: "#38d6a1", sidebar: "#19201d" }
  },
  {
    id: "material-bordeaux",
    name: "Material Bordeaux",
    desc: "Rich crimson plum and velvet rose",
    isDark: true,
    colors: { bg: "#1d1014", text: "#f0dfdf", accent: "#ffb2be", sidebar: "#27181c" }
  },
  {
    id: "material-amber",
    name: "Material Amber",
    desc: "Warm dark ochre and deep copper dusk",
    isDark: true,
    colors: { bg: "#17130c", text: "#e9e1d8", accent: "#ffb951", sidebar: "#221c13" }
  }
];

const shared: ThemeOptions = {
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 0 },
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
  const isLight = !t.isDark;
  return {
    '--bg-app': t.colors.bg,
    '--bg-sidebar': t.colors.sidebar,
    '--bg-editor-wrapper': t.colors.bg,
    '--bg-editor': 'transparent',
    '--border-color': isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    '--text-main': t.colors.text,
    '--text-muted': isLight ? 'rgba(0,0,0,0.54)' : 'rgba(255,255,255,0.6)',
    '--accent-color': t.colors.accent,
    '--accent-rgb': hexToRgbStr(t.colors.accent),
    '--titlebar-bg': t.colors.sidebar,
    '--text-editor-heading': t.colors.accent,
    '--text-editor-character': t.colors.text,
    '--text-editor-dialogue': t.colors.text,
    '--text-editor-parenthetical': isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
    '--text-editor-action': t.colors.text,
    '--text-editor-transition': t.colors.accent,
    '--text-editor-shot': t.colors.accent,
    '--text-editor-meta': isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)',
    '--editor-cursor': t.colors.text,
    
    // Scene heading marker colors
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
  };
}

function cssVarBlock(vars: Record<string, string>) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n    ');
}

export function createActOneTheme(themeId: ThemeId) {
  const t = themes.find(x => x.id === themeId) || themes[0];
  const editorVars = getEditorVars(t);

  return createTheme({
    ...shared,
    palette: {
      mode: t.isDark ? 'dark' : 'light',
      primary: { main: t.colors.accent },
      background: {
        default: t.colors.bg,
        paper: t.colors.sidebar,
      },
      text: {
        primary: t.colors.text,
        secondary: t.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      },
      divider: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
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
          root: { borderRadius: 0 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 0 },
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
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 0 },
        },
      },
    },
  });
}
