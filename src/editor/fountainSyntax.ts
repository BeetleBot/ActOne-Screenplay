import { EditorState, StateField, RangeSetBuilder, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { FountainDocument } from "../parser";
import { getPerScriptSettingObject } from "../utils/perScriptSettings";

export const updateParsedDocEffect = StateEffect.define<FountainDocument>();

export interface PageBreakDisplaySettings {
  showPageNumbers: boolean;
  showPageSeparators: boolean;
}

export const updatePageBreakDisplayEffect = StateEffect.define<PageBreakDisplaySettings>();
export const updateHideSyntaxEffect = StateEffect.define<boolean>();
export const updateHideTagsEffect = StateEffect.define<boolean>();
export const updateScriptFileNameEffect = StateEffect.define<string>();
export const updateSearchMatchesEffect = StateEffect.define<{ from: number; to: number }[]>();
export const updateRightPaneOpenEffect = StateEffect.define<boolean>();



export const LINE_EMPTY = 0;
export const LINE_SECTION = 1;
export const LINE_SYNOPSE = 2;
export const LINE_TITLE_PAGE = 9;
export const LINE_HEADING = 10;
export const LINE_ACTION = 11;
export const LINE_CHARACTER = 12;
export const LINE_PARENTHETICAL = 13;
export const LINE_DIALOGUE = 14;
export const LINE_DUAL_CHARACTER = 15;
export const LINE_DUAL_PARENTHETICAL = 16;
export const LINE_DUAL_DIALOGUE = 17;
export const LINE_TRANSITION = 18;
export const LINE_LYRICS = 19;
export const LINE_PAGEBREAK = 20;
export const LINE_CENTERED = 21;
export const LINE_SHOT = 22;
export const isDialogueType = (t: number) =>
  t === LINE_CHARACTER || t === LINE_DIALOGUE || t === LINE_PARENTHETICAL ||
  t === LINE_DUAL_CHARACTER || t === LINE_DUAL_DIALOGUE || t === LINE_DUAL_PARENTHETICAL;

export const isDualType = (t: number) =>
  t === LINE_DUAL_CHARACTER || t === LINE_DUAL_DIALOGUE || t === LINE_DUAL_PARENTHETICAL;

export const needsBlankAfterEnter = (t: number) =>
  t === LINE_HEADING || t === LINE_ACTION || t === LINE_DIALOGUE ||
  t === LINE_DUAL_DIALOGUE || t === LINE_TRANSITION ||
  t === LINE_SHOT || t === LINE_SECTION || t === LINE_SYNOPSE;

export const classifyLines = (doc: { line: (n: number) => { text: string }; lines: number }): number[] => {
  const types: number[] = [];
  let inTitlePage = true;

  for (let i = 1; i <= doc.lines; i++) {
    const text = doc.line(i).text;
    const trimmed = text.trim();
    let type = LINE_ACTION;

    if (inTitlePage) {
      if (trimmed === "") {
        inTitlePage = false;
        types.push(LINE_EMPTY);
        continue;
      }
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1) {
        types.push(LINE_TITLE_PAGE);
        continue;
      }
      if (trimmed.startsWith(" ") || trimmed.startsWith("\t")) {
        types.push(LINE_TITLE_PAGE);
        continue;
      }
      inTitlePage = false;
    }

    if (trimmed === "") {
      type = LINE_EMPTY;
    } else if (/^#{1,2}(?:[^#]|$)/.test(trimmed)) {
      type = LINE_SECTION;
    } else if (trimmed.startsWith("=")) {
      type = (trimmed.startsWith("===") && trimmed.replace(/=/g, "").trim() === "") ? LINE_PAGEBREAK : LINE_SYNOPSE;
    } else if (trimmed.startsWith("~")) {
      type = LINE_LYRICS;
    } else if (trimmed.startsWith(".") && !trimmed.startsWith("..")) {
      type = LINE_HEADING;
    } else if (trimmed.startsWith(">") && trimmed.endsWith("<")) {
      type = LINE_CENTERED;
    } else if (trimmed.startsWith(">")) {
      type = LINE_TRANSITION;
    } else if (trimmed.startsWith("!!")) {
      type = LINE_SHOT;
    } else if (trimmed.startsWith("!")) {
      type = LINE_ACTION;
    } else if (trimmed.startsWith("@")) {
      type = LINE_CHARACTER;
    } else {
      const prevType = i > 1 ? types[i - 2] : LINE_EMPTY;
      const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
      const isHeadingPrefix = /^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b/i.test(trimmed);

      if (isHeadingPrefix && (prevType === LINE_EMPTY || i === 1)) {
        type = LINE_HEADING;
      } else if (isAllCaps && trimmed.endsWith("TO:") && (prevType === LINE_EMPTY || i === 1)) {
        type = LINE_TRANSITION;
      } else if (isAllCaps && (prevType === LINE_EMPTY || i === 1)) {
        type = trimmed.endsWith("^") ? LINE_DUAL_CHARACTER : LINE_CHARACTER;
      } else if (trimmed.startsWith("(") && trimmed.endsWith(")") && isDialogueType(prevType)) {
        type = isDualType(prevType) ? LINE_DUAL_PARENTHETICAL : LINE_PARENTHETICAL;
      } else if (isDialogueType(prevType)) {
        type = isDualType(prevType) ? LINE_DUAL_DIALOGUE : LINE_DIALOGUE;
      }
    }

    types.push(type);
  }

  return types;
};

