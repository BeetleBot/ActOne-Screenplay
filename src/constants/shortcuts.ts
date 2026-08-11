export interface ShortcutItem {
  id: string;
  label: string;
  category: "File & Document" | "Navigation & View" | "Editor & Formatting" | "Zoom & Interface";
  keys: string[];
  helpDoc?: string;
}

export interface SyntaxItem {
  name: string;
  autoSyntax?: string;
  forcedSyntax?: string;
  autoExample?: string;
  forcedExample?: string;
  description: string;
}

export const SYNTAX_REGISTRY: SyntaxItem[] = [
  {
    name: "Scene Heading (Slugline)",
    autoSyntax: "INT. / EXT. / INT/EXT. / I/E.",
    forcedSyntax: ".",
    autoExample: "INT. COFFEE SHOP - DAY",
    forcedExample: ".ON THE HIGHWAY",
    description: "Auto-detected when starting with INT., EXT., INT/EXT., or I/E.. Force any line as a scene heading by starting with a leading dot (.) followed by text."
  },
  {
    name: "Character Name",
    autoSyntax: "ALL CAPS",
    forcedSyntax: "@",
    autoExample: "JOHN\nHello, world.",
    forcedExample: "@McDONALD\nWhere is the briefcase?",
    description: "Auto-detected when an ALL-CAPS line follows a blank line. Force character names containing lowercase letters (e.g. McDONALD or van HELSING) using a leading @"
  },
  {
    name: "Transition",
    autoSyntax: "ALL CAPS ending in TO:",
    forcedSyntax: ">",
    autoExample: "CUT TO:",
    forcedExample: "> FADE OUT.",
    description: "Auto-detected when an ALL-CAPS line ends in TO: after a blank line. Force any transition line using a leading greater-than symbol (>)."
  },
  {
    name: "Action Paragraph",
    autoSyntax: "Standard Text",
    forcedSyntax: "!",
    autoExample: "John paces back and forth, tapping his fingers.",
    forcedExample: "!INT. STAGE - NIGHT\n(This action paragraph starts with INT. text)",
    description: "Default fallback for text lines. Force an action line that would otherwise trigger automatic slugline or character parsing by prefixing with an exclamation mark (!)."
  },
  {
    name: "Shot Line",
    autoSyntax: "ALL CAPS",
    forcedSyntax: "!!",
    autoExample: "CLOSE UP ON THE MAP",
    forcedExample: "!!CAMERA PANNING LEFT",
    description: "Auto-detected for recognized camera shot terms. Force any line as a shot description using a double exclamation prefix (!!)."
  },
  {
    name: "Lyrics",
    forcedSyntax: "~",
    forcedExample: "~ Oh, beautiful morning light...",
    description: "Song lyrics inside screenplay scenes are created using a leading tilde (~)."
  },
  {
    name: "Centered Text",
    forcedSyntax: "> text <",
    forcedExample: "> THE END <",
    description: "Center any line on the page by placing inward facing angle brackets (> and <) around the line."
  },
  {
    name: "Dual Dialogue",
    forcedSyntax: "CHARACTER ^",
    forcedExample: "JOHN\nI'm ready.\nMARY ^\nMe too.",
    description: "Indicate simultaneous side-by-side speech by placing a caret (^) at the end of the second character name."
  },
  {
    name: "Section Headings",
    forcedSyntax: "# / ## / ###",
    forcedExample: "# ACT I - THE BEGINNING\n## SEQUENCE 1",
    description: "Outline section hierarchy from # (Act level) down to ###### (Sub-sequence level)."
  },
  {
    name: "Synopsis",
    forcedSyntax: "=",
    forcedExample: "= John and Mary discover the hidden map.",
    description: "Scene overview beats rendered beneath scene cards in the Outline View. Hidden in clean PDF export."
  },
  {
    name: "Inline Markers & Notes",
    forcedSyntax: "[[marker color: Description]]",
    forcedExample: "John walks [[marker red: this is how marker works]]",
    description: "Margin revision markers and inline notes embedded inside double brackets [[marker color: text]]. Colors include red, blue, green, orange, yellow, pink, purple, cyan, etc."
  },
  {
    name: "Storyline Tags",
    forcedSyntax: "[[storyline storyline1, storyline2, storyline3]]",
    forcedExample: "INT. COFFEE SHOP - DAY [[storyline SubplotA, RomanceArc]]",
    description: "Subplot tracking tags embedded in scene headings inside double brackets [[storyline storyline1, storyline2]]. Displayed as sub-cards in the Outline View."
  },
  {
    name: "Scene Color Highlighting",
    forcedSyntax: "[[color]]",
    forcedExample: "INT. WAREHOUSE - NIGHT [[color red]]\nEXT. PARK - DAY [[color blue]]",
    description: "Scene background highlight colors assigned in scene headings using double brackets [[color red]]."
  },
];

