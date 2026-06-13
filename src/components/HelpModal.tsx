import React, { useState } from "react";
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
  } catch {
    window.open(url, "_blank");
  }
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ mb: 4 }}>
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
  <Box sx={{ mb: 2.5 }}>
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
  // Writing Assistance
  {
    name: "Autocomplete Suggestions",
    desc: "ActOne autocompletes character names and scene locations automatically based on existing script items. Autocomplete suggestions can be toggled in Settings.",
    category: "Writing & Formatting",
    keywords: ["autocomplete", "suggestions", "character autocomplete", "location autocomplete", "settings"]
  },
  {
    name: "Smart Quotes & Auto-Parentheses",
    desc: "As you type, straight quotation marks (' and \") are converted to smart curly quotes (“ and ”). Typing an opening parenthesis '(' automatically inserts the matching closing one ')'.",
    category: "Writing & Formatting",
    keywords: ["smart quotes", "auto parentheses", "curly quotes", "quotes", "parentheses"]
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
  // File & Project
  {
    name: "ActOne Bundle Format (.actone)",
    desc: "The .actone format is a specialized project bundle format unique to ActOne. Standard .fountain files only save the raw script text. The .actone bundle packages your screenplay text together with all your workspace notepad contents, character gender assignments, task checklists, marker categories, and writing sprint histories. Save as a .actone bundle to unlock these sidebar panels.",
    category: "Files & Projects",
    keywords: ["actone bundle", ".actone", "workspace tool persistence", "save as actone", "notepad contents", "gender assignments"]
  },
  {
    name: "Automatic Saving",
    desc: "ActOne can automatically save changes to your active files at customizable intervals (30s, 1m, 2m, 5m). Toggle autosave and set the interval in Settings.",
    category: "Files & Projects",
    keywords: ["automatic saving", "autosave", "settings", "interval"]
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
  // Workspace & Views
  {
    name: "Zen Mode (Distraction-Free)",
    desc: "Press Alt+Enter to toggle Zen Mode. This hides the header bar, tabs, sidebars, and the status bar, expanding your editor into a distraction-free fullscreen screen. Zoom the editor view from 50% to 200% with Ctrl+= and Ctrl+-.",
    category: "Workspace & Views",
    keywords: ["zen mode", "fullscreen", "distraction free", "alt+enter", "zoom", "ctrl+=", "ctrl+-"]
  },
  {
    name: "Typewriter Mode",
    desc: "Toggle Typewriter Mode in Settings to keep your active writing line vertically centered on the screen. The text scrolls around your line rather than your typing cursor moving down the page.",
    category: "Workspace & Views",
    keywords: ["typewriter mode", "scroll active line", "center cursor"]
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
    name: "Custom Color Markers & Notes",
    desc: "Insert inline notes directly inside double brackets, using the syntax: '[[marker color: description]]' (e.g. '[[marker red: Fix description]]'). Supports 11 colors (blue, brown, cyan, green, magenta, orange, pink, purple, red, yellow, none) and hex codes. View, search, and filter notes by color in the Markers sidebar.",
    category: "Review & Export",
    keywords: ["markers", "notes", "brackets", "color notes", "inline comments", "marker filters"]
  },

  {
    name: "PDF & Fountain Exporting",
    desc: "Print standard PDFs of your script with customizable options (scene numbers on left/right/mirrored, bold headings, font choices, title page inclusion, and outline elements). You can also export a clean, standard Fountain plain-text file with all app-specific tags and markup stripped.",
    category: "Review & Export",
    keywords: ["export", "pdf", "fountain export", "print screenplay", "scene numbers", "print options"]
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
    ],
  },
  {
    group: "Writing & Formatting",
    items: [
      { keys: "Ctrl + Z", action: "Undo last change" },
      { keys: "Ctrl + Y", action: "Redo last change" },
      { keys: "Ctrl + X", action: "Cut highlighted text" },
      { keys: "Ctrl + C", action: "Copy highlighted text" },
      { keys: "Ctrl + V", action: "Paste text from clipboard" },
      { keys: "Ctrl + B", action: "Format selection as bold (**)" },
      { keys: "Ctrl + I", action: "Format selection as italic (*)" },
      { keys: "Ctrl + U", action: "Format selection as underline (_)" },
      { keys: "Shift + Alt + C", action: "Clean screenplay spaces and consolidate formatting" },
    ],
  },
  {
    group: "Workspace & Navigation",
    items: [
      { keys: "Ctrl + F", action: "Toggle the search and replace panel" },
      { keys: "Ctrl + \\", action: "Toggle the sidebar visibility" },
      { keys: "Ctrl + K", action: "Open the Command Palette" },
      { keys: "Ctrl + ,", action: "Open the Settings dialog" },
      { keys: "Alt + Enter", action: "Toggle Zen Mode (fullscreen, distraction-free)" },
      { keys: "Ctrl + Tab / Ctrl + PageDown", action: "Switch to the next document tab" },
      { keys: "Ctrl + Shift + Tab / Ctrl + PageUp", action: "Switch to the previous document tab" },
      { keys: "Escape", action: "Move cursor focus back to the editor" },
      { keys: "Ctrl + =", action: "Zoom in on the text editor" },
      { keys: "Ctrl + -", action: "Zoom out on the text editor" },
      { keys: "Ctrl + 0", action: "Reset text editor zoom to 100%" },
    ],
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
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
    <Dialog open onClose={onClose} fullWidth maxWidth="md" disableScrollLock>
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>ActOne Help Manual</Typography>
        
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
              height: 36,
              fontSize: "0.85rem",
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
            <Tab label="Keyboard Shortcuts" sx={{ fontWeight: 600, fontSize: 13 }} />
          </Tabs>
        </Box>
      )}

      <DialogContent sx={{ p: 3, height: 460, overflowY: "auto" }}>
        {searchQuery ? (
          // Search Results View
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3, fontWeight: 600 }}>
              Search Results for &ldquo;{searchQuery}&rdquo; ({filteredItems.length} articles, {filteredShortcuts.reduce((acc, g) => acc + g.items.length, 0)} shortcuts found)
            </Typography>
            
            {filteredItems.length > 0 && (
              <Section title="Matching Help Articles">
                {filteredItems.map((item, idx) => (
                  <Feature key={idx} name={item.name} desc={item.desc} />
                ))}
              </Section>
            )}

            {filteredShortcuts.length > 0 && (
              <Section title="Matching Keyboard Shortcuts">
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {filteredShortcuts.map((group) =>
                    group.items.map((s, i) => (
                      <Box
                        key={`${group.group}-${i}`}
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
                  {HELP_ITEMS.filter((item) => item.category === "Writing & Formatting" && !item.name.toLowerCase().includes("autocomplete") && !item.name.toLowerCase().includes("spaces") && !item.name.toLowerCase().includes("search")).map((item, idx) => (
                    <Feature key={idx} name={item.name} desc={item.desc} />
                  ))}
                </Section>
                <Section title="Smart Writing Assistance">
                  {HELP_ITEMS.filter((item) => item.category === "Writing & Formatting" && (item.name.toLowerCase().includes("autocomplete") || item.name.toLowerCase().includes("spaces") || item.name.toLowerCase().includes("search") || item.name.toLowerCase().includes("smart quotes"))).map((item, idx) => (
                    <Feature key={idx} name={item.name} desc={item.desc} />
                  ))}
                </Section>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Section title="Files, Projects & Form Persistence">
                  {HELP_ITEMS.filter((item) => item.category === "Files & Projects").map((item, idx) => (
                    <Feature key={idx} name={item.name} desc={item.desc} />
                  ))}
                </Section>
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Section title="Workspace, Layouts & custom Views">
                  {HELP_ITEMS.filter((item) => item.category === "Workspace & Views").map((item, idx) => (
                    <Feature key={idx} name={item.name} desc={item.desc} />
                  ))}
                </Section>
              </Box>
            )}

            {activeTab === 3 && (
              <Box>
                <Section title="Production Breakdown, Markers & Exporting">
                  {HELP_ITEMS.filter((item) => item.category === "Review & Export").map((item, idx) => (
                    <Feature key={idx} name={item.name} desc={item.desc} />
                  ))}
                </Section>
              </Box>
            )}

            {activeTab === 4 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7, fontSize: 13.5 }}>
                  Control ActOne completely with these dedicated keyboard shortcuts designed to keep your focus on writing.
                </Typography>
                {shortcuts.map((group) => (
                  <Section key={group.group} title={group.group}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {group.items.map((s, i) => (
                        <Box
                          key={i}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: 1.5,
                            borderRadius: 1,
                            bgcolor: i % 2 === 0 ? "action.hover" : "transparent",
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

      <DialogActions sx={{ p: 2, px: 3, justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11.5, fontWeight: 500 }}>
          ActOne — Built for Screenwriters
        </Typography>
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
