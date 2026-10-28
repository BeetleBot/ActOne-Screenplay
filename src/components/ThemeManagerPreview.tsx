import { useMemo, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, MenuItem, Paper, Slider, Switch, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { createActOneTheme, type ThemeConfig } from "../theme";
import { ThemeLogo } from "./ThemeLogo";
import { getEditorVars } from "../theme/muiTheme";
import { ViewAgendaIcon, FolderSimplePlusIcon, AddNotesIcon, BeenhereIcon, AssignmentAddIcon, CameraIcon, TimerIcon, GarageIcon, MoreHorizIcon } from "./Icons";

interface ThemeManagerPreviewProps {
  config: ThemeConfig;
  draft: boolean;
}

const scenes = ["INT. COFFEE SHOP - DAY", "EXT. PARK - NIGHT", "INT. OFFICE - DAY"];

/** A sandbox of real MUI controls and app-sized sample content; never mounts document providers. */
export function ThemeManagerPreview({ config, draft }: ThemeManagerPreviewProps) {
  const [view, setView] = useState(0);
  const [scene, setScene] = useState(0);
  const [syntax, setSyntax] = useState(false);
  const [checked, setChecked] = useState(true);
  const [zoom, setZoom] = useState(100);
  const previewTheme = useMemo(() => createActOneTheme(config, 100, syntax), [config, syntax]);
  const vars = useMemo(() => getEditorVars(config, 100, syntax), [config, syntax]);
  const c = { ...config.colors, editorText: config.colors.editorText ?? config.colors.text, editorMuted: "var(--editor-muted)" };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
        <Box>
          <Typography variant="subtitle2">{config.name || "Untitled theme"}</Typography>
          <Typography variant="caption" color="text.secondary">{draft ? "Unsaved preview · Save to keep your changes" : "Live preview · Sample content"}</Typography>
        </Box>
        <Chip size="small" label={config.isDark ? "Dark" : "Light"} />
      </Box>
      <Tabs value={view} onChange={(_, value: number) => setView(value)} aria-label="Theme preview views" variant="scrollable" sx={{ mb: 1 }}>
        <Tab label="Workspace" id="preview-tab-0" aria-controls="preview-panel-0" />
        <Tab label="Prose & notes" id="preview-tab-1" aria-controls="preview-panel-1" />
        <Tab label="UI elements" id="preview-tab-2" aria-controls="preview-panel-2" />
      </Tabs>
      <ThemeProvider theme={previewTheme}>
        <Box role="tabpanel" id={`preview-panel-${view}`} aria-labelledby={`preview-tab-${view}`} sx={{ ...vars, flex: 1, minHeight: 0, overflow: "auto", bgcolor: "background.paper", color: "text.primary", border: "1px solid", borderColor: "divider", borderRadius: "12px", isolation: "isolate", "& ::selection": { bgcolor: c.selectionBg, color: c.selectionText } }}>
          {view === 0 && <Box sx={{ minWidth: 540, height: "100%", minHeight: 480, display: "flex", flexDirection: "column" }}>
            <Box sx={{ height: 46, display: "flex", alignItems: "center", gap: 1, px: 1.5 }}>
              <Typography variant="subtitle2" sx={{ flex: 1 }}>The Next Chapter</Typography>
              <Chip label="Screenplay" size="small" />
            </Box>
            <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
              <Box sx={{ width: 48, flexShrink: 0, display: "flex", alignItems: "center", flexDirection: "column", gap: 0.5, py: 1 }}>
                <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: "20px", bgcolor: "action.hover", mb: 0.5 }}><Box sx={{ width: 20, height: 20 }}><ThemeLogo variant="solid" /></Box></Box>
                {[{ Icon: ViewAgendaIcon, title: "Outline" }, { Icon: FolderSimplePlusIcon, title: "Project" }, { Icon: AddNotesIcon, title: "Notepad" }, { Icon: BeenhereIcon, title: "Markers" }, { Icon: AssignmentAddIcon, title: "Tasks" }, { Icon: CameraIcon, title: "Snapshots" }, { Icon: TimerIcon, title: "Sprint" }, { Icon: GarageIcon, title: "Parking" }].map(({ Icon, title }, index) => <Tooltip key={title} title={title}><IconButton aria-label={`${title} preview`} sx={{ width: 36, height: 36, borderRadius: "20px", color: index === 0 ? "primary.main" : "text.secondary", bgcolor: index === 0 ? "action.selected" : undefined }}><Icon sx={{ fontSize: 20 }} /></IconButton></Tooltip>)}
                <Box sx={{ flex: 1 }} /><Tooltip title="Quick settings"><IconButton aria-label="Quick settings preview" sx={{ width: 36, height: 36, color: "text.secondary" }}><MoreHorizIcon sx={{ fontSize: 20 }} /></IconButton></Tooltip>
              </Box>
              <Box sx={{ width: 180, flexShrink: 0, p: 1 }}>
                <Typography variant="overline">Scene navigator</Typography>
                <TextField placeholder="Find a scene…" size="small" fullWidth slotProps={{ htmlInput: { "aria-label": "Find a sample scene" } }} sx={{ my: 1 }} />
                {scenes.map((heading, index) => <Button key={heading} color="inherit" fullWidth onClick={() => setScene(index)} aria-pressed={scene === index} sx={{ justifyContent: "flex-start", textAlign: "left", gap: 1, p: 1, mb: 0.5, bgcolor: scene === index ? "action.selected" : "transparent" }}><Chip size="small" label={index + 1} sx={{ height: 22, bgcolor: `color-mix(in srgb, var(--scene-color-${["blue", "green", "yellow"][index]}) 35%, transparent)` }} /><Box><Typography sx={{ fontSize: 11, fontWeight: 600 }}>{heading}</Typography><Typography sx={{ fontSize: 11, color: "text.secondary" }}>{["An unexpected beginning", "A chance encounter", "The decision"][index]}</Typography></Box></Button>)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", pr: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 40, gap: 1 }}><Chip label="First draft.fountain" size="small" /><Typography variant="caption" color="text.secondary">Notes.md</Typography></Box>
                <Box sx={{ flex: 1, overflow: "auto", bgcolor: c.editor, borderRadius: "12px", px: 3, py: 4, fontFamily: "var(--font-editor)", fontSize: 14, lineHeight: 1.6, color: c.editorText }}>
                  <Box sx={{ fontWeight: 700, mb: 3, color: "var(--text-editor-heading)" }}>{scenes[scene]}</Box>
                  <Box sx={{ mb: 3 }}>Morning light spills across the table. JANE opens her notebook and finds <Box component="span" sx={{ bgcolor: c.selectionBg, color: c.selectionText }}>a letter she never sent.</Box></Box>
                  <Box sx={{ pl: "30%", color: "var(--text-editor-character)" }}>JANE</Box>
                  <Box sx={{ pl: "20%", color: "var(--text-editor-parenthetical)" }}>(quietly)</Box>
                  <Box sx={{ px: "12%", mb: 3, color: "var(--text-editor-dialogue)" }}>Maybe this is where the story begins.</Box>
                  <Box>Outside, the city is waking up. She turns to a fresh page.</Box>
                  <Box sx={{ textAlign: "right", mt: 3, color: "var(--text-editor-transition)" }}>CUT TO:</Box>
                </Box>
                <FormControlLabel control={<Switch size="small" checked={syntax} onChange={(_, value) => setSyntax(value)} />} label={<Typography variant="caption">Syntax colours</Typography>} />
              </Box>
            </Box>
            <Box sx={{ height: 30, display: "flex", alignItems: "center", justifyContent: "space-between", px: 2 }}><Typography variant="caption" color="text.secondary">3 scenes · 1,420 words</Typography><Typography variant="caption" color="text.secondary">Page 1 of 8 · Saved</Typography></Box>
          </Box>}
          {view === 1 && <Box sx={{ p: 3, minHeight: "100%", bgcolor: c.editor, color: c.editorText }}>
            <Chip size="small" label="Notes.md" sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom>The world of the story</Typography>
            <Typography component="p" sx={{ mb: 2 }}>A quiet coastal town, a missing letter, and a friendship that changes everything.</Typography>
            <Typography variant="h6" gutterBottom>Characters</Typography>
            <Typography component="p" sx={{ mb: 2 }}><strong>Jane</strong> — a writer learning to trust her own voice.</Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}><Typography sx={{ color: c.editorMuted, fontStyle: "italic" }}>“Every new draft is another way of seeing.”</Typography></Paper>
            <Typography component="p" sx={{ mb: 2 }}>Explore the <Box component="a" href="#preview-notes" onClick={event => event.preventDefault()} sx={{ color: "primary.main" }}>character notes</Box> or mark <Box component="mark" sx={{ bgcolor: c.selectionBg, color: c.selectionText }}>an idea to revisit</Box>.</Typography>
            <FormControlLabel control={<Checkbox checked={checked} onChange={(_, value) => setChecked(value)} />} label="Develop the opening scene" />
            <Typography sx={{ color: c.editorMuted }} variant="body2">A supporting note should stay readable alongside the main text.</Typography>
          </Box>}
          {view === 2 && <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <Typography variant="h6">Try the details</Typography>

            <Typography variant="body2" color="text.secondary">Hover, click and tab through these controls to inspect their colours and focus states.</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}><Typography variant="subtitle2" gutterBottom>Buttons & labels</Typography><Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}><Button variant="contained">Primary action</Button><Button variant="outlined">Secondary</Button><Button>Text action</Button><Button disabled variant="contained">Disabled</Button><Chip label="Selected" color="primary" /><Chip label="Draft" variant="outlined" /></Box></Paper>
            <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}><Typography variant="subtitle2">Inputs & selection</Typography><TextField label="Project name" defaultValue="The Next Chapter" size="small" /><TextField label="Paper size" select defaultValue="letter" size="small" slotProps={{ select: { MenuProps: { disablePortal: true } } }}><MenuItem value="letter">US Letter</MenuItem><MenuItem value="a4">A4</MenuItem></TextField><TextField label="Scene name" error helperText="Give this scene a name" size="small" /><Box><FormControlLabel control={<Checkbox checked={checked} onChange={(_, value) => setChecked(value)} />} label="Include scene numbers" /><FormControlLabel control={<Switch checked={syntax} onChange={(_, value) => setSyntax(value)} />} label="Syntax colours" /></Box><Typography variant="caption">Editor zoom: {zoom}%</Typography><Slider aria-label="Preview editor zoom" value={zoom} onChange={(_, value) => setZoom(value as number)} min={75} max={150} /></Paper>
            <Paper variant="outlined" sx={{ p: 2 }}><Typography variant="subtitle2" gutterBottom>Dialog</Typography><Typography variant="body2" color="text.secondary">Save your changes before closing?</Typography><Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}><Button>Cancel</Button><Button variant="contained">Save changes</Button></Box></Paper>
            <Box sx={{ display: "grid", gap: 1 }}><Alert severity="success">Your screenplay is saved.</Alert><Alert severity="info">A new draft is ready to review.</Alert><Alert severity="warning">Some scenes have no synopsis.</Alert><Alert severity="error">The file could not be opened.</Alert></Box>
          </Box>}
        </Box>
      </ThemeProvider>
    </Box>
  );
}