const TYPE_TO_CLASS: Record<number, string> = {
  [LINE_HEADING]: "cm-fountain-heading",
  [LINE_CHARACTER]: "cm-fountain-character",
  [LINE_PARENTHETICAL]: "cm-fountain-parenthetical",
  [LINE_DIALOGUE]: "cm-fountain-dialogue",
  [LINE_DUAL_CHARACTER]: "cm-fountain-character cm-fountain-dual-character",
  [LINE_DUAL_PARENTHETICAL]: "cm-fountain-parenthetical cm-fountain-dual-parenthetical",
  [LINE_DUAL_DIALOGUE]: "cm-fountain-dialogue cm-fountain-dual-dialogue",
  [LINE_TRANSITION]: "cm-fountain-transition",
  [LINE_CENTERED]: "cm-fountain-centered",
  [LINE_LYRICS]: "cm-fountain-lyrics",
  [LINE_SECTION]: "cm-fountain-section",
  [LINE_SYNOPSE]: "cm-fountain-synopse",
  [LINE_PAGEBREAK]: "cm-fountain-pagebreak",
  [LINE_TITLE_PAGE]: "cm-fountain-titlepage",
  [LINE_ACTION]: "cm-fountain-action",
  [LINE_SHOT]: "cm-fountain-shot",
};

