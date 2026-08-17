import { useEffect, useRef } from "react";
import { EditorState, Transaction, RangeSetBuilder, StateField } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate, keymap, placeholder, layer, RectangleMarker, Decoration, DecorationSet } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, redo } from "@codemirror/commands";
import { search, setSearchQuery, getSearchQuery } from "@codemirror/search";
import { autocompletion } from "@codemirror/autocomplete";
import { useFile, useUI, useEditor, useCursor } from "../context";
import { STORAGE_KEYS } from "../constants";
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
import { emptyLineSelectionPlugin } from "./emptyLineSelection";
import { rephraseHighlightField } from "./rephraseState";
import { contextMenuHighlightField } from "./contextMenuState";
import { pendingScrollTargetY } from "./cursorScroll";
import { typewriterCompartment, typewriterScrollPlugin } from "./typewriter";
import { spellcheckCompartment, spellcheckExtension, triggerSpellRecheck } from "./spellcheck";

let scriptSwitchToken = 0;
export const getScriptSwitchToken = () => scriptSwitchToken;

function getScrollArea(view: EditorView): HTMLElement | null {
  return view.dom.closest(".editor-scroll-area") as HTMLElement | null;
}

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

/**
 * Custom cursor layer that renders `.cm-cursor` elements above the editor content.
 *
 * This replaces CodeMirror's `drawSelection()` extension with a cursor-only equivalent so
 * the native contenteditable caret is hidden (and replaced with our drawn `.cm-cursor`).
 *
 * Why: WebKitGTK (Linux) leaves stale ghost paint of the native caret at the previous
 * cursor position during rapid keyboard navigation, producing a visible duplicate caret.
 * A drawn cursor is recreated on every selection transaction, so no ghost can occur.
 *
 * Selection rendering is intentionally untouched: native `::selection` continues to handle
 * text-selection highlights, so visual behavior is identical to the pre-`drawSelection`
 * editor.
 */
const cursorLayer = layer({
  above: true,
  markers(view) {
    const cursors: RectangleMarker[] = [];
    for (const r of view.state.selection.ranges) {
      const prim = r === view.state.selection.main;
      if (r.empty) {
        const className = prim ? "cm-cursor cm-cursor-primary" : "cm-cursor cm-cursor-secondary";
        for (const piece of RectangleMarker.forRange(view, className, r)) {
          cursors.push(piece);
        }
      }
    }
    return cursors;
  },
  update(update, dom) {
    if (update.transactions.some((tr) => tr.selection)) {
      dom.style.animationName = dom.style.animationName === "cm-blink" ? "cm-blink2" : "cm-blink";
    }
    return update.docChanged || update.selectionSet;
  },
  mount(dom) {
    dom.style.animationDuration = "1200ms";
  },
  class: "cm-cursorLayer",
});

const editorTheme = EditorView.theme({
  "&": {
    height: "auto",
    minHeight: "100%",
    caretColor: "transparent",
  },
  ".cm-scroller": {
    overflow: "visible",
  },
  ".cm-content": {
    padding: "0",
    caretColor: "transparent",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--text-main, #000000) !important",
    borderLeftWidth: "2.5px !important",
  },
  "&.cm-focused": {
    outline: "none",
  },
  "& .cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--selection-bg, rgba(46, 170, 220, 0.3)) !important",
    color: "var(--selection-text, inherit)",
  },
  ".cm-placeholder": {
    color: "var(--placeholder-color, rgba(128, 128, 128, 0.3))",
    fontStyle: "italic",
    fontWeight: 400,
  },
  ".cm-gutters": {
    backgroundColor: "transparent !important",
    border: "none !important",
    userSelect: "none",
  },
  ".cm-gutter": {
    minWidth: "16px",
  },
  ".cm-gutterElement": {
    display: "flex !important",
    alignItems: "center !important",
    justifyContent: "center !important",
  },
  ".cm-rephrasing-pulse": {
    animation: "cm-rephrase-pulse-anim 1.5s infinite ease-in-out",
  },
  "@keyframes cm-rephrase-pulse-anim": {
    "0%": { opacity: 1, backgroundColor: "rgba(100, 149, 237, 0.2)" },
    "50%": { opacity: 0.4, backgroundColor: "rgba(100, 149, 237, 0.45)" },
    "100%": { opacity: 1, backgroundColor: "rgba(100, 149, 237, 0.2)" }
  }
});

