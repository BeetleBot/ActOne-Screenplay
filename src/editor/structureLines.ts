import { Compartment, StateField } from "@codemirror/state";
import { EditorView, layer, RectangleMarker } from "@codemirror/view";
import { lineTypesField, LINE_SECTION, LINE_HEADING } from "./fountainSyntax";
import { getSectionDepth, isLineFolded } from "./fountainFold";

export const structureLinesCompartment = new Compartment();

export interface StructureBlock {
  kind: "section" | "subsection" | "scene";
  startLine: number;
  endLine: number;
}

export function computeStructureBlocks(
  doc: { lines: number; line: (n: number) => { text: string } },
  types: readonly number[]
): StructureBlock[] {
  const blocks: StructureBlock[] = [];
  const lines = doc.lines;
  if (lines === 0 || types.length === 0) return blocks;

  let activeSectionStart = -1;
  let activeSubsectionStart = -1;
  let activeSceneStart = -1;

  for (let i = 1; i <= lines; i++) {
    const type = types[i - 1];

    if (type === LINE_SECTION) {
      const lineText = doc.line(i).text;
      const depth = getSectionDepth(lineText);

      if (depth === 1) {
        if (activeSceneStart !== -1) {
          blocks.push({ kind: "scene", startLine: activeSceneStart, endLine: i - 1 });
          activeSceneStart = -1;
        }
        if (activeSubsectionStart !== -1) {
          blocks.push({ kind: "subsection", startLine: activeSubsectionStart, endLine: i - 1 });
          activeSubsectionStart = -1;
        }
        if (activeSectionStart !== -1) {
          blocks.push({ kind: "section", startLine: activeSectionStart, endLine: i - 1 });
        }
        activeSectionStart = i;
      } else {
        if (activeSceneStart !== -1) {
          blocks.push({ kind: "scene", startLine: activeSceneStart, endLine: i - 1 });
          activeSceneStart = -1;
        }
        if (activeSubsectionStart !== -1) {
          blocks.push({ kind: "subsection", startLine: activeSubsectionStart, endLine: i - 1 });
        }
        activeSubsectionStart = i;
      }
    } else if (type === LINE_HEADING) {
      if (activeSceneStart !== -1) {
        blocks.push({ kind: "scene", startLine: activeSceneStart, endLine: i - 1 });
      }
      activeSceneStart = i;
    }
  }

  if (activeSceneStart !== -1) {
    blocks.push({ kind: "scene", startLine: activeSceneStart, endLine: lines });
  }
  if (activeSubsectionStart !== -1) {
    blocks.push({ kind: "subsection", startLine: activeSubsectionStart, endLine: lines });
  }
  if (activeSectionStart !== -1) {
    blocks.push({ kind: "section", startLine: activeSectionStart, endLine: lines });
  }

  return blocks;
}

export const structureBlocksField = StateField.define<StructureBlock[]>({
  create(state) {
    const types = state.field(lineTypesField, false);
    return types ? computeStructureBlocks(state.doc, types) : [];
  },
  update(blocks, tr) {
    if (!tr.docChanged) return blocks;

    // Classification can propagate beyond an edit (for example, removing the
    // blank line before a scene). Compare every structural type, not just the
    // changed range, before reusing cached line-number scopes.
    if (tr.startState.doc.lines === tr.state.doc.lines) {
      const oldTypes = tr.startState.field(lineTypesField, false);
      const newTypes = tr.state.field(lineTypesField, false);
      let touchesStructure = !oldTypes || !newTypes;
      if (oldTypes && newTypes) {
        touchesStructure = newTypes.some((type, i) =>
          type !== oldTypes[i] &&
          (type === LINE_SECTION || type === LINE_HEADING ||
           oldTypes[i] === LINE_SECTION || oldTypes[i] === LINE_HEADING)
        );
      }
      // Changing # to ## keeps the type but changes the scope.
      tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
        const oldStart = tr.startState.doc.lineAt(fromA).number;
        const oldEnd = tr.startState.doc.lineAt(toA).number;
        const newStart = tr.state.doc.lineAt(fromB).number;
        const newEnd = tr.state.doc.lineAt(toB).number;
        for (let i = oldStart; i <= oldEnd && !touchesStructure; i++) {
          if (oldTypes?.[i - 1] === LINE_SECTION) touchesStructure = true;
        }
        for (let i = newStart; i <= newEnd && !touchesStructure; i++) {
          if (newTypes?.[i - 1] === LINE_SECTION) touchesStructure = true;
        }
      });
      if (!touchesStructure) return blocks;
    }

    const types = tr.state.field(lineTypesField, false);
    return types ? computeStructureBlocks(tr.state.doc, types) : [];
  },
});

