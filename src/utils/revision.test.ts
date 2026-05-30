import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { startRevisionMode, mergeRevisions, discardRevisions } from "./revision";

beforeAll(() => {
  (globalThis as any).window = {
    confirm: () => true
  };
});

describe("Revision lifecycle commands", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("startRevisionMode", () => {
    it("should start revision mode directly if file is already .actone bundle", async () => {
      const updateSettings = vi.fn();
      const saveFileAs = vi.fn();

      const result = await startRevisionMode(
        "/path/to/screenplay.actone",
        "raw text",
        updateSettings,
        saveFileAs
      );

      expect(result).toBe(true);
      expect(saveFileAs).not.toHaveBeenCalled();
      expect(updateSettings).toHaveBeenCalled();
    });

    it("should prompt and save as .actone if file is .fountain", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const updateSettings = vi.fn();
      const saveFileAs = vi.fn().mockResolvedValue("/path/to/new.actone");

      const result = await startRevisionMode(
        "/path/to/screenplay.fountain",
        "raw text",
        updateSettings,
        saveFileAs
      );

      expect(result).toBe(true);
      expect(saveFileAs).toHaveBeenCalled();
      expect(updateSettings).toHaveBeenCalled();
    });

    it("should not start revision mode if user cancels the save prompt", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const updateSettings = vi.fn();
      const saveFileAs = vi.fn();

      const result = await startRevisionMode(
        "/path/to/screenplay.fountain",
        "raw text",
        updateSettings,
        saveFileAs
      );

      expect(result).toBe(false);
      expect(saveFileAs).not.toHaveBeenCalled();
      expect(updateSettings).not.toHaveBeenCalled();
    });
  });

  describe("mergeRevisions", () => {
    it("should disable revision mode and clear base text if confirmed", () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const updateSettings = vi.fn();

      mergeRevisions(updateSettings);

      expect(updateSettings).toHaveBeenCalled();
    });

    it("should do nothing if merge confirmation is cancelled", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const updateSettings = vi.fn();

      mergeRevisions(updateSettings);

      expect(updateSettings).not.toHaveBeenCalled();
    });
  });

  describe("discardRevisions", () => {
    it("should revert text, disable revision mode, and clear base text if confirmed", () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const updateSettings = vi.fn();
      const setRawText = vi.fn();

      discardRevisions(updateSettings, setRawText, "base draft text");

      expect(setRawText).toHaveBeenCalledWith("base draft text");
      expect(updateSettings).toHaveBeenCalled();
    });

    it("should do nothing if discard confirmation is cancelled", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const updateSettings = vi.fn();
      const setRawText = vi.fn();

      discardRevisions(updateSettings, setRawText, "base draft text");

      expect(setRawText).not.toHaveBeenCalled();
      expect(updateSettings).not.toHaveBeenCalled();
    });
  });
});
