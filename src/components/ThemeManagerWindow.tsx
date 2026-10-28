import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, Typography, IconButton, Button, TextField } from "@mui/material";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { TitleBar } from "./TitleBar";
import { CrossWindowTourCard } from "./CrossWindowTourCard";
import { THEMING_STEPS } from "./OnboardingTour";
import { createActOneTheme, themes, THEME_CATEGORIES, ADAPTIVE_THEME_META, type ThemeColors } from "../theme";
import { resolveThemeConfig } from "../theme/themeUtils";
import { initThemeEngine, setThemeState as engineSetTheme, onThemeChanged, getInitialThemeId, getInitialCustomThemes } from "../theme/ThemeEngine";
import { AddIcon, DeleteIcon, CheckIcon, DownloadIcon, UploadIcon } from "./Icons";
import { invoke } from "@tauri-apps/api/core";
import { ThemePresetTile } from "./ThemePresetTile";
import { ThemeRecipeEditor } from "./ThemeRecipeEditor";
import { compileTheme, themeIsDark } from "../theme/paletteEngine";
import { ThemeManagerPreview } from "./ThemeManagerPreview";
import { WindowResizeHandles } from "./WindowResizeHandles";
import { completeCustomColors, exportTheme, importTheme } from "../theme/themeUtils";
import { confirmDialog } from "../utils/dialog";

const EMPTY_COLORS = compileTheme({ interface: "#f1f2f4", accent: "#7659a6", paper: "#fffcf5" });

interface CustomTheme {
  id: string; name: string; isDark: boolean; colors: ThemeColors;
}



