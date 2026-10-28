import type { ThemeColors } from "./muiTheme";

export interface ThemeRecipe {
  interface: string;
  accent: string;
  paper: string;
  uiText?: string;
  writingText?: string;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value);
}

export function normalizeHex(value: string): string {
  if (!isHexColor(value)) throw new Error("Choose a valid hex colour");
  return (value.length === 4 ? "#" + value.slice(1).split("").map(channel => channel + channel).join("") : value).toLowerCase();
}

function channels(value: string): number[] {
  const hex = normalizeHex(value);
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}

export function blend(foreground: string, background: string, amount: number): string {
  const a = channels(foreground);
  const b = channels(background);
  return "#" + a.map((channel, index) => Math.round(channel * amount + b[index] * (1 - amount)).toString(16).padStart(2, "0")).join("");
}

export function luminance(value: string): number {
  const rgb = channels(value).map(channel => {
    const linear = channel / 255;
    return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

export function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function automaticInk(surface: string): string {
  const soft = contrast("#202124", surface) >= contrast("#f5f5f5", surface) ? "#202124" : "#f5f5f5";
  return contrast(soft, surface) >= 4.5 ? soft : contrast("#000000", surface) >= contrast("#ffffff", surface) ? "#000000" : "#ffffff";
}

/** Derive all supporting roles from three independent creative choices. No browser or MUI work. */
export function compileTheme(recipe: ThemeRecipe): ThemeColors {
  const surface = normalizeHex(recipe.interface);
  const accent = normalizeHex(recipe.accent);
  const paper = normalizeHex(recipe.paper);
  const text = recipe.uiText ? normalizeHex(recipe.uiText) : automaticInk(surface);
  const editorText = recipe.writingText ? normalizeHex(recipe.writingText) : automaticInk(paper);
  const selectionBg = blend(accent, paper, 0.24);
  return {
    app: blend(text, surface, 0.025), sidebar: surface, editor: paper,
    accent, button: accent, buttonText: automaticInk(accent), text, editorText,
    textSecondary: blend(text, surface, 0.70), border: blend(text, surface, 0.20),
    dropdown: blend(text, surface, 0.045), dropdownText: text,
    selectionBg, selectionText: automaticInk(selectionBg),
  };
}

export function recipeFromColors(colors: ThemeColors): ThemeRecipe {
  return { interface: colors.sidebar, accent: colors.accent, paper: colors.editor };
}

export function themeIsDark(colors: ThemeColors): boolean {
  return luminance(colors.sidebar) < 0.18;
}


export function contrastingLine(surface: string): string {
  const ink = automaticInk(surface);
  for (let step = 65; step <= 100; step += 5) {
    const line = blend(ink, surface, step / 100);
    if (contrast(line, surface) >= 3) return line;
  }
  return ink;
}


/** Preserve a semantic hue where possible, moving toward readable ink only when necessary. */
export function readableOn(color: string, surface: string): string {
  if (contrast(color, surface) >= 4.5) return normalizeHex(color);
  const ink = automaticInk(surface);
  for (let step = 5; step <= 100; step += 5) {
    const candidate = blend(ink, color, step / 100);
    if (contrast(candidate, surface) >= 4.5) return candidate;
  }
  return ink;
}

/** Resolve literal alpha colours against their surface before doing contrast calculations. */
export function opaqueColor(value: string, backdrop: string): string {
  if (/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) return normalizeHex(value);
  const match = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0?\.\d+|0|1))?\s*\)$/);
  if (!match || match.slice(1, 4).some(channel => Number(channel) > 255)) return backdrop;
  const hex = "#" + match.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, "0")).join("");
  return blend(hex, backdrop, match[4] === undefined ? 1 : Number(match[4]));
}

export function resolveUiColors(colors: ThemeColors) {
  const ink = automaticInk(colors.sidebar);
  const menuSurface = opaqueColor(colors.dropdown, colors.sidebar);
  return {
    accent: readableOn(colors.accent, colors.sidebar),
    secondary: readableOn(opaqueColor(colors.textSecondary, colors.sidebar), colors.sidebar),
    menuSurface,
    menuText: readableOn(opaqueColor(colors.dropdownText, menuSurface), menuSurface),
    fieldAccent: readableOn(colors.accent, menuSurface),
    ink,
  };
}