const computeFountainDecorations = (state: EditorState, docObj: FountainDocument | null, hideSyntaxEnabled: boolean, hideTagsEnabled: boolean, rightPaneOpen: boolean, scriptFileName: string, searchMatches: { from: number; to: number }[]): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const allDecos: { from: number; to: number; dec: Decoration }[] = [];
  const doc = state.doc;
  const parsedDocLines = docObj?.lines;
  const lineTypesFallback = (parsedDocLines && parsedDocLines.length === doc.lines)
    ? parsedDocLines.map(p => p.type)
    : null;
  const activeLineNum = state.selection ? state.doc.lineAt(state.selection.main.head).number : -1;
  const lineTypes = lineTypesFallback ? [...lineTypesFallback] : classifyLines(doc);
  if (lineTypesFallback && activeLineNum > 0 && activeLineNum <= lineTypes.length) {
    const realTimeTypes = classifyLines(doc);
    lineTypes[activeLineNum - 1] = realTimeTypes[activeLineNum - 1];
  }



  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const trimmed = line.text.trim();
    const type = lineTypes[i - 1];
    const className = TYPE_TO_CLASS[type];

    const lineDecos: { from: number, to: number, dec: Decoration }[] = [];



    if (className) {
      lineDecos.push({ from: line.from, to: line.from, dec: Decoration.line({ class: className }) });
    }

    if (type === LINE_HEADING) {
      const sceneNumMatch = trimmed.match(/#([^#\s]+)#/);
      if (sceneNumMatch) {
        const num = sceneNumMatch[1].trim();
        lineDecos.push({
          from: line.from, to: line.from, dec: Decoration.line({
            attributes: { "data-scene-number": num }
          })
        });
        const hashStart = line.text.indexOf("#" + sceneNumMatch[1] + "#");
        if (hashStart >= 0) {
          lineDecos.push({
            from: line.from + hashStart, to: line.from + hashStart + sceneNumMatch[0].length, dec: Decoration.mark({ class: "cm-fountain-syntax" })
          });
        }
      }
    }

    const isEditingThisLine = i === activeLineNum;
    const syntaxDeco = (hideSyntaxEnabled && !isEditingThisLine)
      ? Decoration.mark({ class: "cm-fountain-syntax-hidden" })
      : Decoration.mark({ class: "cm-fountain-syntax" });

    if (/^#{1,2}(?:[^#]|$)/.test(trimmed) && type === LINE_SECTION) {
      const match = trimmed.match(/^#+/);
      if (match) {
        const startIdx = line.text.indexOf("#");
        const nextChar = line.text[startIdx + match[0].length];
        const toPos = startIdx + match[0].length + (nextChar === " " ? 1 : 0);
        lineDecos.push({ from: line.from + startIdx, to: line.from + toPos, dec: syntaxDeco });
      }
    }
    if (trimmed.startsWith("=") && type === LINE_SYNOPSE) {
      lineDecos.push({ from: line.from + line.text.indexOf("="), to: line.from + line.text.indexOf("=") + 1, dec: syntaxDeco });
    }

    if (trimmed.startsWith(".") && !trimmed.startsWith("..") && type === LINE_HEADING) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf(".") + 1, dec: syntaxDeco });
    }
    if (trimmed.startsWith("!!") && type === LINE_SHOT) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf("!!") + 2, dec: syntaxDeco });
    } else if (trimmed.startsWith("!") && type === LINE_ACTION) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf("!") + 1, dec: syntaxDeco });
    }
    if (trimmed.startsWith("~") && type === LINE_LYRICS) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf("~") + 1, dec: syntaxDeco });
    }
    if (trimmed.startsWith(">") && trimmed.endsWith("<") && type === LINE_CENTERED) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf(">") + 1, dec: syntaxDeco });
      lineDecos.push({ from: line.to - 1, to: line.to, dec: syntaxDeco });
    } else if (trimmed.startsWith(">") && !trimmed.endsWith("<") && type === LINE_TRANSITION) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf(">") + 1, dec: syntaxDeco });
    }
    if (trimmed.endsWith("^") && type === LINE_DUAL_CHARACTER) {
      lineDecos.push({ from: line.to - 1, to: line.to, dec: syntaxDeco });
    }
    if (trimmed.startsWith("@") && type === LINE_CHARACTER) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf("@") + 1, dec: syntaxDeco });
    }

    const noteTagRegex = /\[\[(.*?)\]\]/g;
    let noteM;
    while ((noteM = noteTagRegex.exec(line.text)) !== null) {
      const noteContent = noteM[1].trim().toLowerCase();
      const noteFrom = line.from + noteM.index;
      const noteTo = noteFrom + noteM[0].length;
      let parsedColor: string | null = null;
      if (noteContent.startsWith("marker")) {
        const markerBody = noteM[1].trim().substring(6).trim();
        let markerColor = "orange";
        const colonIdx = markerBody.indexOf(":");
        if (colonIdx !== -1) {
          const beforeColon = markerBody.substring(0, colonIdx).trim().toLowerCase();
          if (/^(blue|brown|cyan|green|magenta|none|orange|pink|purple|red|yellow)$/.test(beforeColon) ||
              (beforeColon.startsWith("#") && beforeColon.length === 7)) {
            markerColor = beforeColon;
          }
        } else if (/^(blue|brown|cyan|green|magenta|none|orange|pink|purple|red|yellow)$/.test(markerBody.toLowerCase())) {
          markerColor = markerBody.toLowerCase();
        }
        parsedColor = markerColor;
      } else if (/^(blue|brown|cyan|green|magenta|none|orange|pink|purple|red|yellow)$/.test(noteContent) ||
                 (noteContent.startsWith("#") && noteContent.length === 7)) {
        parsedColor = noteContent;
      }

      if (noteContent.startsWith("marker")) {
        const colorVal = (parsedColor && parsedColor !== "none")
          ? (parsedColor.startsWith("#") ? parsedColor : `var(--scene-color-${parsedColor})`)
          : "var(--scene-color-orange)";
        lineDecos.push({
          from: noteFrom,
          to: noteTo,
          dec: Decoration.mark({
            class: "cm-fountain-marker",
            attributes: { style: `color: ${colorVal}` }
          })
        });
      } else if (noteContent.startsWith("color") || noteContent.startsWith("storyline") ||
                 /^(red|blue|green|pink|magenta|gray|purple|cyan|teal|yellow|orange|brown)$/.test(noteContent)) {
        const colorVal = (parsedColor && parsedColor !== "none")
          ? (parsedColor.startsWith("#") ? parsedColor : `var(--scene-color-${parsedColor})`)
          : undefined;
        lineDecos.push({
          from: noteFrom,
          to: noteTo,
          dec: Decoration.mark({
            class: "cm-fountain-note-tag",
            ...(colorVal ? { attributes: { style: `color: ${colorVal}` } } : {})
          })
        });
      }
    }

    const prodTags = getPerScriptSettingObject<{ tags: Array<{ range?: [number, number]; definitionId: string; type?: string }>; definitions: Array<{ id: string; name: string; type: string; colorOverride: string | null }> }>("productionTags", docObj?.settings, scriptFileName, { tags: [], definitions: [] });
    if (!hideTagsEnabled && !rightPaneOpen && prodTags && prodTags.tags) {
      const tagDefMap = new Map<string, string>();
      if (prodTags.definitions) {
        for (const def of prodTags.definitions) {
          tagDefMap.set(def.id, def.type);
        }
      }
      for (const tag of prodTags.tags) {
        if (tag.range) {
          const [start, len] = tag.range;
          const end = start + len;
          const tagFrom = Math.max(line.from, start);
          const tagTo = Math.min(line.to, end);
          if (tagFrom < tagTo) {
            const type = tag.type || tagDefMap.get(tag.definitionId) || "";
            lineDecos.push({
              from: tagFrom,
              to: tagTo,
              dec: Decoration.mark({ class: `cm-tag-${type}` })
            });
          }
        }
      }
    }

    // Markdown Parsing
    const text = line.text;
    
    // Bold
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let m;
    while ((m = boldRegex.exec(text)) !== null) {
      const start = line.from + m.index;
      lineDecos.push({ from: start, to: start + 2, dec: syntaxDeco });
      lineDecos.push({ from: start + 2, to: start + m[0].length - 2, dec: Decoration.mark({ class: "cm-fountain-bold" }) });
      lineDecos.push({ from: start + m[0].length - 2, to: start + m[0].length, dec: syntaxDeco });
    }

    // Italic
    const italicRegex = /(^|[^*])\*([^*]+)\*(?=[^*]|$)/g;
    while ((m = italicRegex.exec(text)) !== null) {
      const offset = m[1].length;
      const start = line.from + m.index + offset;
      const matchLen = m[0].length - offset;
      lineDecos.push({ from: start, to: start + 1, dec: syntaxDeco });
      lineDecos.push({ from: start + 1, to: start + matchLen - 1, dec: Decoration.mark({ class: "cm-fountain-italic" }) });
      lineDecos.push({ from: start + matchLen - 1, to: start + matchLen, dec: syntaxDeco });
    }

    // Underline
    const underlineRegex = /_([^_]+)_/g;
    while ((m = underlineRegex.exec(text)) !== null) {
      const start = line.from + m.index;
      lineDecos.push({ from: start, to: start + 1, dec: syntaxDeco });
      lineDecos.push({ from: start + 1, to: start + m[0].length - 1, dec: Decoration.mark({ class: "cm-fountain-underline" }) });
      lineDecos.push({ from: start + m[0].length - 1, to: start + m[0].length, dec: syntaxDeco });
    }

    // Sort to satisfy RangeSetBuilder constraints
    lineDecos.sort((a, b) => a.from - b.from || a.to - b.to);

    // Prevent overlapping ranges
    const validDecos = [];
    let lastTo = -1;
    for (const d of lineDecos) {
      if (d.from === line.from && d.from === d.to) {
        validDecos.push(d);
        continue;
      }
      if (d.from >= lastTo) {
        validDecos.push(d);
        lastTo = d.to;
      }
    }

    for (const d of validDecos) {
      allDecos.push(d);
    }
  }

  for (const m of searchMatches) {
    if (m.from >= 0 && m.to > m.from && m.to <= state.doc.length) {
      allDecos.push({
        from: m.from,
        to: m.to,
        dec: Decoration.mark({ class: "cm-search-match" })
      });
    }
  }

  allDecos.sort((a, b) => a.from - b.from || a.to - b.to);

  for (const d of allDecos) {
    builder.add(d.from, d.to, d.dec);
  }

  return builder.finish();
};

