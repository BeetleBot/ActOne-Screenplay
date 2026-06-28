import React, { useState, useEffect } from "react";
import { Box, Typography, IconButton, Button, TextField, Switch } from "@mui/material";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { TitleBar } from "./TitleBar";
import { createActOneTheme, deriveAllColors, themes, type ThemeColors } from "../theme";
import { resolveThemeConfig } from "../theme/themeUtils";
import { initThemeEngine, setThemeState as engineSetTheme, onThemeChanged } from "../theme/ThemeEngine";
import { AddIcon, DeleteIcon, CheckIcon } from "./Icons";

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
  { label: "OTHER", ids: ["noir", "ocean", "sunrise", "forest", "lavender"] },
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
  return (
    <Box sx={{
      display: "flex", height: "100%", borderRadius: "8px", overflow: "hidden",
      border: "1px solid", borderColor: colors.border,
      fontFamily: '"Courier Prime", Courier, monospace', fontSize: "11px", lineHeight: 1.4,
    }}>
      <Box sx={{
        width: 20, flexShrink: 0, bgcolor: colors.sidebar, display: "flex", flexDirection: "column",
        alignItems: "center", gap: 1, py: 1.5, px: 0.5, borderRight: `1px solid ${colors.border}`,
      }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "6px", bgcolor: colors.accent, opacity: 0.9 }} />
        <Box sx={{ width: 10, height: 10, borderRadius: "6px", bgcolor: colors.button, opacity: 0.5 }} />
        <Box sx={{ width: 10, height: 10, borderRadius: "6px", bgcolor: colors.button, opacity: 0.35 }} />
        <Box sx={{ flex: 1 }} />
        <Box sx={{ width: 10, height: 10, borderRadius: "6px", bgcolor: colors.button, opacity: 0.2 }} />
      </Box>
      <Box sx={{
        width: 100, flexShrink: 0, bgcolor: colors.sidebar, display: "flex", flexDirection: "column",
        gap: 0.3, p: 1, borderRight: `1px solid ${colors.border}`, fontSize: "7px",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
          <Box sx={{ flex: 1, height: 6, borderRadius: "3px", bgcolor: colors.accent, opacity: 0.15 }} />
        </Box>
        <Box sx={{ fontWeight: 700, color: colors.text, opacity: 0.6, textTransform: "uppercase", fontSize: "6px", letterSpacing: "0.05em", mb: 0.3 }}>ACT ONE</Box>
        {[
          { name: "INT. COFFEE SHOP", active: true },
          { name: "EXT. PARK", active: false },
          { name: "INT. OFFICE", active: false },
        ].map((scene, i) => (
          <Box key={i} sx={{
            display: "flex", alignItems: "center", gap: 0.5, px: 0.5, py: 0.4,
            borderRadius: "4px",
            bgcolor: scene.active ? `rgba(${accentRgb(colors.accent)}, 0.12)` : "transparent",
            color: scene.active ? colors.accent : colors.textSecondary,
            fontWeight: scene.active ? 600 : 400,
          }}>
            <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: scene.active ? colors.accent : colors.border, flexShrink: 0 }} />
            <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "6.5px" }}>{scene.name}</Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ flex: 1, bgcolor: colors.editor, p: 1.5, display: "flex", flexDirection: "column", gap: 0.4, minWidth: 0 }}>
        <Box sx={{ fontWeight: 700, textTransform: "uppercase", color: colors.text, fontSize: "10px" }}>INT. COFFEE SHOP - DAY</Box>
        <Box sx={{ height: 1.5, width: "50%", bgcolor: colors.accent, opacity: 0.4, mb: 0.3, borderRadius: 1 }} />
        <Box sx={{ color: colors.text, opacity: 0.85, fontSize: "9px" }}>The morning rush is in full swing. JANE (20s) sits alone at a corner table, staring at her</Box>
        <Box component="span" sx={{ bgcolor: colors.selectionBg, color: colors.selectionText, borderRadius: "2px", px: 0.3, display: "inline", fontSize: "9px" }}>laptop screen.</Box>
        <Box sx={{ color: colors.text, opacity: 0.85, fontSize: "9px" }}>She sighs deeply.</Box>
        <Box sx={{ ml: "1.6in", fontWeight: 700, textTransform: "uppercase", color: colors.text, fontSize: "9px" }}>JANE</Box>
        <Box sx={{ ml: "0.8in", mr: "0.8in", p: 0.6, borderRadius: "4px", bgcolor: colors.dropdown, color: colors.dropdownText, border: `1px solid ${colors.border}`, fontSize: "8px" }}>
          <Box sx={{ ml: "0.4in", fontStyle: "italic", opacity: 0.7, fontSize: "7px" }}>(worried)</Box>
          <Box sx={{ ml: "0.4in", fontSize: "8px" }}>I can't believe he left me this note...</Box>
        </Box>
        <Box sx={{ my: 0.5, borderTop: `1px dashed ${colors.border}`, opacity: 0.4 }} />
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
                          <Box sx={{ width: 32, height: 32, borderRadius: "8px", overflow: "hidden", display: "flex", flexShrink: 0, border: "1px solid", borderColor: "divider" }}>
                            <Box sx={{ width: 8, bgcolor: tc.sidebar }} />
                            <Box sx={{ flex: 1, bgcolor: tc.editor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: tc.accent }} />
                            </Box>
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
