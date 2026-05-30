import { EditorState, StateField, RangeSetBuilder, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, WidgetType } from "@codemirror/view";
import { LineType, FountainDocument } from "../parser/FountainParser";
import { computeRevisedLines } from "../utils/diff";

export const updateParsedDocEffect = StateEffect.define<FountainDocument>();

class PageBreakWidget extends WidgetType {
  constructor(readonly pageNum: number) {
    super();
  }
  toDOM() {
    const div = document.createElement("div");
    div.className = "cm-fountain-pagebreak-widget";
    
    const line = document.createElement("div");
    line.className = "cm-fountain-pagebreak-line";
    
    const label = document.createElement("span");
    label.className = "cm-fountain-pagebreak-label";
    label.textContent = `${this.pageNum}`;
    
    div.appendChild(line);
    div.appendChild(label);
    
    return div;
  }
  ignoreEvent() { return true; }
  eq(other: PageBreakWidget) {
    return this.pageNum === other.pageNum;
  }
}

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
export const LINE_METADATA = 99;

export const isDialogueType = (t: number) =>
  t === LINE_CHARACTER || t === LINE_DIALOGUE || t === LINE_PARENTHETICAL ||
  t === LINE_DUAL_CHARACTER || t === LINE_DUAL_DIALOGUE || t === LINE_DUAL_PARENTHETICAL;

export const isDualType = (t: number) =>
  t === LINE_DUAL_CHARACTER || t === LINE_DUAL_DIALOGUE || t === LINE_DUAL_PARENTHETICAL;

export const needsBlankAfterEnter = (t: number) =>
  t === LINE_HEADING || t === LINE_ACTION || t === LINE_DIALOGUE ||
  t === LINE_DUAL_DIALOGUE;

