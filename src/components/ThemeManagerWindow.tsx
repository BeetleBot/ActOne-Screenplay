import React, { useState, useEffect } from "react";
import { Box, Typography, IconButton, Button, TextField, Switch } from "@mui/material";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { TitleBar } from "./TitleBar";
import { createActOneTheme, deriveAllColors, themes, type ThemeColors } from "../theme";
import { resolveThemeConfig } from "../theme/themeUtils";
import { initThemeEngine, setThemeState as engineSetTheme, onThemeChanged } from "../theme/ThemeEngine";
import { AddIcon, DeleteIcon, CheckIcon, FormatListBulletedIcon, LibraryBooksIcon, AssignmentIcon, TimerIcon, SettingsIcon } from "./Icons";

const CORE_DEFAULTS = { editor: "#ffffff", text: "#1a1c1e", accent: "#0061a4", sidebar: "#f5f5f5", button: "#0061a4" };
const EMPTY_COLORS = deriveAllColors(CORE_DEFAULTS, false);

interface CoreColors {
  editor: string; text: string; accent: string; sidebar: string; button: string;
}

const CORE_KEYS: { key: keyof CoreColors; label: string }[] = [
  { key: "accent", label: "Accent" },
  { key: "button", label: "Button" },
  { key: "text", label: "Text" },
  { key: "sidebar", label: "Sidebar" },
  { key: "editor", label: "Editor" },
];

interface CustomTheme {
  id: string; name: string; isDark: boolean; colors: ThemeColors;
}

type ThemeSection = { label: string; ids: string[] };

const THEME_SECTIONS: ThemeSection[] = [
  { label: "CLASSIC", ids: ["light", "dark"] },
  { label: "PITCH", ids: ["pitch-black", "pitch-white"] },
  { label: "PASTEL", ids: ["blush", "mauve", "lilac", "sage", "mint", "teal", "butter", "plum"] },
  { label: "OTHER", ids: ["ocean", "sunrise"] },
];

function accentRgb(hex: string) {
  const c = hex.replace("#", "");
  return `${parseInt(c.substring(0, 2), 16)},${parseInt(c.substring(2, 4), 16)},${parseInt(c.substring(4, 6), 16)}`;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="caption" sx={{ minWidth: 56, fontWeight: 600, fontSize: "0.7rem", color: "text.secondary" }}>{label.toUpperCase()}</Typography>
      <Box component="input" type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          width: 28, height: 28, p: 0, border: "1px solid", borderColor: "divider",
          borderRadius: "6px", cursor: "pointer", bgcolor: "transparent",
          "&::-webkit-color-swatch-wrapper": { p: 0 },
          "&::-webkit-color-swatch": { border: "none", borderRadius: "5px" },
        }}
      />
      <TextField size="small" value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          flex: 1,
          "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          bgcolor: "action.hover", borderRadius: "6px",
          "&:hover": { bgcolor: "action.selected" },
          "& input": { fontSize: "11px", fontFamily: "monospace", py: 0.5, px: 1 },
        }}
      />
    </Box>
  );
}

