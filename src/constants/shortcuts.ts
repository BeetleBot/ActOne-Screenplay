export interface ShortcutItem {
  id: string;
  label: string;
  category: "File & Document" | "Navigation & View" | "Editor & Formatting" | "Zoom & Interface";
  keys: string[];
  helpDoc?: string;
}

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