// Keep the hover label in marker equality: renaming a heading may not change
// geometry, but must still refresh the existing rail DOM.
export class StructureRailMarker extends RectangleMarker {
  constructor(className: string, left: number, top: number, width: number, height: number, readonly label: string, readonly target = -1, readonly view?: EditorView) {
    super(className, left, top, width, height);
  }

  override draw() {
    const element = super.draw();
    this.bindNavigation(element);
    return element;
  }

  override update(element: HTMLElement, previous: RectangleMarker) {
    if (!super.update(element, previous)) return false;
    this.bindNavigation(element);
    return true;
  }

  private bindNavigation(element: HTMLElement) {
    element.title = this.label;
    element.onmousedown = event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
    };
    element.onclick = event => {
      if (event.button !== 0 || !this.view || this.target < 0) return;
      event.preventDefault();
      event.stopPropagation();
      const position = Math.min(this.target, this.view.state.doc.length);
      this.view.dispatch({
        selection: { anchor: position },
        effects: EditorView.scrollIntoView(position, { y: "start", yMargin: 24 }),
      });
      this.view.focus();
    };
  }

  override eq(other: RectangleMarker) {
    return other instanceof StructureRailMarker && this.label === other.label && this.target === other.target && this.view === other.view && super.eq(other);
  }
}

export function getStructureLabel(kind: StructureBlock["kind"], text: string): string {
  if (kind !== "scene") return text.replace(/^\s*#+\s*/, "").trim();
  const number = text.match(/#([^#\s]+)#/)?.[1];
  const heading = text.replace(/#([^#\s]+)#/, "").replace(/^\s*\.(?!\.)/, "").trim();
  return number ? `${number} — ${heading}` : heading;
}

export function computeStructureMarkers(view: EditorView): readonly RectangleMarker[] {
  const blocks = view.state.field(structureBlocksField, false);
  if (!blocks || blocks.length === 0 || view.state.doc.length === 0) return [];

  const markers: RectangleMarker[] = [];
  const doc = view.state.doc;

  const zoom = Number.parseFloat(getComputedStyle(view.dom).getPropertyValue("--zoom")) || 1;
  const COL_SECTION = -96;
  const COL_SUBSECTION = -88;
  const COL_SCENE = -80;

  let minVisLine = doc.lines;
  let maxVisLine = 1;
  for (const { from, to } of view.visibleRanges) {
    const startLine = doc.lineAt(from).number;
    const endLine = doc.lineAt(to).number;
    if (startLine < minVisLine) minVisLine = startLine;
    if (endLine > maxVisLine) maxVisLine = endLine;
  }

  const queryStart = Math.max(1, minVisLine - 10);
  const queryEnd = Math.min(doc.lines, maxVisLine + 10);

  for (const block of blocks) {
    if (block.startLine > queryEnd || block.endLine < queryStart) {
      continue;
    }

    if (isLineFolded(view.state, block.startLine)) continue;

    try {
      const topBlock = view.lineBlockAt(doc.line(block.startLine).from);
      const bottomBlock = view.lineBlockAt(doc.line(block.endLine).to);
      const top = topBlock.top + 4;
      const height = Math.max(8, bottomBlock.bottom - top - 4);

      let col: number;
      let width: number;
      let cls: string;

      if (block.kind === "section") {
        col = COL_SECTION;
        width = 3.5;
        cls = "cm-structure-line cm-structure-line-section";
      } else if (block.kind === "subsection") {
        col = COL_SUBSECTION;
        width = 3.5;
        cls = "cm-structure-line cm-structure-line-subsection";
      } else {
        col = COL_SCENE;
        width = 3;
        cls = "cm-structure-line cm-structure-line-scene";
      }

      markers.push(new StructureRailMarker(cls, col * zoom, top, width, height, getStructureLabel(block.kind, doc.line(block.startLine).text), doc.line(block.startLine).from, view));
    } catch {
      // Ignore layout measurement race conditions during rapid typing
    }
  }

  return markers;
}

export const structureLinesLayer = layer({
  above: false,
  class: "cm-structure-layer",
  update(update) {
    return update.docChanged || update.viewportChanged || update.geometryChanged;
  },
  markers(view) {
    return computeStructureMarkers(view);
  },
});

export const structureLinesActiveTheme = EditorView.editorAttributes.of({
  class: "cm-structure-lines-active",
});

export function getStructureLinesInner(enabled: boolean) {
  return enabled ? [structureBlocksField, structureLinesLayer, structureLinesActiveTheme] : [];
}

export function getStructureLinesExtension(enabled: boolean) {
  return structureLinesCompartment.of(getStructureLinesInner(enabled));
}
