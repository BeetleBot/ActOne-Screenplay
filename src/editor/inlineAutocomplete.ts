import { StateField, EditorState } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { EditorView, WidgetType, keymap } from "@codemirror/view";
import { CompletionContext, CompletionResult, startCompletion } from "@codemirror/autocomplete";
import { lineTypesField, LINE_CHARACTER, LINE_DUAL_CHARACTER, LINE_HEADING, LINE_ACTION } from "./fountainSyntax";

class GhostTextWidget extends WidgetType {
  constructor(readonly text: string, readonly hint?: string) { super(); }
  eq(other: GhostTextWidget) { return other.text === this.text && other.hint === this.hint; }
  toDOM() {
    const wrapper = document.createElement("span");
    const ghostSpan = document.createElement("span");
    ghostSpan.className = "cm-ghost-text";
    ghostSpan.textContent = this.text;
    wrapper.appendChild(ghostSpan);
    if (this.hint) {
      const hintSpan = document.createElement("span");
      hintSpan.className = "cm-ghost-hint";
      const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      iconSvg.setAttribute("width", "12");
      iconSvg.setAttribute("height", "12");
      iconSvg.setAttribute("viewBox", "0 0 12 12");
      iconSvg.style.verticalAlign = "middle";
      iconSvg.style.marginRight = "2px";
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M2 2v8M2 6h7l-3-3M9 6l-3 3");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.2");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      iconSvg.appendChild(path);
      hintSpan.appendChild(iconSvg);
      hintSpan.appendChild(document.createTextNode(this.hint));
      wrapper.appendChild(hintSpan);
    }
    return wrapper;
  }
  ignoreEvent() { return true; }
}

interface SuggestionData {
  ghostText: string;
  pos: number;
  type: "character" | "location" | "extension";
  acceptText: string;
}

const CHARACTER_EXTENSIONS = [
  "(V.O.)",
  "(O.S.)",
  "(O.C.)",
  "(PRE-LAP)",
  "(FILTERED)",
  "(ON CALL)",
  "(PHONE CALL)",
  "(PHONE)",
  "(ON PHONE)",
  "(OVER PHONE)",
  "(CELL)",
  "(ON CELL)",
  "(RADIO)",
  "(ON RADIO)",
  "(OVER RADIO)",
  "(INTERCOM)",
  "(SPEAKER)",
  "(ON SPEAKER)",
  "(PA)",
  "(MEGAPHONE)",
  "(DISTORTED)",
  "(ECHO)",
  "(ROBOTIC)",
  "(DIGITAL)",
  "(ON TV)",
  "(TV)",
  "(NARRATOR)",
  "(WHISPER)",
  "(SINGING)",
];

function extractCharacters(state: EditorState, types: number[], excludeLine?: number): Set<string> {
  const chars = new Set<string>();
  for (let i = 1; i <= state.doc.lines; i++) {
    if (i === excludeLine) continue;
    if (types[i - 1] === LINE_CHARACTER || types[i - 1] === LINE_DUAL_CHARACTER) {
      const lineText = state.doc.line(i).text;
      const name = lineText.trim().replace(/^@/, "").replace(/\s*\^$/, "").replace(/\s*\(.*\)$/, "").trim();
      if (name.length > 1) chars.add(name.toUpperCase());
    }
  }
  return chars;
}

