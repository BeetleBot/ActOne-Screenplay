import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { history, undo } from "@codemirror/commands";
import { LineType, parseScreenplay } from "../parser";
import { moveOutlineBlock, outlineMoveMapping, type OutlineDropTarget } from "./moveOutlineBlock";

const text =
  "Title: Test\n\n# Act A\n= Act summary\n\nINT. A - DAY #1# [[color red]]\n= Scene summary\n\nALICE\nHello.\n\n## Sequence A\n\nINT. B - DAY\n\nAction B.\n\n# Act B\n\nINT. C - DAY\n\nAction C.";
const index = (name: string) => text.split("\n").findIndex((line) => line.includes(name));
function move(source: string, target: OutlineDropTarget) {
  const state = EditorState.create({
    doc: text,
    selection: { anchor: text.indexOf("Hello.") + 2 },
    extensions: [history()],
  });
  const spec = moveOutlineBlock(state, index(source), target);
  expect(spec).not.toBeNull();
  return { before: state, transaction: state.update(spec!) };
}
function owner(script: string, scene: string) {
  let parent = "root";
  for (const line of parseScreenplay(script).lines) {
    if (line.type === LineType.section) parent = line.text;
    if (line.type === LineType.heading && line.text.includes(scene)) return parent;
  }
}

describe("outline block moves", () => {
  it("moves a scene into a subsection with its synopsis, dialogue and metadata", () => {
    const { transaction } = move("INT. A", { line: index("Sequence A"), placement: "inside" });
    const script = transaction.newDoc.toString();
    expect(owner(script, "INT. A")).toBe("## Sequence A");
    expect(script).toContain("INT. A - DAY #1# [[color red]]\n= Scene summary\n\nALICE\nHello.");
    expect(script.match(/# Act B/g)).toHaveLength(1);
    expect(transaction.state.doc.lineAt(transaction.state.selection.main.head).text).toBe("Hello.");
    const mapping = transaction.annotation(outlineMoveMapping)!;
    expect(transaction.state.doc.line(mapping.get(index("INT. A"))! + 1).text).toContain("INT. A");
  });
  it("moves a scene out of a subsection into its parent section", () => {
    const { transaction } = move("INT. B", { line: index("# Act A"), placement: "inside" });
    expect(owner(transaction.newDoc.toString(), "INT. B")).toBe("# Act A");
  });
  it("moves a scene outside all sections before the first section", () => {
    const { transaction } = move("INT. B", { line: null, placement: "root" });
    expect(owner(transaction.newDoc.toString(), "INT. B")).toBe("root");
    expect(transaction.newDoc.toString()).toMatch(/^Title: Test\n\nINT. B/);
  });
  it("moves a collapsed subsection and all its scenes to another section", () => {
    const { transaction } = move("Sequence A", { line: index("# Act B"), placement: "inside" });
    const script = transaction.newDoc.toString();
    expect(script.indexOf("# Act B")).toBeLessThan(script.indexOf("## Sequence A"));
    expect(owner(script, "INT. B")).toBe("## Sequence A");
    expect(owner(script, "INT. C")).toBe("# Act B");
  });
  it("promotes a subsection to a root section with its contents", () => {
    const { transaction } = move("Sequence A", { line: null, placement: "root" });
    expect(transaction.newDoc.toString()).toContain("\n# Sequence A\n");
    expect(owner(transaction.newDoc.toString(), "INT. B")).toBe("# Sequence A");
  });
  it("supports deeper nesting and rejects self/descendant drops", () => {
    const { transaction } = move("# Act B", { line: index("Sequence A"), placement: "inside" });
    expect(owner(transaction.newDoc.toString(), "INT. C")).toBe("### Act B");
    const state = EditorState.create({ doc: text });
    expect(moveOutlineBlock(state, index("# Act A"), { line: index("Sequence A"), placement: "inside" })).toBeNull();
    expect(moveOutlineBlock(state, index("Sequence A"), { line: index("Sequence A"), placement: "inside" })).toBeNull();
  });
  it("undo restores the complete script and original selection in one step", () => {
    const { before, transaction } = move("Sequence A", { line: index("# Act B"), placement: "inside" });
    let after = transaction.state;
    expect(
      undo({
        state: after,
        dispatch: (tr) => {
          after = tr.state;
        },
      }),
    ).toBe(true);
    expect(after.doc.toString()).toBe(text);
    expect(after.selection.eq(before.selection)).toBe(true);
  });
  it("does not attach a following section header to a moved scene", () => {
    const { transaction } = move("INT. B", { line: index("INT. C"), placement: "after" });
    expect(owner(transaction.newDoc.toString(), "INT. B")).toBe("# Act B");
    expect(owner(transaction.newDoc.toString(), "INT. A")).toBe("# Act A");
    expect(
      parseScreenplay(transaction.newDoc.toString()).lines.filter((line) => line.type === LineType.heading),
    ).toHaveLength(3);
  });
});
