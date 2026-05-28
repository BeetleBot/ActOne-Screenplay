import React, { useEffect, useRef } from "react";
import { EditorState, StateField, RangeSetBuilder, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, WidgetType, keymap, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { autocompletion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { useScreenplay } from "../context/ScreenplayContext";
import { LineType, FountainDocument } from "../parser/FountainParser";

const updateParsedDocEffect = StateEffect.define<FountainDocument>();

class PageBreakWidget extends WidgetType {
  constructor(readonly pageNum: number) {
    super();
  }
  toDOM() {
    const div = document.createElement("div");
    div.className = "cm-fountain-pagebreak-widget";
    
    const lineLeft = document.createElement("div");
    lineLeft.className = "cm-fountain-pagebreak-line";
    
    const label = document.createElement("span");
    label.className = "cm-fountain-pagebreak-label";
    label.textContent = `PAGE ${this.pageNum}`;
    
    const lineRight = document.createElement("div");
    lineRight.className = "cm-fountain-pagebreak-line";
    
    div.appendChild(lineLeft);
    div.appendChild(label);
    div.appendChild(lineRight);
    
    return div;
  }
  ignoreEvent() { return true; }
  eq(other: PageBreakWidget) {
    return this.pageNum === other.pageNum;
  }
}

const LINE_EMPTY = 0;
const LINE_SECTION = 1;
const LINE_SYNOPSE = 2;
const LINE_TITLE_PAGE = 9;
const LINE_HEADING = 10;
const LINE_ACTION = 11;
const LINE_CHARACTER = 12;
const LINE_PARENTHETICAL = 13;
const LINE_DIALOGUE = 14;
const LINE_DUAL_CHARACTER = 15;
const LINE_DUAL_PARENTHETICAL = 16;
const LINE_DUAL_DIALOGUE = 17;
const LINE_TRANSITION = 18;
const LINE_LYRICS = 19;
const LINE_PAGEBREAK = 20;
const LINE_CENTERED = 21;
const LINE_SHOT = 22;

const isDialogueType = (t: number) =>
  t === LINE_CHARACTER || t === LINE_DIALOGUE || t === LINE_PARENTHETICAL ||
  t === LINE_DUAL_CHARACTER || t === LINE_DUAL_DIALOGUE || t === LINE_DUAL_PARENTHETICAL;

const isDualType = (t: number) =>
  t === LINE_DUAL_CHARACTER || t === LINE_DUAL_DIALOGUE || t === LINE_DUAL_PARENTHETICAL;

const needsBlankAfterEnter = (t: number) =>
  t === LINE_HEADING || t === LINE_ACTION || t === LINE_DIALOGUE ||
  t === LINE_DUAL_DIALOGUE;

const classifyLines = (doc: any): number[] => {
  const types: number[] = [];
  let inTitlePage = true;

  for (let i = 1; i <= doc.lines; i++) {
    const text = doc.line(i).text;
    const trimmed = text.trim();
    let type = LINE_ACTION;

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

const fountainCompletionSource = (context: CompletionContext): CompletionResult | null => {
  const word = context.matchBefore(/[\w\.\/]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const line = context.state.doc.lineAt(context.pos);
  const beforeCursor = line.text.substring(0, context.pos - line.from);
  const lineTypes = classifyLines(context.state.doc);
  const currentType = lineTypes[line.number - 1];

  if (currentType === LINE_HEADING || currentType === LINE_DIALOGUE ||
      currentType === LINE_PARENTHETICAL || currentType === LINE_ACTION) {
    return null;
  }

  const options = [];

  if (currentType === LINE_EMPTY || line.number === 1) {
    if (/^[iIeE]?$/i.test(beforeCursor.trim())) {
      options.push(
        { label: "INT. ", type: "keyword", boost: 99 },
        { label: "EXT. ", type: "keyword", boost: 98 },
        { label: "I/E ", type: "keyword", boost: 97 }
      );
    }
  }

  if (currentType === LINE_CHARACTER || currentType === LINE_EMPTY) {
    const docText = context.state.doc.toString();
    const characters = new Set<string>();
    const lines = docText.split("\n");
    const allTypes = classifyLines(context.state.doc);
    for (let i = 0; i < lines.length; i++) {
      if (allTypes[i] === LINE_CHARACTER || allTypes[i] === LINE_DUAL_CHARACTER) {
        const name = lines[i].trim().replace(/\s*\^$/, "").replace(/\s*\(.*\)$/, "").trim();
        if (name.length > 1) characters.add(name);
      }
    }
    characters.forEach(char => {
      options.push({ label: char, type: "variable" });
    });
  }

  if (currentType === LINE_TRANSITION || currentType === LINE_EMPTY) {
    const trimmed = beforeCursor.trim().toUpperCase();
    const isTransitionPrefix = /^(CUT|FAD|DIS|SMA|MAT)/.test(trimmed);
    if (currentType === LINE_TRANSITION || isTransitionPrefix) {
      const transitions = ["CUT TO:", "FADE OUT.", "FADE IN:", "DISSOLVE TO:", "SMASH CUT TO:", "MATCH CUT TO:"];
      transitions.forEach(t => {
        if (t.startsWith(trimmed)) {
          options.push({ label: t, type: "keyword" });
        }
      });
    }
  }

  if (options.length === 0) return null;

  return {
    from: word.from,
    options: options.filter(opt => opt.label.toUpperCase().startsWith(word.text.toUpperCase()))
  };
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

const computeFountainDecorations = (state: EditorState, docObj: FountainDocument | null): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;
  const lineTypes = classifyLines(doc);

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
      lineDecos.push({ from: line.from, to: line.from, dec: Decoration.line({ class: className }) });
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

const fountainHighlightField = StateField.define<{ decorations: DecorationSet; doc: FountainDocument | null }>({
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

const fountainEnterHandler = (view: EditorView): boolean => {
  const state = view.state;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);

  if (pos !== line.to) return false;

  const lineTypes = classifyLines(state.doc);
  const currentType = lineTypes[line.number - 1];

  if (needsBlankAfterEnter(currentType) && line.text.trim().length > 0) {
    view.dispatch({
      changes: { from: pos, insert: "\n\n" },
      selection: { anchor: pos + 2 },
    });
    return true;
  }

  return false;
};

const fountainParenHandler = (view: EditorView): boolean => {
  const state = view.state;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const trimmed = line.text.trim();

  if (trimmed !== "" || pos !== line.from) return false;

  if (line.number < 2) return false;
  const prevLineNum = line.number - 1;
  if (prevLineNum < 1) return false;

  const prevLine = state.doc.line(prevLineNum);
  if (prevLine.text.trim() !== "") return false;

  if (prevLineNum < 2) return false;
  const lineTypes = classifyLines(state.doc);
  const prevPrevType = lineTypes[prevLineNum - 2];

  if (prevPrevType === LINE_DIALOGUE || prevPrevType === LINE_DUAL_DIALOGUE ||
      prevPrevType === LINE_CHARACTER || prevPrevType === LINE_DUAL_CHARACTER ||
      prevPrevType === LINE_PARENTHETICAL || prevPrevType === LINE_DUAL_PARENTHETICAL) {
    view.dispatch({
      changes: { from: prevLine.from, to: line.from, insert: "" },
    });
    const newPos = prevLine.from;
    view.dispatch({
      changes: { from: newPos, insert: "(" },
      selection: { anchor: newPos + 1 },
    });
    return true;
  }

  return false;
};

const editorTheme = EditorView.theme({
  "&": {
    height: "auto",
    minHeight: "100%",
  },
  ".cm-scroller": {
    overflow: "visible",
  },
  ".cm-content": {
    padding: "0",
  },
  "&.cm-focused": {
    outline: "none",
  }
});

function handleTab(view: EditorView): boolean {
  const state = view.state;
  const selection = state.selection.main;
  
  if (!selection.empty) return false;
  
  const line = state.doc.lineAt(selection.head);
  const text = line.text;
  const trim = text.trim();
  
  let newText = text;
  let newCursor = selection.head;
  
  if (trim === "") {
    newText = "@";
    newCursor = line.from + 1;
  } else if (trim === "()") {
    newText = "@";
    newCursor = line.from + 1;
  } else if (trim === "@") {
    newText = ".";
    newCursor = line.from + 1;
  } else if (trim === ".") {
    newText = ">";
    newCursor = line.from + 1;
  } else if (trim === ">") {
    newText = "";
    newCursor = line.from;
  } else {
    if (text.startsWith("@")) {
      newText = "." + text.substring(1);
    } else if (text.startsWith(".")) {
      newText = ">" + text.substring(1);
    } else if (text.startsWith(">") && text.endsWith("<")) {
      newText = text.substring(1, text.length - 1).trim();
    } else if (text.startsWith(">")) {
      newText = text.substring(1).trimStart();
    } else if (text.startsWith("!")) {
      newText = text.substring(1).trimStart();
    } else if (text.startsWith("~")) {
      newText = text.substring(1).trimStart();
    } else if (text.startsWith("(")) {
      let stripped = text.substring(1);
      if (stripped.endsWith(")")) stripped = stripped.substring(0, stripped.length - 1);
      newText = stripped;
    } else {
      newText = "@" + text;
    }
    newCursor = line.from + newText.length;
  }

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newText },
    selection: { anchor: newCursor }
  });
  
  return true;
}

export const FountainEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { rawText, setRawText, setActiveLineId, setSelectedSceneId, parsedDoc, setEditorView, fontFamily, typewriterMode } = useScreenplay();

  const parsedDocRef = useRef(parsedDoc);
  useEffect(() => {
    parsedDocRef.current = parsedDoc;
  }, [parsedDoc]);

  const setRawTextRef = useRef(setRawText);
  useEffect(() => {
    setRawTextRef.current = setRawText;
  }, [setRawText]);

  const setActiveLineIdRef = useRef(setActiveLineId);
  useEffect(() => {
    setActiveLineIdRef.current = setActiveLineId;
  }, [setActiveLineId]);

  const setSelectedSceneIdRef = useRef(setSelectedSceneId);
  useEffect(() => {
    setSelectedSceneIdRef.current = setSelectedSceneId;
  }, [setSelectedSceneId]);

  const typewriterModeRef = useRef(typewriterMode);
  useEffect(() => {
    typewriterModeRef.current = typewriterMode;
    if (viewRef.current) {
      if (typewriterMode) {
        viewRef.current.scrollDOM.classList.add("cm-typewriter-mode");
        const pos = viewRef.current.state.selection.main.head;
        viewRef.current.dispatch({
          effects: EditorView.scrollIntoView(pos, { y: "center" })
        });
      } else {
        viewRef.current.scrollDOM.classList.remove("cm-typewriter-mode");
      }
    }
  }, [typewriterMode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const fountainKeymap = keymap.of([
      {
        key: "Enter",
        run: fountainEnterHandler
      },
      {
        key: "(",
        run: fountainParenHandler
      },
      {
        key: "Tab",
        run: handleTab,
        preventDefault: true
      }
    ]);

    const startState = EditorState.create({
      doc: rawText,
      extensions: [
        history(),
        drawSelection(),
        fountainKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        editorTheme,
        fountainHighlightField,
        autocompletion({ override: [fountainCompletionSource] }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setRawTextRef.current(update.state.doc.toString());
          }
          if (update.selectionSet || update.docChanged) {
            const pos = update.state.selection.main.head;
            const lineNum = update.state.doc.lineAt(pos).number;
            const idx = lineNum - 1;
            if (idx >= 0 && idx < parsedDocRef.current.lines.length) {
              setActiveLineIdRef.current(parsedDocRef.current.lines[idx].id);
              const lines = parsedDocRef.current.lines;
              for (let i = idx; i >= 0; i--) {
                if (lines[i].isOutlineElement && lines[i].type !== LineType.synopse) {
                  setSelectedSceneIdRef.current(lines[i].id);
                  break;
                }
              }
            }
            if (typewriterModeRef.current && (update.docChanged || update.selectionSet)) {
              setTimeout(() => {
                update.view.dispatch({
                  effects: EditorView.scrollIntoView(pos, { y: "center" })
                });
              }, 0);
            }
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    if (typewriterModeRef.current) {
      view.scrollDOM.classList.add("cm-typewriter-mode");
      setTimeout(() => {
        const pos = view.state.selection.main.head;
        view.dispatch({
          effects: EditorView.scrollIntoView(pos, { y: "center" })
        });
      }, 0);
    }

    viewRef.current = view;
    setEditorView(view);

    return () => {
      view.destroy();
      setEditorView(null);
    };
  }, []);

  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== rawText) {
      const view = viewRef.current;
      const cursor = view.state.selection.main.head;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: rawText },
        selection: { anchor: Math.min(cursor, rawText.length) },
      });
    }
  }, [rawText]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: updateParsedDocEffect.of(parsedDoc)
      });
    }
  }, [parsedDoc]);

  return (
    <div className={`editor-font-wrapper ${fontFamily}`} style={{ display: "flex", flex: 1, minHeight: "100%", flexDirection: "column" }}>
      <div ref={containerRef} style={{ flex: 1, minHeight: "100%", cursor: "text" }} onClick={() => viewRef.current?.focus()} />
    </div>
  );
};
