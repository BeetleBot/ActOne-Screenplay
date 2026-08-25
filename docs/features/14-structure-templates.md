# Story Structure Templates

ActOne includes 8 embedded story structure templates that can be imported into any screenplay.

## Available Templates

1. **Three-Act Structure** — The classic setup/confrontation/resolution arc
2. **Save the Cat** — Blake Snyder's 15-beat structure
3. **The Hero's Journey** — Joseph Campbell's monomyth
4. **The Story Circle** — Dan Harmon's 8-step story circle
5. **Freytag's Pyramid** — Gustav Freytag's 5-act dramatic structure
6. **John Truby's 7 Key Steps** — Truby's 7 essential story beats
7. **Michael Hauge's 6 Stage Journey** — Hauge's 6-stage character arc
8. **The Sequence Approach** — Frank Daniel's 8-sequence method

## Importing a Template

1. **Command Palette** → "Import Structure Template"
2. Select the desired structure from the list (modal nav items are `6px` rounded pills with primary tint for active)
3. Choose import position (before current scene, after current scene, at document end)
4. The template is inserted as formatted Fountain text with:
   - Section headers (`# Beat Name`)
   - Scene headings (`INT. TEMPLATE - DAY`)
   - Synopsis lines (`= Description of the beat`)

## Use Cases

- Outlining a new screenplay from scratch
- Analyzing your existing structure against a template
- Teaching screenwriting structure
- Quick-starting a writing project with a proven framework

## Implementation

Templates are stored as `.fountain` files in `src-tauri/assets/structures/` and embedded into the Rust binary via `include_str!`. The `get_structures` and `get_structure_template` Tauri commands serve them to the frontend.
