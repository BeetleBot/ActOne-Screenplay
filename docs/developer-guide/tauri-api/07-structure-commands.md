# Story Structure Commands

8 story structure templates are embedded in the binary via `include_str!`:

1. **Three-Act Structure**
2. **Save the Cat**
3. **The Hero's Journey**
4. **The Story Circle**
5. **Freytag's Pyramid**
6. **John Truby's 7 Key Steps**
7. **Michael Hauge's 6 Stage Journey**
8. **The Sequence Approach**

## Structure Types

```typescript
interface Structure {
    name: string;
    description: string;
    beats: StructureBeat[];
}

interface StructureBeat {
    label: string;
    description: string;
}
```

## `get_structures`

Returns all available story structures with their beats.

```typescript
invoke<Structure[]>("get_structures");
```

## `get_structure_template`

Returns the raw Fountain text for a specific structure template.

```typescript
invoke<string>("get_structure_template", { name: string });
```

**Parameters:**
- `name: string` — Structure name (e.g., `"Three-Act Structure"`)

**Returns:** Fountain-formatted text with scene headings and synopsis lines for each beat.
