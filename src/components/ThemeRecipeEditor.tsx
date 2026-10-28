import { useRef, useState } from "react";
import { Box, Button, Collapse, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { RestartAltIcon } from "./Icons";
import { automaticInk, compileTheme, isHexColor, recipeFromColors, type ThemeRecipe } from "../theme/paletteEngine";
import type { ThemeColors } from "../theme";

interface ThemeRecipeEditorProps { colors: ThemeColors; onChange: (colors: ThemeColors) => void }
interface ColorChoiceProps { label: string; description: string; value: string; onChange: (value: string) => void; onReset: () => void }

function ColorChoice({ label, description, value, onChange, onReset }: ColorChoiceProps) {
  const [input, setInput] = useState<string | null>(null);
  return <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: "8px" }}>
    <Typography variant="subtitle2">{label}</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>{description}</Typography>
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <Box component="input" type="color" aria-label={`${label} picker`} value={value.length === 4 ? "#" + value.slice(1).split("").map(c => c + c).join("") : value} onChange={event => { setInput(null); onChange(event.target.value); }} sx={{ width: 36, height: 32, padding: 0, border: 0, bgcolor: "transparent", cursor: "pointer", flexShrink: 0, "&::-webkit-color-swatch": { borderRadius: "6px", border: 0 } }} />
      <TextField size="small" value={input ?? value} slotProps={{ htmlInput: { "aria-label": label } }} onChange={event => { setInput(event.target.value); if (isHexColor(event.target.value)) onChange(event.target.value); }} onBlur={() => setInput(null)} sx={{ flex: 1, minWidth: 0, "& input": { fontFamily: "monospace", fontSize: 12 } }} />
      <Tooltip title="Reset colour"><IconButton aria-label={`Reset ${label} colour`} size="small" onClick={() => { setInput(null); onReset(); }}><RestartAltIcon fontSize="small" /></IconButton></Tooltip>
    </Box>
  </Box>;
}

export function ThemeRecipeEditor({ colors, onChange }: ThemeRecipeEditorProps) {
  const original = useRef(colors);
  const [manual, setManual] = useState(false);
  const recipe = recipeFromColors(colors);
  const update = (partial: Partial<ThemeRecipe>) => onChange(compileTheme({ ...recipe, ...(manual ? { uiText: colors.text, writingText: colors.editorText ?? colors.text } : {}), ...partial }));
  const choices = [
    { key: "interface" as const, label: "Interface", description: "Panels, toolbars and the space around your writing." },
    { key: "accent" as const, label: "Accent", description: "Buttons, active controls and little moments of colour." },
    { key: "paper" as const, label: "Writing paper", description: "Your page can be bright, warm or dark, independently." },
  ];
  return <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
    <Typography variant="body2" color="text.secondary">Three colours. Everything else falls into place.</Typography>
    {choices.map(choice => <ColorChoice key={choice.key} label={choice.label} description={choice.description} value={recipe[choice.key]} onChange={value => update({ [choice.key]: value })} onReset={() => update({ [choice.key]: recipeFromColors(original.current)[choice.key] })} />)}
    <Typography variant="caption" color="text.secondary">Text colours are chosen automatically for each surface.</Typography>
    <Button size="small" aria-expanded={manual} onClick={() => { setManual(!manual); if (manual) onChange(compileTheme(recipe)); }} sx={{ alignSelf: "flex-start" }}>{manual ? "Use automatic text colours" : "Choose my own text colours"}</Button>
    <Collapse in={manual} unmountOnExit><Box sx={{ display: "grid", gap: 1 }}>
      <ColorChoice label="UI text" description="Labels and controls." value={colors.text} onChange={value => update({ uiText: value })} onReset={() => update({ uiText: automaticInk(recipe.interface) })} />
      <ColorChoice label="Writing text" description="Screenplay and prose." value={colors.editorText ?? colors.text} onChange={value => update({ writingText: value })} onReset={() => update({ writingText: automaticInk(recipe.paper) })} />
    </Box></Collapse>
  </Box>;
}
