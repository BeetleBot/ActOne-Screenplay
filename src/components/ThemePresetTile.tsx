import { Box, ButtonBase, Typography } from "@mui/material";
import { automaticInk } from "../theme/paletteEngine";

export interface ThemePresetTileProps {
  name: string;
  colors: { sidebar: string; editor: string; accent: string };
  selected: boolean;
  onSelect: () => void;
}

export function ThemePresetTile({ name, colors, selected, onSelect }: ThemePresetTileProps) {
  return <ButtonBase aria-label={`Use ${name} preset`} aria-pressed={selected} onClick={onSelect} sx={{ width: 56, flexShrink: 0, borderRadius: "6px", border: "2px solid", borderColor: selected ? "primary.main" : "divider", display: "flex", flexDirection: "column", overflow: "hidden", "&:hover": { borderColor: "primary.main" }, transition: "border-color var(--duration-fast) ease" }}>
    <Box role="img" aria-label={`${name} palette preview`} sx={{ width: "100%", height: 40, flexShrink: 0, bgcolor: colors.sidebar, p: "4px", boxSizing: "border-box" }}>
      <Box sx={{ height: 4, width: 16, bgcolor: colors.accent, borderRadius: "2px", mb: "3px" }} />
      <Box sx={{ display: "flex", height: 25, gap: "4px" }}>
        <Box sx={{ width: 8, display: "flex", flexDirection: "column", gap: "3px", pt: "3px" }}>{[0, 1, 2].map(line => <Box key={line} sx={{ height: 2, width: "100%", bgcolor: automaticInk(colors.sidebar) }} />)}</Box>
        <Box sx={{ flex: 1, minWidth: 0, bgcolor: colors.editor, borderRadius: "2px", p: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
          <Box sx={{ height: 2, width: "75%", bgcolor: colors.accent }} />
          <Box sx={{ height: 2, width: "100%", bgcolor: automaticInk(colors.editor) }} />
          <Box sx={{ height: 2, width: "65%", bgcolor: automaticInk(colors.editor) }} />
        </Box>
      </Box>
    </Box>
    <Typography sx={{ fontSize: 10, py: 0.5, bgcolor: "background.paper", color: "text.primary", width: "100%" }}>{name}</Typography>
  </ButtonBase>;
}
