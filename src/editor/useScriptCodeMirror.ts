import { useEffect, useMemo, useRef } from "react";
import { EditorState, Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";
import { useCoreCodeMirror } from "./useCoreCodeMirror";
import { useFile, useUI } from "../context";
import { ghostSuggestionField, ghostSuggestionKeymap, fountainCompletionSource, cachedCharactersField, cachedLocationsField } from "./inlineAutocomplete";
import { 
  fountainHighlightPlugin,
  updateParsedDocEffect,
  updateHideSyntaxEffect,
  updateScriptFileNameEffect,
  updateRightPaneOpenEffect,
  lineTypesField,
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
  
  const changes: { from: number; to: number; insert: string }[] = [];
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

const fountainEnterHandler = (view: EditorView): boolean => {
  const state = view.state;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const after = line.text.substring(pos - line.from);

  if (pos !== line.to) {
    const afterTrimmed = after.trim();
    if (afterTrimmed === ")") {
      view.dispatch({
        changes: { from: pos, to: line.to, insert: ")\n" },
        selection: { anchor: pos + 2 },
      });
      return true;
    }
    return false;
  }

  const lineTypes = state.field(lineTypesField, false);
  const currentType = lineTypes ? lineTypes[line.number - 1] : 0;

  if (line.text.trim().length === 0 || !needsBlankAfterEnter(currentType)) return false;

  view.dispatch({
    changes: { from: pos, insert: "\n\n" },
    selection: { anchor: pos + 2 },
  });
  return true;
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
  const lineTypes = state.field(lineTypesField, false);
  const prevPrevType = lineTypes ? lineTypes[prevLineNum - 2] : 0;

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
  
  let newText: string;
  let newCursor: number;
  
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

export function useScriptCodeMirror(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { hideSyntaxEnabled, activeRightPane } = useUI();
  const { scriptFileName, parsedDoc } = useFile();

  const scriptFileNameRef = useRef(scriptFileName);
  useEffect(() => { scriptFileNameRef.current = scriptFileName; }, [scriptFileName]);

  const fountainKeymap = useMemo(() => keymap.of([
    { key: "Enter", run: fountainEnterHandler },
    { key: "(", run: (view) => {
        if (fountainParenHandler(view)) return true;
        const { head } = view.state.selection.main;
        const line = view.state.doc.lineAt(head);
        const types = view.state.field(lineTypesField, false);
        const lineType = types ? types[line.number - 1] : 0;
        if (lineType === LINE_CHARACTER || lineType === LINE_DUAL_CHARACTER) return false;
        if (localStorage.getItem("actone-match-parentheses-enabled") === "true") {
          const after = line.text.substring(head - line.from);
          if (after.startsWith(")")) {
            view.dispatch({ selection: { anchor: head + 1 } });
            return true;
          }
          view.dispatch({
            changes: { from: head, insert: "()" },
            selection: { anchor: head + 1 }
          });
          return true;
        }
        return false;
      }
    },
    { key: "Tab", run: handleTab, preventDefault: true }
  ]), []);

  const extraExtensions = useMemo(() => [
    ghostSuggestionField,
    ghostSuggestionKeymap(),
    fountainKeymap,
    autocompletion({ override: [fountainCompletionSource], activateOnTyping: false }),
    lineTypesField,
    cachedCharactersField,
    cachedLocationsField,
    fountainHighlightPlugin,
    smartQuotesExtension,
  ], [fountainKeymap]);

  const handleInit = (view: EditorView) => {
    view.dispatch({
      effects: [
        updateHideSyntaxEffect.of(hideSyntaxEnabled),
        updateRightPaneOpenEffect.of(activeRightPane !== null),
        updateScriptFileNameEffect.of(scriptFileName),
        updateParsedDocEffect.of(parsedDoc)
      ]
    });
  };

  const handleScriptSwitch = (view: EditorView) => {
    view.dispatch({
      effects: [
        updateHideSyntaxEffect.of(hideSyntaxEnabled),
        updateRightPaneOpenEffect.of(activeRightPane !== null),
        updateScriptFileNameEffect.of(scriptFileNameRef.current),
      ]
    });
  };

  const viewRef = useCoreCodeMirror({
    containerRef,
    extraExtensions,
    onInit: handleInit,
    onScriptSwitch: handleScriptSwitch
  });

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: updateHideSyntaxEffect.of(hideSyntaxEnabled)
      });
    }
  }, [hideSyntaxEnabled, viewRef]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: updateRightPaneOpenEffect.of(activeRightPane !== null)
      });
    }
  }, [activeRightPane, viewRef]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: updateScriptFileNameEffect.of(scriptFileName)
      });
    }
  }, [scriptFileName, viewRef]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: updateParsedDocEffect.of(parsedDoc)
      });
    }
  }, [parsedDoc, viewRef]);

  return viewRef;
}
