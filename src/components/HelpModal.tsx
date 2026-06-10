import React, { useState } from "react";
import { CloseIcon, OpenInNewIcon } from "./Icons";

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
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5, fontSize: 13.5 }}>
      {name}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: 13 }}>
      {desc}
    </Typography>
  </Box>
);

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
    ],
  },
  {
    group: "Workspace & Navigation",
    items: [
      { keys: "Ctrl + F", action: "Toggle the search and replace panel" },
      { keys: "Ctrl + \\", action: "Toggle the sidebar visibility" },
      { keys: "Ctrl + K", action: "Open the Command Palette" },
      { keys: "Ctrl + ,", action: "Open the Settings dialog" },
      { keys: "Ctrl + Shift + H", action: "Toggle Fountain formatting markup visibility" },
      { keys: "Ctrl + Alt + Enter", action: "Toggle Zen Mode (fullscreen, distraction-free)" },
      { keys: "Ctrl + =", action: "Zoom in on the text editor" },
      { keys: "Ctrl + -", action: "Zoom out on the text editor" },
      { keys: "Ctrl + 0", action: "Reset text editor zoom to 100%" },
    ],
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<number>(0);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>ActOne Help Manual</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} variant="scrollable" scrollButtons="auto">
          <Tab label="Writing & Editing" sx={{ fontWeight: 600, fontSize: 13 }} />
          <Tab label="Files & Projects" sx={{ fontWeight: 600, fontSize: 13 }} />
          <Tab label="Workspace & Views" sx={{ fontWeight: 600, fontSize: 13 }} />
          <Tab label="Review & Export" sx={{ fontWeight: 600, fontSize: 13 }} />
          <Tab label="Keyboard Shortcuts" sx={{ fontWeight: 600, fontSize: 13 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, height: 460, overflowY: "auto" }}>
        {activeTab === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7, fontSize: 13.5 }}>
              ActOne is designed for plain-text screenwriting using simple writing patterns. Instead of dealing with margins, indents, and dialogue alignment manually, you simply type your script naturally, and ActOne formats it in real-time according to industry standards.
            </Typography>

            <Section title="Writing Rules & Formats">
              <Feature
                name="Scene Headings"
                desc="Indicate a change of location or time of day by starting a line with INT. (Interior) or EXT. (Exterior) in all capital letters (for example: 'INT. COFFEE SHOP - DAY'). If you want to force a scene heading that doesn't start with these prefixes, start the line with a single period (for example: '.SECRET HIDEAWAY')."
              />
              <Feature
                name="Characters"
                desc="Type character names in all CAPITAL letters on their own line with an empty line before it. To force a line as a character name, start it with the '@' symbol (for example: '@McQueen')."
              />
              <Feature
                name="Dialogue"
                desc="Type dialogue paragraphs directly underneath the character name, without leaving any blank lines."
              />
              <Feature
                name="Parentheticals"
                desc="To add actor directions or delivery instructions, wrap them in parentheses on their own line between the character name and the dialogue (for example: '(whispering)')."
              />
              <Feature
                name="Action & Scene Descriptions"
                desc="Any paragraph that does not follow the scene heading, character, dialogue, or parenthetical rules is automatically formatted as an action description. You can force a line to format as action by starting it with an exclamation mark ('!')."
              />
              <Feature
                name="Transitions"
                desc="Write transition lines (like 'CUT TO:' or 'FADE OUT.') in all CAPITAL letters at the end of a line. You can force a transition line by starting it with the '>' symbol (for example: '> FADE OUT.')."
              />
              <Feature
                name="Centered Text & Lyrics"
                desc="Center lines of text by wrapping them in '>' and '<' symbols (for example: '> THE END <'). For musical lyrics, start the line with a tilde '~' (for example: '~ Sing a song')."
              />
              <Feature
                name="Page Breaks"
                desc="Force a new page in your script by typing exactly '===' on a line by itself."
              />
              <Feature
                name="Dual Dialogue"
                desc="Create side-by-side dialogue for two characters speaking simultaneously by typing a carat '^' symbol immediately following the second character's name (for example: 'BOB ^')."
              />
              <Feature
                name="Synopsis Outline Notes"
                desc="Add outline summaries by starting a line with an equals sign '='. These notes help plan your beats and remain completely invisible when you export the final script."
              />
              <Feature
                name="Outline Sections"
                desc="Organize your script structure by starting a line with one or more '#' symbols. A single '#' denotes a major section (like an Act), while '##' creates sub-levels (like sequences)."
              />
            </Section>

            <Section title="Smart Writing Assistance">
              <Feature
                name="Autocomplete Suggestions"
                desc="As you type character names and locations, ActOne shows smart autocomplete suggestions matching your existing script data. This feature can be toggled on or off in Settings."
              />
              <Feature
                name="Smart Quotes"
                desc={"Straight quotation marks (' or \") are automatically converted to curly typographic quotes (“ or ”) as you type."}
              />
              <Feature
                name="Auto-Match Parentheses"
                desc="Typing an opening parenthesis '(' automatically inserts the closing one ')' for you."
              />
              <Feature
                name="Clean Screenplay Spaces"
                desc="Consolidates spacing throughout your document. It removes unnecessary blank lines, groups outline elements and dialogue with no gaps, and cleans up spacing following Fountain syntax prefixes. Run it from the right-click menu or the Command Palette."
              />
              <Feature
                name="Search & Replace"
                desc="Press Ctrl+F to open the search bar. You can locate words, replace them individually, or replace all matches at once. Choose to make matches case-sensitive, match whole words, or use regular expressions. Select 'Preserve Case' to automatically capitalize replacements to match the original text."
              />
            </Section>

            <Section title="Text Parking Lot">
              <Feature
                name="Parking Text Selections"
                desc="If you want to cut a block of text out of your script but save it for later, highlight it in the editor, right-click, and choose 'Park Selection'. This deletes the text from the screenplay page and converts it into a card in the 'Parking' sidebar tab."
              />
              <Feature
                name="Restoring Parked Snippets"
                desc="To put parked text back into your script, place your writing cursor where you want it to go, open the 'Parking' sidebar tab, and click the text card. The snippet is pasted back at your cursor and removed from the parking list."
              />
            </Section>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Section title="File & Project Management">
              <Feature
                name="Creating New Screenplays"
                desc="Start a fresh, untitled screenplay page from the File menu or by using the Ctrl+N shortcut."
              />
              <Feature
                name="Opening Existing Scripts"
                desc="Open screenplay files in .fountain, .txt, or .actone formats via File > Open or by using Ctrl+O."
              />
              <Feature
                name="Saving Your Work"
                desc="Save your current script changes with Ctrl+S. Use Ctrl+Shift+S (Save As) to save a duplicate copy of your file with a new name or in a different directory."
              />
              <Feature
                name="Automatic Saving"
                desc="ActOne can automatically save changes to your open files at set time intervals (30 seconds, 1 minute, 2 minutes, or 5 minutes). You can toggle this feature and adjust the interval in Settings."
              />
              <Feature
                name="Recent Projects Tracker"
                desc="The Welcome Screen lists your recent projects. Click any project to open it, or click the trash icon next to a project to remove it from your recent files list."
              />
            </Section>

            <Section title="Working with Tabs">
              <Feature
                name="Multiple Document Editing"
                desc="Open several scripts at once. Each screenplay displays in a separate tab along the top header bar."
              />
              <Feature
                name="Unsaved Changes Indicator"
                desc="A solid circular dot displays on a tab to alert you that the file has unsaved changes."
              />
              <Feature
                name="Closing Tabs"
                desc="Close active script tabs by clicking the 'X' button on the tab, middle-clicking the tab, or pressing Alt+Q. ActOne will prompt you to save if there are unsaved changes."
              />
            </Section>

            <Section title="The ActOne Bundle Format (.actone)">
              <Feature
                name="What is a .actone File?"
                desc="The .actone format is a specialized project bundle format unique to ActOne. While standard plain-text .fountain files only save the raw script text, the .actone bundle packages your screenplay text together with all your workspace notepad contents, character gender assignments, task checklists, marker categories, and writing sprint histories."
              />
              <Feature
                name="Workspace Tools Persistence"
                desc="To use and save tasks, character gender assignments, notepad entries, and note markers, you must save your script as an ActOne Bundle (.actone). If you open a standard .fountain file, a warning banner will offer to save the file as a .actone bundle so you can use these tools."
              />
            </Section>
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Section title="Workspace Customization">
              <Feature
                name="Visual Themes"
                desc="Switch between 12 curated themes (6 light and 6 dark themes) in the settings dialog or the quick settings menu to customize your workspace aesthetics."
              />
              <Feature
                name="Visual Fonts"
                desc="Toggle your editor font style between 'Courier Prime' (traditional serif font standard for screenplays) and 'Courier Prime Sans' (clean, modern sans-serif) in Settings."
              />
              <Feature
                name="Zoom & Sizing"
                desc="Adjust the text editor zoom from 50% to 200% via Settings, the Command Palette, or using Ctrl+= / Ctrl+- shortcuts. You can also adjust the scale of the entire user interface (sidebars, menus, buttons) from 75% to 150% in settings."
              />
              <Feature
                name="Typewriter Mode"
                desc="Toggle Typewriter Mode in settings to keep your active writing line vertically centered on the screen. The text scrolls around your line rather than your typing cursor moving down the page."
              />
              <Feature
                name="Hide Fountain Markup"
                desc="Toggle Hide Markup to conceal plain-text formatting characters (like **bold** asterisks, _underline_ lines, or [[marker]] tags) inside the editor. This gives you a clean reading experience while leaving the raw formatting intact."
              />
              <Feature
                name="Zen Mode"
                desc="Press Alt+Enter to toggle Zen Mode. This hides the header bar, tabs, sidebar, and status labels, expanding your editor into a distraction-free fullscreen screen."
              />
            </Section>

            <Section title="Story Outline Navigator">
              <Feature
                name="Navigating Script Structure"
                desc="The Navigator panel displays a hierarchical outline of your script's acts, sequences, and scenes. Click any heading to scroll the editor to its exact line."
              />
              <Feature
                name="Visibility Filters"
                desc="Toggle outline visibility buttons to show or hide Sections, Scenes, or Synopses. This helps you examine your script's macro structure without scene clutter, or dive deep into scene synopses."
              />
              <Feature
                name="Outline custom controls"
                desc="Adjust the navigator font size (small, normal, large) in the outline menu. You can double-click section headers to collapse/expand outline branches, and navigate outline items using your keyboard (Arrow Up/Down to select, Arrow Left/Right to expand/collapse, and Enter to jump)."
              />
            </Section>

            <Section title="Workspace Tool Tabs">
              <Feature
                name="Document Notepad"
                desc="A freeform notepad sidebar tab to brainstorm characters, scribble beat sheets, draft outline ideas, or outline scene goals. Your notes persist inside the .actone bundle."
              />
              <Feature
                name="Character Tracking"
                desc="Automatically scans your script to list characters and count their dialogue lines. You can assign genders (Male, Female, Non-Binary, Unknown) to characters. Search character names using the filter input."
              />
              <Feature
                name="To-Do Task Manager"
                desc="Add tasks to plan your screenplay revisions. Check off completed items to move them to a collapsible completed list at the bottom of the tasks pane, or delete tasks entirely."
              />
              <Feature
                name="Writing Sprint Timer"
                desc="Set writing sprints from 1 to 60 minutes. Sprints track countdown time, show progress visual circles, and log your net word count gains. View previous sprint sessions in History, or check out your top writing sessions on the Leaderboard."
              />
            </Section>
          </Box>
        )}

        {activeTab === 3 && (
          <Box>
            <Section title="Production Breakdown & Tagging">
              <Feature
                name="Tagging Elements"
                desc="Tag production details without cluttering your script text. Highlight any word or phrase in the editor, right-click, select 'Tag', and assign it to one of the 15 production categories: Cast (Character), Prop, VFX, SFX, Camera, Animal, Extras, Vehicle, Costume, Makeup, Music, Sound, Stunt, Set Design, or Other."
              />
              <Feature
                name="Managing Tag Definitions"
                desc="Open the 'Breakdown' sidebar tab to view tagged elements categorized in accordions. Each card displays tag occurrences in scenes. Click an occurrence to scroll to its editor position. You can delete definitions or merge redundant entries into a single target definition (for example: merging 'John D.' into 'John Doe')."
              />
            </Section>

            <Section title="Custom Markers & Notes">
              <Feature
                name="Creating Notes"
                desc="Insert inline notes directly inside double brackets, using the color syntax: '[[marker color: description]]'. For example: '[[marker red: Fix action description]]'. The 11 supported colors are: blue, brown, cyan, green, magenta, none (defaults to orange), orange, pink, purple, red, and yellow. You can also type hex color codes (for example: '[[marker #ff00ff: edit note]]')."
              />
              <Feature
                name="Marker Sidebar Inspector"
                desc="View notes in the 'Markers' sidebar tab. Click color chips to filter markers by color category, or type search terms. Click any marker card to scroll the editor to its exact line."
              />
              <Feature
                name="Scene Coloring"
                desc="Type '[[color name]]' (for example: '[[color blue]]') following a scene heading. This colors that scene in the Outline Navigator, helping you map story beats visually."
              />
            </Section>

            <Section title="Revision Tracking Mode">
              <Feature
                name="Starting Revisions"
                desc="Activate Revision Mode in the Command Palette. ActOne captures a snapshot of your script as a base draft. The app header displays a red 'Revision' badge."
              />
              <Feature
                name="Reviewing Diffs & Changes"
                desc="Open the revision reviewer to see changes. Additions highlight in green, deletions highlight in red with strikethroughs, and modified lines display detailed word-level diffs."
              />
              <Feature
                name="Accepting & Rejecting Edits"
                desc="Review each edit in the revision list, which lists scene context. Select 'Accept' to save changes to the base draft, or 'Reject' (or 'Restore') to revert edits. You can also select 'Merge All' to approve all changes and exit revision mode, or 'Discard All' to revert entirely."
              />
            </Section>

            <Section title="Story Structure Templates">
              <Feature
                name="Importing Outline Outlines"
                desc="Open the Structure Template modal to select classic beat structures (Three-Act, Save the Cat, Hero's Journey, etc.). Read structural beat details, and choose to: Insert beats at your cursor, Append to the end of the script, or Overwrite the document."
              />
            </Section>

            <Section title="Title Page Builder">
              <Feature
                name="Structured Title Pages"
                desc="Open the Title Page modal to edit metadata. Use the Form View to modify structured fields (Title, Author, Credit, Source, Contact, Draft Date). Use the Fountain View to edit the raw Fountain title page syntax block. The two views synchronize automatically."
              />
            </Section>

            <Section title="Screenplay Exporting">
              <Feature
                name="PDF Export"
                desc="Print standard PDFs of your script. Customize options including scene numbers (off, left, or mirrored on both sides), bold headings, export fonts (Courier Prime vs Courier Prime Sans), title page inclusion, and outline elements (sections/synopses)."
              />
              <Feature
                name="Fountain Export"
                desc="Export a clean, standard Fountain plain-text file. ActOne automatically strips out all app-specific notes, markers, tag databases, and formatting colors, leaving you with a clean screenplay file ready to share."
              />
            </Section>
          </Box>
        )}

        {activeTab === 4 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7, fontSize: 13.5 }}>
              Use these verified keyboard shortcuts to navigate ActOne and format your screenplay without moving your hands from the keyboard.
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
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, px: 3, justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11.5, fontWeight: 500 }}>
          ActOne — Screenwriting Made Simple
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