function extractLocations(state: EditorState, types: number[], excludeLine?: number): Set<string> {
  const locs = new Set<string>();
  for (let i = 1; i <= state.doc.lines; i++) {
    if (i === excludeLine) continue;
    if (types[i - 1] === LINE_HEADING) {
      const lineText = state.doc.line(i).text;
      let clean = lineText.trim();
      clean = clean.replace(/^\./, "").trim();
      clean = clean.replace(/\[\[.*?\]\]/g, "").trim();
      clean = clean.replace(/#([^#\s]+)#/g, "").trim();
      const settingMatch = clean.match(/^(INT\/EXT|EXT\/INT|INT|EXT|I\/E|E\/I)\b\.?\s*/i);
      if (settingMatch) {
        clean = clean.substring(settingMatch[0].length).trim();
      }
      const parts = clean.split(/\s+-\s+/);
      if (parts.length > 0 && parts[0].trim()) {
        locs.add(parts[0].trim().toUpperCase());
      }
    }
  }
  return locs;
}

export const cachedCharactersField = StateField.define<Set<string>>({
  create(state) {
    const types = state.field(lineTypesField, false);
    return types ? extractCharacters(state, types) : new Set();
  },
  update(value, tr) {
    if (!tr.docChanged) return value;
    const types = tr.state.field(lineTypesField, false);
    if (!types) return value;

    let characterLineChanged = false;
    tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
      if (characterLineChanged) return;
      const startLine = tr.state.doc.lineAt(fromB).number;
      const endLine = tr.state.doc.lineAt(Math.min(toB, tr.state.doc.length)).number;
      for (let l = startLine; l <= endLine; l++) {
        if (types[l - 1] === LINE_CHARACTER || types[l - 1] === LINE_DUAL_CHARACTER) {
          characterLineChanged = true;
          break;
        }
      }
    });

    if (!characterLineChanged && value.size > 0) return value;
    return extractCharacters(tr.state, types);
  },
});

export const cachedLocationsField = StateField.define<Set<string>>({
  create(state) {
    const types = state.field(lineTypesField, false);
    return types ? extractLocations(state, types) : new Set();
  },
  update(value, tr) {
    if (!tr.docChanged) return value;
    const types = tr.state.field(lineTypesField, false);
    if (!types) return value;

    let headingLineChanged = false;
    tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
      if (headingLineChanged) return;
      const startLine = tr.state.doc.lineAt(fromB).number;
      const endLine = tr.state.doc.lineAt(Math.min(toB, tr.state.doc.length)).number;
      for (let l = startLine; l <= endLine; l++) {
        if (types[l - 1] === LINE_HEADING) {
          headingLineChanged = true;
          break;
        }
      }
    });

    if (!headingLineChanged && value.size > 0) return value;
    return extractLocations(tr.state, types);
  },
});

