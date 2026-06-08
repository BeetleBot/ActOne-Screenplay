import React, { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
  <Box sx={{ mb: 3 }}>
    <Typography
      variant="overline"
      sx={{
        fontWeight: 700,
        color: "primary.main",
        letterSpacing: "0.05em",
        display: "block",
        mb: 1.5,
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const Feature: React.FC<{ name: string; desc: string }> = ({ name, desc }) => (
  <Box sx={{ display: "flex", gap: 1, mb: 1, fontSize: 13, lineHeight: 1.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 140, color: "text.primary" }}>
      {name}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {desc}
    </Typography>
  </Box>
);

const shortcutGroups = [
  {
    group: "File Operations",
    shortcuts: [
      { keys: "Ctrl + N", action: "New screenplay" },
      { keys: "Ctrl + O", action: "Open a screenplay file" },
      { keys: "Ctrl + S", action: "Save current file" },
      { keys: "Ctrl + Shift + S", action: "Save as a new file" },
      { keys: "Ctrl + W / Alt + Q", action: "Close current file tab" },
      { keys: "Ctrl + Tab", action: "Switch to next open file" },
      { keys: "Ctrl + Shift + Tab", action: "Switch to previous open file" },
      { keys: "Ctrl + P", action: "Open export dialog (PDF / Fountain)" },
    ],
  },
  {
    group: "Editing",
    shortcuts: [
      { keys: "Ctrl + Z", action: "Undo last change" },
      { keys: "Ctrl + Y", action: "Redo last change" },
      { keys: "Ctrl + X", action: "Cut selected text" },
      { keys: "Ctrl + C", action: "Copy selected text" },
      { keys: "Ctrl + V", action: "Paste from clipboard" },
      { keys: "Ctrl + F", action: "Open search panel" },
    ],
  },
  {
    group: "Text Formatting",
    shortcuts: [
      { keys: "Ctrl + B", action: "Bold (wraps selection in **)" },
      { keys: "Ctrl + I", action: "Italic (wraps selection in *)" },
      { keys: "Ctrl + U", action: "Underline (wraps selection in _)" },
    ],
  },
  {
    group: "View & Navigation",
    shortcuts: [
      { keys: "Ctrl + \\", action: "Toggle sidebar visibility" },
      { keys: "Ctrl + K", action: "Open command palette" },
      { keys: "Ctrl + ,", action: "Open settings" },
      { keys: "Ctrl + Shift + H", action: "Toggle hide Fountain markup" },
      { keys: "Alt + Enter", action: "Toggle zen mode (fullscreen)" },
      { keys: "Ctrl + =", action: "Zoom in" },
      { keys: "Ctrl + -", action: "Zoom out" },
      { keys: "Ctrl + 0", action: "Reset zoom to 100%" },
    ],
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<number>(0);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Help Guide</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} variant="scrollable" scrollButtons="auto">
          <Tab label="Writing & Editing" />
          <Tab label="Files & Projects" />
          <Tab label="Workspace & Views" />
          <Tab label="Review & Export" />
          <Tab label="Keyboard Shortcuts" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, height: 400, overflowY: "auto" }}>
        {activeTab === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              ActOne uses the Fountain file format — a plain-text markup language for screenwriting.
              You write your script in plain text, and Fountain's simple rules automatically
              recognize scene headings, character names, dialogue, and more.
            </Typography>

            <Section title="Fountain Basics">
              <Feature name="Scene Heading" desc='Start a line with INT, EXT, INT/EXT, or similar followed by a location and time of day (e.g., "INT. COFFEE SHOP - DAY").' />
              <Feature name="Character Name" desc="Type a character name in ALL CAPS above their dialogue. Leave a blank line before it." />
              <Feature name="Dialogue" desc="Place directly below a character name. Keep it flowing naturally." />
              <Feature name="Parenthetical" desc="A short instruction in parentheses, placed between character name and dialogue." />
              <Feature name="Action / Description" desc="Any paragraph that isn't recognized as another element becomes action text." />
              <Feature name="Transition" desc="End a line with TO: or use ALL CAPS (e.g., CUT TO:, FADE OUT.)." />
              <Feature name="Title Page" desc="Start your file with key: value pairs (e.g., Title: My Screenplay). Separate the title page from the script with a blank line." />
              <Feature name="Lyrics / Centered" desc="Start a line with ~ for centered text or @ for lyrics." />
              <Feature name="Page Break" desc="Insert === on its own line to force a page break." />
              <Feature name="Dual Dialogue" desc="Place a ^ character between two dialogue blocks to have characters speak simultaneously." />
              <Feature name="Synopsis" desc="Start a line with = to add a synopsis note (invisible in exports)." />
              <Feature name="Section" desc="Start a line with # to create a section heading for organizing your outline." />
            </Section>

            <Section title="Text Formatting">
              <Feature name="Bold" desc="Wrap text in **double asterisks** or press Ctrl+B." />
              <Feature name="Italic" desc="Wrap text in *single asterisks* or press Ctrl+I." />
              <Feature name="Underline" desc="Wrap text in _underscores_ or press Ctrl+U." />
            </Section>

            <Section title="Editing Features">
              <Feature name="Search & Replace" desc="Press Ctrl+F to open the search panel. Toggle the replace section to find and replace text. Supports case-sensitive, whole-word, and regex matching." />
              <Feature name="Preserve Case" desc="When replacing text, toggle the preserve case option to automatically match ALL CAPS, Title Case, or lowercase of the original text." />
              <Feature name="Autocomplete" desc="As you type character names or scene locations, ActOne suggests matches from your script. Enable/disable in Settings." />
              <Feature name="Smart Quotes" desc="Straight quotation marks are automatically converted to curly typographic quotes as you type." />
              <Feature name="Auto-Match Parentheses" desc="Opening a parenthesis automatically inserts the closing one." />
              <Feature name="Undo / Redo" desc="Standard undo (Ctrl+Z) and redo (Ctrl+Y) support for your editing session." />
            </Section>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Section title="File Management">
              <Feature name="Create New File" desc="Start a fresh screenplay from the File menu or press Ctrl+N. An untitled tab opens ready for writing." />
              <Feature name="Open Files" desc="Open .fountain, .txt, or .actone files via File > Open or Ctrl+O. Supports both the Tauri file dialog and browser file picker." />
              <Feature name="Save" desc="Save your work with Ctrl+S. If the file hasn't been saved yet, you'll be prompted to choose a location." />
              <Feature name="Save As" desc="Save a copy of your script in .fountain or .actone format via File > Save As or Ctrl+Shift+S." />
              <Feature name="Recent Files" desc="Quickly reopen recently worked-on files. The last 10 files are remembered and accessible from the recent files list." />
              <Feature name="Auto-Save" desc="ActOne can automatically save your work at a set interval (30s, 1m, 2m, or 5m). Configure in Settings." />
            </Section>

            <Section title="Working with Tabs">
              <Feature name="Multiple Files" desc="Open several scripts at once. Each file appears as a tab in the editor bar." />
              <Feature name="Tab Navigation" desc="Switch between open files by clicking their tabs, or use Ctrl+Tab / Ctrl+Shift+Tab to cycle through them." />
              <Feature name="Close Tabs" desc="Close the current file with Ctrl+W or Alt+Q. Click the X on a tab, or middle-click any tab to close it. Unsaved changes will prompt for confirmation." />
              <Feature name="Dirty Indicator" desc="A filled circle on a tab means the file has unsaved changes." />
            </Section>

            <Section title=".actone Bundle Format">
              <Feature name="What is .actone?" desc="The .actone format is a ZIP bundle that contains your Fountain script along with document settings, character data, and revision history — all in one file." />
              <Feature name="Why use it?" desc="Saving as .actone preserves your sidebar notes, character gender assignments, revision history, and other document-specific settings that a plain .fountain file cannot store." />
              <Feature name="How to save" desc='Choose "Save As" and select the .actone format. Open .actone files just like any other file.' />
            </Section>
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Section title="Editor Modes">
              <Feature name="Editor View" desc="The default view — a paginated, paper-like editor where you write your screenplay using Fountain syntax." />
              <Feature name="Index Cards View" desc="Switch to a visual index card layout showing each scene as a card. Drag cards to reorder scenes, double-click to jump to that scene in the editor." />
              <Feature name="Zen Mode" desc="Fullscreen, distraction-free writing. Press Alt+Enter to toggle. Hides the menu bar, sidebar, and tabs." />
              <Feature name="Typewriter Mode" desc="Keeps the line you're editing vertically centered on screen — the text scrolls around you rather than the cursor moving down the page." />
              <Feature name="Hide Fountain Markup" desc="Hides formatting markers (like **bold** and *italic*) inside the editor for a cleaner reading experience." />
            </Section>

            <Section title="Sidebar Tools">
              <Feature name="Outline / Navigator" desc="A hierarchical view of your script's structure. Shows sections, scene headings, and synopses. Click any item to jump to that location. Filter by keywords, toggle which elements to show." />
              <Feature name="Drag & Drop Reorder" desc="Drag scenes up and down in the outline to rearrange them. The editor updates automatically." />
              <Feature name="Notepad" desc="A free-form text area for brainstorming, beat sheets, or production notes. Saved inside .actone bundles." />
              <Feature name="Characters" desc="Automatically extracts all character names from your script. Assign genders for dialogue statistics. Filter to find specific characters." />
              <Feature name="Statistics" desc="Live script stats: estimated page count, word count, scene count, dialogue vs. action ratio, gender dialogue split, and most-used locations." />
            </Section>

            <Section title="Visual Customization">
              <Feature name="Themes" desc="Choose from 12 carefully designed themes — 6 light and 6 dark. Access via View > Change Theme or the toolbar settings menu." />
              <Feature name="Font" desc="Switch between Courier Prime (serif, standard for screenplays) and Courier Prime Sans. Set in Settings." />
              <Feature name="Paper Size" desc="Toggle between US Letter and A4. Affects page layout, preview rendering, and PDF export." />
              <Feature name="Zoom" desc="Adjust the editor zoom from 50% to 200%. Use Ctrl+= / Ctrl+- / Ctrl+0 or the settings slider." />
            </Section>
          </Box>
        )}

        {activeTab === 3 && (
          <Box>
            <Section title="Exporting Your Script">
              <Feature name="Export to PDF" desc="Generate a professional, paginated PDF of your screenplay. Configure scene numbers, bold headings, paper size, font, and more." />
              <Feature name="Export to Fountain" desc="Export a clean .fountain file with all ActOne-specific metadata stripped — ready to share or open in other Fountain-compatible tools." />
            </Section>

            <Section title="Export Options">
              <Feature name="Scene Numbers" desc="Choose to disable scene numbers, show them on the left side, or mirror them on both sides (industry standard for production)." />
              <Feature name="Bold Scene Headings" desc="Optionally render all scene headings in bold within the PDF." />
              <Feature name="Include Title Page" desc="Choose whether to include your title page in the exported PDF." />
              <Feature name="Sections & Synopses" desc="Optionally keep or strip # section headings and = synopsis lines from the export." />
              <Feature name="Clean Export" desc="When exporting to Fountain, ActOne automatically strips its internal comment blocks, marker tags, and color/storyline tags for a clean standard-format file." />
            </Section>

            <Section title="Title Page Editor">
              <Feature name="Form View" desc="Edit title page fields (Title, Author, Credit, Source, Contact, Draft Date) in a structured form." />
              <Feature name="Fountain View" desc="Edit the raw Fountain title page syntax directly." />
              <Feature name="Two-Way Sync" desc="Changes in the form automatically update the Fountain text and vice versa." />
            </Section>

            <Section title="Structure Templates">
              <Feature name="Import Structure" desc="Browse built-in screenplay structure templates (Three-Act Structure, Hero's Journey, Save the Cat, etc.)." />
              <Feature name="Insert Options" desc="Insert beat outlines at the cursor, append them to the end of your script, or overwrite the entire document with the structure." />
              <Feature name="Beat Preview" desc="Preview a structure's full beat breakdown before inserting it." />
            </Section>

            <Section title="Revision Mode">
              <Feature name="Start Revision" desc="Capture a snapshot of your current script to begin tracking changes." />
              <Feature name="Review Changes" desc="See a detailed diff of every added, removed, or modified line after editing." />
              <Feature name="Accept / Reject" desc="Review each change individually with Accept or Reject buttons." />
              <Feature name="Merge All" desc="Accept all pending changes at once to finalize your revision." />
              <Feature name="Discard All" desc="Revert the entire script back to the pre-revision state." />
              <Feature name="Word-Level Diff" desc="Modified lines show inline word-level changes with color highlighting for precise review." />
            </Section>
          </Box>
        )}

        {activeTab === 4 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              Master these keyboard shortcuts to write faster and navigate ActOne without lifting your hands from the keyboard.
            </Typography>

            {shortcutGroups.map((group) => (
              <Section key={group.group} title={group.group}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {group.shortcuts.map((s, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 1,
                        borderRadius: 1,
                        bgcolor: i % 2 === 0 ? "action.hover" : "transparent",
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "text.primary" }}>{s.action}</Typography>
                      <Chip
                        label={s.keys}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: "background.paper",
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
        <Typography variant="caption" color="text.secondary">
          ActOne — Screenwriting Made Simple
        </Typography>
        <Button
          onClick={openFountainGuide}
          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          size="small"
        >
          Fountain Syntax Guide
        </Button>
      </DialogActions>
    </Dialog>
  );
};
