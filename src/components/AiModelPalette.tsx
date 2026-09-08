import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, List, ListSubheader, ListItemButton, ListItemIcon, ListItemText, Box, Typography, useTheme } from "@mui/material";
import { usePromptConfig, setPromptConfigField, fetchModels, getActiveModelName } from "../hooks/usePromptConfig";
import { useApiList } from "../hooks/useApiList";
import { STORAGE_KEYS } from "../constants";
import { useModalWindows } from "../hooks/useModalWindows";
import { useUI } from "../context";
import { CheckIcon, SettingsIcon, MuseIcon, AutoAwesomeIcon, CloseIcon } from "./Icons";

interface AiModelPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiModelPalette: React.FC<AiModelPaletteProps> = ({ isOpen, onClose }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const config = usePromptConfig();
  const apiList = useApiList();
  const { openSettingsWindow } = useModalWindows();
  const { setActiveRightPane } = useUI();
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeModelName = getActiveModelName(config);
  const isDisabled = config.provider === "none";

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(0);
    let cancelled = false;
    setLoading(true);
    fetchModels("ollama").then((models) => {
      if (cancelled) return;
      setOllamaModels(models);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleDisable = () => {
    setPromptConfigField("provider", "none");
    setActiveRightPane(null);
    onClose();
  };

  const handleSelectOllama = (model: string) => {
    setPromptConfigField("provider", "ollama");
    setPromptConfigField("model", model);
    onClose();
  };

  const handleSelectApi = (id: string) => {
    const entry = apiList.find((e) => e.id === id);
    if (!entry) return;
    localStorage.setItem(STORAGE_KEYS.PROMPT_API_ENDPOINT, entry.endpoint);
    localStorage.setItem(STORAGE_KEYS.PROMPT_API_KEY, entry.apiKey);
    localStorage.setItem(STORAGE_KEYS.PROMPT_API_MODEL, entry.model);
    setPromptConfigField("provider", "openai-compatible");
    try { window.dispatchEvent(new Event("prompt-config-changed")); } catch {}
    onClose();
  };

  const handleConfigure = () => {
    openSettingsWindow("muse");
    onClose();
  };

  type Item = { id: string; label: string; sub?: string; icon: React.ReactNode; active?: boolean; action: () => void; };
  const items: { header: string; items: Item[] }[] = [];

  const modelItems: Item[] = [];
  for (const m of ollamaModels) {
    const isActive = !isDisabled && config.provider === "ollama" && config.model === m;
    modelItems.push({
      id: `ollama:${m}`,
      label: m,
      sub: "Ollama • local",
      icon: isActive ? <CheckIcon sx={{ fontSize: 16, color: "primary.main" }} /> : <MuseIcon sx={{ fontSize: 16 }} />,
      active: isActive,
      action: () => handleSelectOllama(m),
    });
  }
  for (const e of apiList) {
    const isActive = !isDisabled && config.provider === "openai-compatible" && config.apiModel === e.model && localStorage.getItem(STORAGE_KEYS.PROMPT_API_ENDPOINT) === e.endpoint;
    modelItems.push({
      id: `api:${e.id}`,
      label: e.name || e.model || "Unnamed API",
      sub: e.model ? `${e.model} • ${e.endpoint || "custom endpoint"}` : e.endpoint || "OpenAI-compatible",
      icon: isActive ? <CheckIcon sx={{ fontSize: 16, color: "primary.main" }} /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />,
      active: isActive,
      action: () => handleSelectApi(e.id),
    });
  }

  if (modelItems.length > 0) items.push({ header: `Available Models — Active: ${activeModelName}`, items: modelItems });
  else if (!loading) items.push({ header: "Available Models", items: [] });

  items.push({
    header: "Actions",
    items: [
      { id: "disable", label: isDisabled ? "AI Disabled" : "Disable AI", sub: isDisabled ? "Currently disabled" : "Turn off Muse for this workspace", icon: <CloseIcon sx={{ fontSize: 16 }} />, active: isDisabled, action: handleDisable },
      { id: "configure", label: "Configure Models…", sub: "Open Muse settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: handleConfigure },
    ],
  });

  const flat = items.flatMap((s) => s.items);
  useEffect(() => {
    if (selectedIndex >= flat.length) setSelectedIndex(Math.max(0, flat.length - 1));
  }, [flat.length, selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => (p + 1) % flat.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => (p - 1 + flat.length) % flat.length); }
    else if (e.key === "Enter") { e.preventDefault(); flat[selectedIndex]?.action(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  if (!isOpen) return null;
  let flatIdx = 0;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" hideBackdrop disableScrollLock sx={{ zIndex: 1000001 }} slotProps={{ paper: { onKeyDown: handleKeyDown, sx: { borderRadius: "14px", overflow: "hidden", bgcolor: theme.palette.background.paper + (isDark ? "e6" : "f2"), backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", boxShadow: isDark ? "0 20px 48px -8px rgba(0,0,0,0.6)" : "0 20px 48px -8px rgba(0,0,0,0.2)", backgroundImage: "none" } } }}>
      <Box sx={{ p: 1.5, pb: 1, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 12 }}>Switch AI Model</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{isDisabled ? "AI is disabled" : `Active: ${activeModelName}`} • Alt+Shift+M</Typography>
      </Box>
      <DialogContent dividers sx={{ p: 0, maxHeight: "50vh" }}>
        {loading && <Typography sx={{ p: 2, fontSize: 12 }} color="text.secondary">Loading local models…</Typography>}
        {!loading && modelItems.length === 0 && <Typography sx={{ p: 2, fontSize: 12 }} color="text.secondary">No models configured. Use Configure Models to add one.</Typography>}
        <List disablePadding sx={{ px: 1, py: 0.5 }}>
          {items.map((section) => (
            <Box key={section.header}>
              <ListSubheader sx={{ bgcolor: "transparent", color: "text.secondary", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", py: 0.5, px: 1.5, lineHeight: "24px" }}>{section.header}</ListSubheader>
              {section.items.map((it) => {
                const idx = flatIdx++;
                const isSelected = idx === selectedIndex;
                return (
                  <ListItemButton key={it.id} selected={isSelected} onClick={it.action} onMouseEnter={() => setSelectedIndex(idx)} sx={{ py: 0.8, px: 1.5, my: 0.25, borderRadius: "6px", gap: 1.2, bgcolor: it.active ? `${theme.palette.primary.main}12` : undefined, border: it.active ? `1px solid ${theme.palette.primary.main}30` : "1px solid transparent", "&.Mui-selected": { bgcolor: `${theme.palette.primary.main}20` } }}>
                    <ListItemIcon sx={{ minWidth: "auto", color: it.active ? "primary.main" : "text.secondary" }}>{it.icon}</ListItemIcon>
                    <ListItemText primary={<Typography sx={{ fontWeight: it.active ? 600 : 400, fontSize: "0.84rem" }}>{it.label}</Typography>} secondary={it.sub ? <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{it.sub}</Typography> : undefined} />
                    {it.active && <Typography sx={{ fontSize: 10, fontWeight: 700, color: "primary.main", ml: 1 }}>Active</Typography>}
                  </ListItemButton>
                );
              })}
            </Box>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};