/**
 * Prevents CodeMirror's default mousedown listener from collapsing active text selections on right-click.
 */
const rightClickSelectionPreservePlugin = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 2) return false;
    const sel = view.state.selection.main;
    if (sel.empty) return false;

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos !== null && pos >= sel.from && pos <= sel.to) {
      // Right clicked inside existing selection — prevent CodeMirror from collapsing selection!
      return true;
    }
    return false;
  },
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


const activeLineDeco = Decoration.line({ class: "cm-activeLine-always" });

const activeLineAlwaysPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    lastLineNumber: number;

    constructor(view: EditorView) {
      this.lastLineNumber = view.state.doc.lineAt(view.state.selection.main.head).number;
      this.decorations = this.getDecos(view);
    }

    update(update: ViewUpdate) {
      if (update.selectionSet || update.docChanged) {
        const newLineNum = update.state.doc.lineAt(update.state.selection.main.head).number;
        if (newLineNum !== this.lastLineNumber || update.docChanged) {
          this.lastLineNumber = newLineNum;
          this.decorations = this.getDecos(update.view);
        }
      }
    }

    getDecos(view: EditorView): DecorationSet {
      const pos = view.state.selection.main.head;
      const activeLine = view.state.doc.lineAt(pos);
      const focusEnabled = localStorage.getItem(STORAGE_KEYS.LINE_FOCUS_ENABLED) === "true";
      const builder = new RangeSetBuilder<Decoration>();
      builder.add(activeLine.from, activeLine.from, activeLineDeco);

      if (focusEnabled) {
        const editorDom = view.dom;
        if (!editorDom.classList.contains("cm-line-focus-mode")) {
          editorDom.classList.add("cm-line-focus-mode");
        }
      } else {
        const editorDom = view.dom;
        editorDom.classList.remove("cm-line-focus-mode");
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);


const searchMatchDeco = Decoration.mark({ class: "cm-searchMatch" });
const activeSearchMatchDeco = Decoration.mark({ class: "cm-searchMatch cm-searchMatch-selected" });

const searchHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    const query = getSearchQuery(tr.state);
    if (!query || !query.valid || !query.search) {
      return Decoration.none;
    }
    if (tr.docChanged || tr.selection || tr.effects.some(e => e.is(setSearchQuery))) {
      const builder = new RangeSetBuilder<Decoration>();
      const cursor = query.getCursor(tr.state);
      const { from: selFrom, to: selTo } = tr.state.selection.main;

      let match = cursor.next();
      while (!match.done) {
        const { from, to } = match.value;
        const isActive = (from === selFrom && to === selTo);
        builder.add(from, to, isActive ? activeSearchMatchDeco : searchMatchDeco);
        match = cursor.next();
      }
      return builder.finish();
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});




