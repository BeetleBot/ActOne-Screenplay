import { describe, it, expect } from "vitest";
import { packActoneBundle, unpackActoneBundle } from "./actone";

describe("actone bundle", () => {
  it("packs and unpacks a bundle with content only", () => {
    const content = "EXT. HOUSE - DAY\n\nHello world.";
    const settings = {};
    const packed = packActoneBundle(content, settings);
    expect(packed).toBeInstanceOf(Uint8Array);
    expect(packed.length).toBeGreaterThan(0);

    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.content).toBe(content);
  });

  it("packs and unpacks with settings", () => {
    const content = "INT. ROOM - NIGHT";
    const settings = { revisionModeEnabled: true, genders: { JOHN: "male" } };
    const packed = packActoneBundle(content, settings);
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.content).toBe(content);
    expect(unpacked.settings.genders).toEqual({ JOHN: "male" });
    expect(unpacked.settings.todos).toEqual([]);
  });

  it("packs and unpacks with todos, parking, sprint", () => {
    const content = "Action line.";
    const settings = {
      todos: [{ id: "1", text: "Fix this", completed: false }],
      parking: [{ id: "p1", text: "Parked text", createdAt: 100 }],
      sprintHistory: [{ id: "s1", startTime: 0, endTime: 1, durationMinutes: 5, wordCount: 100, content: "" }],
      markers: [{ id: "m1", color: "red", description: "Fix this" }],
      productionTags: { tags: [], definitions: [] },
    };
    const packed = packActoneBundle(content, settings);
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.settings.todos).toHaveLength(1);
    expect(unpacked.settings.parking).toHaveLength(1);
    expect(unpacked.settings.sprintHistory).toHaveLength(1);
    expect(unpacked.settings.markers).toHaveLength(1);
    expect(unpacked.settings.productionTags).toEqual({ tags: [], definitions: [] });
  });

  it("handles empty content gracefully", () => {
    const packed = packActoneBundle("", {});
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.content).toBe("");
  });

  it("throws for non-zipped bytes", () => {
    expect(() => unpackActoneBundle(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
