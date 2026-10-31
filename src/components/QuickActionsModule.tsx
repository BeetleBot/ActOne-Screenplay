import React from "react";
import { LineType, FountainDocument, stripFormatting } from "../parser";
import { getSceneTitle } from "../utils/text";
import { themes } from "../theme";
import type { CustomTheme } from "../theme/themeUtils";
import type { RecentFile } from "../context";
import {
  ViewAgendaIcon,
  BeenhereIcon,
  HistoryIcon,
  PersonIcon,
  ColorLensIcon,
  BookmarkIcon,
} from "./Icons";

export function normalizeCharacterSpeaker(text: string): string {
  return stripFormatting(text)
    .replace(/^@\s*/, "")
    .replace(/\s*\^\s*$/, "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim()
    .toUpperCase();
}

export type QuickActionType = "scenes" | "recent" | "characters" | "themes" | "markers";

export interface QuickActionPaletteItem {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  prefix?: string;
  subtitle?: string;
  badge?: string;
  tags?: string[];
  action: () => void;
}

export interface QuickActionPrefix {
  prefix: string;
  type: QuickActionType;
  title: string;
  placeholder: string;
  emptyText: string;
}

export const QUICK_ACTION_PREFIXES: QuickActionPrefix[] = [
  {
    prefix: "sc.",
    type: "scenes",
    title: "Scenes & Headings",
    placeholder: "Search scenes... (e.g. coffee, 14, INT, NIGHT)",
    emptyText: "No scenes or headings found",
  },
  {
    prefix: "rf.",
    type: "recent",
    title: "Recent Projects",
    placeholder: "Search recent projects...",
    emptyText: "No recent projects found",
  },
  {
    prefix: "ch.",
    type: "characters",
    title: "Characters & Dialogue Pass",
    placeholder: "Search characters... (e.g. BOB, ALICE)",
    emptyText: "No speaking characters found",
  },
  {
    prefix: "th.",
    type: "themes",
    title: "Theme Switcher",
    placeholder: "Search themes... (e.g. midnight, sepia, dark)",
    emptyText: "No themes found",
  },
  {
    prefix: "mk.",
    type: "markers",
    title: "Markers & Notes",
    placeholder: "Search markers... (e.g. red, fix, rewrite)",
    emptyText: "No inline markers or notes found",
  },
];

export function detectQuickActionPrefix(val: string): { type: QuickActionType; query: string } | null {
  for (const item of QUICK_ACTION_PREFIXES) {
    const raw = item.prefix; // e.g. "sc."
    const base = raw.replace(/\.$/, ""); // e.g. "sc"
    if (val.startsWith(raw) || val.startsWith(`${base} `)) {
      const query = val.replace(new RegExp(`^${base}[.\\s]*`), "");
      return { type: item.type, query };
    }
  }
  return null;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function fuzzyQuickActionScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500 + (100 - Math.min(t.length, 100));

  const exactIdx = t.indexOf(q);
  if (exactIdx !== -1) return 300 - Math.min(exactIdx, 50);

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    let allFound = true;
    let score = 200;
    for (const w of words) {
      const idx = t.indexOf(w);
      if (idx === -1) {
        allFound = false;
        break;
      }
      score += 20 - Math.min(idx, 15);
    }
    if (allFound) return score;
  }

  let qIdx = 0;
  let tIdx = 0;
  let score = 0;
  let consecutive = 0;

  while (qIdx < q.length && tIdx < t.length) {
    if (q[qIdx] === t[tIdx]) {
      score += 10 + consecutive * 5;
      consecutive++;
      qIdx++;
    } else {
      consecutive = 0;
    }
    tIdx++;
  }

  return qIdx === q.length ? score : 0;
}

export function getPageNumberForLine(lineIndex: number, breaks: number[] = []): number {
  let page = 1;
  for (const b of breaks) {
    if (lineIndex >= b) {
      page++;
    } else {
      break;
    }
  }
  return page;
}

/* =========================================================================
   Quick Action Builders
   ========================================================================= */

export function buildSceneQuickActionItems(params: {
  isProse: boolean;
  proseText: string;
  parsedDoc: FountainDocument;
  pageBreaks?: number[];
  onSelectLine: (lineNumber: number) => void;
}): QuickActionPaletteItem[] {
  const { isProse, proseText, parsedDoc, pageBreaks = [], onSelectLine } = params;

  if (isProse) {
    if (!proseText) return [];
    const lines = proseText.split(/\r?\n/);
    const items: QuickActionPaletteItem[] = [];
    let currentCategory = "General";
    for (let i = 0; i < lines.length; i++) {
      const lineStr = lines[i];
      const match = lineStr.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const depth = match[1];
        const title = match[2].trim();
        // Top-level headings (# and ##) form category sections, lower levels nest under currentCategory
        if (depth.length <= 2) {
          currentCategory = title;
        }
        items.push({
          id: `prose-heading-${i}`,
          name: title,
          category: currentCategory,
          icon: <BeenhereIcon sx={{ fontSize: 16 }} />,
          badge: depth,
          shortcut: `L${i + 1}`,
          action: () => onSelectLine(i),
        });
      }
    }
    return items;
  }

  if (!parsedDoc || !parsedDoc.lines) return [];
  const items: QuickActionPaletteItem[] = [];
  const lines = parsedDoc.lines;
  let fallbackIndex = 1;
  const sectionStack: { depth: number; title: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.type === LineType.section) {
      const depth = line.sectionDepth || 1;
      const cleanTitle = stripFormatting(line.text)
        .replace(/^#+/, "")
        .trim();
      while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].depth >= depth) {
        sectionStack.pop();
      }
      sectionStack.push({ depth, title: cleanTitle });
      continue;
    }

    if (line.type === LineType.heading) {
      const title = getSceneTitle(line);
      const sceneNum = line.sceneNumber || String(fallbackIndex++);
      let synopsis: string | undefined;

      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].type === LineType.heading || lines[j].type === LineType.section) {
          break;
        }
        if (lines[j].type === LineType.synopse) {
          synopsis = lines[j].text.replace(/^=\s*/, "").trim();
          break;
        }
      }

      const tags: string[] = [];
      if (line.setting) tags.push(line.setting);
      if (line.timeOfDay) tags.push(line.timeOfDay);

      const pageNum = getPageNumberForLine(i, pageBreaks);

      const categoryName = sectionStack.length > 0
        ? sectionStack.map((s) => s.title).join(" / ")
        : "Scenes";

      items.push({
        id: line.id || `scene-${i}`,
        name: title,
        category: categoryName,
        icon: <ViewAgendaIcon sx={{ fontSize: 16 }} />,
        badge: `#${sceneNum}`,
        subtitle: synopsis,
        tags,
        shortcut: `p. ${pageNum} · L${i + 1}`,
        action: () => onSelectLine(i),
      });
    }
  }
  return items;
}

