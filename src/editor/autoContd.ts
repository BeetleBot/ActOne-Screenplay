import { StateField, StateEffect, RangeSetBuilder, type EditorState, type Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { lineTypesField, LINE_CHARACTER, LINE_DUAL_CHARACTER } from "./fountainSyntax";

export const updateAutoContdEffect = StateEffect.define<boolean>();

const CONTD_EXTENSION = "(CONT'D)";

class ContdWidget extends WidgetType {
  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-auto-contd";
    span.textContent = ` ${CONTD_EXTENSION}`;
    return span;
  }

  eq(): boolean {
    return true;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

const contdWidget = Decoration.widget({ widget: new ContdWidget(), side: 1 });

function extractBaseName(lineText: string, lineType: number): string {
  let name = lineText.trim();
  if (lineType === LINE_CHARACTER && name.startsWith("@")) {
    name = name.substring(1).trim();
  }
  if (lineType === LINE_DUAL_CHARACTER && name.endsWith("^")) {
    name = name.slice(0, -1).trim();
  }
  const parenIdx = name.indexOf("(");
  if (parenIdx !== -1) {
    name = name.substring(0, parenIdx).trim();
  }
  return name.toUpperCase();
}

function hasContdExtension(lineText: string): boolean {
  return lineText.toUpperCase().includes(CONTD_EXTENSION);
}

interface CharacterCue {
  from: number;
  to: number;
  name: string;
  explicit: boolean;
}

interface AutoContdState {
  cues: CharacterCue[];
  candidates: DecorationSet;
  decorations: DecorationSet;
  enabled: boolean;
  activeLine: number;
}

function collectCues(state: EditorState, first: number, last: number): CharacterCue[] {
  const types = state.field(lineTypesField);
  const cues: CharacterCue[] = [];
  for (let number = first; number <= last; number++) {
    const type = types[number - 1];
    if (type !== LINE_CHARACTER && type !== LINE_DUAL_CHARACTER) continue;
    const line = state.doc.line(number);
    cues.push({ from: line.from, to: line.to, name: extractBaseName(line.text, type), explicit: hasContdExtension(line.text) });
  }
  return cues;
}

function eligible(cues: CharacterCue[], index: number): boolean {
  const cue = cues[index];
  return index > 0 && cue.name !== "" && cue.name === cues[index - 1].name && !cue.explicit;
}

function lowerBound(cues: CharacterCue[], position: number): number {
  let low = 0;
  let high = cues.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (cues[middle].from < position) low = middle + 1;
    else high = middle;
  }
  return low;
}

function visibleCandidates(candidates: DecorationSet, state: EditorState, enabled: boolean): DecorationSet {
  if (!enabled) return Decoration.none;
  const line = state.doc.lineAt(state.selection.main.head);
  return candidates.update({ filterFrom: line.from, filterTo: line.to, filter: from => from !== line.to });
}

function updateCues(value: AutoContdState, tr: Transaction): Pick<AutoContdState, "cues" | "candidates"> {
  const doc = tr.state.doc;
  let first = doc.lines;
  let last = 1;
  let changedRanges = 0;
  tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    changedRanges++;
    first = Math.min(first, doc.lineAt(fromB).number);
    last = Math.max(last, doc.lineAt(toB).number);
  });
  if (changedRanges > 1 || doc.lines < 3) {
    const cues = collectCues(tr.state, 1, doc.lines);
    const builder = new RangeSetBuilder<Decoration>();
    cues.forEach((cue, index) => { if (eligible(cues, index)) builder.add(cue.to, cue.to, contdWidget); });
    return { cues, candidates: builder.finish() };
  }
  first = Math.max(1, first - 1);
  const delta = doc.lines - tr.startState.doc.lines;
  const types = tr.state.field(lineTypesField);
  const oldTypes = tr.startState.field(lineTypesField);
  // Match the classifier's forward propagation, including a stable following line.
  last = Math.min(doc.lines, last + 1);
  while (last < doc.lines && types[last - 1] !== oldTypes[last - 1 - delta]) last++;
  const from = doc.line(first).from;
  const to = doc.line(last).to;
  const mapped = value.cues.map(cue => ({ ...cue,
    from: tr.changes.mapPos(cue.from, 1), to: tr.changes.mapPos(cue.to, 1),
  }));
  const start = lowerBound(mapped, from);
  const end = lowerBound(mapped, to + 1);
  const replacement = collectCues(tr.state, first, last);
  const cues = [...mapped.slice(0, start), ...replacement, ...mapped.slice(end)];
  // Only changed cues and their immediate successor can change speaker continuity.
  const successor = start + replacement.length;
  const filterTo = cues[successor]?.to ?? to;
  const additions = [];
  for (let index = start; index <= successor && index < cues.length; index++) {
    if (eligible(cues, index)) additions.push(contdWidget.range(cues[index].to));
  }
  const candidates = value.candidates.map(tr.changes).update({
    filterFrom: from, filterTo,
    filter: position => position < from || position > filterTo,
    add: additions,
    sort: true,
  });
  return { cues, candidates };
}

export const autoContdField = StateField.define<AutoContdState>({
  create(state) {
    const cues = collectCues(state, 1, state.doc.lines);
    const builder = new RangeSetBuilder<Decoration>();
    cues.forEach((cue, index) => { if (eligible(cues, index)) builder.add(cue.to, cue.to, contdWidget); });
    const candidates = builder.finish();
    return {
      cues, candidates, enabled: true,
      activeLine: state.doc.lineAt(state.selection.main.head).number,
      decorations: visibleCandidates(candidates, state, true),
    };
  },
  update(value, tr) {
    let enabled = value.enabled;
    for (const effect of tr.effects) {
      if (effect.is(updateAutoContdEffect)) enabled = effect.value;
    }
    const activeLine = tr.state.doc.lineAt(tr.state.selection.main.head).number;
    if (!tr.docChanged && enabled === value.enabled && activeLine === value.activeLine) return value;
    const { cues, candidates } = tr.docChanged ? updateCues(value, tr) : value;
    return { cues, candidates, enabled, activeLine, decorations: visibleCandidates(candidates, tr.state, enabled) };
  },
  provide: field => EditorView.decorations.from(field, value => value.decorations),
});
