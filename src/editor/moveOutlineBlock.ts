import { Annotation, EditorSelection, type EditorState, type TransactionSpec } from "@codemirror/state";
import { isolateHistory } from "@codemirror/commands";
import { LineType, parseScreenplay } from "../parser";

export interface OutlineDropTarget {
  line: number | null;
  placement: "before" | "after" | "inside" | "root";
}

export const outlineMoveMapping = Annotation.define<Map<number, number>>();

interface SourceLine {
  text: string;
  source?: number;
}
interface Block {
  line: number;
  depth: number;
  section: boolean;
  lines: SourceLine[];
  children: Block[];
  parent: Block | null;
}

/** Move semantic blocks, retaining their source lines for selection and outline identity. */
export function moveOutlineBlock(
  state: EditorState,
  sourceLine: number,
  target: OutlineDropTarget,
): TransactionSpec | null {
  const parsed = parseScreenplay(state.doc.toString()).lines;
  const roots: Block[] = [];
  const blocks: Block[] = [];
  const stack: Block[] = [];
  const preamble: SourceLine[] = [];
  let current: Block | undefined;
  parsed.forEach((line, index) => {
    if (line.isOutlineElement && line.type !== LineType.synopse) {
      const section = line.type === LineType.section;
      const depth = line.sectionDepth ?? 1;
      if (section) while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
      const parent = stack.at(-1) ?? null;
      current = { line: index, depth, section, parent, lines: [], children: [] };
      (parent ? parent.children : roots).push(current);
      blocks.push(current);
      if (section) stack.push(current);
    }
    (current ? current.lines : preamble).push({ text: line.text, source: index });
  });
  const source = blocks.find((block) => block.line === sourceLine);
  const destination = blocks.find((block) => block.line === target.line);
  if (!source || (target.placement !== "root" && !destination) || source === destination) return null;

  // Dropping on a section's body means inside; the top edge means before it.
  const inside =
    destination?.section && (target.placement === "inside" || (target.placement === "after" && !source.section));
  const parent = target.placement === "root" ? null : inside ? destination! : destination!.parent;
  for (let ancestor = parent; ancestor; ancestor = ancestor.parent) if (ancestor === source) return null;
  const siblings = parent ? parent.children : roots;
  let insertion =
    inside || target.placement === "root"
      ? siblings.length
      : siblings.indexOf(destination!) + (target.placement === "after" ? 1 : 0);
  const oldSiblings = source.parent ? source.parent.children : roots;
  const oldIndex = oldSiblings.indexOf(source);
  oldSiblings.splice(oldIndex, 1);
  if (siblings === oldSiblings && oldIndex < insertion) insertion--;

  // Fountain has no closing section marker. Direct scenes must precede child
  // sections; root scenes likewise precede the first top-level section.
  const firstSection = siblings.findIndex((block) => block.section);
  const boundary = firstSection < 0 ? siblings.length : firstSection;
  insertion = source.section ? Math.max(boundary, insertion) : Math.min(boundary, insertion);
  if (siblings === oldSiblings && insertion === oldIndex) return null;
  const depthDelta = source.section ? (parent ? parent.depth + 1 : 1) - source.depth : 0;
  const relevel = (block: Block) => {
    if (block.section) {
      block.depth += depthDelta;
      block.lines[0].text = block.lines[0].text.replace(/^#+/, "#".repeat(block.depth));
    }
    block.children.forEach(relevel);
  };
  relevel(source);
  siblings.splice(insertion, 0, source);

  const output = [...preamble];
  const write = (block: Block) => {
    if (output.length && output[output.length - 1].text.trim()) output.push({ text: "" });
    output.push(...block.lines);
    block.children.forEach(write);
  };
  roots.forEach(write);
  const text = output.map((line) => line.text).join("\n");
  if (text === state.doc.toString()) return null;
  const lineMap = new Map<number, number>();
  const offsets: number[] = [];
  let offset = 0;
  output.forEach((line, index) => {
    offsets.push(offset);
    if (line.source !== undefined) lineMap.set(line.source, index);
    offset += line.text.length + 1;
  });
  const mapPosition = (position: number) => {
    const line = state.doc.lineAt(position);
    const index = lineMap.get(line.number - 1);
    if (index === undefined) return Math.min(position, text.length);
    const column = position - line.from + output[index].text.length - line.length;
    return offsets[index] + Math.max(0, Math.min(column, output[index].text.length));
  };
  return {
    changes: { from: 0, to: state.doc.length, insert: text },
    selection: EditorSelection.create(
      state.selection.ranges.map((range) => EditorSelection.range(mapPosition(range.anchor), mapPosition(range.head))),
      state.selection.mainIndex,
    ),
    annotations: [outlineMoveMapping.of(lineMap), isolateHistory.of("full")],
    userEvent: "move.scene",
  };
}
