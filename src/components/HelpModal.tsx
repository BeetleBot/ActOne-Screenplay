import React, { useState, useMemo, useCallback } from "react";
import { useUI } from "../context";
import { CloseIcon, SearchIcon, ClearIcon, OpenInNewIcon } from "./Icons";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: React.ReactNode;
  tags: string[];
  relatedIds: string[];
}

const KBD: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      px: 0.6, py: 0.15, mx: 0.2,
      fontSize: "11px", fontWeight: 700,
      fontFamily: "monospace",
      bgcolor: "action.selected",
      border: "1px solid",
      borderColor: "divider",
      borderRadius: "4px",
      lineHeight: 1.5,
      verticalAlign: "middle",
    }}
  >
    {children}
  </Box>
);

const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography component="code" variant="body2" sx={{ fontFamily: "Courier Prime, monospace", fontSize: "12px", bgcolor: "action.hover", px: 0.5, borderRadius: "3px" }}>
    {children}
  </Typography>
);

const articles: HelpArticle[] = [
  // ===== GETTING STARTED =====
  {
    id: "welcome-screen",
    title: "Welcome Screen",
    category: "Getting Started",
    tags: ["welcome", "launch", "start"],
    relatedIds: ["new-screenplay", "open-file", "recent-files"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
          When you launch ActOne with no files open, the Welcome screen appears. From here you can:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>New Project</b> — Create a blank untitled screenplay</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Open Project</b> — Browse for a .fountain, .txt, or .actone file</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Templates</b> — Import a screenplay structure template (Three-Act, Save the Cat, etc.)</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Recent Projects</b> — Quick-open recently used files (up to 10). Click the X to remove from the list.</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
          The footer also includes a theme switcher and a Help button. Writing quotes from famous screenwriters rotate randomly at the top.
        </Typography>
      </Box>
    ),
  },
  {
    id: "new-screenplay",
    title: "Creating a New Screenplay",
    category: "Getting Started",
    tags: ["new", "create", "untitled"],
    relatedIds: ["welcome-screen", "open-file", "file-tabs"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Press <KBD>Ctrl+N</KBD> or open the Command Palette (<KBD>Ctrl+K</KBD>) and choose "New Screenplay" to create a new untitled tab. You can have multiple tabs open simultaneously.
        </Typography>
      </Box>
    ),
  },
  {
    id: "open-file",
    title: "Opening Files",
    category: "Getting Started",
    tags: ["open", "file", "fountain", "actone", "txt"],
    relatedIds: ["welcome-screen", "new-screenplay", "file-tabs", "recent-files"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Press <KBD>Ctrl+O</KBD> or use the Command Palette <KBD>Ctrl+K</KBD> → "Open Screenplay…" to open .fountain, .txt, or .actone files via the native file dialog.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
          When launched from the command line, ActOne accepts file paths as arguments. The app also listens for OS-level file-open events (e.g. double-clicking a .fountain file).
        </Typography>
      </Box>
    ),
  },
  {
    id: "recent-files",
    title: "Recent Files",
    category: "Getting Started",
    tags: ["recent", "history", "quick open"],
    relatedIds: ["open-file", "welcome-screen"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Welcome screen shows your most recently opened files (up to 10) as clickable chips. Click one to re-open it. Hover and click the X to remove an entry from the list. Recent files are stored in your browser's localStorage.
        </Typography>
      </Box>
    ),
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts Reference",
    category: "Getting Started",
    tags: ["shortcuts", "keys", "hotkeys", "keyboard"],
    relatedIds: ["command-palette"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
          ActOne is designed for keyboard-driven writing. Below is the complete list of shortcuts.
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>File Operations</Typography>
          {[
            ["Ctrl+N", "New screenplay tab"],
            ["Ctrl+O", "Open file"],
            ["Ctrl+S", "Save"],
            ["Ctrl+Shift+S", "Save as"],
            ["Alt+Q", "Close active tab"],
            ["Ctrl+P", "Export dialog"],
            ["Ctrl+Tab / Ctrl+PageDown", "Next tab"],
            ["Ctrl+Shift+Tab / Ctrl+PageUp", "Previous tab"],
          ].map(([keys, action]) => (
            <Box key={keys} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.4, px: 1, borderRadius: 1, "&:nth-of-type(odd)": { bgcolor: "action.hover" } }}>
              <Typography variant="body2" sx={{ fontSize: 12.5 }}>{action}</Typography>
              <Chip label={keys} size="small" variant="outlined" sx={{ fontFamily: "monospace", fontSize: 10.5, fontWeight: 700, borderRadius: 1.5 }} />
            </Box>
          ))}
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>Editing & Formatting</Typography>
          {[
            ["Ctrl+Z", "Undo"],
            ["Ctrl+Y", "Redo"],
            ["Ctrl+X", "Cut"],
            ["Ctrl+C", "Copy"],
            ["Ctrl+V", "Paste"],
            ["Ctrl+A", "Select all"],
            ["Ctrl+B", "Bold (**)"],
            ["Ctrl+I", "Italic (*)"],
            ["Ctrl+U", "Underline (_)"],
            ["Shift+Alt+C", "Clean screenplay spaces"],
            ["Tab", "Cycle line prefixes (@ → . → > → normal)"],
          ].map(([keys, action]) => (
            <Box key={keys} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.4, px: 1, borderRadius: 1, "&:nth-of-type(odd)": { bgcolor: "action.hover" } }}>
              <Typography variant="body2" sx={{ fontSize: 12.5 }}>{action}</Typography>
              <Chip label={keys} size="small" variant="outlined" sx={{ fontFamily: "monospace", fontSize: 10.5, fontWeight: 700, borderRadius: 1.5 }} />
            </Box>
          ))}
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>View & Navigation</Typography>
          {[
            ["Ctrl+F", "Toggle search panel"],
            ["Ctrl+\\", "Toggle sidebar"],
            ["Ctrl+K / Ctrl+Shift+P", "Command palette"],
            ["Ctrl+,", "Settings"],
            ["Ctrl+Alt+Enter", "Toggle Zen Mode"],
            ["Escape", "Focus editor"],
            ["Ctrl+=", "Zoom in"],
            ["Ctrl+-", "Zoom out"],
            ["Ctrl+0", "Reset zoom"],
          ].map(([keys, action]) => (
            <Box key={keys} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.4, px: 1, borderRadius: 1, "&:nth-of-type(odd)": { bgcolor: "action.hover" } }}>
              <Typography variant="body2" sx={{ fontSize: 12.5 }}>{action}</Typography>
              <Chip label={keys} size="small" variant="outlined" sx={{ fontFamily: "monospace", fontSize: 10.5, fontWeight: 700, borderRadius: 1.5 }} />
            </Box>
          ))}
        </Box>
      </Box>
    ),
  },
  {
    id: "command-palette",
    title: "Command Palette",
    category: "Getting Started",
    tags: ["commands", "palette", "ctrl+k", "search"],
    relatedIds: ["keyboard-shortcuts"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Press <KBD>Ctrl+K</KBD> or <KBD>Ctrl+Shift+P</KBD> to open the Command Palette. Type to filter over 30 commands across File, Edit, View, Format, Settings, and Help categories. Each command shows its keyboard shortcut when available. Navigate with arrow keys and press Enter to execute. Press Escape to close.
        </Typography>
      </Box>
    ),
  },

  // ===== FOUNTAIN SYNTAX =====
  {
    id: "scene-headings",
    title: "Scene Headings / Sluglines",
    category: "Fountain Syntax",
    tags: ["scene heading", "slugline", "int", "ext", "interior", "exterior"],
    relatedIds: ["character-names", "action", "sections"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Scene headings indicate time and location changes. Start a line with <Mono>INT</Mono>, <Mono>EXT</Mono>, <Mono>INT/EXT</Mono>, or <Mono>I/E</Mono> followed by a location and time of day separated by a dash.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Example: <Mono>INT. WRITING STUDIO - DAY</Mono>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          To force any line to be a scene heading (even if it doesn't start with a standard prefix), begin the line with a period: <Mono>.SECRET HIDEOUT</Mono>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Use the Command Palette to auto-renumber all scene headings or clear scene numbers.
        </Typography>
      </Box>
    ),
  },
  {
    id: "character-names",
    title: "Character Names",
    category: "Fountain Syntax",
    tags: ["character", "@", "name", "all caps"],
    relatedIds: ["dialogue", "parentheticals", "character-tracker"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Introduce a character by typing their name in ALL CAPS on a line preceded by a blank line. Names with lowercase letters can be forced with the <Mono>@</Mono> prefix: <Mono>@McQueen</Mono>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          ActOne automatically recognizes character lines and formats the following text as dialogue. Character names are tracked in the Character Tracker sidebar.
        </Typography>
      </Box>
    ),
  },
  {
    id: "dialogue",
    title: "Dialogue",
    category: "Fountain Syntax",
    tags: ["dialogue", "speech", "speaking"],
    relatedIds: ["character-names", "parentheticals", "dual-dialogue"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Place dialogue text directly underneath a character name line, with no blank lines between them. Dialogue automatically gets the correct screenplay indentation.
        </Typography>
      </Box>
    ),
  },
  {
    id: "parentheticals",
    title: "Parentheticals (Wrylies)",
    category: "Fountain Syntax",
    tags: ["parenthetical", "wryly", "delivery", "parentheses"],
    relatedIds: ["character-names", "dialogue"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Add actor directions by wrapping text in parentheses on a line between the character name and dialogue: <Mono>(whispering)</Mono>
        </Typography>
      </Box>
    ),
  },
  {
    id: "action",
    title: "Action & Scene Descriptions",
    category: "Fountain Syntax",
    tags: ["action", "description", "!", "exclamation"],
    relatedIds: ["scene-headings", "transitions"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Write action in standard mixed-case paragraphs. Any line that doesn't trigger another Fountain rule is treated as action. Force a line as action by starting it with <Mono>!</Mono>: <Mono>!He exits through the window.</Mono>
        </Typography>
      </Box>
    ),
  },
  {
    id: "transitions",
    title: "Transitions",
    category: "Fountain Syntax",
    tags: ["transition", "cut to", "fade in", ">", "TO"],
    relatedIds: ["action"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Write transitions like <Mono>CUT TO:</Mono> or <Mono>FADE OUT.</Mono> in ALL CAPS. Force a transition on any line by starting with <Mono>&gt;</Mono>: <Mono>&gt; FADE IN:</Mono>
        </Typography>
      </Box>
    ),
  },
  {
    id: "centered-lyrics",
    title: "Centered Text & Lyrics",
    category: "Fountain Syntax",
    tags: ["centered", "lyrics", "~", "> <", "music"],
    relatedIds: ["action"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Center text by wrapping it in <Mono>&gt;</Mono> and <Mono>&lt;</Mono>: <Mono>&gt; THE END &lt;</Mono>. Start a line with <Mono>~</Mono> for lyrics: <Mono>~ Sing a song</Mono>
        </Typography>
      </Box>
    ),
  },
  {
    id: "page-breaks",
    title: "Page Breaks",
    category: "Fountain Syntax",
    tags: ["page break", "===", "new page"],
    relatedIds: ["export-pdf"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Force a page break in PDF exports by typing exactly <Mono>===</Mono> on a line by itself. The editor shows a visual page break indicator.
        </Typography>
      </Box>
    ),
  },
  {
    id: "dual-dialogue",
    title: "Dual Dialogue",
    category: "Fountain Syntax",
    tags: ["dual dialogue", "^", "simultaneous", "side by side"],
    relatedIds: ["dialogue", "character-names"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Create side-by-side dialogue by appending <Mono>^</Mono> (carat) to the second character's name: <Mono>BOB ^</Mono>. Both characters' dialogue renders in parallel columns.
        </Typography>
      </Box>
    ),
  },
  {
    id: "synopsis",
    title: "Synopsis Outline Notes",
    category: "Fountain Syntax",
    tags: ["synopsis", "=", "outline", "notes", "invisible"],
    relatedIds: ["sections", "outline-navigator"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Add outline summaries by starting a line with <Mono>=</Mono>: <Mono>= Introduce the villain</Mono>. Synopsis lines appear in the Outline Navigator and are invisible in exported PDFs (unless toggled on).
        </Typography>
      </Box>
    ),
  },
  {
    id: "sections",
    title: "Sections & Hierarchy",
    category: "Fountain Syntax",
    tags: ["section", "#", "act", "sequence", "header"],
    relatedIds: ["synopsis", "outline-navigator"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Organize your script with Markdown-like headers. Use <Mono>#</Mono> for major blocks (e.g., <Mono># Act I</Mono>), <Mono>##</Mono> for sequences, and <Mono>###</Mono> for sub-sequences. These structure the Outline Navigator hierarchy with collapsible sections.
        </Typography>
      </Box>
    ),
  },
  {
    id: "inline-formatting",
    title: "Inline Text Formatting",
    category: "Fountain Syntax",
    tags: ["bold", "italic", "underline", "**", "format"],
    relatedIds: ["transform-case"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Select text and use <KBD>Ctrl+B</KBD> for bold (<Mono>**text**</Mono>), <KBD>Ctrl+I</KBD> for italic (<Mono>*text*</Mono>), <KBD>Ctrl+U</KBD> for underline (<Mono>_text_</Mono>). Press the same shortcut again to remove formatting. Also accessible via right-click → Format.
        </Typography>
      </Box>
    ),
  },
  {
    id: "boneyard-comments",
    title: "Boneyard Comments",
    category: "Fountain Syntax",
    tags: ["boneyard", "comments", "/*", "hidden"],
    relatedIds: ["notes-markers"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Wrap text in <Mono>/*</Mono> and <Mono>*/</Mono> to create boneyard comments — sections that are completely ignored by the parser and invisible in exports. Useful for hiding alternate lines or notes.
        </Typography>
      </Box>
    ),
  },

  // ===== WRITING TOOLS =====
  {
    id: "tab-cycle",
    title: "Tab-to-Cycle Line Prefixes",
    category: "Writing Tools",
    tags: ["tab", "prefix", "@", ".", ">", "cycle"],
    relatedIds: ["character-names", "scene-headings", "transitions"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Press <KBD>Tab</KBD> at the start of a line to cycle through Fountain prefixes: <Mono>@</Mono> (forced character) → <Mono>.</Mono> (forced heading) → <Mono>&gt;</Mono> (forced transition) → back to normal. Each press advances to the next in the cycle.
        </Typography>
      </Box>
    ),
  },
  {
    id: "smart-newline",
    title: "Smart Newline Handling",
    category: "Writing Tools",
    tags: ["enter", "newline", "spacing", "auto spacing"],
    relatedIds: ["tab-cycle"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          When you press <KBD>Enter</KBD> after a scene heading, character name, parenthetical, dialogue, or transition, ActOne automatically inserts the correct blank line spacing required by Fountain syntax. No need to manually add blank lines.
        </Typography>
      </Box>
    ),
  },
  {
    id: "autocomplete",
    title: "Autocomplete",
    category: "Writing Tools",
    tags: ["autocomplete", "suggestions", "character", "location"],
    relatedIds: ["smart-quotes", "smart-newline"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          ActOne suggests character names and scene locations as you type, based on existing content in your script. Suggestions appear in a dropdown. Toggle this feature in Settings → Editor → Character/Scene Autocomplete.
        </Typography>
      </Box>
    ),
  },
  {
    id: "smart-quotes",
    title: "Smart Quotes",
    category: "Writing Tools",
    tags: ["smart quotes", "curly quotes", "quotes", "typography"],
    relatedIds: ["autocomplete", "auto-parentheses"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Straight quotation marks (<Mono>"</Mono> and <Mono>'</Mono>) are automatically converted to smart curly quotes as you type. Toggle in Settings → Editor → Smart Quotes.
        </Typography>
      </Box>
    ),
  },
  {
    id: "auto-parentheses",
    title: "Auto-Match Parentheses",
    category: "Writing Tools",
    tags: ["parentheses", "auto", "match"],
    relatedIds: ["smart-quotes"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Typing <Mono>(</Mono> automatically inserts the matching <Mono>)</Mono>. Toggle in Settings → Editor → Auto-Match Parentheses.
        </Typography>
      </Box>
    ),
  },
  {
    id: "typewriter-mode",
    title: "Typewriter Mode",
    category: "Writing Tools",
    tags: ["typewriter", "scroll", "center cursor"],
    relatedIds: ["hide-syntax", "editor-zoom"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Keeps your active editing line vertically centered on screen. As you type, the page scrolls around your line instead of your cursor moving down. Toggle via Quick Settings in the Activity Bar, the Command Palette, or Settings.
        </Typography>
      </Box>
    ),
  },
  {
    id: "hide-syntax",
    title: "Hide Fountain Markup",
    category: "Writing Tools",
    tags: ["hide syntax", "clean view", "reading view", "prefixes"],
    relatedIds: ["typewriter-mode", "zen-mode"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Toggle "Hide Fountain Markup" via Command Palette or Quick Settings to hide syntax prefixes (<Mono>.</Mono>, <Mono>@</Mono>, <Mono>!</Mono>, <Mono>&gt;</Mono>, <Mono>~</Mono>, <Mono>#</Mono>, <Mono>=</Mono>) from view on non-active lines. The active line still shows prefixes so you can edit. Gives a clean manuscript-like reading experience.
        </Typography>
      </Box>
    ),
  },
  {
    id: "editor-zoom",
    title: "Editor Zoom",
    category: "Writing Tools",
    tags: ["zoom", "font size", "ctrl+=", "ctrl+-"],
    relatedIds: ["typewriter-mode", "interface-scale"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Zoom the editor text from 50% to 300% using <KBD>Ctrl+=</KBD> (zoom in), <KBD>Ctrl+-</KBD> (zoom out), and <KBD>Ctrl+0</KBD> (reset to 100%). Also adjustable via Quick Settings slider or in Settings → Editor → Editor Zoom.
        </Typography>
      </Box>
    ),
  },
  {
    id: "clean-spaces",
    title: "Clean Screenplay Spaces",
    category: "Writing Tools",
    tags: ["clean spaces", "formatting", "blank lines", "Shift+Alt+C"],
    relatedIds: ["smart-newline", "transform-case"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Press <KBD>Shift+Alt+C</KBD> or use the Command Palette → "Clean Spaces" to normalize your screenplay formatting. Removes redundant blank lines, groups outline elements, and establishes proper 1-blank-line hierarchy between standard Fountain elements.
        </Typography>
      </Box>
    ),
  },
  {
    id: "transform-case",
    title: "Transform Case",
    category: "Writing Tools",
    tags: ["uppercase", "lowercase", "title case", "case"],
    relatedIds: ["clean-spaces", "inline-formatting"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Right-click a selection and choose Transform Case to convert between UPPERCASE, Title Case, or lowercase. Useful for normalizing character names and scene headings.
        </Typography>
      </Box>
    ),
  },
  {
    id: "look-up",
    title: "Look Up Word",
    category: "Writing Tools",
    tags: ["look up", "google", "search", "research"],
    relatedIds: ["context-menu"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Right-click any selected word and choose "Look Up" to search it on Google in your default browser. Quick for researching terms, names, or locations without leaving ActOne.
        </Typography>
      </Box>
    ),
  },
  {
    id: "search-replace",
    title: "Search & Replace",
    category: "Writing Tools",
    tags: ["search", "replace", "ctrl+f", "regex", "preserve case"],
    relatedIds: ["look-up"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Press <KBD>Ctrl+F</KBD> to open the floating search panel. Features include:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary">Case-sensitive toggle (<Mono>Aa</Mono>)</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Whole-word toggle (<Mono>ab</Mono>)</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Regex toggle (<Mono>.*</Mono>)</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Match counter (<Mono>n/m</Mono>) with prev/next navigation</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Replace Next / Replace All</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Preserve Case</b> — automatically adjusts replacement to match source case (ALL CAPS, Title Case, lowercase)</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
          The panel is draggable — grab the header to reposition it anywhere in the editor.
        </Typography>
      </Box>
    ),
  },
  {
    id: "scene-numbers",
    title: "Scene Numbers",
    category: "Writing Tools",
    tags: ["scene numbers", "renumber", "#", "clear"],
    relatedIds: ["scene-headings", "export-pdf"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Command Palette provides two scene number commands:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>Renumber Scene Headings</b> — Appends sequential <Mono>#1#</Mono>, <Mono>#2#</Mono>, etc. to every scene heading</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Clear Scene Numbers</b> — Removes all <Mono>#N#</Mono> markers from scene headings</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
          Scene numbers display in the editor margins and in the Outline Navigator badges. PDF export can include them on the left or mirrored on both sides.
        </Typography>
      </Box>
    ),
  },

  // ===== WORKSPACE & VIEWS =====
  {
    id: "activity-bar",
    title: "Activity Bar",
    category: "Workspace & Views",
    tags: ["activity bar", "sidebar", "tabs", "icons"],
    relatedIds: ["outline-navigator", "sidebar-panels", "zen-mode"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Activity Bar on the left side of the window provides access to all sidebar panels. Click an icon to open that view; click again to close the sidebar. An active indicator bar shows which panel is open.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Tabs available: <b>Outline</b>, <b>Scripts</b>, <b>Characters</b>, <b>Statistics</b>, <b>Notepad</b>, <b>Markers</b>, <b>Tasks</b>, <b>Sprint</b>, <b>Parking</b>. Tabs marked with * require the file to be saved as a .actone bundle.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          The bottom of the Activity Bar has a <b>Command Palette</b> button and a <b>Quick Settings</b> button with sliders for Interface Scale, Editor Zoom, Typewriter Mode, Hide Syntax, Theme switching, and Paper Size.
        </Typography>
      </Box>
    ),
  },
  {
    id: "outline-navigator",
    title: "Outline Navigator",
    category: "Workspace & Views",
    tags: ["outline", "navigator", "sidebar", "tree", "hierarchy"],
    relatedIds: ["sections", "synopsis", "scene-reorder", "activity-bar"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Outline sidebar (first tab) displays a hierarchical tree of your sections (<Mono>#</Mono>), scenes (headings), and synopses (<Mono>=</Mono>). Features:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary">Click an item to scroll the editor to that line</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Collapsible section headers — click the arrow or double-click to expand/collapse</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Keyboard navigation: <KBD>↑</KBD><KBD>↓</KBD> to move, <KBD>←</KBD><KBD>→</KBD> to collapse/expand, <KBD>Enter</KBD> to jump to line</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Search/filter field to find items by name</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Visibility toggles: show/hide Sections, Scenes, and Synopses</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Font size: Small / Normal / Large (persisted)</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Scene color dots, scene number badges, and storyline chips</Typography></li>
        </ul>
      </Box>
    ),
  },
  {
    id: "sidebar-panels",
    title: "Sidebar Panels Overview",
    category: "Workspace & Views",
    tags: ["sidebar", "panels", "workspace", "bundle"],
    relatedIds: ["activity-bar", "outline-navigator", "actone-bundle"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          ActOne provides several sidebar panels to support your writing workflow. Most panels require the file to be saved as a <b>.actone bundle</b> (they are read-only or show a conversion banner for plain .fountain files).
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Available panels: Outline, Scripts, Characters, Statistics, Notepad, Markers, Tasks, Sprint, Parking. Each has its own article in this guide.
        </Typography>
      </Box>
    ),
  },
  {
    id: "notepad",
    title: "Document Notepad",
    category: "Workspace & Views",
    tags: ["notepad", "notes", "brainstorm", "outline"],
    relatedIds: ["sidebar-panels", "actone-bundle"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          A freeform text area in the sidebar for jotting down outline notes, beat sheets, character ideas, or draft goals. Content persists inside .actone bundles. Plain .fountain files show a banner prompting conversion.
        </Typography>
      </Box>
    ),
  },
  {
    id: "character-tracker",
    title: "Character Tracker & Gender Analyzer",
    category: "Workspace & Views",
    tags: ["characters", "gender", "tracker", "dialogue counts"],
    relatedIds: ["sidebar-panels", "statistics"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Characters panel scans your script and lists every character name with their dialogue line count, sorted by frequency. Features:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary">Filter characters by name with the search field</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Set gender by clicking the colored pill — cycles through Unknown → Male → Female → Non-Binary</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Keyboard navigation: <KBD>↑</KBD><KBD>↓</KBD> to move between characters</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Gender data feeds into the Statistics dashboard's "Dialogue by Gender" chart</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
          Requires .actone bundle to persist gender assignments.
        </Typography>
      </Box>
    ),
  },
  {
    id: "statistics",
    title: "Statistics Dashboard",
    category: "Workspace & Views",
    tags: ["stats", "statistics", "word count", "pages", "locations"],
    relatedIds: ["character-tracker", "sidebar-panels"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Statistics panel shows a live dashboard of your screenplay metrics:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>Stat Cards</b>: Estimated pages, total words, scene count, line count</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Dialogue vs Action</b>: Visual percentage bar of total word distribution</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Dialogue by Gender</b>: Bar chart broken down by character gender (requires gender assignments)</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Top Locations</b>: Most-used shooting locations parsed from scene headings</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
          The Status Bar also shows estimated page count based on the built-in pagination engine.
        </Typography>
      </Box>
    ),
  },
  {
    id: "tasks",
    title: "To-Do Tasks",
    category: "Workspace & Views",
    tags: ["tasks", "todo", "checklist", "revisions"],
    relatedIds: ["sidebar-panels", "sprint-timer"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Tasks panel helps you track screenplay revisions and to-do items:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary">Type a task and press <KBD>Enter</KBD> to add it</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Click the checkbox to mark complete (moves to collapsible "Completed" list)</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Keyboard navigation: <KBD>↑</KBD><KBD>↓</KBD> to select, <KBD>Enter</KBD>/<KBD>Space</KBD> to toggle, <KBD>Delete</KBD>/<KBD>Backspace</KBD> to remove</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Right-click selected text in the editor → <b>Create Task</b> to add it as a new task</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
          Persists in .actone bundles.
        </Typography>
      </Box>
    ),
  },
  {
    id: "sprint-timer",
    title: "Writing Sprint Timer",
    category: "Workspace & Views",
    tags: ["sprint", "timer", "writing", "wpm", "countdown"],
    relatedIds: ["tasks", "sidebar-panels", "statistics"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Sprint panel provides a countdown writing timer to boost productivity:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary">Preset durations: 5, 15, 25, 45, 60 minutes — or set custom 1-999 minutes</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Circular progress indicator with remaining time displayed</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Real-time word count gain (net from sprint start) and live WPM calculation</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Status bar shows active sprint with remaining time and WPM</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>History</b> tab: all completed sprints with word count, duration, WPM, date, and file. Delete individual or clear all.</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Leaderboard</b> tab: top 10 sprints ranked by word count with Gold/Silver/Bronze badges</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Stats</b>: Personal Best WPM and Total Words Sprinted</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
          Sprint data syncs to .actone bundles and localStorage.
        </Typography>
      </Box>
    ),
  },
  {
    id: "parking",
    title: "Text Parking",
    category: "Workspace & Views",
    tags: ["parking", "clipboard", "text storage", "temporary"],
    relatedIds: ["sidebar-panels", "context-menu"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Parking panel works as a temporary clipboard for storing text snippets:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary">Select text in the editor and click "Park Selection" to store it</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Click a parked card to re-insert at cursor and auto-remove it</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Right-click → <b>Park Selection</b> stores text and deletes it from the editor (cut)</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Keyboard navigation: <KBD>↑</KBD><KBD>↓</KBD> to select, <KBD>Enter</KBD> to insert</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Individual delete button on each card</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
          Persists in .actone bundles.
        </Typography>
      </Box>
    ),
  },
  {
    id: "markers-list",
    title: "Markers List",
    category: "Workspace & Views",
    tags: ["markers", "notes", "inline", "filter"],
    relatedIds: ["notes-markers", "sidebar-panels"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Markers sidebar shows all <Mono>[[marker ...]]</Mono> notes from your script. Features:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary">Filter by text search</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Filter by color chip</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Shows scene context and scene number for each marker</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Click a marker to scroll the editor to its position</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Keyboard navigation: <KBD>↑</KBD><KBD>↓</KBD>, <KBD>Enter</KBD> to jump</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Marker count display at the top</Typography></li>
        </ul>
      </Box>
    ),
  },
  {
    id: "scripts-manager",
    title: "Scripts Manager (Multi-Script Bundles)",
    category: "Workspace & Views",
    tags: ["scripts", "multi-script", "bundle", "manage"],
    relatedIds: ["actone-bundle", "sidebar-panels", "export"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Scripts sidebar lets you manage multiple Fountain scripts inside a single .actone bundle:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>Add</b> new scripts, <b>rename</b> them (inline edit), or <b>delete</b> them (with confirmation)</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Drag-and-drop</b> to reorder scripts in the bundle</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Click a script name to load it into the editor</Typography></li>
          <li><Typography variant="body2" color="text.secondary">The Status Bar shows the active script name — click it to quickly switch</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Export All</b> exports every script in the bundle as separate files (PDF, Fountain, or FDX)</Typography></li>
        </ul>
      </Box>
    ),
  },
  {
    id: "zen-mode",
    title: "Zen Mode (Distraction-Free)",
    category: "Workspace & Views",
    tags: ["zen mode", "fullscreen", "distraction free", "focus"],
    relatedIds: ["activity-bar", "hide-syntax", "typewriter-mode"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Press <KBD>Ctrl+Alt+Enter</KBD> to toggle Zen Mode. This hides the header bar, sidebars, and status bar, expanding your editor into a distraction-free fullscreen view. Uses Tauri fullscreen API with HTML5 Fullscreen API as fallback outside Tauri. Zoom still works with <KBD>Ctrl+=</KBD> and <KBD>Ctrl+-</KBD>.
        </Typography>
      </Box>
    ),
  },
  {
    id: "context-menu",
    title: "Editor Context Menu",
    category: "Workspace & Views",
    tags: ["right click", "context menu", "menu"],
    relatedIds: ["scene-highlighting", "production-breakdown", "transform-case", "parking"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Right-click anywhere in the editor for quick access to a rich context menu:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>Selection Stats</b>: Word and character count of selection</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Cut/Copy/Paste</b>: Standard clipboard operations</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Tag</b>: 14 production categories (Cast, Prop, VFX, SFX, Camera, Animal, Extras, Vehicle, Costume, Makeup, Music, Sound, Stunt, Set Design, Other)</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Remove Tag</b>: Removes tag from current cursor position</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Highlight Scene</b>: 7 colors + Clear — color-codes a scene heading</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Drop Marker</b>: 11 colors — inserts <Mono>[[marker color: description]]</Mono> at cursor</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Format</b>: Bold, Italic, Underline, Clean Spaces</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Transform Case</b>: UPPERCASE, Title Case, lowercase</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Look Up Word</b>: Google search selection</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Create Task</b>: Adds selected text as a to-do item</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Park Selection</b>: Stores selection to Parking sidebar (cuts from editor)</Typography></li>
        </ul>
      </Box>
    ),
  },
  {
    id: "status-bar",
    title: "Status Bar",
    category: "Workspace & Views",
    tags: ["status bar", "info", "stats", "mode"],
    relatedIds: ["statistics", "sprint-timer", "scripts-manager"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Status Bar at the bottom of the window shows:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>Script Name</b> — clickable to switch scripts in multi-script bundles</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Line Count</b> — total lines in the current script</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Word Count</b> — total words in the current script</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Estimated Page Count</b> — calculated by the built-in pagination engine</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Active Sprint</b> — when a sprint is running, shows time remaining and live WPM</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>View Mode</b> — toggle between Editor and other views</Typography></li>
        </ul>
      </Box>
    ),
  },
  {
    id: "file-tabs",
    title: "File Tabs",
    category: "Workspace & Views",
    tags: ["tabs", "files", "multi-tab", "close"],
    relatedIds: ["open-file", "new-screenplay", "scripts-manager"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Open multiple scripts simultaneously in tabs. Features:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>Dirty indicator</b>: a circular dot appears when unsaved changes exist</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Close with <KBD>Alt+Q</KBD>, click the X, or middle-click the tab header</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Right-click a tab for Close / Close Others / Close All</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Scroll horizontally through tabs using the mouse wheel on the tab bar</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Navigate: <KBD>Ctrl+Tab</KBD> / <KBD>Ctrl+PageDown</KBD> (next), <KBD>Ctrl+Shift+Tab</KBD> / <KBD>Ctrl+PageUp</KBD> (previous)</Typography></li>
        </ul>
      </Box>
    ),
  },

  // ===== PRODUCTION FEATURES =====
  {
    id: "scene-highlighting",
    title: "Scene Highlighting (Color Coding)",
    category: "Production Features",
    tags: ["highlight", "color", "scene", "color code"],
    relatedIds: ["production-breakdown", "notes-markers", "outline-navigator"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Right-click a scene heading and choose <b>Highlight Scene</b> → pick a color (Red, Orange, Yellow, Green, Blue, Purple, Pink) or <b>Clear Highlight</b> to remove it. Color is stored as <Mono>[[color name]]</Mono> on the scene heading line.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Highlighted scenes show a colored left border in the editor, a colored dot in the Outline Navigator, and are exported as color-tagged elements in FDX format.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          You can also use hex codes directly: <Mono>[[#ff0000]]</Mono>
        </Typography>
      </Box>
    ),
  },
  {
    id: "production-breakdown",
    title: "Production Breakdown & Tagging",
    category: "Production Features",
    tags: ["breakdown", "tag", "props", "cast", "vfx", "production"],
    relatedIds: ["scene-highlighting", "notes-markers", "context-menu"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Tag production elements directly in your script without cluttering the text. Select text, right-click → <b>Tag</b>, and choose a category:
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
          Cast, Prop, VFX, SFX, Camera, Animal, Extras, Vehicle, Costume, Makeup, Music, Sound, Stunt, Set Design, Other
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Open the <b>Production Breakdown</b> modal (Command Palette → "Show Production Breakdown...") to view all tags grouped by category. Each tag shows occurrence count and scene locations — click to jump to that line. Merge redundant tags into one definition, or delete tags entirely.
        </Typography>
      </Box>
    ),
  },
  {
    id: "notes-markers",
    title: "Color Markers & Notes",
    category: "Production Features",
    tags: ["markers", "notes", "[[ ]]", "inline comments", "color"],
    relatedIds: ["markers-list", "production-breakdown"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Insert inline notes anywhere using double-bracket syntax: <Mono>[[marker color: description]]</Mono>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Example: <Mono>[[marker red: Fix description here]]</Mono>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Supported colors: blue, brown, cyan, green, magenta, orange (default), pink, purple, red, yellow, none. Hex codes also work: <Mono>[[marker #ff6600: Note]]</Mono>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Use the right-click menu → <b>Drop Marker</b> to insert markers without remembering syntax. View and filter all markers in the Markers sidebar. Markers are visible in the editor but stripped from Fountain exports.
        </Typography>
      </Box>
    ),
  },
  {
    id: "storylines",
    title: "Storyline Tags",
    category: "Production Features",
    tags: ["storyline", "plot", "tag", "arc"],
    relatedIds: ["scene-highlighting", "outline-navigator"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Tag scene headings with storyline labels using <Mono>[[storyline Label]]</Mono> syntax. Multiple storylines are comma-separated: <Mono>[[storyline Plot A, Romance]]</Mono>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Storyline labels appear as small chips in the Outline Navigator, helping you visually track multiple plot threads (e.g., A-Plot, B-Plot, Character Arc).
        </Typography>
      </Box>
    ),
  },
  {
    id: "structure-templates",
    title: "Structure Templates",
    category: "Production Features",
    tags: ["template", "structure", "three act", "save the cat", "beat sheet"],
    relatedIds: ["production-breakdown", "sections"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Open the Command Palette → "Import Structure Template" to browse and insert predefined screenplay structures. 8 built-in templates:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary">Three-Act Structure</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Save the Cat</Typography></li>
          <li><Typography variant="body2" color="text.secondary">The Hero's Journey</Typography></li>
          <li><Typography variant="body2" color="text.secondary">The Story Circle</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Freytag's Pyramid</Typography></li>
          <li><Typography variant="body2" color="text.secondary">John Truby's 7 Key Steps</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Michael Hauge's 6 Stage Journey</Typography></li>
          <li><Typography variant="body2" color="text.secondary">The Sequence Approach</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          The import modal shows a preview of beats. Choose insertion mode: <b>Insert at Cursor</b>, <b>Append to End</b>, or <b>Overwrite</b> (with confirmation). Templates insert as <Mono># Section</Mono> and <Mono>= Beat synopsis</Mono> lines.
        </Typography>
      </Box>
    ),
  },
  {
    id: "scene-reorder",
    title: "Scene Drag-and-Drop Reordering",
    category: "Production Features",
    tags: ["reorder", "drag", "drop", "scene", "outline"],
    relatedIds: ["outline-navigator", "structure-templates"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          In the Outline Navigator, drag scenes by the grab handle (six-dot icon) to reorder them. A visual ghost follows your cursor and an insertion indicator line shows where the scene will land. The editor text updates automatically to reflect the new scene order.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          This uses <Mono>reorderScenes()</Mono> which manipulates the raw Fountain text and re-parses — so all formatting is preserved.
        </Typography>
      </Box>
    ),
  },

  // ===== FILES & PROJECTS =====
  {
    id: "actone-bundle",
    title: "ActOne Bundle Format (.actone)",
    category: "Files & Projects",
    tags: ["actone", "bundle", "zip", "portable"],
    relatedIds: ["scripts-manager", "sidebar-panels", "save"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The <b>.actone</b> format is a specialized project bundle unique to ActOne. While standard .fountain files only save raw script text, .actone bundles package everything together:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary">All script files (Fountain text)</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Notepad contents</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Character gender assignments</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Task checklists</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Marker categories</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Sprint session history</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Production tags</Typography></li>
          <li><Typography variant="body2" color="text.secondary">Parked text snippets</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          <b>Extremely portable</b>: rename any .actone file to .zip and extract it to find your screenplay as a plain .fountain file alongside all data as readable JSON files.
        </Typography>
      </Box>
    ),
  },
  {
    id: "save",
    title: "Saving Files",
    category: "Files & Projects",
    tags: ["save", "save as", "ctrl+s", "autosave"],
    relatedIds: ["actone-bundle", "file-tabs", "auto-save"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          <KBD>Ctrl+S</KBD> saves the active file. For .actone bundles, this zips all scripts and settings. For plain .fountain files, it writes the Fountain text directly.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          <KBD>Ctrl+Shift+S</KBD> opens the native Save As dialog. You can save as .actone (recommended for full features) or .fountain.
        </Typography>
      </Box>
    ),
  },
  {
    id: "title-page-editor",
    title: "Title Page Editor",
    category: "Files & Projects",
    tags: ["title page", "cover", "author", "draft date"],
    relatedIds: ["export-pdf", "actone-bundle"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Open the Command Palette → "Edit Title Page" to set your screenplay's metadata. Two views:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>Form View</b>: Fields for Title, Author, Credit, Source, Contact, Draft Date</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Fountain View</b>: Raw Fountain title page syntax for advanced editing</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Changes sync bidirectionally between views. The title page appears in PDF exports.
        </Typography>
      </Box>
    ),
  },

  // ===== EXPORT =====
  {
    id: "export-overview",
    title: "Export Overview",
    category: "Export",
    tags: ["export", "pdf", "fountain", "fdx", "print"],
    relatedIds: ["export-pdf", "export-fountain", "export-fdx"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Press <KBD>Ctrl+P</KBD> or open the Command Palette → "Export..." to open the Export dialog. ActOne supports three export formats, each with configurable options.
        </Typography>
      </Box>
    ),
  },
  {
    id: "export-pdf",
    title: "PDF Export",
    category: "Export",
    tags: ["pdf", "print", "export"],
    relatedIds: ["export-overview", "export-fountain", "theme-manager"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Export your screenplay as a professionally formatted PDF. Options:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>Include Title Page</b></Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Bold Scene Headings</b></Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Scene Numbers</b>: Off, Left Side Only, or Mirror on Both Sides</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Font</b>: Courier Prime or Courier Prime Sans</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Include Sections</b> (outline headers)</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Include Synopsis</b> (outline notes)</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Paper Size</b>: US Letter or A4 (from settings)</Typography></li>
        </ul>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          PDF rendering uses the krilla and cosmic-text Rust engine for high-quality output with proper screenplay formatting, dialogue indentation, dual dialogue, and page breaks.
        </Typography>
      </Box>
    ),
  },
  {
    id: "export-fountain",
    title: "Fountain Export",
    category: "Export",
    tags: ["fountain", "export", "plain text"],
    relatedIds: ["export-overview", "actone-bundle"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Exports a clean .fountain file with all app-specific tags (markers, color tags, storyline tags, ActOne settings block) stripped. Options for including/excluding sections, synopses, and title page.
        </Typography>
      </Box>
    ),
  },
  {
    id: "export-fdx",
    title: "FDX (Final Draft) Export",
    category: "Export",
    tags: ["fdx", "final draft", "fade in", "compatibility"],
    relatedIds: ["export-overview"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Export your screenplay as Final Draft XML (.fdx) for compatibility with Final Draft, Fade In, and other professional screenwriting applications. Scene colors and structure are preserved.
        </Typography>
      </Box>
    ),
  },
  {
    id: "export-all",
    title: "Export All Scripts",
    category: "Export",
    tags: ["export", "batch", "all scripts", "bundle"],
    relatedIds: ["scripts-manager", "export-overview"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          In the Scripts sidebar, the "Export All" button exports every script in the bundle at once. Same format options as single export (PDF, Fountain, FDX). In Tauri, uses native save dialogs; in the browser, uses download links.
        </Typography>
      </Box>
    ),
  },

  // ===== SETTINGS & CUSTOMIZATION =====
  {
    id: "settings-overview",
    title: "Settings Overview",
    category: "Settings & Customization",
    tags: ["settings", "ctrl+,", "configuration"],
    relatedIds: ["theme-manager", "auto-save", "font-paper"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Press <KBD>Ctrl+,</KBD> or use the Command Palette → "Open Settings..." to open the Settings dialog. Two tabs: <b>General</b> and <b>Editor</b>. Quick Settings are also available from the Activity Bar gear icon.
        </Typography>
      </Box>
    ),
  },
  {
    id: "theme-manager",
    title: "Theme Manager & Custom Themes",
    category: "Settings & Customization",
    tags: ["theme", "colors", "dark", "light", "custom"],
    relatedIds: ["settings-overview", "font-paper"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          ActOne ships with 6 built-in themes: <b>Light</b>, <b>Dark</b>, <b>Warm Sepia</b>, <b>Matrix Charcoal</b>, <b>Pitch Black</b>, and <b>Pitch White</b>.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          <b>Create your own</b> via Settings → Theme Manager. Pick 5 core colors (Accent, Button, Text, Sidebar, Editor), choose Dark/Light mode, and see a live preview of a mini screenplay. 5 preset starting points: Noir, Ocean, Sunset, Forest, Lavender. Custom themes persist in localStorage.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Quick-switch themes from the Activity Bar's Quick Settings menu or the Welcome screen footer.
        </Typography>
      </Box>
    ),
  },
  {
    id: "font-paper",
    title: "Font & Paper Settings",
    category: "Settings & Customization",
    tags: ["font", "courier prime", "paper", "letter", "a4"],
    relatedIds: ["settings-overview", "export-pdf"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          In Settings, choose between <b>Courier Prime</b> (standard screenplay monospace) and <b>Courier Prime Sans</b>. Switch paper size between <b>US Letter</b> and <b>A4</b> — this affects PDF export formatting and editor page width.
        </Typography>
      </Box>
    ),
  },
  {
    id: "interface-scale",
    title: "Interface Scale",
    category: "Settings & Customization",
    tags: ["scale", "ui size", "zoom", "dpi"],
    relatedIds: ["settings-overview", "editor-zoom"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Adjust the entire UI from 75% to 150% in 5% increments via the Quick Settings slider or Settings → Interface Scale. All dialogs and modals respect this scaling so they never overflow on small screens.
        </Typography>
      </Box>
    ),
  },
  {
    id: "auto-save",
    title: "Auto-Save",
    category: "Settings & Customization",
    tags: ["autosave", "save", "interval"],
    relatedIds: ["save", "settings-overview"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Toggle auto-save in Settings and choose an interval: 30 seconds, 1 minute, 2 minutes, or 5 minutes. ActOne automatically saves changes to your active file at the chosen interval.
        </Typography>
      </Box>
    ),
  },
  {
    id: "editor-settings",
    title: "Editor Preferences",
    category: "Settings & Customization",
    tags: ["editor", "preferences", "autocomplete", "quotes", "parentheses"],
    relatedIds: ["settings-overview", "autocomplete", "smart-quotes", "auto-parentheses", "typewriter-mode", "hide-syntax"],
    content: (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          The Editor tab in Settings controls:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 2 }}>
          <li><Typography variant="body2" color="text.secondary"><b>Font Style</b>: Courier Prime or Courier Prime Sans</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Editor Zoom</b>: 50%–200% slider</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Typewriter Mode</b>: Keep active line centered</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Autocomplete</b>: Character names and locations</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Smart Quotes</b>: Auto-convert to curly quotes</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Auto-Match Parentheses</b>: Auto-insert closing <Mono>)</Mono></Typography></li>
          <li><Typography variant="body2" color="text.secondary"><b>Hide Fountain Markup</b>: Clean reading view</Typography></li>
        </ul>
      </Box>
    ),
  },
];

const categories = [
  "Getting Started",
  "Fountain Syntax",
  "Writing Tools",
  "Workspace & Views",
  "Production Features",
  "Files & Projects",
  "Export",
  "Settings & Customization",
];

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

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const { appScale } = useUI();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Getting Started");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("welcome-screen");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories));

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const selectedArticle = useMemo(
    () => (searchQuery ? filteredArticles[0] : articles.find((a) => a.id === selectedArticleId)) || articles[0],
    [searchQuery, selectedArticleId, filteredArticles]
  );

  const relatedArticles = useMemo(
    () => (selectedArticle ? articles.filter((a) => selectedArticle.relatedIds.includes(a.id)) : []),
    [selectedArticle]
  );

  const handleSelectArticle = useCallback((id: string) => {
    setSelectedArticleId(id);
    const article = articles.find((a) => a.id === id);
    if (article) setSelectedCategory(article.category);
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    setSearchQuery(tag);
  }, []);

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      disableScrollLock
      sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '10px', height: '80vh', maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: "nowrap", fontSize: 15 }}>ActOne Help Wiki</Typography>
        <TextField
          size="small"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1, maxWidth: 400,
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px", height: 32, fontSize: "0.8rem",
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
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery("")} sx={{ color: "text.secondary", p: "2px" }}>
                    <ClearIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", overflow: "hidden", height: "100%" }}>
        {/* Wiki Sidebar */}
        <Box sx={{
          width: 220, flexShrink: 0, borderRight: 1, borderColor: "divider",
          overflowY: "auto", bgcolor: "action.hover",
        }}>
          {searchQuery ? (
            <Box sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, display: "block" }}>
                Results ({filteredArticles.length})
              </Typography>
              {filteredArticles.map((a) => (
                <Box
                  key={a.id}
                  onClick={() => { setSelectedArticleId(a.id); setSearchQuery(""); }}
                  sx={{
                    px: 1, py: 0.6, borderRadius: 1, cursor: "pointer", fontSize: 12.5,
                    bgcolor: selectedArticleId === a.id ? "action.selected" : "transparent",
                    color: selectedArticleId === a.id ? "primary.main" : "text.primary",
                    fontWeight: selectedArticleId === a.id ? 600 : 400,
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                >
                  {a.title}
                  <Typography variant="caption" sx={{ display: "block", fontSize: 10, color: "text.secondary", mt: 0.2 }}>
                    {a.category}
                  </Typography>
                </Box>
              ))}
              {filteredArticles.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", fontSize: 12, py: 2, textAlign: "center" }}>
                  No matching articles found.
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ py: 1 }}>
              {categories.map((cat) => {
                const count = articles.filter((a) => a.category === cat).length;
                const isExpanded = expandedCategories.has(cat);
                const isSelected = selectedCategory === cat;
                return (
                  <Box key={cat}>
                    <Box
                      onClick={() => { setSelectedCategory(cat); toggleCategory(cat); }}
                      sx={{
                        px: 1.5, py: 0.7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                        bgcolor: isSelected ? "action.selected" : "transparent",
                        color: isSelected ? "primary.main" : "text.primary",
                        fontWeight: isSelected ? 700 : 600,
                        fontSize: 11.5, letterSpacing: "0.02em",
                        "&:hover": { bgcolor: "action.selected" },
                        borderLeft: isSelected ? "3px solid" : "3px solid transparent",
                        borderColor: isSelected ? "primary.main" : "transparent",
                      }}
                    >
                      {cat}
                      <Typography variant="caption" sx={{ fontSize: 10, opacity: 0.5 }}>{count}</Typography>
                    </Box>
                    {isExpanded && isSelected && (
                      <Box sx={{ ml: 0.5 }}>
                        {articles.filter((a) => a.category === cat).map((a) => (
                          <Box
                            key={a.id}
                            onClick={() => handleSelectArticle(a.id)}
                            sx={{
                              px: 2, py: 0.4, cursor: "pointer", fontSize: 12,
                              fontWeight: selectedArticleId === a.id ? 600 : 400,
                              color: selectedArticleId === a.id ? "primary.main" : "text.secondary",
                              bgcolor: selectedArticleId === a.id ? "action.hover" : "transparent",
                              borderLeft: selectedArticleId === a.id ? "2px solid" : "2px solid transparent",
                              borderColor: selectedArticleId === a.id ? "primary.main" : "transparent",
                              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                            }}
                          >
                            {a.title}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Article Detail */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5 }}>
          {selectedArticle && (
            <Box>
              <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "primary.main", mb: 0.5, display: "block" }}>
                {selectedArticle.category}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18, mb: 2 }}>
                {selectedArticle.title}
              </Typography>
              <Box sx={{ mb: 2, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {selectedArticle.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={() => handleTagClick(tag)}
                    sx={{
                      fontSize: 10.5, fontWeight: 600, cursor: "pointer", borderRadius: "6px",
                      bgcolor: "action.hover", "&:hover": { bgcolor: "action.selected" },
                    }}
                  />
                ))}
              </Box>
              <Box sx={{ lineHeight: 1.7 }}>
                {selectedArticle.content}
              </Box>

              {relatedArticles.length > 0 && (
                <Box sx={{ mt: 4, pt: 2.5, borderTop: 1, borderColor: "divider" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 12, mb: 1.5, color: "text.secondary" }}>
                    Related Articles
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {relatedArticles.map((rel) => (
                      <Box
                        key={rel.id}
                        onClick={() => handleSelectArticle(rel.id)}
                        sx={{
                          px: 1.5, py: 0.8, borderRadius: 1, cursor: "pointer",
                          bgcolor: "action.hover", "&:hover": { bgcolor: "action.selected" },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12.5, color: "primary.main" }}>
                          {rel.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                          {rel.category}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <Box sx={{ borderTop: 1, borderColor: "divider", px: 2.5, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5, fontWeight: 500 }}>
          ActOne v{__APP_VERSION__} &copy; 2026 Write Up Film Service Company
        </Typography>
        <Button onClick={openFountainGuide} endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />} size="small" sx={{ textTransform: "none", fontWeight: 600, fontSize: 12 }}>
          Fountain Syntax Guide
        </Button>
      </Box>
    </Dialog>
  );
};