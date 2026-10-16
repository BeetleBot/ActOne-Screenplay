import { describe, expect, it } from "vitest";
import { parseScreenplay } from "../parser";
import { acknowledgeSavedFile } from "./savedFile";
import type { ScreenplayFile } from "../context/FileContext";

function file(rawText: string, scripts?: ScreenplayFile["scripts"]): ScreenplayFile {
  return {
    id: "file-1", filePath: null, rawText, parsedDoc: parseScreenplay(rawText),
    isSaving: false, isDirty: true, savedText: "before", scripts,
  };
}

describe("acknowledgeSavedFile", () => {
  it("keeps newer plain-text edits dirty when an older save finishes", () => {
    const snapshot = file("saved revision");
    const current = { ...file("newer revision"), isSaving: true };
    const result = acknowledgeSavedFile(current, snapshot);
    expect(result.rawText).toBe("newer revision");
    expect(result.savedText).toBe("saved revision");
    expect(result.isDirty).toBe(true);
  });

  it("acknowledges each saved bundle script while retaining edits made during the write", () => {
    const snapshot = file("saved", [{ name: "Scene", fileName: "scene.fountain", content: "saved", savedContent: "old" }]);
    const current = file("new edit", [{ name: "Scene", fileName: "scene.fountain", content: "new edit", savedContent: "old" }]);
    const result = acknowledgeSavedFile(current, snapshot, snapshot.scripts);
    expect(result.scripts?.[0].content).toBe("new edit");
    expect(result.scripts?.[0].savedContent).toBe("saved");
    expect(result.isDirty).toBe(true);
  });

  it("marks a file clean when its saved revision is still current", () => {
    const snapshot = file("saved");
    expect(acknowledgeSavedFile(snapshot, snapshot).isDirty).toBe(false);
  });
});
