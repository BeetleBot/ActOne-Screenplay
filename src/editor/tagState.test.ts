import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import {
  tagStateField,
  setTagsEffect,
  updateTagsEffect,
  tagInvertedEffects,
  TagStore,
  TagItem,
  TagDef,
} from "./tagState";

describe("tagStateField", () => {
  it("initializes with empty tags and definitions", () => {
    const state = EditorState.create({
      doc: "INT. SCENE 1 - DAY\nAction text",
      extensions: [tagStateField],
    });
    const store = state.field(tagStateField);
    expect(store.tags).toEqual([]);
    expect(store.definitions).toEqual([]);
  });

  it("updates state via setTagsEffect", () => {
    const state = EditorState.create({
      doc: "INT. SCENE 1 - DAY\nAction text",
      extensions: [tagStateField],
    });

    const def: TagDef = { id: "def-1", name: "Prop", type: "PROP", colorOverride: null };
    const tag: TagItem = { range: [5, 7], definitionId: "def-1", type: "PROP" };
    const store: TagStore = { tags: [tag], definitions: [def] };

    const tr = state.update({
      effects: [setTagsEffect.of(store)],
    });
    const updatedStore = tr.state.field(tagStateField);

    expect(updatedStore.definitions).toHaveLength(1);
    expect(updatedStore.definitions[0].id).toBe("def-1");
    expect(updatedStore.tags).toHaveLength(1);
    expect(updatedStore.tags[0].range).toEqual([5, 7]);
  });

  it("updates state via updateTagsEffect", () => {
    const state = EditorState.create({
      doc: "INT. SCENE 1 - DAY\nAction text",
      extensions: [tagStateField],
    });

    const def: TagDef = { id: "def-2", name: "Vehicle", type: "VEHICLE", colorOverride: "#ff0000" };
    const tag: TagItem = { range: [0, 4], definitionId: "def-2", type: "VEHICLE" };
    const store: TagStore = { tags: [tag], definitions: [def] };

    const tr = state.update({
      effects: [updateTagsEffect.of(store)],
    });
    const updatedStore = tr.state.field(tagStateField);

    expect(updatedStore.definitions[0].name).toBe("Vehicle");
    expect(updatedStore.tags[0].range).toEqual([0, 4]);
  });

  it("remaps tag positions when document changes before the tag", () => {
    const def: TagDef = { id: "def-1", name: "Prop", type: "PROP", colorOverride: null };
    const tag: TagItem = { range: [10, 5], definitionId: "def-1" };
    const initialStore: TagStore = { tags: [tag], definitions: [def] };

    let state = EditorState.create({
      doc: "0123456789ABCDE",
      extensions: [tagStateField],
    });
    state = state.update({ effects: [setTagsEffect.of(initialStore)] }).state;

    // Insert 5 characters at position 0
    const tr = state.update({
      changes: { from: 0, insert: "HELLO" },
    });
    const updatedStore = tr.state.field(tagStateField);

    expect(updatedStore.tags[0].range).toEqual([15, 5]);
  });

  it("removes tags that get completely deleted by document changes", () => {
    const tag: TagItem = { range: [5, 5], definitionId: "def-1" };
    const initialStore: TagStore = { tags: [tag], definitions: [] };

    let state = EditorState.create({
      doc: "0123456789ABCDE",
      extensions: [tagStateField],
    });
    state = state.update({ effects: [setTagsEffect.of(initialStore)] }).state;

    // Delete range [0, 12] covering the entire tag
    const tr = state.update({
      changes: { from: 0, to: 12, insert: "" },
    });
    const updatedStore = tr.state.field(tagStateField);

    expect(updatedStore.tags).toHaveLength(0);
  });
});

describe("tagInvertedEffects", () => {
  it("provides inverted effects extension", () => {
    expect(tagInvertedEffects).toBeDefined();
  });
});
