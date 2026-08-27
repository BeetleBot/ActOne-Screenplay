import { useEffect, useRef } from "react";
import { EditorState, RangeSetBuilder, StateField, Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate, keymap, placeholder, layer, RectangleMarker, Decoration, DecorationSet } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, redo } from "@codemirror/commands";
import { search, setSearchQuery, getSearchQuery } from "@codemirror/search";
import { useFile, useUI, useEditor, useCursor } from "../context";
import { STORAGE_KEYS } from "../constants";
import { emptyLineSelectionPlugin } from "./emptyLineSelection";
import { rephraseHighlightField } from "./rephraseState";
import { contextMenuHighlightField } from "./contextMenuState";
import { pendingScrollTargetY } from "./cursorScroll";
import { typewriterCompartment, typewriterScrollPlugin } from "./typewriter";
import { spellcheckCompartment, spellcheckExtension, triggerSpellRecheck } from "./spellcheck";

let scriptSwitchToken = 0;
export const getScriptSwitchToken = () => scriptSwitchToken;

export function getScrollArea(view: EditorView): HTMLElement | null {
  return view.dom.closest(".editor-scroll-area") as HTMLElement | null;
}

export const cursorLayer = layer({
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

export const editorTheme = EditorView.theme({
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

export const rightClickSelectionPreservePlugin = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 2) return false;
    const sel = view.state.selection.main;
    if (sel.empty) return false;

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos !== null && pos >= sel.from && pos <= sel.to) {
      return true;
    }
    return false;
  },
});

const activeLineDeco = Decoration.line({ class: "cm-activeLine-always" });

export const activeLineAlwaysPlugin = ViewPlugin.fromClass(
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

export const searchHighlightField = StateField.define<DecorationSet>({
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

export interface CoreCodeMirrorProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  extraExtensions?: Extension[];
  onScriptSwitch?: (view: EditorView) => void;
  onInit?: (view: EditorView) => void;
}

export function useCoreCodeMirror({ containerRef, extraExtensions = [], onScriptSwitch, onInit }: CoreCodeMirrorProps) {
  const viewRef = useRef<EditorView | null>(null);
  const { rawText, setRawText, activeScriptIndex, activeFileId, parsedDoc, scripts, scriptFileName } = useFile();
  const { typewriterMode, lineFocusEnabled, isZenMode, spellcheckEnabled } = useUI();
  const { setEditorView } = useEditor();
  const { setActiveLineNumber } = useCursor();
  
  const lastScriptKeyRef = useRef("");
  const activeScript = scripts && scripts.length > 0 ? scripts[activeScriptIndex] : undefined;
  const currentScriptKey = `${activeFileId}::${activeScript?.fileName || scriptFileName || activeScriptIndex}`;
  const statesRef = useRef<Record<string, EditorState>>({});
  const extensionsRef = useRef<any[]>([]);

  const setRawTextRef = useRef(setRawText);
  useEffect(() => {
    setRawTextRef.current = setRawText;
  }, [setRawText]);

  const rawTextDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRawTextRef = useRef<string | null>(null);
  const cursorDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActiveLineNumberRef = useRef(setActiveLineNumber);
  useEffect(() => {
    setActiveLineNumberRef.current = setActiveLineNumber;
  }, [setActiveLineNumber]);

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

    const extensions = [
      history(),
      cursorLayer,
      ...extraExtensions,
      activeLineAlwaysPlugin,
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
      search(),
      searchHighlightField,
      rephraseHighlightField,
      contextMenuHighlightField,
      spellcheckCompartment.of(spellcheckEnabled ? spellcheckExtension : []),
      typewriterCompartment.of(typewriterMode ? typewriterScrollPlugin : []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const docStr = update.state.doc.toString();
          lastDispatchedTextRef.current = docStr;
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
    
    if (onInit) {
      onInit(view);
    }

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
        if (rawTextDebounceTimerRef.current !== null) {
          clearTimeout(rawTextDebounceTimerRef.current);
          rawTextDebounceTimerRef.current = null;
        }
        if (pendingRawTextRef.current !== null) {
          setRawTextRef.current(pendingRawTextRef.current);
          pendingRawTextRef.current = null;
        }

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

        const effects: any[] = [
          spellcheckCompartment.reconfigure(
            spellcheckEnabled ? spellcheckExtension : []
          ),
          typewriterCompartment.reconfigure(
            typewriterModeRef.current ? typewriterScrollPlugin : []
          )
        ];
        
        view.dispatch({ effects });
        
        if (onScriptSwitch) {
          onScriptSwitch(view);
        }

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
        const docCurrent = view.state.doc.toString();
        if (rawText !== docCurrent && rawText !== lastDispatchedTextRef.current && pendingRawTextRef.current === null) {
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
      } else if (parsedDoc !== lastDispatchedParsedDocRef.current) {
        lastDispatchedParsedDocRef.current = parsedDoc;
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
