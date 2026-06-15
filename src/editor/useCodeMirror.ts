import { useEffect, useRef } from "react";
import { EditorState, Compartment, Transaction } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate, keymap, hoverTooltip, placeholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { search } from "@codemirror/search";
import { useFile, useUI, useEditor } from "../context";
import { LineType } from "../parser";
import { fountainCompletionSource } from "./autocomplete";
import { 
  fountainHighlightField, 
  updateParsedDocEffect,
  updateHideSyntaxEffect,
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

const CATEGORIES = [
  { key: "cast", label: "Cast (Character)" },
  { key: "prop", label: "Prop" },
  { key: "vfx", label: "VFX" },
  { key: "sfx", label: "SFX (Special Effect)" },
  { key: "camera", label: "Camera" },
  { key: "animal", label: "Animal" },
  { key: "extras", label: "Extras" },
  { key: "vehicle", label: "Vehicle" },
  { key: "costume", label: "Costume" },
  { key: "makeup", label: "Makeup" },
  { key: "music", label: "Music" },
  { key: "sound", label: "Sound" },
  { key: "stunt", label: "Stunt" },
  { key: "setDesign", label: "Set Design" },
  { key: "other", label: "Other (Generic)" }
];

export function useCodeMirror(containerRef: React.RefObject<HTMLDivElement | null>) {
  const viewRef = useRef<EditorView | null>(null);
  const { rawText, setRawText, parsedDoc, updateSettings } = useFile();
  const { typewriterMode, hideSyntaxEnabled } = useUI();
  const { setActiveLineId, setSelectedSceneId, setEditorView } = useEditor();

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

  const updateSettingsRef = useRef(updateSettings);
  useEffect(() => {
    updateSettingsRef.current = updateSettings;
  }, [updateSettings]);

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
            const line = view.state.doc.lineAt(head);
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
      const prodTags = settings?.productionTags;
      if (!prodTags || !prodTags.tags) return null;

      for (const tag of prodTags.tags) {
        if (tag.range) {
          const [start, len] = tag.range;
          if (pos >= start && pos <= start + len) {
            const def = prodTags.definitions?.find((d: Record<string, unknown>) => d.id === tag.definitionId);
            const name = def ? def.name : view.state.sliceDoc(start, start + len);
            const categoryLabel = CATEGORIES.find(c => c.key === tag.type)?.label || tag.type;
            
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

    const startState = EditorState.create({
      doc: rawText,
      extensions: [
        history(),
        fountainKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        editorTheme,
        placeholder("Start writing here"),
        fountainHighlightField,
        smartQuotesExtension,
        autocompletion({ override: [fountainCompletionSource] }),
        search(),
        prodTagsTooltip,
        typewriterCompartment.of(typewriterMode ? typewriterScrollPlugin : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setRawTextRef.current(update.state.doc.toString());
            const prodTags = parsedDocRef.current.settings?.productionTags;
            if (prodTags && prodTags.tags && prodTags.tags.length > 0) {
              let changed = false;
              const mappedTags = prodTags.tags.map((tag: { range?: [number, number]; definitionId?: string; type?: string; sceneId?: string }) => {
                if (!tag.range) return tag;
                const [start, len] = tag.range;
                try {
                  const newStart = update.changes.mapPos(start, 1);
                  const newEnd = update.changes.mapPos(start + len, -1);
                  const newLen = newEnd - newStart;
                  if (newStart !== start || newLen !== len) {
                    changed = true;
                  }
                  if (newLen <= 0) {
                    changed = true;
                    return null;
                  }
                  return {
                    ...tag,
                    range: [newStart, newLen]
                  };
                } catch (e) {
                  return tag;
                }
              }).filter(Boolean);

              if (changed) {
                updateSettingsRef.current((prev) => {
                  const prevProd = prev.productionTags || { tags: [], definitions: [] };
                  return {
                    ...prev,
                    productionTags: {
                      ...prevProd,
                      tags: mappedTags
                    }
                  };
                });
              }
            }
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
      const view = viewRef.current;
      let prevCursorY: number | null = null;
      try {
        const coords = view.coordsAtPos(view.state.selection.main.head);
        if (coords) prevCursorY = coords.top;
      } catch (e) {}

      view.dispatch({
        effects: updateParsedDocEffect.of(parsedDoc)
      });

      if (prevCursorY !== null) {
        requestAnimationFrame(() => {
          try {
            const coords = view.coordsAtPos(view.state.selection.main.head);
            if (coords) {
              const diff = coords.top - (prevCursorY as number);
              if (Math.abs(diff) > 0.5) {
                view.scrollDOM.scrollTop += diff;
              }
            }
          } catch (e) {}
        });
      }
    }
  }, [parsedDoc]);

  return viewRef;
}