export const SHORTCUTS_REGISTRY: ShortcutItem[] = [
  // ===== File & Document =====
  { id: "new-file", label: "New Screenplay", category: "File & Document", keys: ["Ctrl", "N"] },
  { id: "open-file", label: "Open File", category: "File & Document", keys: ["Ctrl", "O"] },
  { id: "save-file", label: "Save", category: "File & Document", keys: ["Ctrl", "S"] },
  { id: "save-as", label: "Save As", category: "File & Document", keys: ["Ctrl", "Shift", "S"] },
  { id: "close-tab", label: "Close Tab", category: "File & Document", keys: ["Alt", "Q"] },
  { id: "export", label: "Export PDF / FDX", category: "File & Document", keys: ["Ctrl", "P"] },
  { id: "next-tab", label: "Next Tab", category: "File & Document", keys: ["Ctrl", "Tab"] },
  { id: "prev-tab", label: "Previous Tab", category: "File & Document", keys: ["Ctrl", "Shift", "Tab"] },

  // ===== Navigation & View =====
  { id: "prev-scene", label: "Previous Scene", category: "Navigation & View", keys: ["Alt", "↑"] },
  { id: "next-scene", label: "Next Scene", category: "Navigation & View", keys: ["Alt", "↓"] },
  { id: "shortcuts-modal", label: "Keyboard Shortcuts Modal", category: "Navigation & View", keys: ["F1"] },
  { id: "command-palette", label: "Command Palette", category: "Navigation & View", keys: ["Ctrl", "K"] },
  { id: "find-replace", label: "Find & Replace", category: "Navigation & View", keys: ["Ctrl", "F"] },
  { id: "toggle-sidebar", label: "Toggle Sidebar", category: "Navigation & View", keys: ["Ctrl", "\\"] },
  { id: "toggle-zen", label: "Toggle Zen Mode", category: "Navigation & View", keys: ["Ctrl", "Alt", "Enter"] },
  { id: "open-muse", label: "Open Muse AI", category: "Navigation & View", keys: ["Alt", "M"] },
  { id: "open-snapshots", label: "Open Snapshots", category: "Navigation & View", keys: ["Alt", "S"] },
  { id: "open-settings", label: "Settings", category: "Navigation & View", keys: ["Ctrl", ","] },

  // ===== Editor & Formatting =====
  { id: "bold", label: "Bold Text (**)", category: "Editor & Formatting", keys: ["Ctrl", "B"] },
  { id: "italic", label: "Italic Text (*)", category: "Editor & Formatting", keys: ["Ctrl", "I"] },
  { id: "underline", label: "Underline Text (_)", category: "Editor & Formatting", keys: ["Ctrl", "U"] },
  { id: "cycle-prefix", label: "Cycle Line Element Prefix", category: "Editor & Formatting", keys: ["Tab"] },
  { id: "accept-autocomplete", label: "Accept Autocomplete Suggestion", category: "Editor & Formatting", keys: ["Tab"] },
  { id: "undo", label: "Undo", category: "Editor & Formatting", keys: ["Ctrl", "Z"] },
  { id: "redo", label: "Redo", category: "Editor & Formatting", keys: ["Ctrl", "Y"] },

  // ===== Zoom & Interface =====
  { id: "zoom-in", label: "Zoom In Editor", category: "Zoom & Interface", keys: ["Ctrl", "="] },
  { id: "zoom-out", label: "Zoom Out Editor", category: "Zoom & Interface", keys: ["Ctrl", "-"] },
  { id: "reset-zoom", label: "Reset Editor Zoom", category: "Zoom & Interface", keys: ["Ctrl", "0"] },
  { id: "scale-ui-in", label: "Scale App UI In", category: "Zoom & Interface", keys: ["Ctrl", "Alt", "="] },
  { id: "scale-ui-out", label: "Scale App UI Out", category: "Zoom & Interface", keys: ["Ctrl", "Alt", "-"] },
  { id: "reset-scale-ui", label: "Reset App UI Scale", category: "Zoom & Interface", keys: ["Ctrl", "Alt", "0"] },
];

export function generateShortcutsHelpMarkdown(): string {
  const categories: ShortcutItem["category"][] = [
    "File & Document",
    "Editor & Formatting",
    "Navigation & View",
    "Zoom & Interface",
  ];

  let markdown = "ActOne is designed for keyboard-driven writing. Below is the complete list of shortcuts, automatically generated from system settings.\n\n";

  for (const cat of categories) {
    const items = SHORTCUTS_REGISTRY.filter((item) => item.category === cat);
    if (items.length === 0) continue;

    markdown += `**${cat}**\n\n`;
    markdown += `| Action | Shortcut |\n|--------|----------|\n`;
    for (const item of items) {
      const keysFormatted = item.keys.map((k) => `<kbd>${k}</kbd>`).join(" + ");
      markdown += `| ${item.label} | ${keysFormatted} |\n`;
    }
    markdown += `\n`;
  }

  return markdown.trim();
}