function ThemePreview({ colors }: { colors: ThemeColors }) {
  const accentRgbVal = accentRgb(colors.accent);

  return (
    <Box sx={{
      display: "flex", flexDirection: "column", height: "100%", borderRadius: "8px", overflow: "hidden",
      border: "1px solid", borderColor: colors.border, bgcolor: colors.editor,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      userSelect: "none"
    }}>
      {/* Mini Top Header/Tab Bar */}
      <Box sx={{
        height: 24, bgcolor: colors.sidebar, borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, flexShrink: 0
      }}>
        {/* Simulated Tabs on left */}
        <Box sx={{ display: "flex", alignItems: "flex-end", height: "100%", gap: 0.3 }}>
          <Box sx={{
            height: 18, px: 1, bgcolor: colors.editor, border: `1px solid ${colors.border}`,
            borderBottom: "none", borderTopLeftRadius: 4, borderTopRightRadius: 4,
            display: "flex", alignItems: "center", gap: 0.5, borderTop: `1.5px solid ${colors.accent}`
          }}>
            <Typography sx={{ fontSize: "6.5px", fontWeight: 600, color: colors.text, fontFamily: "monospace" }}>script.fountain</Typography>
          </Box>
          <Box sx={{
            height: 16, px: 1, bgcolor: "transparent", opacity: 0.6,
            display: "flex", alignItems: "center", gap: 0.5
          }}>
            <Typography sx={{ fontSize: "6.5px", color: colors.textSecondary, fontFamily: "monospace" }}>notes.txt</Typography>
          </Box>
        </Box>

        {/* Windows-style Window Control Buttons on right */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, opacity: 0.5, mr: 0.5 }}>
          {/* Minimize */}
          <Box sx={{ width: 6, height: 1, bgcolor: colors.text }} />
          {/* Maximize */}
          <Box sx={{ width: 5, height: 5, border: `1px solid ${colors.text}` }} />
          {/* Close */}
          <Box sx={{ position: "relative", width: 6, height: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box sx={{ position: "absolute", width: 7, height: 1, bgcolor: colors.text, transform: "rotate(45deg)" }} />
            <Box sx={{ position: "absolute", width: 7, height: 1, bgcolor: colors.text, transform: "rotate(-45deg)" }} />
          </Box>
        </Box>
      </Box>

      {/* Main Workspace Area */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* Mini ActivityBar */}
        <Box sx={{
          width: 24, bgcolor: colors.sidebar, borderRight: `1px solid ${colors.border}`,
          display: "flex", flexDirection: "column", alignItems: "center", py: 1, gap: 1, flexShrink: 0
        }}>
          {/* Active Outline tab */}
          <Box sx={{
            width: 18, height: 18, borderRadius: "4px",
            bgcolor: `rgba(${accentRgbVal}, 0.12)`, display: "flex", alignItems: "center", justifyContent: "center",
            borderLeft: `2.5px solid ${colors.accent}`, borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
            color: colors.accent
          }}>
            <FormatListBulletedIcon sx={{ fontSize: 9 }} />
          </Box>
          {/* Inactive tabs */}
          <LibraryBooksIcon sx={{ fontSize: 9, color: colors.textSecondary, opacity: 0.4 }} />
          <AssignmentIcon sx={{ fontSize: 9, color: colors.textSecondary, opacity: 0.4 }} />
          <TimerIcon sx={{ fontSize: 9, color: colors.textSecondary, opacity: 0.4 }} />
          <Box sx={{ flex: 1 }} />
          {/* Settings */}
          <SettingsIcon sx={{ fontSize: 9, color: colors.textSecondary, opacity: 0.4, mb: 0.5 }} />
        </Box>

        {/* Mini Workspace Sidebar (Outline List - Static) */}
        <Box sx={{
          width: 90, bgcolor: colors.sidebar, borderRight: `1px solid ${colors.border}`,
          display: "flex", flexDirection: "column", p: 0.8, gap: 0.5, flexShrink: 0
        }}>
          <Typography sx={{ fontWeight: 800, color: colors.textSecondary, opacity: 0.5, fontSize: "5.5px", letterSpacing: "0.05em", mb: 0.2 }}>OUTLINE</Typography>
          
          <Box sx={{
            display: "flex", alignItems: "center", gap: 0.5, px: 0.5, py: 0.4, borderRadius: "3px",
            bgcolor: `rgba(${accentRgbVal}, 0.12)`, color: colors.accent
          }}>
            <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: colors.accent }} />
            <Typography sx={{ fontSize: "6px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>INT. COFFEE SHOP</Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 0.5, py: 0.4, color: colors.textSecondary, opacity: 0.7 }}>
            <Box sx={{ width: 3, height: 3, borderRadius: "50%", border: `1px solid ${colors.border}` }} />
            <Typography sx={{ fontSize: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>EXT. PARK - NIGHT</Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 0.5, py: 0.4, color: colors.textSecondary, opacity: 0.7 }}>
            <Box sx={{ width: 3, height: 3, borderRadius: "50%", border: `1px solid ${colors.border}` }} />
            <Typography sx={{ fontSize: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>INT. OFFICE - DAY</Typography>
          </Box>
        </Box>

        {/* Mini Editor Workspace - Single Detailed Scene */}
        <Box sx={{
          flex: 1, bgcolor: colors.editor, p: 1.5, display: "flex", flexDirection: "column",
          gap: 0.8, overflowY: "auto", minWidth: 0, fontFamily: '"Courier Prime", Courier, monospace', fontSize: "9px"
        }}>
          {/* Scene Heading */}
          <Box sx={{ fontWeight: 700, color: colors.text, fontSize: "7.5px", mt: 0.5 }}>
            INT. COFFEE SHOP - DAY
          </Box>
          
          {/* Action Blocks */}
          <Box sx={{ color: colors.text, opacity: 0.8, fontSize: "6.5px", lineHeight: 1.3 }}>
            The morning rush is in full swing. JANE (20s) sits alone at a corner table, staring intently at her{" "}
            <Box component="span" sx={{ bgcolor: colors.selectionBg, color: colors.selectionText, px: 0.3, borderRadius: "2px" }}>
              laptop screen.
            </Box>
          </Box>
          
          <Box sx={{ color: colors.text, opacity: 0.8, fontSize: "6.5px", lineHeight: 1.3 }}>
            She sighs deeply, rubbing her temples, and then glances quickly at her phone.
          </Box>

          {/* Character Dialogue Sequence */}
          <Box sx={{ alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", my: 0.3 }}>
            <Typography sx={{ fontFamily: "inherit", fontWeight: 700, fontSize: "7px", color: colors.text, textTransform: "uppercase" }}>JANE</Typography>
            <Typography sx={{ fontFamily: "inherit", fontStyle: "italic", fontSize: "6px", color: colors.textSecondary, opacity: 0.8 }}>(to herself, typing)</Typography>
            <Typography sx={{ fontFamily: "inherit", fontSize: "6.5px", color: colors.text, textAlign: "center", maxWidth: "80%", mt: 0.2 }}>
              This screenplay needs to be perfect.
            </Typography>
            <Typography sx={{ fontFamily: "inherit", fontStyle: "italic", fontSize: "6px", color: colors.textSecondary, opacity: 0.8, mt: 0.2 }}>(beat)</Typography>
            <Typography sx={{ fontFamily: "inherit", fontSize: "6.5px", color: colors.text, textAlign: "center", maxWidth: "80%", mt: 0.2 }}>
              Or else everything falls apart.
            </Typography>
          </Box>

          {/* Action Line */}
          <Box sx={{ color: colors.text, opacity: 0.8, fontSize: "6.5px", lineHeight: 1.3 }}>
            She hits the enter key with dramatic flair.
          </Box>

          {/* Transition */}
          <Box sx={{ alignSelf: "flex-end", fontWeight: 700, color: colors.text, fontSize: "7px", textTransform: "uppercase", mt: 0.5, mr: 1 }}>
            FADE OUT.
          </Box>
        </Box>
      </Box>

      {/* Bottom Status Bar */}
      <Box sx={{
        height: 16, bgcolor: colors.sidebar, borderTop: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, flexShrink: 0
      }}>
        <Typography sx={{ fontSize: "5.5px", color: colors.textSecondary, opacity: 0.6 }}>1,420 words | Page 1 of 8</Typography>
        <Typography sx={{ fontSize: "5.5px", color: colors.accent, fontWeight: 700 }}>Fountain</Typography>
      </Box>
    </Box>
  );
}


export const ThemeManagerWindow: React.FC = () => {
  const [themeId, setThemeId] = useState("light");
  const [appScale, setAppScale] = useState(100);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ThemeColors>({ ...EMPTY_COLORS });
  const [formName, setFormName] = useState("");
  const [formIsDark, setFormIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    initThemeEngine().then((state) => {
      setThemeId(state.themeId);
      setAppScale(state.appScale);
      try { setCustomThemes(JSON.parse(state.customThemes)); } catch { setCustomThemes([]); }
    });
    return onThemeChanged((state) => {
      setThemeId(state.themeId);
      setAppScale(state.appScale);
      try { setCustomThemes(JSON.parse(state.customThemes)); } catch { setCustomThemes([]); }
    });
  }, []);

  const setTheme = (id: string) => {
    setThemeId(id);
    engineSetTheme({ themeId: id });
  };

  const updateCoreColor = (key: keyof CoreColors, value: string) => {
    setForm(prev => deriveAllColors({ ...prev, [key]: value } as CoreColors, formIsDark));
  };

  const updateFormIsDark = (dark: boolean) => {
    setFormIsDark(dark);
    setForm(prev => deriveAllColors(
      { editor: prev.editor, text: prev.text, accent: prev.accent, sidebar: prev.sidebar, button: prev.button },
      dark,
    ));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_COLORS });
    setFormName("");
    setFormIsDark(false);
    setEditingId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    setForm({ ...EMPTY_COLORS });
    setFormName("");
    setFormIsDark(false);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (ct: CustomTheme) => {
    setFormName(ct.name);
    setFormIsDark(ct.isDark);
    setForm({ ...ct.colors });
    setEditingId(ct.id);
    setShowForm(true);
  };

  const applyPreset = (preset: { name: string; colors: { sidebar: string; editor: string; accent: string } }) => {
    setFormName(preset.name);
    setFormIsDark(true);
    const core = { editor: preset.colors.editor, text: "#e0e0e0", accent: preset.colors.accent, sidebar: preset.colors.sidebar, button: preset.colors.accent };
    setForm(deriveAllColors(core, true));
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const core = { editor: form.editor, text: form.text, accent: form.accent, sidebar: form.sidebar, button: form.button };
    const full = deriveAllColors(core, formIsDark);
    let updated: CustomTheme[];
    if (editingId) {
      updated = customThemes.map(t => t.id === editingId ? { ...t, name: formName.trim(), isDark: formIsDark, colors: full } : t);
      if (themeId === editingId) setTheme(editingId);
    } else {
      const id = formName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
      updated = [...customThemes, { id, name: formName.trim(), isDark: formIsDark, colors: full }];
    }
    setCustomThemes(updated);
    engineSetTheme({ customThemes: JSON.stringify(updated) });
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this custom theme? This cannot be undone.")) return;
    const updated = customThemes.filter(t => t.id !== id);
    setCustomThemes(updated);
    engineSetTheme({ customThemes: JSON.stringify(updated) });
    if (themeId === id) setTheme("light");
  };

  const previewColors = (() => {
    if (showForm) return { colors: form, isDark: formIsDark };
    const builtin = themes.find(t => t.id === themeId);
    if (builtin) return { colors: builtin.colors, isDark: builtin.isDark };
    const custom = customThemes.find(t => t.id === themeId);
    if (custom) {
      const core = { editor: custom.colors.editor, text: custom.colors.text, accent: custom.colors.accent, sidebar: custom.colors.sidebar, button: custom.colors.button };
      return { colors: deriveAllColors(core, custom.isDark), isDark: custom.isDark };
    }
    return { colors: themes[0].colors, isDark: false };
  })();

  const currentThemeConfig = resolveThemeConfig(themeId, customThemes, systemDark);
  const muiTheme = createActOneTheme(currentThemeConfig, appScale);

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch { window.close(); }
  };

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <TitleBar title="Theme Manager" onClose={handleClose} />
        <Box sx={{ flex: 1, display: "flex", gap: 1.5, p: 2, minHeight: 0 }}>
          {/* Left pane */}
          <Box sx={{
            width: 340, flexShrink: 0, display: "flex", flexDirection: "column",
            border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, minHeight: 0,
          }}>
            {showForm ? (
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, mb: 1.25, display: "block" }}>
                  {editingId ? "EDIT THEME" : "CREATE THEME"}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 11, color: "text.secondary" }}>THEME NAME</Typography>
                  <TextField size="small" fullWidth value={formName} onChange={(e) => setFormName(e.target.value)}
                    sx={{ "& .MuiOutlinedInput-notchedOutline": { border: "none" }, bgcolor: "action.hover", borderRadius: "6px", "&:hover": { bgcolor: "action.selected" }, "& .MuiOutlinedInput-input": { py: 0.6, px: 1.25, fontSize: 12 } }}
                  />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Dark Theme</Typography>
                  <Switch size="small" checked={formIsDark} onChange={(e) => updateFormIsDark(e.target.checked)} />
                </Box>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 600, mb: 1, color: "text.secondary", fontSize: "10px", letterSpacing: "0.05em" }}>PRESETS</Typography>
                <Box sx={{ display: "flex", gap: 0.75, mb: 2, flexWrap: "wrap" }}>
                  {[
                    { name: "Noir", colors: { sidebar: "#1a1a2e", editor: "#0f0f1a", accent: "#e94560" } },
                    { name: "Ocean", colors: { sidebar: "#0d2137", editor: "#132a45", accent: "#00b4d8" } },
                    { name: "Sunset", colors: { sidebar: "#2d1b2e", editor: "#3d1f2e", accent: "#ff6b35" } },
                    { name: "Forest", colors: { sidebar: "#1a2e1a", editor: "#1f3d1f", accent: "#6b8c42" } },
                    { name: "Lavender", colors: { sidebar: "#1e1a2e", editor: "#2a1f3d", accent: "#b39ddb" } },
                  ].map(p => (
                    <Box key={p.name} onClick={() => applyPreset(p)} sx={{ width: 44, height: 44, borderRadius: "10px", cursor: "pointer", border: "2px solid", borderColor: "divider", display: "flex", flexDirection: "column", overflow: "hidden", "&:hover": { borderColor: "primary.main" }, transition: "border-color 0.12s ease" }}>
                      <Box sx={{ flex: 1, bgcolor: p.colors.sidebar }} />
                      <Box sx={{ flex: 1, bgcolor: p.colors.editor }} />
                      <Box sx={{ height: 6, bgcolor: p.colors.accent }} />
                    </Box>
                  ))}
                </Box>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 600, mb: 1.5, color: "text.secondary", fontSize: "10px", letterSpacing: "0.05em" }}>COLORS</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                  {CORE_KEYS.map(f => (
                    <ColorField key={f.key} label={f.label} value={form[f.key]} onChange={(v) => updateCoreColor(f.key, v)} />
                  ))}
                </Box>
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 2.5 }}>
                  <Button size="small" variant="outlined" color="inherit" onClick={resetForm} sx={{ fontSize: 11 }}>Cancel</Button>
                  <Button size="small" variant="contained" color="primary" onClick={handleSave} disabled={!formName.trim()} sx={{ fontSize: 11 }}>{editingId ? "Update" : "Save"}</Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", pr: 0.5 }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, mb: 0.75, display: "block" }}>ADAPTIVE</Typography>
                  <Box onClick={() => setTheme("adaptive")} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1, mb: 0.5, borderRadius: "8px", cursor: "pointer", border: "2px solid", borderColor: themeId === "adaptive" ? "primary.main" : "divider", bgcolor: themeId === "adaptive" ? "action.selected" : "transparent", "&:hover": { bgcolor: "action.hover" }, transition: "all 0.12s ease" }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: "8px", overflow: "hidden", display: "flex", flexShrink: 0, border: "1px solid", borderColor: "divider" }}>
                      <Box sx={{ flex: 1, bgcolor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#0061a4" }} />
                      </Box>
                      <Box sx={{ width: "2px", bgcolor: "divider" }} />
                      <Box sx={{ flex: 1, bgcolor: "#1a1c1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#a0caff" }} />
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, fontSize: 12 }}>
                        {themeId === "adaptive" && <CheckIcon sx={{ fontSize: 14, color: "primary.main" }} />}Adaptive
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Follows system preference</Typography>
                    </Box>
                  </Box>
                </Box>
                {THEME_SECTIONS.map(section => (
                  <Box key={section.label} sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, mb: 0.75, display: "block" }}>{section.label}</Typography>
                    {section.ids.map(id => {
                      const t = themes.find(x => x.id === id);
                      if (!t) return null;
                      const isActive = themeId === t.id;
                      const tc = t.colors;
                      return (
                        <Box key={t.id} onClick={() => setTheme(t.id)} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1, mb: 0.5, borderRadius: "8px", cursor: "pointer", border: "2px solid", borderColor: isActive ? "primary.main" : "divider", bgcolor: isActive ? "action.selected" : "transparent", "&:hover": { bgcolor: "action.hover" }, transition: "all 0.12s ease" }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: "8px", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", flexShrink: 0, border: "1px solid", borderColor: "divider" }}>
                            <Box sx={{ bgcolor: tc.editor }} />
                            <Box sx={{ bgcolor: tc.sidebar }} />
                            <Box sx={{ bgcolor: tc.accent }} />
                            <Box sx={{ bgcolor: tc.dropdown }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, fontSize: 12 }}>
                              {isActive && <CheckIcon sx={{ fontSize: 14, color: "primary.main" }} />}{t.name}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ))}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, display: "block" }}>CUSTOM THEMES</Typography>
                  <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={startCreate} sx={{ fontSize: 11 }}>Create</Button>
                </Box>
                {customThemes.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2, fontSize: "0.8rem", fontStyle: "italic" }}>No custom themes yet.</Typography>
                )}
                {customThemes.map(ct => {
                  const isActive = themeId === ct.id;
                  return (
                    <Box key={ct.id} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, mb: 0.5, borderRadius: "8px", cursor: "pointer", border: "2px solid", borderColor: isActive ? "primary.main" : "transparent", bgcolor: isActive ? "action.selected" : "transparent", "&:hover": { bgcolor: "action.hover" }, transition: "all 0.12s ease" }} onClick={() => setTheme(ct.id)}>
                      <Box sx={{ width: 28, height: 28, borderRadius: "6px", overflow: "hidden", display: "flex", flexShrink: 0, border: "1px solid", borderColor: "divider" }}>
                        <Box sx={{ width: 7, bgcolor: ct.colors.sidebar }} />
                        <Box sx={{ flex: 1, bgcolor: ct.colors.editor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: ct.colors.accent }} />
                        </Box>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, fontSize: 12 }}>
                          {isActive && <CheckIcon sx={{ fontSize: 14, color: "primary.main" }} />}{ct.name}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); startEdit(ct); }} sx={{ color: "text.secondary" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem" }}>EDIT</Typography>
                      </IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(ct.id); }} sx={{ color: "text.secondary" }}>
                        <DeleteIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
          {/* Right pane: preview */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, minHeight: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, mb: 1.25, display: "block" }}>THEME PREVIEW</Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ThemePreview colors={previewColors.colors} />
            </Box>
          </Box>
        </Box>
      </Box>
    </MuiThemeProvider>
  );
};
