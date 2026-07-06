import { useEffect, useRef } from "react";
import { EditorState, Compartment, Transaction, RangeSetBuilder } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate, keymap, hoverTooltip, placeholder, Decoration, DecorationSet } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, redo } from "@codemirror/commands";
import { search } from "@codemirror/search";
import { autocompletion } from "@codemirror/autocomplete";
import { useFile, useUI, useEditor } from "../context";
import { getPerScriptSettingObject, updatePerScriptSetting } from "../utils/perScriptSettings";
import { CATEGORIES, STORAGE_KEYS } from "../constants";
import { ghostSuggestionField, ghostSuggestionKeymap, fountainCompletionSource } from "./inlineAutocomplete";
import { 
  fountainHighlightField, 
  updateParsedDocEffect,
  updateHideSyntaxEffect,
  updateHideTagsEffect,
  updateScriptFileNameEffect,
  updateSearchMatchesEffect,
  updateRightPaneOpenEffect,
  classifyLines,
  needsBlankAfterEnter,
  LINE_CHARACTER,
  LINE_DIALOGUE,
  LINE_DUAL_CHARACTER,
  LINE_DUAL_DIALOGUE,
  LINE_PARENTHETICAL,
  LINE_DUAL_PARENTHETICAL
} from "./fountainSyntax";
import { emptyLineSelectionPlugin } from "./emptyLineSelection";
import { tagStateField, tagInvertedEffects, setTagsEffect } from "./tagState";

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
  }
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

const typewriterCompartment = new Compartment();

const typewriterScrollPlugin = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (update.docChanged && update.state.selection.main.empty) {
        const head = update.state.selection.main.head;
        update.view.requestMeasure({
          read(view) {
            const coords = view.coordsAtPos(head);
            const scrollContainer = view.dom.closest('.editor-scroll-area');
            if (!coords || !scrollContainer) return null;

            const containerRect = scrollContainer.getBoundingClientRect();
            const cursorY = (coords.top + coords.bottom) / 2;
            const containerCenterY = containerRect.top + containerRect.height / 2;

            return {
              scrollContainer,
              diff: cursorY - containerCenterY,
            };
          },
          write(measureResult) {
            if (measureResult && Math.abs(measureResult.diff) > 0.5) {
              measureResult.scrollContainer.scrollTop += measureResult.diff;
            }
          }
        });
      }
    }
  }
);

const fadedLineDeco = Decoration.line({ class: "cm-faded-line" });
const activeLineDeco = Decoration.line({ class: "cm-activeLine-always" });

const activeLineAlwaysPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.getDecos(view);
    }

    update(_update: ViewUpdate) {
      this.decorations = this.getDecos(_update.view);
    }

    getDecos(view: EditorView): DecorationSet {
      const state = view.state;
      const pos = state.selection.main.head;
      const activeLine = state.doc.lineAt(pos);
      const focusEnabled = localStorage.getItem(STORAGE_KEYS.LINE_FOCUS_ENABLED) === "true";
      const builder = new RangeSetBuilder<Decoration>();

      if (focusEnabled) {
        for (let i = 1; i <= state.doc.lines; i++) {
          const line = state.doc.line(i);
          if (line.number === activeLine.number) {
            builder.add(line.from, line.from, activeLineDeco);
          } else {
            builder.add(line.from, line.from, fadedLineDeco);
          }
        }
      } else {
        builder.add(activeLine.from, activeLine.from, activeLineDeco);
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);


interface UseCodeMirrorProdTagItem {
  range?: [number, number];
  definitionId: string;
  type?: string;
}
interface UseCodeMirrorProdDef {
  id: string;
  name: string;
  type: string;
  colorOverride: string | null;
}

export function useCodeMirror(containerRef: React.RefObject<HTMLDivElement | null>) {
  const viewRef = useRef<EditorView | null>(null);
  const { rawText, setRawText, parsedDoc, updateSettings, activeScriptIndex, activeFileId, scriptFileName } = useFile();
  const { typewriterMode, hideSyntaxEnabled, hideTagsEnabled, lineFocusEnabled, activeRightPane } = useUI();
  const { setActiveLineId, setActiveLineNumber, setSelectedSceneId, setEditorView } = useEditor();
  const lastScriptKeyRef = useRef("");
  const currentScriptKey = `${activeFileId}-${activeScriptIndex}`;

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

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: typewriterCompartment.reconfigure(
          typewriterMode ? typewriterScrollPlugin : []
        ),
      });
      if (typewriterMode) {
        setTimeout(() => {
          if (viewRef.current) {
            const head = viewRef.current.state.selection.main.head;
            const coords = viewRef.current.coordsAtPos(head);
            const scrollContainer = viewRef.current.dom.closest('.editor-scroll-area');
            if (coords && scrollContainer) {
              const containerRect = scrollContainer.getBoundingClientRect();
              const cursorY = (coords.top + coords.bottom) / 2;
              const containerCenterY = containerRect.top + containerRect.height / 2;
              scrollContainer.scrollTop += cursorY - containerCenterY;
            }
          }
        }, 50);
      }
    }
  }, [typewriterMode]);

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
        effects: updateHideTagsEffect.of(hideTagsEnabled)
      });
    }
  }, [hideTagsEnabled]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: updateRightPaneOpenEffect.of(activeRightPane !== null)
      });
    }
  }, [activeRightPane]);

  useEffect(() => {
    if (viewRef.current) {
      const prodTags = getPerScriptSettingObject("productionTags", parsedDoc.settings, scriptFileName, { tags: [], definitions: [] });
      const currentTags = viewRef.current.state.field(tagStateField, false);
      if (currentTags && JSON.stringify(prodTags) !== JSON.stringify(currentTags)) {
        viewRef.current.dispatch({
          effects: setTagsEffect.of(prodTags)
        });
      }
    }
  }, [parsedDoc.settings, scriptFileName]);

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
          const types = classifyLines(view.state.doc);
          const lineType = types[line.number - 1];
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

    const prodTagsTooltip = hoverTooltip((view, pos) => {
      const settings = parsedDocRef.current.settings;
      const prodTags = getPerScriptSettingObject<{ tags: UseCodeMirrorProdTagItem[]; definitions: UseCodeMirrorProdDef[] }>("productionTags", settings, scriptFileNameRef.current, { tags: [], definitions: [] });
      if (!prodTags || !prodTags.tags) return null;

      for (const tag of prodTags.tags) {
        if (tag.range) {
          const [start, len] = tag.range;
          if (pos >= start && pos <= start + len) {
            const def = prodTags.definitions?.find((d) => d.id === tag.definitionId);
            const name = def ? def.name : view.state.sliceDoc(start, start + len);
            const type = tag.type || (def?.type as string) || "";
            const categoryLabel = CATEGORIES.find(c => c.key === type)?.label || type;
            
            return {
              pos: start,
              end: start + len,
              above: true,
              create() {
                const dom = document.createElement("div");
                dom.className = "cm-tag-tooltip";
                dom.textContent = `${categoryLabel}: ${name}`;
                return { dom };
              }
            };
          }
        }
      }
      return null;
    });

    const initialProdTags = getPerScriptSettingObject("productionTags", parsedDocRef.current.settings, scriptFileNameRef.current, { tags: [], definitions: [] });

    const startState = EditorState.create({
      doc: rawText,
      extensions: [
        tagStateField.init(() => initialProdTags),
        tagInvertedEffects,
        history(),
        ghostSuggestionField,
        ghostSuggestionKeymap(),
        activeLineAlwaysPlugin,
        fountainKeymap,
        autocompletion({ override: [fountainCompletionSource], activateOnTyping: false }),
        keymap.of([
          { key: "Mod-Shift-z", run: redo, preventDefault: true },
          ...defaultKeymap,
          ...historyKeymap
        ]),
        emptyLineSelectionPlugin,
        editorTheme,
        placeholder("Start writing here"),
        fountainHighlightField,
        smartQuotesExtension,
        search(),
        prodTagsTooltip,

        typewriterCompartment.of(typewriterMode ? typewriterScrollPlugin : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setRawTextRef.current(update.state.doc.toString());
          }

          const prevTags = update.startState.field(tagStateField, false);
          const currTags = update.state.field(tagStateField, false);
          if (currTags && prevTags && currTags !== prevTags) {
            updateSettingsRef.current((prev) => {
              return {
                ...prev,
                ...updatePerScriptSetting(prev, "productionTags", scriptFileNameRef.current, currTags)
              };
            });
          }

          if (update.selectionSet || update.docChanged) {
            const pos = update.state.selection.main.head;
            const lineNum = update.state.doc.lineAt(pos).number;
            const idx = lineNum - 1;
            setActiveLineNumberRef.current(idx);
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;
    setEditorView(view);

    view.dispatch({
      selection: { anchor: 0, head: 0 },
      effects: [
        updateHideTagsEffect.of(hideTagsEnabled),
        updateHideSyntaxEffect.of(hideSyntaxEnabled),
        updateRightPaneOpenEffect.of(activeRightPane !== null),
        updateSearchMatchesEffect.of([]),
      ]
    });

    requestAnimationFrame(() => {
      view.focus();
    });

    if (typewriterMode) {
      setTimeout(() => {
        if (viewRef.current) {
          const head = viewRef.current.state.selection.main.head;
          const coords = viewRef.current.coordsAtPos(head);
          const scrollContainer = viewRef.current.dom.closest('.editor-scroll-area');
          if (coords && scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const cursorY = (coords.top + coords.bottom) / 2;
            const containerCenterY = containerRect.top + containerRect.height / 2;
            scrollContainer.scrollTop += cursorY - containerCenterY;
          }
        }
      }, 100);
    }

    return () => {
      view.destroy();
      setEditorView(null);
    };
  }, []);

  useEffect(() => {
    if (viewRef.current) {
      const view = viewRef.current;
      const isDifferentScript = lastScriptKeyRef.current !== currentScriptKey;
      lastScriptKeyRef.current = currentScriptKey;

      if (view.state.doc.toString() !== rawText) {
        if (isDifferentScript) {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: rawText },
            selection: { anchor: 0, head: 0 }
          });
        } else {
          const cursor = view.state.selection.main.head;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: rawText },
            selection: { anchor: Math.min(cursor, rawText.length) },
          });
        }
      }

      if (isDifferentScript) {
        pendingScrollToRef.current = 0;
        requestAnimationFrame(() => {
          view.focus();
        });
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

      if (screenText !== lastDispatchedTextRef.current) {
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

      if (prevCursorY !== null) {
        requestAnimationFrame(() => {
          try {
            const coords = view.coordsAtPos(view.state.selection.main.head);
            if (coords) {
              const diff = coords.top - (prevCursorY as number);
              if (Math.abs(diff) > 0.5) {
                const scrollArea = view.dom.closest('.editor-scroll-area') as HTMLElement | null;
                if (scrollArea) {
                  scrollArea.scrollTop += diff;
                }
              }
            }
      } catch {
        void 0;
      }
          const pendingTarget = pendingScrollToRef.current;
          if (pendingTarget !== null) {
            pendingScrollToRef.current = null;
            try {
              const coords = view.coordsAtPos(pendingTarget);
              const scrollArea = view.dom.closest('.editor-scroll-area') as HTMLElement | null;
              if (coords && scrollArea) {
                const areaRect = scrollArea.getBoundingClientRect();
                const targetY = scrollArea.scrollTop + coords.top - areaRect.top - areaRect.height * 0.3;
                scrollArea.scrollTo({ top: targetY, behavior: 'smooth' });
              }
            } catch { void 0; }
          }
        });
      } else {
        const pendingTarget = pendingScrollToRef.current;
        if (pendingTarget !== null) {
          pendingScrollToRef.current = null;
          requestAnimationFrame(() => {
            try {
              const coords = view.coordsAtPos(pendingTarget);
              const scrollArea = view.dom.closest('.editor-scroll-area') as HTMLElement | null;
              if (coords && scrollArea) {
                const areaRect = scrollArea.getBoundingClientRect();
                const targetY = scrollArea.scrollTop + coords.top - areaRect.top - areaRect.height * 0.3;
                scrollArea.scrollTo({ top: targetY, behavior: 'smooth' });
              }
            } catch { void 0; }
          });
        }
      }
    }
  }, [parsedDoc]);

  return viewRef;
}