export const classifyLines = (doc: any): number[] => {
  const types: number[] = [];
  let inTitlePage = true;
  let inMetadataBlock = false;

  for (let i = 1; i <= doc.lines; i++) {
    const text = doc.line(i).text;
    const trimmed = text.trim();
    let type = LINE_ACTION;

    if (trimmed.includes("/* If you are seeing this and you are not using ActOne, you can delete these. - ACTONE:") ||
        trimmed.includes("/* If you're seeing this, you can remove the following stuff - ACTONE:") ||
        trimmed.includes("ACTONE:")) {
      inMetadataBlock = true;
    }

    if (inMetadataBlock) {
      types.push(LINE_METADATA);
      if (trimmed.includes("END_ACTONE*/")) {
        inMetadataBlock = false;
      }
      continue;
    }

    if (inTitlePage) {
      if (trimmed === "") {
        if (i > 1) inTitlePage = false;
        types.push(LINE_EMPTY);
        continue;
      }
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1) {
        types.push(LINE_TITLE_PAGE);
        continue;
      }
      if (trimmed.startsWith(" ") || trimmed.startsWith("\t") || i > 1) {
        types.push(LINE_TITLE_PAGE);
        continue;
      }
      inTitlePage = false;
    }

    if (trimmed === "") {
      type = LINE_EMPTY;
    } else if (trimmed.startsWith("#")) {
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
  [LINE_METADATA]: "cm-fountain-metadata",
};

const computeFountainDecorations = (state: EditorState, docObj: FountainDocument | null): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;
  const lineTypes = classifyLines(doc);

  const revisionModeEnabled = docObj?.settings?.revisionModeEnabled;
  const revisionBaseText = docObj?.settings?.revisionBaseText;
  let revisedLines: boolean[] = [];
  if (revisionModeEnabled && typeof revisionBaseText === "string") {
    revisedLines = computeRevisedLines(revisionBaseText, doc.toString());
  }

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const trimmed = line.text.trim();
    const type = lineTypes[i - 1];
    const className = TYPE_TO_CLASS[type];

    let lineDecos: { from: number, to: number, dec: Decoration }[] = [];

    if (docObj && docObj.pageBreaks) {
      const breakIdx = docObj.pageBreaks.indexOf(i);
      if (breakIdx !== -1) {
        const hasTitlePage = docObj.lines.some(l => l.type >= LineType.titlePageTitle && l.type <= LineType.titlePageUnknown);
        const pageNum = hasTitlePage ? breakIdx + 1 : breakIdx + 2;
        lineDecos.push({
          from: line.from,
          to: line.from,
          dec: Decoration.widget({
            widget: new PageBreakWidget(pageNum),
            block: true,
            side: -1
          })
        });
      }
    }

    if (className) {
      let finalClassName = className;
      if (type === LINE_METADATA) {
        const isStart = i === 1 || lineTypes[i - 2] !== LINE_METADATA;
        if (isStart) {
          finalClassName += " cm-fountain-metadata-start";
        }
      }
      if (revisedLines[i - 1]) {
        finalClassName += " cm-fountain-revised";
      }
      lineDecos.push({ from: line.from, to: line.from, dec: Decoration.line({ class: finalClassName }) });
    } else {
      if (revisedLines[i - 1]) {
        lineDecos.push({ from: line.from, to: line.from, dec: Decoration.line({ class: "cm-fountain-revised" }) });
      }
    }

    if (type === LINE_HEADING) {
      const sceneNumMatch = trimmed.match(/#([^#]+)#\s*$/);
      if (sceneNumMatch) {
        const num = sceneNumMatch[1].trim();
        lineDecos.push({
          from: line.from, to: line.from, dec: Decoration.line({
            attributes: { "data-scene-number": num }
          })
        });
        const hashStart = line.text.lastIndexOf("#" + sceneNumMatch[1] + "#");
        if (hashStart >= 0) {
          lineDecos.push({
            from: line.from + hashStart, to: line.to, dec: Decoration.mark({ class: "cm-fountain-syntax" })
          });
        }
      }
    }

    if (trimmed.startsWith(".") && !trimmed.startsWith("..") && type === LINE_HEADING) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf(".") + 1, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    }
    if (trimmed.startsWith("!!") && type === LINE_SHOT) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf("!!") + 2, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    } else if (trimmed.startsWith("!") && type === LINE_ACTION) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf("!") + 1, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    }
    if (trimmed.startsWith("~") && type === LINE_LYRICS) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf("~") + 1, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    }
    if (trimmed.startsWith(">") && trimmed.endsWith("<") && type === LINE_CENTERED) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf(">") + 1, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
      lineDecos.push({ from: line.to - 1, to: line.to, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    } else if (trimmed.startsWith(">") && !trimmed.endsWith("<") && type === LINE_TRANSITION) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf(">") + 1, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    }
    if (trimmed.endsWith("^") && type === LINE_DUAL_CHARACTER) {
      lineDecos.push({ from: line.to - 1, to: line.to, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    }
    if (trimmed.startsWith("@") && type === LINE_CHARACTER) {
      lineDecos.push({ from: line.from, to: line.from + line.text.indexOf("@") + 1, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    }

    let noteTagRegex = /\[\[(.*?)\]\]/g;
    let noteM;
    while ((noteM = noteTagRegex.exec(line.text)) !== null) {
      const noteContent = noteM[1].trim().toLowerCase();
      const noteFrom = line.from + noteM.index;
      const noteTo = noteFrom + noteM[0].length;
      if (noteContent.startsWith("marker")) {
        lineDecos.push({ from: noteFrom, to: noteTo, dec: Decoration.mark({ class: "cm-fountain-marker" }) });
      } else if (noteContent.startsWith("color") || noteContent.startsWith("storyline") ||
                 /^(red|blue|green|pink|magenta|gray|purple|cyan|teal|yellow|orange|brown)$/.test(noteContent)) {
        lineDecos.push({ from: noteFrom, to: noteTo, dec: Decoration.mark({ class: "cm-fountain-note-tag" }) });
      }
    }

    // Markdown Parsing
    let text = line.text;
    
    // Bold
    let boldRegex = /\*\*([^*]+)\*\*/g;
    let m;
    while ((m = boldRegex.exec(text)) !== null) {
      let start = line.from + m.index;
      lineDecos.push({ from: start, to: start + 2, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
      lineDecos.push({ from: start + 2, to: start + m[0].length - 2, dec: Decoration.mark({ class: "cm-fountain-bold" }) });
      lineDecos.push({ from: start + m[0].length - 2, to: start + m[0].length, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    }

    // Italic
    let italicRegex = /(^|[^*])\*([^*]+)\*(?=[^*]|$)/g;
    while ((m = italicRegex.exec(text)) !== null) {
      let offset = m[1].length;
      let start = line.from + m.index + offset;
      let matchLen = m[0].length - offset;
      lineDecos.push({ from: start, to: start + 1, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
      lineDecos.push({ from: start + 1, to: start + matchLen - 1, dec: Decoration.mark({ class: "cm-fountain-italic" }) });
      lineDecos.push({ from: start + matchLen - 1, to: start + matchLen, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    }

    // Underline
    let underlineRegex = /_([^_]+)_/g;
    while ((m = underlineRegex.exec(text)) !== null) {
      let start = line.from + m.index;
      lineDecos.push({ from: start, to: start + 1, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
      lineDecos.push({ from: start + 1, to: start + m[0].length - 1, dec: Decoration.mark({ class: "cm-fountain-underline" }) });
      lineDecos.push({ from: start + m[0].length - 1, to: start + m[0].length, dec: Decoration.mark({ class: "cm-fountain-syntax" }) });
    }

    // Sort to satisfy RangeSetBuilder constraints
    lineDecos.sort((a, b) => a.from - b.from || a.to - b.to);

    // Prevent overlapping ranges
    let validDecos = [];
    let lastTo = -1;
    for (let d of lineDecos) {
      if (d.from === line.from && d.from === d.to) {
        validDecos.push(d);
        continue;
      }
      if (d.from >= lastTo) {
        validDecos.push(d);
        lastTo = d.to;
      }
    }

    for (let d of validDecos) {
      builder.add(d.from, d.to, d.dec);
    }
  }

  return builder.finish();
};

export const fountainHighlightField = StateField.define<{ decorations: DecorationSet; doc: FountainDocument | null }>({
  create(state) {
    return {
      decorations: computeFountainDecorations(state, null),
      doc: null,
    };
  },
  update(value, tr) {
    let doc = value.doc;
    for (let effect of tr.effects) {
      if (effect.is(updateParsedDocEffect)) {
        doc = effect.value;
      }
    }
    if (tr.docChanged || doc !== value.doc) {
      return {
        decorations: computeFountainDecorations(tr.state, doc),
        doc,
      };
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f, (val) => val.decorations),
});
