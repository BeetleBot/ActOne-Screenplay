export interface ShortcutItem {
  id: string;
  label: string;
  category: "File & Document" | "Navigation & View" | "Editor & Formatting" | "Zoom & Interface";
  keys: string[];
  helpDoc?: string;
}

export interface SyntaxItem {
  name: string;
  syntax: string;
  example: string;
  description: string;
}

export const SYNTAX_REGISTRY: SyntaxItem[] = [
  { name: "Scene Heading", syntax: "INT. / EXT. / .FORCED", example: "INT. COFFEE SHOP - DAY", description: "Starts a new scene. Can be forced with a leading dot." },
  { name: "Character Name", syntax: "ALL CAPS or @Character", example: "JOHN\nHello, world.", description: "Character line preceding dialogue. Can be forced with @." },
  { name: "Parenthetical", syntax: "(parenthetical)", example: "(whispering)", description: "Directions inside dialogue enclosed in parentheses." },
  { name: "Transition", syntax: "CUT TO: or > Transition", example: "CUT TO:", description: "Ending transitions. Right-aligned or forced with >." },
  { name: "Centered Text", syntax: "> text <", example: "> THE END <", description: "Text placed between inward arrows is rendered centered." },
  { name: "Dual Dialogue", syntax: "CHARACTER ^", example: "JACK ^", description: "Character name ending with ^ formats as side-by-side speech." },
  { name: "Section Heading", syntax: "# Act I, ## Scene 1", example: "# ACT I - THE BEGINNING", description: "Structural organization levels (#, ##, ###, ####)." },
  { name: "Synopsis", syntax: "= Synopsis text", example: "= John meets Sarah for coffee.", description: "Scene overview/beats that appear in Outline View." },
  { name: "Inline Note", syntax: "[[ Note text ]]", example: "[[ Fix pacing in this paragraph ]]", description: "Private writer notes hidden during screenplay export." },
  { name: "Boneyard Comments", syntax: "/* Comment */", example: "/* Omitted scene 14 */", description: "Multi-line comments ignored during export." },
  { name: "Scene Numbers", syntax: "#scene-num#", example: "INT. CAFE - DAY #12A#", description: "Scene numbers placed at the end of scene headings." },
  { name: "Inline Markers", syntax: "~color:Description~", example: "~blue:Check continuity~", description: "Colored marker tags for inline script revision flags." },
  { name: "Storyline Tags", syntax: "tag:StorylineName", example: "tag:SubplotA", description: "Storyline tracking tags for scene organization." },
  { name: "Bold Text", syntax: "**bold**", example: "**emphasized**", description: "Bold formatting syntax." },
  { name: "Italic Text", syntax: "*italic*", example: "*whispered*", description: "Italic formatting syntax." },
  { name: "Underline Text", syntax: "_underline_", example: "_important_", description: "Underline formatting syntax." },
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
