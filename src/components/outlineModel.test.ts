import { describe, expect, it } from "vitest";
import { parseScreenplay } from "../parser";
import { reconcileOutline } from "./outlineModel";

describe("outline reconciliation", () => {
  it("reuses rows and the complete list for dialogue-only edits", () => {
    const before = reconcileOutline([], parseScreenplay("INT. ROOM - DAY\n\nRAJ\nHello.").lines);
    const after = reconcileOutline(before, parseScreenplay("INT. ROOM - DAY\n\nRAJ\nHello, everyone.").lines);
    expect(after).toBe(before);
  });

  it("preserves section identity and updates positions after inserting lines", () => {
    const before = reconcileOutline(
      [],
      parseScreenplay("# Act One\n\nINT. ROOM - DAY\n\nAction.\n\n## Sequence\n\nEXT. ROAD - NIGHT").lines,
    );
    const after = reconcileOutline(
      before,
      parseScreenplay("\n\n# Act One\n\nINT. ROOM - DAY\n\nAction.\n\n## Sequence\n\nEXT. ROAD - NIGHT").lines,
    );
    expect(after.map((item) => item.key)).toEqual(before.map((item) => item.key));
    expect(after.map((item) => item.index)).toEqual(before.map((item) => item.index + 2));
  });

  it("distinguishes duplicate headings and preserves keys when renaming", () => {
    const before = reconcileOutline([], parseScreenplay("INT. ROOM - DAY\n\nAction.\n\nINT. ROOM - DAY").lines);
    expect(before[0].key).not.toBe(before[1].key);
    const after = reconcileOutline(before, parseScreenplay("INT. ROOM - DAY\n\nAction.\n\nINT. HALL - NIGHT").lines);
    expect(after[1].key).toBe(before[1].key);
    expect(after[1].line.text).toBe("INT. HALL - NIGHT");
  });

  it("refreshes scene numbers and colors instead of retaining stale fields", () => {
    const before = reconcileOutline([], parseScreenplay("INT. ROOM - DAY #1# [[color red]]").lines);
    const after = reconcileOutline(before, parseScreenplay("INT. ROOM - DAY #2# [[color blue]]").lines);
    expect(after[0]).not.toBe(before[0]);
    expect(after[0].line.sceneNumber).toBe("2");
  });
});
