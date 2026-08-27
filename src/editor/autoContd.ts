import { StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
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

function buildAutoContdDecorations(state: import("@codemirror/state").EditorState, enabled: boolean): DecorationSet {
  if (!enabled) return Decoration.none;

  const lineTypes = state.field(lineTypesField);
  const doc = state.doc;
  const activeLineNum = state.selection ? doc.lineAt(state.selection.main.head).number : -1;
  const builder = new RangeSetBuilder<Decoration>();
  let lastSpeakingCharacter = "";

  for (let i = 1; i <= doc.lines; i++) {
    const type = lineTypes[i - 1];
    if (type !== LINE_CHARACTER && type !== LINE_DUAL_CHARACTER) continue;

    const line = doc.line(i);
    const baseName = extractBaseName(line.text, type);

    if (
      baseName === lastSpeakingCharacter &&
      baseName !== "" &&
      i !== activeLineNum &&
      !hasContdExtension(line.text)
    ) {
      builder.add(line.to, line.to, contdWidget);
    }

    lastSpeakingCharacter = baseName;
  }

  return builder.finish();
}

export const autoContdField = StateField.define<{ decorations: DecorationSet; enabled: boolean }>({
  create(state) {
    return {
      decorations: buildAutoContdDecorations(state, true),
      enabled: true,
    };
  },
  update(value, tr) {
    let enabled = value.enabled;
    let effectFired = false;

    for (const effect of tr.effects) {
      if (effect.is(updateAutoContdEffect)) {
        enabled = effect.value;
        effectFired = true;
      }
    }

    const currentLineNum = tr.state.selection ? tr.state.doc.lineAt(tr.state.selection.main.head).number : -1;
    const prevLineNum = tr.startState.selection ? tr.startState.doc.lineAt(tr.startState.selection.main.head).number : -1;
    const selectionMoved = Boolean(tr.selection) && currentLineNum !== prevLineNum;

    if (tr.docChanged || effectFired || selectionMoved) {
      return {
        decorations: buildAutoContdDecorations(tr.state, enabled),
        enabled,
      };
    }

    return value;
  },
  provide: (f) => EditorView.decorations.from(f, (val) => val.decorations),
});
