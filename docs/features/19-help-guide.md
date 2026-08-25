# Help Guide

**Window:** `?modal=help` (`src/components/HelpWindow.tsx`)

The Help Guide provides **88 searchable articles across 10 categories**. The article inventory is maintained in `src/data/helpArticles.tsx`.

## Categories

1. **Getting Started** (10 articles)
   - Welcome Screen, Creating a New Project, Project Landing Pad, Opening Projects, Recent Files, Keyboard Shortcuts Reference, Command Palette, Importing Screenplays, Interactive Tutorial, Quick Guide (F1)

2. **Fountain Syntax** (14 articles)
   - Scene Headings, Character Names, Dialogue, Parentheticals, Action & Scene Descriptions, Transitions, Centered Text & Lyrics, Shot Lines, Page Breaks, Dual Dialogue, Synopsis Outline Notes, Sections & Hierarchy, Inline Text Formatting, Boneyard Comments

3. **Markdown Syntax** (7 articles) *(new — Prose documents)*
   - Markdown & Prose Overview, Headings & Section Dividers, Text Formatting & Emphasis, Lists & Interactive Task Checkboxes, Blockquotes & Stepped Rails, Tables & Grid Formatting, Fenced Code Blocks & Preformatted Text

4. **Writing Tools** (14 articles)
   - Tab-to-Cycle Line Prefixes, Smart Newline Handling, Autocomplete & Ghost Text, Smart Quotes, Auto-Match Parentheses, Typewriter Mode, Hide Fountain Markup, Focus Mode (Line Focus), Fix Formatting, Editor Zoom, Transform Case, Look Up Word, Search & Replace, Scene Numbers

5. **Workspace & Views** (20 articles)
   - Activity Bar, Outline Navigator, Sidebar Panels Overview, Document Notepad, Prose & Markdown Editing, Character Data, Script Statistics, X-Ray Screenplay Analyzer, To-Do Tasks, Writing Sprint Timer, Snapshots, Text Parking, Markers List, Scripts Manager, Zen Mode, Editor Context Menu, Status Bar, File Tabs, Quick Settings Menu, Window Size and Position

6. **Production Features** (5 articles)
   - Scene Highlighting (Color Coding), Color Markers & Notes, Storyline Tags, Structure Templates, Scene Drag-and-Drop Reordering

7. **Files & Projects** (3 articles)
   - ActOne Bundle Format (.actone), Saving Projects, Title Page Editor

8. **Export** (4 articles)
   - Export Overview, PDF Export, Fountain Export, FDX (Final Draft) Export

9. **Settings & Customization** (7 articles)
   - Settings Overview, Spellcheck, Theme Manager & Custom Themes, Font & Paper Settings, Interface Scale, Auto-Save, Editor Preferences

10. **AI & Muse** (4 articles) *(new in v0.4.0)*
    - Muse AI Assistant Overview, Configuring Muse (AI Providers), Using Muse Chat, Muse Tools and Screenplay Actions

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
