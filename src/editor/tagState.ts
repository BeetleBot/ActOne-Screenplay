import { StateField, StateEffect } from "@codemirror/state";
import { invertedEffects } from "@codemirror/commands";

export interface TagDef {
  id: string;
  name: string;
  type: string;
  colorOverride: string | null;
}

export interface TagItem {
  range?: [number, number];
  definitionId: string;
  type?: string;
  sceneId?: string;
}

export interface TagStore {
  tags: TagItem[];
  definitions: TagDef[];
}

// Effect to completely overwrite tags (e.g. from React syncing down, or initial load)
export const setTagsEffect = StateEffect.define<TagStore>();

// Effect to add/update tags and defs.
// We keep it simple: just an effect that sets a new TagStore, and we can invert it by keeping the old TagStore.
export const updateTagsEffect = StateEffect.define<TagStore>();

export const tagStateField = StateField.define<TagStore>({
  create() {
    return { tags: [], definitions: [] };
  },
  update(value, tr) {
    let nextValue = value;

    // Apply set or update effects
    for (const e of tr.effects) {
      if (e.is(setTagsEffect)) {
        nextValue = e.value;
      } else if (e.is(updateTagsEffect)) {
        nextValue = e.value;
      }
    }
    
    // Remap tag positions on document changes
    if (tr.docChanged && nextValue.tags.length > 0) {
      const mappedTags = nextValue.tags.map((tag) => {
        if (!tag.range) return tag;
        try {
          const [start, len] = tag.range;
          let newStart = tr.changes.mapPos(start, 1);
          const newEnd = tr.changes.mapPos(start + len, -1);
          let newLen = newEnd - newStart;
          if (newLen < 0) {
            newStart = tr.changes.mapPos(start, -1);
            newLen = tr.changes.mapPos(start + len, 1) - newStart;
          }
          if (newLen <= 0) return null; // Tag was deleted completely
          return { ...tag, range: [newStart, newLen] as [number, number] };
        } catch {
          return tag;
        }
      }).filter(Boolean) as TagItem[];
      
      nextValue = { ...nextValue, tags: mappedTags };
    }

    return nextValue;
  }
});

// Configure inverted effects for undo/redo
export const tagInvertedEffects = invertedEffects.of((tr) => {
  const effects: StateEffect<any>[] = [];
  
  for (const e of tr.effects) {
    if (e.is(updateTagsEffect)) {
      // The inverse of updating tags is setting them back to what they were before this transaction
      const prevState = tr.startState.field(tagStateField);
      effects.push(updateTagsEffect.of(prevState));
    }
  }
  
  return effects;
});