export function useCodeMirror(containerRef: React.RefObject<HTMLDivElement | null>) {
  const viewRef = useRef<EditorView | null>(null);
  const { rawText, setRawText, parsedDoc, updateSettings, activeScriptIndex, activeFileId, scriptFileName } = useFile();
  const { typewriterMode, hideSyntaxEnabled, lineFocusEnabled, activeRightPane, isZenMode, spellcheckEnabled } = useUI();
  const { setEditorView } = useEditor();
  const { setActiveLineId, setActiveLineNumber, setSelectedSceneId } = useCursor();
  const lastScriptKeyRef = useRef("");
  const currentScriptKey = `${activeFileId}-${activeScriptIndex}`;
  const statesRef = useRef<Record<string, EditorState>>({});
  const extensionsRef = useRef<any[]>([]);

  const parsedDocRef = useRef(parsedDoc);
  useEffect(() => {
    parsedDocRef.current = parsedDoc;
  }, [parsedDoc]);

  const setRawTextRef = useRef(setRawText);
  useEffect(() => {
    setRawTextRef.current = setRawText;
  }, [setRawText]);

  const rawTextDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRawTextRef = useRef<string | null>(null);
  const cursorDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActiveLineIdRef = useRef(setActiveLineId);
  useEffect(() => {
    setActiveLineIdRef.current = setActiveLineId;
  }, [setActiveLineId]);

  const setActiveLineNumberRef = useRef(setActiveLineNumber);
  useEffect(() => {
    setActiveLineNumberRef.current = setActiveLineNumber;
  }, [setActiveLineNumber]);

  const setSelectedSceneIdRef = useRef(setSelectedSceneId);
  useEffect(() => {
    setSelectedSceneIdRef.current = setSelectedSceneId;
  }, [setSelectedSceneId]);

  const updateSettingsRef = useRef(updateSettings);
  useEffect(() => {
    updateSettingsRef.current = updateSettings;
  }, [updateSettings]);

  const scriptFileNameRef = useRef(scriptFileName);
  useEffect(() => {
    scriptFileNameRef.current = scriptFileName;
  }, [scriptFileName]);

  const pendingScrollToRef = useRef<number | null>(null);
  const lastDispatchedTextRef = useRef("");
  const lastDispatchedParsedDocRef = useRef<unknown>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});

  const typewriterModeRef = useRef(typewriterMode);
  useEffect(() => { typewriterModeRef.current = typewriterMode; }, [typewriterMode]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: typewriterCompartment.reconfigure(
          typewriterMode ? typewriterScrollPlugin : []
        ),
      });
      if (typewriterMode) {
        const token = scriptSwitchToken;
        setTimeout(() => {
          if (scriptSwitchToken !== token) return;
          if (viewRef.current) {
            viewRef.current.dispatch({
              effects: EditorView.scrollIntoView(viewRef.current.state.selection.main.head, { y: "center" })
            });
          }
        }, 50);
      }
    }
  }, [typewriterMode]);

  useEffect(() => {
    if (!viewRef.current) return;
    const timer = setTimeout(() => viewRef.current?.requestMeasure(), 500);
    return () => clearTimeout(timer);
  }, [isZenMode]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: updateHideSyntaxEffect.of(hideSyntaxEnabled)
      });
    }
  }, [hideSyntaxEnabled]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: updateRightPaneOpenEffect.of(activeRightPane !== null)
      });
    }
  }, [activeRightPane]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: updateScriptFileNameEffect.of(scriptFileName)
      });
    }
  }, [scriptFileName]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({});
    }
  }, [lineFocusEnabled]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: spellcheckCompartment.reconfigure(
          spellcheckEnabled ? spellcheckExtension : []
        ),
      });
    }
  }, [spellcheckEnabled]);

  useEffect(() => {
    const handler = () => {
      if (viewRef.current) {
        triggerSpellRecheck(viewRef.current);
      }
    };
    window.addEventListener("dictionary-changed", handler);
    return () => window.removeEventListener("dictionary-changed", handler);
  }, []);

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
      {
        key: "Tab",
        run: handleTab,
        preventDefault: true
      }
    ]);

    const extensions = [
      history(),
      cursorLayer,
      ghostSuggestionField,
      ghostSuggestionKeymap(),
      activeLineAlwaysPlugin,
      fountainKeymap,
      autocompletion({ override: [fountainCompletionSource], activateOnTyping: false }),
      keymap.of([
        { key: "Mod-Shift-z", run: redo, preventDefault: true },
        { key: "Alt-ArrowUp", run: () => true },
        { key: "Alt-ArrowDown", run: () => true },
        ...defaultKeymap,
        ...historyKeymap
      ]),
      emptyLineSelectionPlugin,
      rightClickSelectionPreservePlugin,
      editorTheme,
      placeholder("Start writing here"),
      lineTypesField,
      cachedCharactersField,
      cachedLocationsField,
      fountainHighlightPlugin,
      smartQuotesExtension,
      search(),
      searchHighlightField,
      rephraseHighlightField,
      contextMenuHighlightField,
      spellcheckCompartment.of(spellcheckEnabled ? spellcheckExtension : []),

      typewriterCompartment.of(typewriterMode ? typewriterScrollPlugin : []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const docStr = update.state.doc.toString();
          pendingRawTextRef.current = docStr;
          if (rawTextDebounceTimerRef.current !== null) {
            clearTimeout(rawTextDebounceTimerRef.current);
          }
          rawTextDebounceTimerRef.current = setTimeout(() => {
            rawTextDebounceTimerRef.current = null;
            if (pendingRawTextRef.current !== null) {
              setRawTextRef.current(pendingRawTextRef.current);
              pendingRawTextRef.current = null;
            }
          }, 50);
        }

        if (update.selectionSet || update.docChanged) {
          const pos = update.state.selection.main.head;
          const lineNum = update.state.doc.lineAt(pos).number;
          const idx = lineNum - 1;
          if (cursorDebounceTimerRef.current !== null) {
            clearTimeout(cursorDebounceTimerRef.current);
          }
          cursorDebounceTimerRef.current = setTimeout(() => {
            cursorDebounceTimerRef.current = null;
            setActiveLineNumberRef.current(idx);
          }, 50);
        }
      }),
    ];

    extensionsRef.current = extensions;

    const startState = EditorState.create({
      doc: rawText,
      extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;
    setEditorView(view);

    view.dispatch({
      effects: [
        updateHideSyntaxEffect.of(hideSyntaxEnabled),
        updateRightPaneOpenEffect.of(activeRightPane !== null),
      ]
    });

    requestAnimationFrame(() => {
      view.focus();
    });

    if (typewriterMode) {
      setTimeout(() => {
        if (viewRef.current) {
          viewRef.current.dispatch({
            effects: EditorView.scrollIntoView(viewRef.current.state.selection.main.head, { y: "center" })
          });
        }
      }, 100);
    }

    return () => {
      if (rawTextDebounceTimerRef.current !== null) {
        clearTimeout(rawTextDebounceTimerRef.current);
      }
      if (pendingRawTextRef.current !== null) {
        setRawTextRef.current(pendingRawTextRef.current);
      }
      view.destroy();
      setEditorView(null);
    };
  }, []);

  useEffect(() => {
    if (viewRef.current) {
      const view = viewRef.current;
      const isDifferentScript = lastScriptKeyRef.current !== currentScriptKey;

      if (isDifferentScript) {
        const scrollArea = getScrollArea(view);

        if (lastScriptKeyRef.current) {
          statesRef.current[lastScriptKeyRef.current] = view.state;
          if (scrollArea) {
            scrollPositionsRef.current[lastScriptKeyRef.current] = scrollArea.scrollTop;
          }
        }

        lastScriptKeyRef.current = currentScriptKey;
        scriptSwitchToken += 1;
        const token = scriptSwitchToken;

        if (statesRef.current[currentScriptKey]) {
          view.setState(statesRef.current[currentScriptKey]);
        } else {
          const newState = EditorState.create({
            doc: rawText,
            extensions: extensionsRef.current
          });
          view.setState(newState);
        }

        view.dispatch({
          effects: [
            spellcheckCompartment.reconfigure(
              spellcheckEnabled ? spellcheckExtension : []
            ),
            typewriterCompartment.reconfigure(
              typewriterModeRef.current ? typewriterScrollPlugin : []
            ),
            updateHideSyntaxEffect.of(hideSyntaxEnabled),
            updateRightPaneOpenEffect.of(activeRightPane !== null),
            updateScriptFileNameEffect.of(scriptFileNameRef.current),
          ],
        });

        pendingScrollToRef.current = null;

        requestAnimationFrame(() => {
          if (scriptSwitchToken !== token) return;
          view.focus();
        });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scriptSwitchToken !== token) return;
            const area = getScrollArea(view);
            if (area) {
              const savedScrollTop = scrollPositionsRef.current[currentScriptKey];
              if (savedScrollTop !== undefined) {
                area.scrollTop = savedScrollTop;
              }
            }
            view.dispatch({
              effects: EditorView.scrollIntoView(view.state.selection.main.head, {
                y: typewriterModeRef.current ? "center" : "nearest"
              })
            });
          });
        });
      } else {
        // Same script, check if text changed externally (e.g. disk reload / sync / AI translation)
        if (pendingRawTextRef.current === null && view.state.doc.toString() !== rawText) {
          const scrollArea = getScrollArea(view);
          const savedScrollTop = scrollArea ? scrollArea.scrollTop : null;

          const currentSel = view.state.selection.main;
          const newAnchor = Math.min(currentSel.anchor, rawText.length);
          const newHead = Math.min(currentSel.head, rawText.length);

          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: rawText },
            selection: { anchor: newAnchor, head: newHead },
            scrollIntoView: false
          });

          if (savedScrollTop !== null && scrollArea) {
            const token = scriptSwitchToken;
            scrollArea.scrollTop = savedScrollTop;
            requestAnimationFrame(() => {
              if (scriptSwitchToken === token) {
                scrollArea.scrollTop = savedScrollTop;
              }
            });
          }
        }
      }
    }
  }, [rawText, currentScriptKey]);

  useEffect(() => {
    if (viewRef.current) {
      const view = viewRef.current;
      const screenText = parsedDoc.screenplayText;
      const pendingTarget = pendingScrollToRef.current;

      if (screenText === lastDispatchedTextRef.current && parsedDoc === lastDispatchedParsedDocRef.current && pendingTarget === null) return;

      let prevCursorY: number | null = null;
      try {
        const coords = view.coordsAtPos(view.state.selection.main.head);
        if (coords) prevCursorY = coords.top;
      } catch {
        void 0;
      }

      const isExternalTextChange = screenText !== lastDispatchedTextRef.current;

      if (isExternalTextChange) {
        lastDispatchedTextRef.current = screenText;
        lastDispatchedParsedDocRef.current = parsedDoc;
        view.dispatch({
          effects: [
            updateParsedDocEffect.of(parsedDoc),
            updateScriptFileNameEffect.of(scriptFileName),
          ]
        });
      } else if (parsedDoc !== lastDispatchedParsedDocRef.current) {
        lastDispatchedParsedDocRef.current = parsedDoc;
        view.dispatch({
          effects: [
            updateParsedDocEffect.of(parsedDoc),
            updateScriptFileNameEffect.of(scriptFileName),
          ]
        });
      }

      const scrollToPendingTarget = () => {
        const target = pendingScrollToRef.current;
        if (target === null) return;
        pendingScrollToRef.current = null;
        const token = scriptSwitchToken;

        view.requestMeasure({
          read(v) {
            if (scriptSwitchToken !== token) return null;
            const targetPos = Math.min(target, v.state.doc.length);
            const coords = v.coordsAtPos(targetPos);
            const scrollArea = getScrollArea(v);
            if (!coords || !scrollArea) return null;
            const areaRect = scrollArea.getBoundingClientRect();
            const targetY = pendingScrollTargetY(
              scrollArea.scrollTop,
              coords.top,
              areaRect.top,
              areaRect.height
            );
            return { scrollArea, targetY };
          },
          write(measureResult) {
            if (!measureResult) return;
            measureResult.scrollArea.scrollTo({ top: measureResult.targetY, behavior: 'auto' });
          }
        });
      };

      if (prevCursorY !== null && view.hasFocus && pendingScrollToRef.current === null && !isExternalTextChange && !typewriterModeRef.current) {
        const token = scriptSwitchToken;
        const savedPrevCursorY = prevCursorY;

        view.requestMeasure({
          read(v) {
            if (scriptSwitchToken !== token) return null;
            const currentHead = v.state.selection.main.head;
            const coords = v.coordsAtPos(currentHead);
            if (!coords) return null;
            const diff = coords.top - savedPrevCursorY;
            if (Math.abs(diff) <= 0.5) return null;
            const scrollArea = getScrollArea(v);
            return scrollArea ? { scrollArea, diff } : null;
          },
          write(measureResult) {
            if (!measureResult) return;
            measureResult.scrollArea.scrollTop += measureResult.diff;
          }
        });
        scrollToPendingTarget();
      } else {
        scrollToPendingTarget();
      }
    }
  }, [parsedDoc]);

  return viewRef;
}
