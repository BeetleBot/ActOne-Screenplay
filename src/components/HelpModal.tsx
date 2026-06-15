import React, { useState } from "react";
import { useUI } from "../context";
import { CloseIcon, OpenInNewIcon, SearchIcon, ClearIcon } from "./Icons";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  TextField,
  InputAdornment,
} from "@mui/material";

interface HelpModalProps {
  onClose: () => void;
}

const openFountainGuide = () => {
  const url = "https://fountain.io";
  try {
    import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(url));
  } catch (e) {
    console.warn("Failed to open URL via Tauri opener", e);
    window.open(url, "_blank");
  }
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ mb: 3 }}>
    <Typography
      variant="overline"
      sx={{
        fontWeight: 800,
        color: "primary.main",
        letterSpacing: "0.08em",
        display: "block",
        mb: 2,
        fontSize: 11,
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const Feature: React.FC<{ name: string; desc: string }> = ({ name, desc }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5, fontSize: 13.5 }}>
      {name}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: 13 }}>
      {desc}
    </Typography>
  </Box>
);

interface HelpItem {
  name: string;
  desc: string;
  category: string;
  keywords: string[];
}

// Comprehensive documentation items mapping to actual codebase features
const HELP_ITEMS: HelpItem[] = [
  // Fountain & Writing Rules
  {
    name: "Scene Headings / Sluglines",
    desc: "Indicate time and location changes by starting a line with INT. (Interior) or EXT. (Exterior) in all capital letters (e.g. 'INT. WRITING STUDIO - DAY'). To force a scene heading that doesn't start with these prefixes, start the line with a single period (e.g. '.SECRET HIDEOUT'). You can also renumber or clear scene numbers via the Command Palette.",
    category: "Writing & Formatting",
    keywords: ["scene heading", "slugline", "int", "ext", "interior", "exterior", "renumber", "clear scene numbers"]
  },
  {
    name: "Character Names",
    desc: "Introduce characters by typing their name in all CAPITAL letters on a single line with an empty line before it. To force a character name (such as names with lowercase letters), start the line with the '@' symbol (e.g. '@McQueen').",
    category: "Writing & Formatting",
    keywords: ["character", "@", "capital letters", "names"]
  },
  {
    name: "Dialogue",
    desc: "Type dialogue paragraphs directly underneath the character name line, without leaving any blank lines between the character name (or parenthetical) and the dialogue text.",
    category: "Writing & Formatting",
    keywords: ["dialogue", "speech", "speaking", "lines"]
  },
  {
    name: "Parentheticals",
    desc: "Add actor directions or tone instructions by wrapping them in parentheses on their own line immediately between the character name and the dialogue text (e.g. '(whispering)').",
    category: "Writing & Formatting",
    keywords: ["parenthetical", "parentheses", "action direction", "delivery", "whispering"]
  },
  {
    name: "Action & Scene Descriptions",
    desc: "Write action and physical descriptions in standard mixed-case paragraphs. Any line that does not trigger character, dialogue, parenthetical, or scene heading rules is treated as action. Force a line to format as action by starting it with an exclamation mark (e.g. '!He exits through the window.').",
    category: "Writing & Formatting",
    keywords: ["action", "description", "scene description", "exclamation point", "!"]
  },
  {
    name: "Transitions",
    desc: "Write camera directions or cut-aways (e.g. 'CUT TO:' or 'FADE OUT.') in all CAPITAL letters at the end of a line. Force transitions on any line by starting with a '>' symbol (e.g. '> FADE IN:').",
    category: "Writing & Formatting",
    keywords: ["transition", "cut to", "fade in", "fade out", ">"]
  },
  {
    name: "Centered Text & Lyrics",
    desc: "Center lines of text (e.g. for title cards or ending lines) by wrapping them in '>' and '<' symbols (e.g. '> THE END <'). For musical lyrics, start the line with a tilde symbol (e.g. '~ Sing a song').",
    category: "Writing & Formatting",
    keywords: ["centered text", "lyrics", "music", "tilde", "ends", "> <", "~"]
  },
  {
    name: "Page Breaks",
    desc: "Force a new page in your exported PDF screenplay by typing exactly '===' on a line by itself.",
    category: "Writing & Formatting",
    keywords: ["page break", "new page", "==="]
  },
  {
    name: "Dual Dialogue",
    desc: "Create side-by-side dialogue for two characters speaking simultaneously by typing a carat '^' symbol immediately following the second character's name (e.g. 'BOB ^').",
    category: "Writing & Formatting",
    keywords: ["dual dialogue", "simultaneous dialogue", "side by side", "^", "carat"]
  },
  {
    name: "Synopsis Outline Notes",
    desc: "Add outline summaries of scenes or beats by starting a line with an equals sign (e.g. '= Introduce the villain'). These outline items remain visible in your Navigator panel but are completely invisible when you export the final script.",
    category: "Writing & Formatting",
    keywords: ["synopsis", "outline notes", "=", "beats", "invisible notes"]
  },
  {
    name: "Outline Sections",
    desc: "Organize script structures using Markdown-like headers. A single '#' prefix represents a major block (like 'Act I'), while '##' or '###' represents sequences or chapters. These elements structure your outline navigator hierarchy.",
    category: "Writing & Formatting",
    keywords: ["outline section", "header", "#", "##", "act", "sequence"]
  },
  // Formatting Assistance
  {
    name: "Inline Text Formatting",
    desc: "Select text and press Ctrl+B to wrap it in bold ** markers, Ctrl+I for italic * markers, or Ctrl+U for underline _ markers. Press the same shortcut again to remove the formatting. Access the same options via the right-click context menu under Format.",
    category: "Writing & Formatting",
    keywords: ["bold", "italic", "underline", "inline formatting", "ctrl+b", "ctrl+i", "ctrl+u", "**", "format"]
  },
  {
    name: "Transform Case",
    desc: "Right-click a selection and choose Transform Case to convert text to UPPERCASE, Title Case, or lowercase. Useful for quickly normalizing character names or scene headings.",
    category: "Writing & Formatting",
    keywords: ["transform case", "uppercase", "title case", "lowercase", "case conversion", "context menu"]
  },
  {
    name: "Tab-to-Cycle Line Prefixes",
    desc: "Press Tab at the start of a line to cycle through Fountain prefixes: @ (forced character), . (forced scene heading), > (forced transition), and back to normal. Each press advances to the next prefix in the cycle.",
    category: "Writing & Formatting",
    keywords: ["tab cycle", "line prefix", "@", ".", ">", "forced character", "forced heading", "forced transition"]
  },
  {
    name: "Smart Newline Handling",
    desc: "When you press Enter after a scene heading, character name, parenthetical, dialogue, or transition, ActOne automatically inserts the correct blank line spacing required by Fountain syntax—no extra manual blank lines needed.",
    category: "Writing & Formatting",
    keywords: ["smart newline", "enter", "blank lines", "spacing", "auto spacing"]
  },
  {
    name: "Clean Screenplay Spaces",
    desc: "Press Shift+Alt+C to run the clean screenplay spaces command. It removes redundant blank lines, groups outline elements, and establishes a clean 1-blank-line hierarchy between standard elements, preserving Fountain formatting.",
    category: "Writing & Formatting",
    keywords: ["clean screenplay spaces", "consolidate formatting", "spaces", "remove empty lines", "Shift+Alt+C"]
  },
  {
    name: "Search & Replace",
    desc: "Press Ctrl+F to toggle the search and replace panel. Find words, replace matches, perform case-sensitive filtering, toggle whole-word match, or use regex queries. Includes a 'Preserve Case' option to automatically format replacements.",
    category: "Writing & Formatting",
    keywords: ["search", "replace", "ctrl+f", "regex", "preserve case", "case sensitive"]
  },
  {
    name: "Look Up Word",
    desc: "Right-click any selected word and choose Look Up to search it on Google in a new browser tab. Quick way to research terms, names, or definitions while writing.",
    category: "Writing & Formatting",
    keywords: ["look up", "google search", "search web", "right click", "context menu", "word lookup", "research"]
  },
  {
    name: "Scene Numbers",
    desc: "Automatically add sequential scene numbers to all scene headings via Command Palette > Renumber Scene Headings (appends #1#, #2#, etc.). Clear all scene numbers at once with Clear Scene Numbers. Scene numbers display in the editor, outline navigator, and planning board cards.",
    category: "Writing & Formatting",
    keywords: ["scene numbers", "renumber", "clear scene numbers", "#", "sequential numbering"]
  },
  {
    name: "Import Structure Template",
    desc: "Open Command Palette > Import Structure Template to browse and insert predefined screenplay structures (e.g., Three-Act Structure, Save the Cat, Hero's Journey). Each structure inserts section headers and beat descriptions as outline elements in your script.",
    category: "Writing & Formatting",
    keywords: ["structure template", "import structure", "three act", "save the cat", "hero's journey", "beat sheet", "outline template"]
  },
  // File & Project
  {
    name: "ActOne Bundle Format (.actone)",
    desc: "The .actone format is a specialized project bundle format unique to ActOne. Standard .fountain files only save the raw script text. The .actone bundle packages your screenplay text together with all your workspace notepad contents, character gender assignments, task checklists, marker categories, and writing sprint histories. Save as a .actone bundle to unlock these sidebar panels. The format is extremely portable and human-friendly — rename any .actone file to .zip and extract it to find your screenplay as a plain .fountain file alongside all supporting data as readable JSON files.",
    category: "Files & Projects",
    keywords: ["actone bundle", ".actone", "workspace tool persistence", "save as actone", "notepad contents", "gender assignments", "zip", "extract", "portable", "human friendly", "fountain"]
  },
  {
    name: "File Tabs Control",
    desc: "Open multiple scripts simultaneously. Tabs display dirty indicators (circular dots) when unsaved. Close tabs with Alt+Q, by clicking the 'X', or by middle-clicking the tab header. Right-clicking a tab exposes options to Close, Close Others, or Close All.",
    category: "Files & Projects",
    keywords: ["tabs", "close tab", "close others", "close all", "unsaved changes dot", "alt+q", "middle click"]
  },
  {
    name: "Multi-Script Bundles (.actone)",
    desc: "The Scripts sidebar tab lets you manage multiple fountain scripts inside a single .actone bundle. Add new scripts, rename them, or delete them (with confirmation). Click a script name to load it into the editor. The status bar shows the active script — click it to quickly switch between scripts. Export All exports every script in the bundle as separate files.",
    category: "Files & Projects",
    keywords: ["scripts", "multi-script", "bundle", "add script", "rename script", "delete script", "export all", "script switcher", "fountain.json"]
  },
  {
    name: "Title Page Editor",
    desc: "Open Command Palette > Edit Title Page to set your screenplay's title, author, contact info, draft date, and more. The title page is embedded in your Fountain file following standard Fountain title page format and appears in PDF exports.",
    category: "Review & Export",
    keywords: ["title page", "title editor", "cover page", "author", "contact", "draft date", "fountain title page"]
  },
  // Workspace & Views
  {
    name: "Planning Board Overview",
    desc: "Switch to Planning Board mode via the status bar button or Command Palette (Ctrl+Shift+P). The Planning Board visualizes your screenplay structure as a kanban-style board where Sections become columns, Subsections become grouped cards, and individual Scenes become draggable cards with optional color coding and synopsis notes.",
    category: "Workspace & Views",
    keywords: ["planning board", "kanban", "visual outline", "board view", "ctrl+shift+p", "scene cards", "storyboard"]
  },
  {
    name: "Planning Board Sections & Hierarchy",
    desc: "Sections (# headers) become columns on the board. Subsections (## headers) become grouped areas within columns. Scenes (INT./EXT. headings) become individual cards. Each card shows the scene title, scene number badge (if assigned), a synopsis editor, and a delete button. Add new Sections, Subsections, or Scenes using the + buttons.",
    category: "Workspace & Views",
    keywords: ["sections", "subsections", "scene cards", "add section", "add scene", "hierarchy", "#", "##"]
  },
  {
    name: "Planning Board Drag & Drop",
    desc: "Drag and drop scene cards between sections, subsections, or reorder them within the same group. A dashed placeholder appears at the drop target showing exactly where the scene will land. Sections and subsections are also draggable for full structural reordering. Auto-scroll makes it easy to drag across large boards.",
    category: "Workspace & Views",
    keywords: ["drag drop", "reorder scenes", "move scene", "auto scroll", "placeholder", "reorder sections"]
  },
  {
    name: "Scene Highlighting (Color Coding)",
    desc: "Right-click a scene heading line in the editor, choose Highlight Scene, and pick a color (Red, Orange, Yellow, Green, Blue, Purple, Pink) or Clear Highlight to remove it. Highlighted scenes show a colored left border in the editor and a colored card border in the Planning Board.",
    category: "Workspace & Views",
    keywords: ["scene highlight", "color coding", "scene color", "highlight scene", "colored border", "right click highlight"]
  },
  {
    name: "Scene Drag-and-Drop Reordering",
    desc: "In the Outline sidebar, drag and drop scenes to reorder them. A visual indicator shows the insertion point. The editor text updates automatically to reflect the new scene order.",
    category: "Workspace & Views",
    keywords: ["scene reorder", "drag drop outline", "reorder scenes", "outline reorder", "move scene up down"]
  },
  {
    name: "Hide Fountain Markup",
    desc: "Toggle 'Hide Fountain Markup' via Command Palette or the Quick Settings menu in the activity bar to hide Fountain syntax prefixes (., @, !, >, ~, #, =) from view. The active line still shows prefixes so you can edit. This gives a clean, manuscript-like reading view without cluttering the text.",
    category: "Workspace & Views",
    keywords: ["hide syntax", "hide fountain markup", "clean view", "reading view", "manuscript view", "hide prefixes", "fountain syntax"]
  },
  {
    name: "Zen Mode (Distraction-Free)",
    desc: "Press Alt+Enter to toggle Zen Mode. This hides the header bar, tabs, sidebars, and the status bar, expanding your editor into a distraction-free fullscreen screen. Zoom the editor view from 50% to 200% with Ctrl+= and Ctrl+-.",
    category: "Workspace & Views",
    keywords: ["zen mode", "fullscreen", "distraction free", "alt+enter", "zoom", "ctrl+=", "ctrl+-"]
  },
  {
    name: "Story Outline Navigator",
    desc: "Displays a hierarchical outline of your sections, scenes, and synopses in the sidebar. Click outline items to scroll the editor to that line. Features visibility filters (Sections, Scenes, Synopses), outline font sizing, collapsible headers, and full keyboard navigation (Arrows Up/Down to navigate, Arrows Left/Right to expand/collapse).",
    category: "Workspace & Views",
    keywords: ["outline navigator", "sidebar navigator", "scenes list", "navigator filters", "keyboard outline navigation"]
  },
  {
    name: "Document Notepad",
    desc: "A freeform notepad sidebar tab to brainstorm characters, scribble beat sheets, draft outline ideas, or outline scene goals. Your notes persist inside the .actone bundle.",
    category: "Workspace & Views",
    keywords: ["notepad", "notes sidebar", "brainstorming"]
  },
  {
    name: "Character Tracker & Gender Analyzer",
    desc: "Scans your script to list characters and count dialogue lines. Assign genders (Male, Female, Non-Binary, Unknown) to characters to track breakdown stats. Search character names using the filter input.",
    category: "Workspace & Views",
    keywords: ["character tracker", "gender analyzer", "dialogue counts", "character list", "stats"]
  },
  {
    name: "To-Do Task Manager",
    desc: "Add tasks to plan your screenplay revisions. Check off completed items to move them to a collapsible completed list at the bottom of the tasks pane, or delete tasks entirely.",
    category: "Workspace & Views",
    keywords: ["tasks", "to-do list", "revisions checklist", "task manager"]
  },
  {
    name: "Writing Sprint Timer",
    desc: "Set writing sprints from 1 to 60 minutes. Sprints track countdown time, show progress visual circles, and log your net word count gains. View previous sprint sessions in History, or check out your top writing sessions on the Leaderboard.",
    category: "Workspace & Views",
    keywords: ["sprint timer", "writing sprint", "countdown", "word count gains", "leaderboard", "timer history"]
  },
  // Review & Export
  {
    name: "Production Breakdown & Tagging",
    desc: "Tag production details without cluttering your script text. Highlight text, right-click, select 'Tag', and assign it to Cast, Prop, VFX, SFX, Camera, Animal, Extras, Vehicle, Costume, Makeup, Music, Sound, Stunt, Set Design, or Other. Manage, inspect occurrences, and merge redundant tags in the Breakdown sidebar.",
    category: "Review & Export",
    keywords: ["production breakdown", "tagging", "props", "cast", "vfx", "tag editor", "merge tags"]
  },
  {
    name: "Text Parking",
    desc: "The Parking sidebar tab works as a temporary clipboard for storing text snippets you want to reuse later. Right-click a selection in the editor and choose Park Selection to save it. Click a parked item to re-insert it at the cursor. Remove items individually or clear all. Parked text persists in .actone bundles.",
    category: "Workspace & Views",
    keywords: ["parking", "park selection", "clipboard", "text storage", "temporary storage", "reuse text", "parked items"]
  },
  {
    name: "Editor Context Menu",
    desc: "Right-click anywhere in the editor for quick access to: Cut/Copy/Paste, Tag (production breakdown categories), Highlight Scene (color), Drop Marker (inline color notes), Format (Bold/Italic/Underline/Clean Spaces), Transform Case (UPPER/Title/lower), Look Up Word (Google search), Create Task (adds to Tasks sidebar), and Park Selection (saves to Parking sidebar).",
    category: "Workspace & Views",
    keywords: ["context menu", "right click", "tag", "highlight", "marker", "format", "transform case", "look up", "create task", "park"]
  },
  {
    name: "Custom Color Markers & Notes",
    desc: "Insert inline notes directly inside double brackets, using the syntax: '[[marker color: description]]' (e.g. '[[marker red: Fix description]]'). Supports 11 colors (blue, brown, cyan, green, magenta, orange, pink, purple, red, yellow, none) and hex codes. View, search, and filter notes by color in the Markers sidebar.",
    category: "Review & Export",
    keywords: ["markers", "notes", "brackets", "color notes", "inline comments", "marker filters"]
  },

  {
    name: "PDF, Fountain & FDX Exporting",
    desc: "Export your screenplay in three formats. PDF with customizable options (scene numbers, bold headings, font choices, title page, sections/synopses). Fountain as a clean plain-text file with all app-specific tags stripped. FDX (Final Draft XML) for compatibility with Final Draft, Fade In, and other professional screenwriting applications.",
    category: "Review & Export",
    keywords: ["export", "pdf", "fountain export", "fdx", "final draft", "print screenplay", "scene numbers", "print options"]
  },
  {
    name: "Adaptive Interface & Modal Sizing",
    desc: "All dialogs and modals automatically adapt to your window size and Interface Scale setting. Modal heights are capped to viewport size so they never overflow on small screens. Adjust the overall UI size via Settings > Interface Scale (75%–150%).",
    category: "Workspace & Views",
    keywords: ["interface scale", "modal sizing", "responsive", "window size", "adaptive", "dialog size", "view"]
  },
  // Settings & Configuration
  {
    name: "Theme Manager & Custom Themes",
    desc: "Open Settings > Theme Manager to create, edit, and apply custom color themes. Choose from built-in Light/Dark themes or create your own by setting Editor, Text, Accent, Sidebar, and Button colors. Five preset themes (Noir, Ocean, Sunset, Forest, Lavender) provide quick starting points. Custom themes persist in local storage.",
    category: "Settings & Configuration",
    keywords: ["theme manager", "custom theme", "color theme", "noir", "ocean", "sunset", "forest", "lavender", "accent color", "dark mode", "light mode"]
  },
  {
    name: "Font & Paper Settings",
    desc: "In Settings, choose between Courier Prime (standard screenplay monospace) and Courier Prime Sans. Switch paper size between US Letter and A4 for PDF export formatting. Font and paper settings apply globally.",
    category: "Settings & Configuration",
    keywords: ["font", "courier prime", "courier prime sans", "paper size", "us letter", "a4", "settings"]
  },
  {
    name: "Typewriter Mode",
    desc: "Toggle Typewriter Mode in Settings to keep your active writing line vertically centered on the screen. The text scrolls around your line rather than your typing cursor moving down the page.",
    category: "Settings & Configuration",
    keywords: ["typewriter mode", "scroll active line", "center cursor"]
  },
  {
    name: "Automatic Saving",
    desc: "ActOne can automatically save changes to your active files at customizable intervals (30s, 1m, 2m, 5m). Toggle autosave and set the interval in Settings.",
    category: "Settings & Configuration",
    keywords: ["automatic saving", "autosave", "settings", "interval"]
  },
  {
    name: "Smart Quotes & Auto-Parentheses",
    desc: "As you type, straight quotation marks (' and \") are converted to smart curly quotes (\" and \"). Typing an opening parenthesis '(' automatically inserts the matching closing one ')'. Both features can be toggled in Settings.",
    category: "Settings & Configuration",
    keywords: ["smart quotes", "auto parentheses", "curly quotes", "quotes", "parentheses"]
  },
  {
    name: "Autocomplete Suggestions",
    desc: "ActOne autocompletes character names and scene locations automatically based on existing script items. Autocomplete suggestions can be toggled in Settings.",
    category: "Settings & Configuration",
    keywords: ["autocomplete", "suggestions", "character autocomplete", "location autocomplete", "settings"]
  },
];