export const ThemeManagerWindow: React.FC = () => {
  const [themeId, setThemeId] = useState(() => getInitialThemeId());
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => getInitialCustomThemes() as CustomTheme[]);
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
      try { setCustomThemes(JSON.parse(state.customThemes)); } catch { setCustomThemes([]); }
    });
    return onThemeChanged((state) => {
      setThemeId(state.themeId);
      try { setCustomThemes(JSON.parse(state.customThemes)); } catch { setCustomThemes([]); }
    });
  }, []);

  const setTheme = (id: string) => {
    setThemeId(id);
    engineSetTheme({ themeId: id });
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
    setForm({ ...ct.colors, app: ct.colors.app ?? ct.colors.editor, editorText: ct.colors.editorText ?? ct.colors.text });
    setEditingId(ct.id);
    setShowForm(true);
  };

  const applyPreset = (preset: { name: string; colors: { sidebar: string; editor: string; accent: string } }) => {
    setFormName(preset.name);
    const colors = compileTheme({ interface: preset.colors.sidebar, accent: preset.colors.accent, paper: preset.colors.editor });
    setFormIsDark(themeIsDark(colors));
    setForm(colors);
  };

  const handleExportTheme = async (theme: CustomTheme) => {
    try {
      const payload = exportTheme(theme);

      if (!(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) return;
      await invoke("save_theme_dialog", {
        content: payload,
        defaultName: `${theme.name}.actheme`
      });
    } catch (err) {
      console.error("Failed to export theme", err);
      alert("Failed to export theme.");
    }
  };

  const handleImportTheme = async () => {
    try {
      if (!(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) return;
      const result = await invoke<{ path: string; content: string } | null>("import_theme_dialog");
      if (!result) return;

      const newTheme = importTheme(result.content);

      const updated = [...customThemes, newTheme];
      setCustomThemes(updated);
      engineSetTheme({ customThemes: JSON.stringify(updated) });
    } catch (err) {
      console.error("Theme import failed", err);
      alert("Failed to import theme.");
    }
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const full = completeCustomColors(form, formIsDark);
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

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirmDialog("Delete this custom theme? This cannot be undone.", { kind: "warning" });
    if (!isConfirmed) return;
    const updated = customThemes.filter(t => t.id !== id);
    setCustomThemes(updated);
    engineSetTheme({ customThemes: JSON.stringify(updated) });
    if (themeId === id) setTheme("light");
  };

  const currentThemeConfig = useMemo(() => resolveThemeConfig(themeId, customThemes, systemDark), [themeId, customThemes, systemDark]);
  const muiTheme = useMemo(() => createActOneTheme(currentThemeConfig, 100), [currentThemeConfig]);
  const previewConfig = useMemo(() => showForm ? { ...currentThemeConfig, name: formName, colors: form, isDark: formIsDark } : currentThemeConfig, [showForm, currentThemeConfig, formName, form, formIsDark]);

  const handleClose = async () => {
    try {
      if (!(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) { window.close(); return; }
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch { window.close(); }
  };

  const params = new URLSearchParams(window.location.search);
  const isTourMode = params.get("tour") === "theming";

  const [tourActive, setTourActive] = useState(isTourMode);
  const [tourStep, setTourStep] = useState(0);
  const [tourTaskComplete, setTourTaskComplete] = useState(false);

  const initialThemeId = useRef(themeId);

  useEffect(() => {
    if (!tourActive) return;
    setTourTaskComplete(false);

    if (tourStep === 0 || tourStep >= 3) {
      setTourTaskComplete(true);
      return;
    }

    const interval = setInterval(() => {
      let complete = false;
      if (tourStep === 1) complete = themeId !== initialThemeId.current;
      else if (tourStep === 2) complete = showForm;
      if (complete) {
        setTourTaskComplete(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [tourActive, tourStep, themeId, showForm]);

  const handleTourNext = () => {
    if (tourStep < THEMING_STEPS.length - 1) {
      setTourStep((p) => p + 1);
      setTourTaskComplete(false);
    } else {
      handleClose();
    }
  };

  const handleTourBack = () => {
    if (tourStep > 0) {
      setTourStep((p) => p - 1);
      setTourTaskComplete(false);
    }
  };

  const handleTourCancel = () => {
    setTourActive(false);
    handleClose();
  };

  useEffect(() => {
    if (!tourActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.shiftKey || e.metaKey) && tourTaskComplete) {
        e.preventDefault();
        e.stopPropagation();
        handleTourNext();
      }
    };
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [tourActive, tourTaskComplete]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <TitleBar title="Theme Manager" onClose={handleClose} />
        <WindowResizeHandles />
        <Box sx={{ flex: 1, display: "flex", gap: 1.5, p: 2, minHeight: 0 }}>
          {/* Left pane */}
          <Box sx={{
            width: "40%", flex: "0 0 40%", minWidth: 300, display: "flex", flexDirection: "column",
            border: "1px solid", borderColor: "divider", borderRadius: '10px', p: 1.5, minHeight: 0,
          }}>
            {showForm ? (
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, mb: 1.25, display: "block" }}>
                  {editingId ? "EDIT THEME" : "CREATE THEME"}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 11, color: "text.secondary" }}>THEME NAME</Typography>
                  <TextField size="small" fullWidth slotProps={{ htmlInput: { "aria-label": "Theme name" } }} value={formName} onChange={(e) => setFormName(e.target.value)}
                    sx={{ "& .MuiOutlinedInput-notchedOutline": { border: "none" }, bgcolor: "action.hover", borderRadius: '6px', "&:hover": { bgcolor: "action.selected" }, "& .MuiOutlinedInput-input": { py: 0.6, px: 1.25, fontSize: 12 } }}
                  />
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
                    <ThemePresetTile key={p.name} name={p.name} colors={p.colors} selected={form.sidebar.toLowerCase() === p.colors.sidebar && form.editor.toLowerCase() === p.colors.editor && form.accent.toLowerCase() === p.colors.accent} onSelect={() => applyPreset(p)} />
                  ))}
                </Box>
                <ThemeRecipeEditor key={editingId ?? "new"} colors={form} onChange={colors => { setForm(colors); setFormIsDark(themeIsDark(colors)); }} />
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 2.5, position: "sticky", bottom: 0, bgcolor: "background.paper", py: 1 }}>
                  <Button size="small" variant="outlined" color="inherit" onClick={resetForm} sx={{ borderRadius: '6px', fontSize: 11 }}>Cancel</Button>
                  <Button size="small" variant="contained" color="primary" onClick={handleSave} disabled={!formName.trim()} sx={{ borderRadius: '6px', fontSize: 11 }}>{editingId ? "Update" : "Save"}</Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", pr: 0.5 }}>
                {THEME_CATEGORIES.map(cat => {
                  const catThemes = themes.filter(t => t.category === cat.category);
                  return (
                    <Box key={cat.label} sx={{ mb: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, mb: 0.75, display: "block" }}>{cat.label}</Typography>
                      {cat.adaptiveId && (() => {
                        const meta = ADAPTIVE_THEME_META[cat.adaptiveId!];
                        const isActive = themeId === cat.adaptiveId;
                        return (
                          <Box onClick={() => setTheme(cat.adaptiveId!)} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1, mb: 0.5, borderRadius: '8px', cursor: "pointer", border: "2px solid", borderColor: isActive ? "primary.main" : "divider", bgcolor: isActive ? "action.selected" : "transparent", "&:hover": { bgcolor: "action.hover" }, transition: "all var(--duration-fast) ease" }}>
                            <Box sx={{ width: 32, height: 32, borderRadius: '6px', overflow: "hidden", display: "flex", flexShrink: 0, border: "1px solid", borderColor: "divider" }}>
                              <Box sx={{ flex: 1, bgcolor: meta.splitLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: meta.splitLightDot }} />
                              </Box>
                              <Box sx={{ width: "2px", bgcolor: "divider" }} />
                              <Box sx={{ flex: 1, bgcolor: meta.splitDarkBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: meta.splitDarkDot }} />
                              </Box>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, fontSize: 12 }}>
                                {isActive && <CheckIcon sx={{ fontSize: 14, color: "primary.main" }} />}{meta.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Follows system preference</Typography>
                            </Box>
                          </Box>
                        );
                      })()}
                      {catThemes.map(t => {
                        const isActive = themeId === t.id;
                        const tc = t.colors;
                        return (
                          <Box key={t.id} onClick={() => setTheme(t.id)} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1, mb: 0.5, borderRadius: '8px', cursor: "pointer", border: "2px solid", borderColor: isActive ? "primary.main" : "divider", bgcolor: isActive ? "action.selected" : "transparent", "&:hover": { bgcolor: "action.hover" }, transition: "all var(--duration-fast) ease" }}>
                            <Box sx={{ width: 32, height: 32, borderRadius: '6px', overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", flexShrink: 0, border: "1px solid", borderColor: "divider" }}>
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
                  );
                })}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, display: "block" }}>CUSTOM THEMES</Typography>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Button size="small" startIcon={<UploadIcon sx={{ fontSize: 14 }} />} onClick={handleImportTheme} sx={{ borderRadius: '6px', fontSize: 11 }}>Import</Button>
                    <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={startCreate} sx={{ borderRadius: '6px', fontSize: 11 }}>Create</Button>
                  </Box>
                </Box>
                {customThemes.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2, fontSize: "0.8rem", fontStyle: "italic" }}>No custom themes yet.</Typography>
                )}
                {customThemes.map(ct => {
                  const isActive = themeId === ct.id;
                  return (
                    <Box key={ct.id} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, mb: 0.5, borderRadius: '8px', cursor: "pointer", border: "2px solid", borderColor: isActive ? "primary.main" : "transparent", bgcolor: isActive ? "action.selected" : "transparent", "&:hover": { bgcolor: "action.hover" }, transition: "all var(--duration-fast) ease" }} onClick={() => setTheme(ct.id)}>
                      <Box sx={{ width: 28, height: 28, borderRadius: '6px', overflow: "hidden", display: "flex", flexShrink: 0, border: "1px solid", borderColor: "divider" }}>
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
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleExportTheme(ct); }} title="Export Theme (.actheme)" sx={{ color: "text.secondary", borderRadius: '6px' }}>
                        <DownloadIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); startEdit(ct); }} sx={{ color: "text.secondary", borderRadius: '6px' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem" }}>EDIT</Typography>
                      </IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(ct.id); }} sx={{ color: "text.secondary", borderRadius: '6px' }}>
                        <DeleteIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
          {/* Right pane: preview */}
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: "1px solid", borderColor: "divider", borderRadius: '10px', p: 1.5, minHeight: 0 }}>
            <ThemeManagerPreview config={previewConfig} draft={showForm} />
          </Box>
        </Box>
      </Box>
      {tourActive && (
        <CrossWindowTourCard
          step={THEMING_STEPS[tourStep]}
          tourName="Themes"
          progress={((tourStep + 1) / THEMING_STEPS.length) * 100}
          taskComplete={tourTaskComplete}
          isLastStep={tourStep === THEMING_STEPS.length - 1}
          stepNumber={tourStep + 1}
          totalSteps={THEMING_STEPS.length}
          onNext={handleTourNext}
          onBack={tourStep > 0 ? handleTourBack : undefined}
          onCancel={handleTourCancel}
        />
      )}
    </MuiThemeProvider>
  );
};
