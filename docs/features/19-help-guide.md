# Help Guide

**Window:** `?modal=help` (`src/components/HelpWindow.tsx`)

The Help Guide provides 78 searchable articles across 9 categories. The article inventory is maintained in `src/data/helpArticles.tsx`.

## Categories

1. **Getting Started** (9 articles)
   - Welcome Screen, Creating a New Screenplay, Opening Files, Recent Files, Keyboard Shortcuts Reference, Command Palette, Importing Screenplays, Quick Guide, Interactive Tutorial

2. **Fountain Syntax** (14 articles)
   - Scene Headings, Character Names, Dialogue, Parentheticals, Action, Transitions, Centered Text & Lyrics, Shot Lines, Page Breaks, Dual Dialogue, Synopsis, Sections, Inline Text Formatting, Boneyard Comments

3. **Writing Tools** (14 articles)
   - Tab-to-Cycle, Smart Newline, Autocomplete & Ghost Text, Smart Quotes, Auto-Match Parentheses, Typewriter Mode, Hide Fountain Markup, Focus Mode, Fix Formatting, Editor Zoom, Transform Case, Look Up Word, Search & Replace, Scene Numbers

4. **Workspace & Views** (19 articles)
   - Activity Bar, Outline Navigator, Sidebar Panels, Document Notepad, Character Data, Script Statistics, X-Ray Analyzer, To-Do Tasks, Writing Sprint Timer, Snapshots, Text Parking, Markers List, Scripts Manager, Zen Mode, Editor Context Menu, Status Bar, File Tabs, Quick Settings, Window Size and Position

5. **Production Features** (5 articles)
   - Scene Highlighting, Color Markers & Notes, Storyline Tags, Structure Templates, Scene Drag-and-Drop Reordering

6. **Files & Projects** (3 articles)
   - ActOne Bundle Format, Saving Files, Title Page Editor

7. **Export** (4 articles)
   - Export Overview, PDF Export, Fountain Export, FDX Export

8. **Settings & Customization** (7 articles)
   - Settings Overview, Spellcheck, Theme Manager, Font & Paper, Interface Scale, Auto-Save, Editor Preferences

9. **AI & Muse** (4 articles) *(new in v0.4.0)*
   - Muse overview, provider configuration, chat usage, and screenplay tools/actions

## Features

- **Full-text search** across all articles (Fuse.js-powered)
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
    tags: string[];   // Search tags
    relatedIds: string[];  // Related article IDs
}
```

The current Muse article IDs are `muse-overview`, `muse-configure`, `muse-chat`, and `muse-tools`. There is no implemented `@command` mode; help content must not describe `@write-scene`, `@q`, `@lookup`, or `@synonyms` autocomplete as available features.