const defaultDisplaySettings: PageBreakDisplaySettings = { showPageNumbers: true, showPageSeparators: false };

export const fountainHighlightField = StateField.define<{
  decorations: DecorationSet;
  doc: FountainDocument | null;
  displaySettings: PageBreakDisplaySettings;
  hideSyntaxEnabled: boolean;
  hideTagsEnabled: boolean;
  rightPaneOpen: boolean;
  scriptFileName: string;
  searchMatches: { from: number; to: number }[];
}>({
  create(state) {
    return {
      decorations: computeFountainDecorations(state, null, false, false, false, "", []),
      doc: null,
      displaySettings: defaultDisplaySettings,
      hideSyntaxEnabled: false,
      hideTagsEnabled: false,
      rightPaneOpen: false,
      scriptFileName: "",
      searchMatches: [],
    };
  },
  update(value, tr) {
    let doc = value.doc;
    let displaySettings = value.displaySettings;
    let hideSyntaxEnabled = value.hideSyntaxEnabled;
    let hideTagsEnabled = value.hideTagsEnabled;
    let rightPaneOpen = value.rightPaneOpen;
    let scriptFileName = value.scriptFileName;
    let searchMatches = value.searchMatches;
    let hideSyntaxChanged = false;
    let hideTagsChanged = false;
    let rightPaneChanged = false;
    let scriptFileNameChanged = false;
    let searchMatchesChanged = false;

    for (const effect of tr.effects) {
      if (effect.is(updateParsedDocEffect)) {
        doc = effect.value;
      }
      if (effect.is(updatePageBreakDisplayEffect)) {
        displaySettings = effect.value;
      }
      if (effect.is(updateHideSyntaxEffect)) {
        hideSyntaxEnabled = effect.value;
        hideSyntaxChanged = true;
      }
      if (effect.is(updateHideTagsEffect)) {
        hideTagsEnabled = effect.value;
        hideTagsChanged = true;
      }
      if (effect.is(updateRightPaneOpenEffect)) {
        rightPaneOpen = effect.value;
        rightPaneChanged = true;
      }
      if (effect.is(updateScriptFileNameEffect)) {
        scriptFileName = effect.value;
        scriptFileNameChanged = true;
      }
      if (effect.is(updateSearchMatchesEffect)) {
        searchMatches = effect.value;
        searchMatchesChanged = true;
      }
    }
    if (
      tr.docChanged ||
      tr.selection ||
      doc !== value.doc ||
      displaySettings !== value.displaySettings ||
      hideSyntaxChanged ||
      hideTagsChanged ||
      rightPaneChanged ||
      scriptFileNameChanged ||
      searchMatchesChanged
    ) {
      return {
        decorations: computeFountainDecorations(tr.state, doc, hideSyntaxEnabled, hideTagsEnabled, rightPaneOpen, scriptFileName, searchMatches),
        doc,
        displaySettings,
        hideSyntaxEnabled,
        hideTagsEnabled,
        rightPaneOpen,
        scriptFileName,
        searchMatches,
      };
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f, (val) => val.decorations),
});
