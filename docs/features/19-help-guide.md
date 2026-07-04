# Help Guide

**Window:** `?modal=help` (451 lines, 1053-line help articles data)

The Help Guide provides 47 searchable articles across 8 categories.

## Categories

1. **Getting Started** (4 articles)
   - Installation, first launch, welcome screen, interface tour

2. **Writing** (5 articles)
   - Fountain syntax basics, formatting text, scene structure, characters & dual dialogue, transitions & shots

3. **Editing Features** (7 articles)
   - CodeMirror editor, autocomplete, empty-line selection, search & replace, drag-to-reorder, undo/redo, keyboard shortcuts

4. **Organization** (4 articles)
   - Outline view, planning board, scripts view, parking feature

5. **Project Management** (5 articles)
   - Characters & genders, tags & categories, scene colors, todos & markers, sprint tracking

6. **Export & Output** (4 articles)
   - PDF export, FDX export, .actone archive, printing

7. **Advanced** (6 articles)
   - Command palette, zen mode, zoom & fullscreen, settings, structure templates, help & fountain guide

8. **Cross-Platform & Technical** (2 articles)
   - Running outside Tauri, Windows vs Linux behavior

## Features

- **Full-text search** across all articles (fuse.js-powered)
- **Category filtering**
- **Markdown rendering** via react-markdown with remark-gfm and rehype-raw
- **Links** to external resources and related articles

## Implementation

Articles are defined in `src/data/helpArticles.tsx` as an array of:
```typescript
interface HelpArticle {
    id: string;
    title: string;
    category: string;
    content: string;  // Markdown
    keywords: string[];
}
```