const shortcuts = [
  {
    group: "File Operations",
    items: [
      { keys: "Ctrl + N", action: "Create a new screenplay tab" },
      { keys: "Ctrl + O", action: "Open an existing screenplay file (.fountain, .txt, .actone)" },
      { keys: "Ctrl + S", action: "Save changes to the active file" },
      { keys: "Ctrl + Shift + S", action: "Save the current script as a new file" },
      { keys: "Alt + Q", action: "Close the active screenplay tab" },
      { keys: "Ctrl + P", action: "Open the export dialog (PDF or Fountain)" },
      { keys: "Ctrl + Tab / Ctrl + PageDown", action: "Switch to the next document tab" },
      { keys: "Ctrl + Shift + Tab / Ctrl + PageUp", action: "Switch to the previous document tab" },
    ],
  },
  {
    group: "Editing & Text Formatting",
    items: [
      { keys: "Ctrl + Z", action: "Undo last change" },
      { keys: "Ctrl + Y", action: "Redo last change" },
      { keys: "Ctrl + X", action: "Cut highlighted text" },
      { keys: "Ctrl + C", action: "Copy highlighted text" },
      { keys: "Ctrl + V", action: "Paste text from clipboard" },
      { keys: "Ctrl + A", action: "Select all text" },
      { keys: "Ctrl + B", action: "Format selection as bold (**)" },
      { keys: "Ctrl + I", action: "Format selection as italic (*)" },
      { keys: "Ctrl + U", action: "Format selection as underline (_)" },
      { keys: "Shift + Alt + C", action: "Clean screenplay spaces and consolidate formatting" },
      { keys: "Tab", action: "Cycle line prefixes (@ → . → > → normal)" },
    ],
  },
  {
    group: "View & Navigation",
    items: [
      { keys: "Ctrl + F", action: "Toggle the search and replace panel" },
      { keys: "Ctrl + \\", action: "Toggle the sidebar visibility" },
      { keys: "Ctrl + K", action: "Open the Command Palette" },
      { keys: "Ctrl + ,", action: "Open the Settings dialog" },
      { keys: "Ctrl + Shift + P", action: "Switch between Editor and Planning Board" },
      { keys: "Alt + Enter", action: "Toggle Zen Mode (fullscreen, distraction-free)" },
      { keys: "Escape", action: "Move cursor focus back to the editor" },
      { keys: "Ctrl + =", action: "Zoom in on the text editor" },
      { keys: "Ctrl + -", action: "Zoom out on the text editor" },
      { keys: "Ctrl + 0", action: "Reset text editor zoom to 100%" },
    ],
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const { appScale } = useUI();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredItems = searchQuery.trim()
    ? HELP_ITEMS.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const filteredShortcuts = searchQuery.trim()
    ? shortcuts
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.keys.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((group) => group.items.length > 0)
    : [];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" disableScrollLock sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '10px' } }}>
      <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: "nowrap", fontSize: 15 }}>ActOne Help Manual</Typography>
        
        {/* Modern Search Bar */}
        <TextField
          size="small"
          placeholder="Search topics, features, shortcuts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1,
            maxWidth: 400,
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              height: 32,
              fontSize: "0.8rem",
              bgcolor: "action.hover",
              "& fieldset": { borderColor: "transparent" },
              "&:hover fieldset": { borderColor: "divider" },
              "&.Mui-focused fieldset": { borderColor: "primary.main" },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ color: "text.secondary" }}>
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery("")} sx={{ color: "text.secondary", p: "2px" }}>
                    <ClearIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ),
            }
          }}
        />

        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      {!searchQuery && (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} variant="scrollable" scrollButtons="auto">
            <Tab label="Writing & Formatting" sx={{ fontWeight: 600, fontSize: 13 }} />
            <Tab label="Files & Projects" sx={{ fontWeight: 600, fontSize: 13 }} />
            <Tab label="Workspace & Views" sx={{ fontWeight: 600, fontSize: 13 }} />
            <Tab label="Review & Export" sx={{ fontWeight: 600, fontSize: 13 }} />
            <Tab label="Settings & Config" sx={{ fontWeight: 600, fontSize: 13 }} />
            <Tab label="Keyboard Shortcuts" sx={{ fontWeight: 600, fontSize: 13 }} />
          </Tabs>
        </Box>
      )}

      <DialogContent sx={{ px: 2.5, py: 2, maxHeight: `${(60 * 100) / appScale}vh`, overflowY: "auto" }}>
        {searchQuery ? (
          // Search Results View
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3, fontWeight: 600 }}>
              Search Results for &ldquo;{searchQuery}&rdquo; ({filteredItems.length} articles, {filteredShortcuts.reduce((acc, g) => acc + g.items.length, 0)} shortcuts found)
            </Typography>
            
            {filteredItems.length > 0 && (
              <Section title="Matching Help Articles">
                  {filteredItems.map((item) => (
                  <Feature key={item.name} name={item.name} desc={item.desc} />
                ))}
              </Section>
            )}

            {filteredShortcuts.length > 0 && (
              <Section title="Matching Keyboard Shortcuts">
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {filteredShortcuts.map((group) =>
                    group.items.map((s) => (
                      <Box
                        key={`${group.group}-${s.keys}`}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: "action.hover",
                        }}
                      >
                        <Typography variant="body2" sx={{ color: "text.primary", fontSize: 13 }}>
                          {s.action} ({group.group})
                        </Typography>
                        <Chip
                          label={s.keys}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            fontWeight: 700,
                            bgcolor: "background.paper",
                            borderRadius: 1.5,
                          }}
                        />
                      </Box>
                    ))
                  )}
                </Box>
              </Section>
            )}

            {filteredItems.length === 0 && filteredShortcuts.length === 0 && (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  No results found matching your search.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                  Try using different keywords or search for a specific keyboard shortcut.
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          // Standard Categorized Tab Views
          <Box>
            {activeTab === 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7, fontSize: 13.5 }}>
                  ActOne allows plain-text screenwriting using the simple industry-standard Fountain syntax. Write naturally and let ActOne format margins, dialogue alignments, and headers automatically in real-time.
                </Typography>
                <Section title="Fountain Syntax Screenwriting">
                  {HELP_ITEMS.filter((item) => item.category === "Writing & Formatting" && !item.name.toLowerCase().includes("autocomplete") && !item.name.toLowerCase().includes("spaces") && !item.name.toLowerCase().includes("search")).map((item) => (
                    <Feature key={item.name} name={item.name} desc={item.desc} />
                  ))}
                </Section>
                <Section title="Smart Writing Assistance">
                  {HELP_ITEMS.filter((item) => item.category === "Writing & Formatting" && (item.name.toLowerCase().includes("autocomplete") || item.name.toLowerCase().includes("spaces") || item.name.toLowerCase().includes("search") || item.name.toLowerCase().includes("smart quotes"))).map((item) => (
                    <Feature key={item.name} name={item.name} desc={item.desc} />
                  ))}
                </Section>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Section title="Files, Projects & Form Persistence">
                  {HELP_ITEMS.filter((item) => item.category === "Files & Projects").map((item) => (
                    <Feature key={item.name} name={item.name} desc={item.desc} />
                  ))}
                </Section>
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Section title="Workspace, Layouts & custom Views">
                  {HELP_ITEMS.filter((item) => item.category === "Workspace & Views").map((item) => (
                    <Feature key={item.name} name={item.name} desc={item.desc} />
                  ))}
                </Section>
              </Box>
            )}

            {activeTab === 3 && (
              <Box>
                <Section title="Production Breakdown, Markers & Exporting">
                  {HELP_ITEMS.filter((item) => item.category === "Review & Export").map((item) => (
                    <Feature key={item.name} name={item.name} desc={item.desc} />
                  ))}
                </Section>
              </Box>
            )}

            {activeTab === 4 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7, fontSize: 13.5 }}>
                  Customize ActOne to match your workflow. These settings control the writing environment, visual preferences, and smart assistance features.
                </Typography>
                <Section title="Settings & Configuration">
                  {HELP_ITEMS.filter((item) => item.category === "Settings & Configuration").map((item) => (
                    <Feature key={item.name} name={item.name} desc={item.desc} />
                  ))}
                </Section>
              </Box>
            )}

            {activeTab === 5 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7, fontSize: 13.5 }}>
                  Control ActOne completely with these dedicated keyboard shortcuts designed to keep your focus on writing.
                </Typography>
                {shortcuts.map((group) => (
                  <Section key={group.group} title={group.group}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {group.items.map((s, idx) => (
                        <Box
                          key={s.keys}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: 1.5,
                            borderRadius: 1,
                            bgcolor: idx % 2 === 0 ? "action.hover" : "transparent",
                          }}
                        >
                          <Typography variant="body2" sx={{ color: "text.primary", fontSize: 13 }}>
                            {s.action}
                          </Typography>
                          <Chip
                            label={s.keys}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: "background.paper",
                              borderRadius: 1.5,
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Section>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.25, justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, fontWeight: 500 }}>
            ActOne — Built for Screenwriters
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, opacity: 0.45 }}>
            &copy; 2026 P Nirmal Kasi Rajan
          </Typography>
        </Box>
        <Button
          onClick={openFountainGuide}
          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          size="small"
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Fountain Syntax Guide
        </Button>
      </DialogActions>
    </Dialog>
  );
};