function computeSuggestion(state: EditorState): SuggestionData | null {
  const { head } = state.selection.main;
  if (!state.selection.main.empty) return null;

  const line = state.doc.lineAt(head);
  if (head !== line.to) return null;

  const text = line.text;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const types = state.field(lineTypesField, false);
  if (!types) return null;
  const type = types[line.number - 1];

  if (type === LINE_CHARACTER || type === LINE_DUAL_CHARACTER) {
    const parenIndex = trimmed.lastIndexOf("(");
    if (parenIndex >= 0) {
      const afterParen = trimmed.substring(parenIndex + 1);
      if (!afterParen.includes(")")) {
        const typed = afterParen.toUpperCase();
        let best: string | null = null;
        for (const ext of CHARACTER_EXTENSIONS) {
          const inner = ext.slice(1, -1);
          if (inner.startsWith(typed) && inner.length > typed.length) {
            best = ext;
            break;
          }
        }
        if (best) {
          const ghostText = best.slice(1 + typed.length);
          return { ghostText, pos: head, type: "extension", acceptText: best };
        }
        return null;
      }
    }

    const prefix = trimmed.startsWith("@") ? trimmed.substring(1).trimStart() : trimmed;
    if (!prefix) return null;
    const upperPrefix = prefix.toUpperCase();
    const chars = state.field(cachedCharactersField, false) || new Set<string>();
    let best: string | null = null;
    for (const c of chars) {
      if (c.startsWith(upperPrefix) && c.length > upperPrefix.length) {
        if (!best || c.length < best.length) {
          best = c;
        }
      }
    }
    if (best) {
      const suffix = best.substring(upperPrefix.length);
      return { ghostText: suffix, pos: head, type: "character", acceptText: best };
    }
    return null;
  }

  if (type === LINE_HEADING) {
    let input = trimmed;
    input = input.replace(/^\./, "").trim();
    const settingMatch = input.match(/^(INT\/EXT|EXT\/INT|INT|EXT|I\/E|E\/I)\b\.?\s*/i);
    if (settingMatch) {
      input = input.substring(settingMatch[0].length).trim();
    }
    if (/\s+-\s+/.test(input)) return null;
    const typedLoc = input.trim().toUpperCase();
    if (!typedLoc) return null;

    const locs = state.field(cachedLocationsField, false) || new Set<string>();
    let best: string | null = null;
    for (const l of locs) {
      if (l.startsWith(typedLoc) && l.length > typedLoc.length) {
        if (!best || l.length < best.length) {
          best = l;
        }
      }
    }
    if (best) {
      const suffix = best.substring(typedLoc.length);
      return { ghostText: suffix, pos: head, type: "location", acceptText: suffix };
    }
    return null;
  }

  if (type === LINE_ACTION) {
    const hasForceMarker = trimmed.startsWith("@");
    const prefix = hasForceMarker ? trimmed.substring(1).trimStart() : trimmed;
    if (!hasForceMarker && (!/^[A-Z][A-Z\s.'-]*$/.test(prefix) || prefix.length < 2)) return null;
    const upperPrefix = prefix.toUpperCase();
    const chars = state.field(cachedCharactersField, false) || new Set<string>();
    let best: string | null = null;
    for (const c of chars) {
      if (c.startsWith(upperPrefix) && c.length > upperPrefix.length) {
        if (!best || c.length < best.length) {
          best = c;
        }
      }
    }
    if (best) {
      const suffix = best.substring(upperPrefix.length);
      return { ghostText: suffix, pos: head, type: "character", acceptText: best };
    }
    return null;
  }

  return null;
}

export function testComputeSuggestion(state: EditorState): SuggestionData | null {
  return computeSuggestion(state);
}

function acceptSuggestion(view: EditorView, sug: SuggestionData): boolean {
  if (!sug) return false;
  const line = view.state.doc.lineAt(sug.pos);

  if (sug.type === "character") {
    const lineStart = line.from;
    const originalLine = view.state.doc.lineAt(sug.pos).text;
    const startsWithAt = originalLine.trim().startsWith("@");
    const insert = startsWithAt ? "@" + sug.acceptText : sug.acceptText;
    view.dispatch({
      changes: { from: lineStart, to: line.to, insert },
      selection: { anchor: lineStart + insert.length },
    });
    return true;
  }

  if (sug.type === "location") {
    view.dispatch({
      changes: { from: sug.pos, to: sug.pos, insert: sug.acceptText + " - " },
      selection: { anchor: sug.pos + sug.acceptText.length + 3 },
    });
    return true;
  }

  if (sug.type === "extension") {
    const lineText = line.text;
    const parenIndex = lineText.lastIndexOf("(");
    if (parenIndex >= 0) {
      view.dispatch({
        changes: { from: line.from + parenIndex, to: line.to, insert: sug.acceptText },
        selection: { anchor: line.from + parenIndex + sug.acceptText.length },
      });
      return true;
    }
    return false;
  }

  return false;
}

export function fountainCompletionSource(context: CompletionContext): CompletionResult | null {
  if (!context.explicit) return null;
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const trimmed = line.text.trim();
  if (!trimmed) return null;

  const types = state.field(lineTypesField, false);
  if (!types) return null;
  const type = types[line.number - 1];

  if (type === LINE_CHARACTER || type === LINE_DUAL_CHARACTER) {
    const parenIndex = trimmed.lastIndexOf("(");
    if (parenIndex >= 0) {
      const afterParen = trimmed.substring(parenIndex + 1);
      if (!afterParen.includes(")")) {
        const typed = afterParen.toUpperCase();
        const options = CHARACTER_EXTENSIONS
          .filter(ext => ext.slice(1, -1).startsWith(typed))
          .reverse()
          .map(ext => ({
            label: ext,
            apply: (view: EditorView) => {
              const l = view.state.doc.lineAt(view.state.selection.main.head);
              const pi = l.text.lastIndexOf("(");
              if (pi >= 0) {
                view.dispatch({
                  changes: { from: l.from + pi, to: l.to, insert: ext },
                  selection: { anchor: l.from + pi + ext.length },
                });
              }
            },
          }));
        return options.length > 0 ? { from: pos, options } : null;
      }
    }

    const prefix = trimmed.startsWith("@") ? trimmed.substring(1).trimStart() : trimmed;
    if (!prefix) return null;
    const upperPrefix = prefix.toUpperCase();
    const chars = state.field(cachedCharactersField, false) || new Set<string>();
    const options = [...chars]
      .filter(c => c.startsWith(upperPrefix))
      .sort()
      .map(c => ({
        label: c,
        apply: (view: EditorView) => {
          const l = view.state.doc.lineAt(view.state.selection.main.head);
          const startsWithAt = l.text.trim().startsWith("@");
          const insert = startsWithAt ? "@" + c : c;
          view.dispatch({
            changes: { from: l.from, to: l.to, insert },
            selection: { anchor: l.from + insert.length },
          });
        },
      }));
    return options.length > 0 ? { from: pos, options } : null;
  }

  if (type === LINE_HEADING) {
    let input = trimmed;
    input = input.replace(/^\./, "").trim();
    const settingMatch = input.match(/^(INT\/EXT|EXT\/INT|INT|EXT|I\/E|E\/I)\b\.?\s*/i);
    if (settingMatch) {
      input = input.substring(settingMatch[0].length).trim();
    }
    if (/\s+-\s+/.test(input)) return null;
    const typedLoc = input.trim().toUpperCase();
    if (!typedLoc) return null;

    const locs = state.field(cachedLocationsField, false) || new Set<string>();
    const options = [...locs]
      .filter(l => l.startsWith(typedLoc))
      .sort()
      .map(l => {
        const suffix = l.substring(typedLoc.length);
        return {
          label: l,
          apply: (view: EditorView) => {
            view.dispatch({
              changes: { from: pos, to: pos, insert: suffix + " - " },
              selection: { anchor: pos + suffix.length + 3 },
            });
          },
        };
      });
    return options.length > 0 ? { from: pos, options } : null;
  }

  if (type === LINE_ACTION) {
    const hasForceMarker = trimmed.startsWith("@");
    const prefix = hasForceMarker ? trimmed.substring(1).trimStart() : trimmed;
    if (!prefix) return null;
    if (!hasForceMarker && (!/^[A-Z][A-Z\s.'-]*$/.test(prefix) || prefix.length < 2)) return null;
    const upperPrefix = prefix.toUpperCase();
    const chars = state.field(cachedCharactersField, false) || new Set<string>();
    const options = [...chars]
      .filter(c => c.startsWith(upperPrefix))
      .sort()
      .map(c => ({
        label: c,
        apply: (view: EditorView) => {
          const l = view.state.doc.lineAt(view.state.selection.main.head);
          const startsWithAt = l.text.trim().startsWith("@");
          const insert = startsWithAt ? "@" + c : c;
          view.dispatch({
            changes: { from: l.from, to: l.to, insert },
            selection: { anchor: l.from + insert.length },
          });
        },
      }));
    return options.length > 0 ? { from: pos, options } : null;
  }

  return null;
}

export const ghostSuggestionField = StateField.define<SuggestionData | null>({
  create() { return null; },
  update(value, tr) {
    if (tr.selection || tr.docChanged) {
      return computeSuggestion(tr.state);
    }
    return value;
  },
  provide: (f) => {
    const getDeco = (val: SuggestionData | null) => {
      if (!val) return Decoration.none;
      return Decoration.set([
        Decoration.widget({ widget: new GhostTextWidget(val.ghostText, "Tab to accept"), side: 1 }).range(val.pos),
      ]);
    };
    return EditorView.decorations.from(f, getDeco);
  },
});

export function ghostSuggestionKeymap() {
  return keymap.of([
    {
      key: "Tab",
      run: (view) => {
        const sug = view.state.field(ghostSuggestionField);
        if (sug) {
          acceptSuggestion(view, sug);
          return true;
        }
        return false;
      },
    },
    {
      key: "ArrowDown",
      run: (view) => {
        const sug = view.state.field(ghostSuggestionField);
        if (sug) {
          return startCompletion(view);
        }
        return false;
      },
    },
  ]);
}