export function buildRecentQuickActionItems(params: {
  recentFiles: RecentFile[];
  onOpenFile: (path: string) => void;
}): QuickActionPaletteItem[] {
  const { recentFiles, onOpenFile } = params;
  return (recentFiles || []).map((file) => ({
    id: `recent-${file.path}`,
    name: file.name,
    category: "Recent Projects",
    icon: <HistoryIcon sx={{ fontSize: 16 }} />,
    shortcut: formatRelativeTime(file.lastOpened),
    subtitle: file.path,
    action: () => onOpenFile(file.path),
  }));
}

export function buildCharacterQuickActionItems(params: {
  parsedDoc: FountainDocument;
  onSelectLine: (lineNumber: number) => void;
}): QuickActionPaletteItem[] {
  const { parsedDoc, onSelectLine } = params;
  if (!parsedDoc || !parsedDoc.lines) return [];

  const charMap = new Map<string, { count: number; firstLine: number; lines: number[] }>();

  for (let i = 0; i < parsedDoc.lines.length; i++) {
    const line = parsedDoc.lines[i];
    if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
      const speaker = normalizeCharacterSpeaker(line.text);
      if (speaker) {
        let entry = charMap.get(speaker);
        if (!entry) {
          entry = { count: 0, firstLine: i, lines: [] };
          charMap.set(speaker, entry);
        }
        entry.count++;
        entry.lines.push(i);
      }
    }
  }

  return [...charMap.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([name, data]) => ({
      id: `char-${name}`,
      name,
      category: "Characters",
      icon: <PersonIcon sx={{ fontSize: 16 }} />,
      badge: `${data.count} ${data.count === 1 ? "speech" : "speeches"}`,
      shortcut: `Starts L${data.firstLine + 1}`,
      subtitle: `Total speaking occurrences: ${data.count}. Click to jump to first dialogue.`,
      action: () => onSelectLine(data.firstLine),
    }));
}

export function buildThemeQuickActionItems(params: {
  activeThemeId: string;
  customThemes?: CustomTheme[];
  onSelectTheme: (themeId: string) => void;
}): QuickActionPaletteItem[] {
  const { activeThemeId, customThemes = [], onSelectTheme } = params;

  const builtInItems: QuickActionPaletteItem[] = themes.map((t) => ({
    id: `theme-${t.id}`,
    name: t.name,
    category: t.isDark ? "Dark Themes" : "Light Themes",
    icon: <ColorLensIcon sx={{ fontSize: 16 }} />,
    badge: t.isDark ? "DARK" : "LIGHT",
    shortcut: t.id === activeThemeId ? "ACTIVE" : undefined,
    subtitle: `Theme ID: ${t.id} · ${t.category}`,
    action: () => onSelectTheme(t.id),
  }));

  const customItems: QuickActionPaletteItem[] = customThemes.map((c) => ({
    id: `theme-custom-${c.id}`,
    name: c.name,
    category: "Custom Themes",
    icon: <ColorLensIcon sx={{ fontSize: 16 }} />,
    badge: c.isDark ? "CUSTOM DARK" : "CUSTOM LIGHT",
    shortcut: c.id === activeThemeId ? "ACTIVE" : undefined,
    subtitle: `User defined custom theme (${c.id})`,
    action: () => onSelectTheme(c.id),
  }));

  return [...builtInItems, ...customItems];
}

export function buildMarkerQuickActionItems(params: {
  parsedDoc: FountainDocument;
  onSelectLine: (lineNumber: number) => void;
}): QuickActionPaletteItem[] {
  const { parsedDoc, onSelectLine } = params;
  if (!parsedDoc || !parsedDoc.lines) return [];

  const items: QuickActionPaletteItem[] = [];
  const lines = parsedDoc.lines;
  let currentScene = "Introduction";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.type === LineType.heading) {
      currentScene = getSceneTitle(line);
    }
    if (line.marker) {
      const color = line.marker.color || "marker";
      const desc = line.marker.description?.trim() || line.text.trim();
      items.push({
        id: line.id || `marker-${i}`,
        name: desc,
        category: "Markers & Notes",
        icon: <BookmarkIcon sx={{ fontSize: 16 }} />,
        badge: color.toUpperCase(),
        tags: [color],
        shortcut: `L${i + 1}`,
        subtitle: currentScene,
        action: () => onSelectLine(i),
      });
    }
  }

  return items;
}
