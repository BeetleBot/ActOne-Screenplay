import { useEffect, useRef } from "react";
import { EditorState, Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { useAppContext } from "../context/AppContext";
import { LineType } from "../parser/FountainParser";
import { fountainCompletionSource } from "./autocomplete";
import { 
  fountainHighlightField, 
  updateParsedDocEffect,
  classifyLines,
  needsBlankAfterEnter,
  LINE_CHARACTER,
  LINE_DIALOGUE,
  LINE_DUAL_CHARACTER,
  LINE_DUAL_DIALOGUE,
  LINE_PARENTHETICAL,
  LINE_DUAL_PARENTHETICAL
} from "./fountainSyntax";

const smartQuotesExtension = EditorState.transactionFilter.of((tr) => {
  if (localStorage.getItem("actone-smart-quotes-enabled") !== "true") return tr;
  if (!tr.docChanged || tr.annotation(Transaction.userEvent) !== "input.type") return tr;
  
  const changes: any[] = [];
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    const text = inserted.toString();
    if (text === '"') {
      const beforePos = fromA - 1;
      let isOpening = true;
      if (beforePos >= 0) {
        const charBefore = tr.startState.doc.sliceString(beforePos, fromA);
        if (charBefore && !/\s/.test(charBefore)) {
          isOpening = false;
        }
      }
      changes.push({ from: fromA, to: toA, insert: isOpening ? "“" : "”" });
    } else if (text === "'") {
      const beforePos = fromA - 1;
      let isOpening = true;
      if (beforePos >= 0) {
        const charBefore = tr.startState.doc.sliceString(beforePos, fromA);
        if (charBefore && !/\s/.test(charBefore)) {
          isOpening = false;
        }
      }
      changes.push({ from: fromA, to: toA, insert: isOpening ? "‘" : "’" });
    }
  });
  
  if (changes.length > 0) {
    return [tr, { changes }];
  }
  return tr;
});

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

export function useCodeMirror(containerRef: React.RefObject<HTMLDivElement | null>) {
  const viewRef = useRef<EditorView | null>(null);
  const { rawText, setRawText, setActiveLineId, setSelectedSceneId, parsedDoc, setEditorView, typewriterMode } = useAppContext();

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
        run: (view) => {
          if (fountainParenHandler(view)) return true;
          if (localStorage.getItem("actone-match-parentheses-enabled") === "true") {
            const { head } = view.state.selection.main;
            view.dispatch({
              changes: { from: head, insert: "()" },
              selection: { anchor: head + 1 }
            });
            return true;
          }
          return false;
        }
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

        fountainKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        editorTheme,
        fountainHighlightField,
        smartQuotesExtension,
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
            if (typewriterModeRef.current && update.docChanged) {
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

  return viewRef;
}
