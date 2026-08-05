with open("src/components/FountainEditor.tsx", "r") as f:
    content = f.read()

# Remove unused imports
content = content.replace('import { alpha } from "@mui/material/styles";\n', '')
content = content.replace('import type { Theme } from "@mui/material/styles";\n', '')

content = content.replace(
"""import { ContentCutIcon, ContentCopyIcon, AssignmentIcon, BookmarkIcon, ColorLensIcon, TextFieldsIcon, GoogleLogoIcon, TaskAltIcon, ArchiveIcon, FormatBoldIcon, FormatItalicIcon, FormatUnderlinedIcon, ChevronRightIcon, AutoAwesomeIcon } from "./Icons";
""", "")

content = content.replace('import { Divider, ListItemIcon, ListItemText, Typography, Box } from "@mui/material";\n', '')

# Remove unused state variables
content = content.replace('  const [promptMenuAnchorEl, setPromptMenuAnchorEl] = useState<null | HTMLElement>(null);\n', '')
content = content.replace('  const [rephraseMenuAnchorEl, setRephraseMenuAnchorEl] = useState<null | HTMLElement>(null);\n', '')
content = content.replace('  const [formatMenuAnchorEl, setFormatMenuAnchorEl] = useState<null | HTMLElement>(null);\n', '')
content = content.replace('  const [highlightMenuAnchorEl, setHighlightMenuAnchorEl] = useState<null | HTMLElement>(null);\n', '')
content = content.replace('  const [markerMenuAnchorEl, setMarkerMenuAnchorEl] = useState<null | HTMLElement>(null);\n', '')
content = content.replace('  const [transformMenuAnchorEl, setTransformMenuAnchorEl] = useState<null | HTMLElement>(null);\n', '')
content = content.replace('  const [translateMenuAnchorEl, setTranslateMenuAnchorEl] = useState<null | HTMLElement>(null);\n', '')

# Remove unused menuHasSelection in the main body
content = content.replace('  const menuHasSelection = menuSelectionRef.current !== null && menuSelectionRef.current.from !== menuSelectionRef.current.to;\n', '')
content = content.replace('  const menuSelectedText = menuSelectionRef.current?.text ?? "";\n', '')

# Remove wordCount and charCount since they are not rendered in the native menu
content = content.replace("""  const wordCount = useMemo(() => {
    const text = contextMenu ? menuSelectedText : selectedText;
    if (!text) return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [selectedText, menuSelectedText, contextMenu]);

  const charCount = contextMenu ? menuSelectedText.length : selectedText.length;
""", "")

content = content.replace('  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);\n', '')

with open("src/components/FountainEditor.tsx", "w") as f:
    f.write(content)

print("Done")
