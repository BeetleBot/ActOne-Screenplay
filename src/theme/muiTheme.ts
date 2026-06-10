import { createTheme, type ThemeOptions } from '@mui/material/styles';

export type ThemeId =
  | 'baseline'
  | 'terracotta'
  | 'lavender'
  | 'eucalyptus'
  | 'indigo'
  | 'slate'
  | 'cyber'
  | 'botanical'
  | 'bordeaux'
  | 'amber'
  | 'azure'
  | 'crimson'
  | 'emerald'
  | 'golden'
  | 'ink'
  | 'pitch-black';

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
    id: "baseline",
    name: "Arctic (Light)",
    desc: "Vibrant blue and clean white",
    isDark: false,
    colors: { bg: "#fdfcff", text: "#1a1c1e", accent: "#0061a4", sidebar: "#f0f4f9" }
  },
  {
    id: "azure",
    name: "Azure (Light)",
    desc: "Professional and clean bright blue",
    isDark: false,
    colors: { bg: "#f8f9fa", text: "#202124", accent: "#1a73e8", sidebar: "#ffffff" }
  },
  {
    id: "crimson",
    name: "Crimson (Light)",
    desc: "Energetic and playful warm red",
    isDark: false,
    colors: { bg: "#fffbfa", text: "#202124", accent: "#d93025", sidebar: "#fce8e6" }
  },
  {
    id: "emerald",
    name: "Emerald (Light)",
    desc: "Fresh and organic vibrant green",
    isDark: false,
    colors: { bg: "#f6fbf6", text: "#202124", accent: "#1e8e3e", sidebar: "#e6f4ea" }
  },
  {
    id: "golden",
    name: "Golden (Light)",
    desc: "Bright and cheerful warm yellow",
    isDark: false,
    colors: { bg: "#fffdf0", text: "#202124", accent: "#f9ab00", sidebar: "#fef7e0" }
  },
  {
    id: "terracotta",
    name: "Terracotta (Light)",
    desc: "Warm earth and peach tones",
    isDark: false,
    colors: { bg: "#fffbff", text: "#2b1700", accent: "#a04000", sidebar: "#f7eee6" }
  },
  {
    id: "lavender",
    name: "Lavender (Light)",
    desc: "Playful lavender and violet pastel",
    isDark: false,
    colors: { bg: "#fffbfa", text: "#1d1622", accent: "#743f9c", sidebar: "#f4edf7" }
  },
  {
    id: "eucalyptus",
    name: "Eucalyptus (Light)",
    desc: "Fresh sage and botanical greens",
    isDark: false,
    colors: { bg: "#fbfdf8", text: "#1a1c19", accent: "#006d3a", sidebar: "#edf2ec" }
  },
  {
    id: "indigo",
    name: "Indigo (Light)",
    desc: "Classic oceanic indigo breeze",
    isDark: false,
    colors: { bg: "#fcfcff", text: "#191c1e", accent: "#3f51b5", sidebar: "#f0f2f5" }
  },
  {
    id: "slate",
    name: "Midnight (Dark)",
    desc: "Clean slate dark with neon teal",
    isDark: true,
    colors: { bg: "#111416", text: "#e2e2e6", accent: "#a0caff", sidebar: "#1a1c1e" }
  },
  {
    id: "cyber",
    name: "Cyber (Dark)",
    desc: "True black with hot magenta glow",
    isDark: true,
    colors: { bg: "#0a0b10", text: "#e0e0e0", accent: "#ff007f", sidebar: "#141520" }
  },
  {
    id: "botanical",
    name: "Deep Forest (Dark)",
    desc: "Deep mint teal and dark forest shadow",
    isDark: true,
    colors: { bg: "#0f1513", text: "#e1e3e0", accent: "#38d6a1", sidebar: "#19201d" }
  },
  {
    id: "bordeaux",
    name: "Bordeaux (Dark)",
    desc: "Rich crimson plum and velvet rose",
    isDark: true,
    colors: { bg: "#1d1014", text: "#f0dfdf", accent: "#ffb2be", sidebar: "#27181c" }
  },
  {
    id: "amber",
    name: "Amber (Dark)",
    desc: "Warm dark ochre and deep copper dusk",
    isDark: true,
    colors: { bg: "#17130c", text: "#e9e1d8", accent: "#ffb951", sidebar: "#221c13" }
  },
  {
    id: "ink",
    name: "Ink (Dark)",
    desc: "High-contrast paper and ink experience",
    isDark: true,
    colors: { bg: "#121212", text: "#ffffff", accent: "#ffffff", sidebar: "#1e1e1e" }
  },
  {
    id: "pitch-black",
    name: "Pitch Black (AMOLED)",
    desc: "Pure black background optimized for OLED screens",
    isDark: true,
    colors: { bg: "#000000", text: "#e8e8e8", accent: "#3da9fc", sidebar: "#000000" }
  }
];

const shared: ThemeOptions = {
  typography: {
    fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

    // Production category colors
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

    // Gender colors for statistics
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

function mixHex(color1: string, color2: string, weight: number): string {
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

export function createActOneTheme(themeId: ThemeId) {
  const baseTheme = themes.find(x => x.id === themeId) || themes[0];
  const t: ThemeConfig = JSON.parse(JSON.stringify(baseTheme));

  if (t.id !== "pitch-black" && t.id !== "ink") {
    if (!t.isDark) {
      t.colors.bg = mixHex(t.colors.accent, "#ffffff", 0.03);
      t.colors.sidebar = mixHex(t.colors.accent, "#ffffff", 0.06);
    } else {
      t.colors.bg = mixHex(t.colors.accent, "#000000", 0.08);
      t.colors.sidebar = mixHex(t.colors.accent, "#000000", 0.12);
    }
  }

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
          root: { borderRadius: '9999px' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: '24px' },
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
          paper: { borderRadius: '16px' },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: '12px' },
        },
      },
    },
  });
}
