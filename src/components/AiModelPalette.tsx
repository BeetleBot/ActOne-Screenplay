import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  InputBase,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  usePromptConfig,
  setPromptConfigField,
  fetchModels,
} from "../hooks/usePromptConfig";
import { useApiList } from "../hooks/useApiList";
import { STORAGE_KEYS } from "../constants";
import { useModalWindows } from "../hooks/useModalWindows";
import { useUI } from "../context";
import {
  CheckIcon,
  SettingsIcon,
  AutoAwesomeIcon,
  CloseIcon,
  MuseIcon,
  SearchIcon,
} from "./Icons";

interface AiModelPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiModelPalette: React.FC<AiModelPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const config = usePromptConfig();
  const apiList = useApiList();
  const { openSettingsWindow } = useModalWindows();
  const { setActiveRightPane } = useUI();
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isDisabled = config.provider === "none";

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(0);
    setSearch("");
    const focusSearch = window.setTimeout(() => {
      searchRef.current?.focus({ preventScroll: true });
    }, 40);
    let cancelled = false;
    setLoading(true);
    fetchModels("ollama").then((models) => {
      if (cancelled) return;
      setOllamaModels(models);
      setLoading(false);
    });
    return () => {
      window.clearTimeout(focusSearch);
      cancelled = true;
    };
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
    try {
      window.dispatchEvent(new Event("prompt-config-changed"));
    } catch {}
    onClose();
  };

  const handleConfigure = () => {
    openSettingsWindow("muse");
    onClose();
  };

  interface Item {
    id: string;
    label: string;
    badge?: string;
    icon: React.ReactNode;
    active?: boolean;
    action: () => void;
  }

  const modelItems: Item[] = [];

  for (const m of ollamaModels) {
    const isActive =
      !isDisabled && config.provider === "ollama" && config.model === m;
    modelItems.push({
      id: `ollama:${m}`,
      label: m,
      badge: "local",
      icon: <MuseIcon sx={{ fontSize: 14 }} />,
      active: isActive,
      action: () => handleSelectOllama(m),
    });
  }

  for (const e of apiList) {
    const isActive =
      !isDisabled &&
      config.provider === "openai-compatible" &&
      config.apiModel === e.model &&
      localStorage.getItem(STORAGE_KEYS.PROMPT_API_ENDPOINT) === e.endpoint;
    modelItems.push({
      id: `api:${e.id}`,
      label: e.name || e.model || "Unnamed API",
      badge: "API",
      icon: <AutoAwesomeIcon sx={{ fontSize: 14 }} />,
      active: isActive,
      action: () => handleSelectApi(e.id),
    });
  }

  const actionItems: Item[] = [
    {
      id: "disable",
      label: "Disable AI",
      icon: <CloseIcon sx={{ fontSize: 13 }} />,
      active: isDisabled,
      action: handleDisable,
    },
    {
      id: "configure",
      label: "Configure Models…",
      icon: <SettingsIcon sx={{ fontSize: 13 }} />,
      action: handleConfigure,
    },
  ];

  const filteredModelItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return modelItems;
    return modelItems.filter((item) => item.label.toLocaleLowerCase().includes(query));
  }, [modelItems, search]);

  const navigationItems = filteredModelItems;

  useEffect(() => {
    if (selectedIndex >= navigationItems.length) {
      setSelectedIndex(Math.max(0, navigationItems.length - 1));
    }
  }, [navigationItems.length, selectedIndex]);

  useEffect(() => {
    const selectedItem = navigationItems[selectedIndex];
    if (selectedItem) {
      itemRefs.current[selectedItem.id]?.scrollIntoView({ block: "nearest" });
    }
  }, [navigationItems, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!navigationItems.length) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((p) => (p + 1) % navigationItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((p) => (p - 1 + navigationItems.length) % navigationItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigationItems[selectedIndex]?.action();
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedIndex(navigationItems.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      hideBackdrop
      disableScrollLock
      sx={{ zIndex: 1000001 }}
      slotProps={{
        paper: {
          onKeyDown: handleKeyDown,
          role: "dialog",
          "aria-label": "Choose AI model",
          sx: {
            width: 340,
            maxWidth: "90vw",
            borderRadius: "12px",
            overflow: "hidden",
            bgcolor: "background.paper",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: isDark
              ? "0 20px 48px -8px rgba(0, 0, 0, 0.62)"
              : "0 20px 48px -8px rgba(0, 0, 0, 0.18)",
            backgroundImage: "none",
            p: 0.75,
          },
        },
      }}
    >
      <Box sx={{ display: "flex", gap: 0.5, mb: 0.75 }}>
        {actionItems.map((it) => {
          return (
            <ListItemButton
              key={it.id}
              role="button"
              aria-pressed={it.active}
              onClick={it.action}
              sx={{
                minWidth: 0,
                flex: 1,
                minHeight: 30,
                justifyContent: "center",
                gap: 0.6,
                px: 0.75,
                py: 0.4,
                borderRadius: "6px",
                color: it.active && it.id === "disable" ? "error.main" : "text.secondary",
                bgcolor: it.active && it.id === "disable"
                  ? alpha(theme.palette.error.main, 0.1)
                  : alpha(theme.palette.text.primary, 0.035),
                "&:hover": {
                  bgcolor: it.active && it.id === "disable"
                    ? alpha(theme.palette.error.main, 0.16)
                    : alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              {it.icon}
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                {it.label}
              </Typography>
            </ListItemButton>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1,
          minHeight: 34,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "6px",
          bgcolor: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.035),
          "&:focus-within": {
            borderColor: alpha(theme.palette.primary.main, 0.7),
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.12)}`,
          },
        }}
      >
        <SearchIcon sx={{ fontSize: 15, color: "text.secondary" }} />
        <InputBase
          inputRef={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Filter models"
          inputProps={{
            "aria-label": "Filter AI models",
            "aria-controls": "ai-model-options",
            "aria-activedescendant": navigationItems[selectedIndex]?.id,
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "0.76rem",
            color: "text.primary",
            "& input::placeholder": { color: "text.secondary", opacity: 0.8 },
          }}
        />
        <Typography sx={{ fontSize: "0.62rem", color: "text.disabled", flexShrink: 0 }}>
          ↑↓
        </Typography>
      </Box>

      <DialogContent sx={{ p: 0, mt: 0.75, maxHeight: 300, overflowY: "auto" }}>
        {loading && (
          <Typography
            sx={{ p: 1.5, fontSize: "0.74rem", textAlign: "center" }}
            color="text.secondary"
          >
            Loading models…
          </Typography>
        )}

        <List
          id="ai-model-options"
          disablePadding
          role="listbox"
          aria-label="AI models and actions"
          sx={{ py: 0.15 }}
        >
          {filteredModelItems.map((it, modelIndex) => {
            const idx = modelIndex;
            const isSelected = idx === selectedIndex;
            const isFirstModel = modelIndex === 0;
            return (
              <React.Fragment key={it.id}>
                {isFirstModel && <Divider sx={{ my: 0.5, opacity: 0.55 }} />}
                <ListItemButton
                  id={it.id}
                  ref={(node: HTMLDivElement | null) => { itemRefs.current[it.id] = node; }}
                  role="option"
                  aria-selected={isSelected}
                  selected={isSelected}
                  onClick={it.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  sx={{
                    py: 0.45,
                    px: 0.9,
                    my: 0.1,
                    minHeight: 29,
                    borderRadius: "6px",
                    gap: 0.9,
                     bgcolor: it.active && it.id !== "disable"
                       ? alpha(theme.palette.primary.main, 0.1)
                       : undefined,
                     "&.Mui-selected": {
                       bgcolor: it.active && it.id !== "disable"
                         ? alpha(theme.palette.primary.main, 0.18)
                         : alpha(theme.palette.primary.main, 0.1),
                     },
                     "&:hover": {
                       bgcolor: it.active && it.id !== "disable"
                         ? alpha(theme.palette.primary.main, 0.18)
                         : alpha(theme.palette.primary.main, 0.08),
                     },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: "auto",
                      color:
                        it.id === "disable" && it.active
                          ? "error.main"
                          : it.active
                          ? "primary.main"
                          : "text.secondary",
                    }}
                  >
                    {it.icon}
                  </ListItemIcon>

                  <ListItemText
                    disableTypography
                    primary={
                      <Typography
                        sx={{
                          fontSize: "0.76rem",
                          fontWeight: it.active && it.id !== "disable" ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color:
                            it.id === "disable" && it.active
                              ? "error.main"
                              : it.active
                              ? "text.primary"
                              : "text.secondary",
                        }}
                        title={it.label}
                      >
                        {it.label}
                      </Typography>
                    }
                  />

                  {it.badge && (
                    <Typography
                      sx={{
                        fontSize: "0.6rem",
                        fontWeight: 500,
                        px: 0.5,
                        py: 0.1,
                        borderRadius: "3px",
                         bgcolor: alpha(
                           it.badge === "local" ? theme.palette.success.main : theme.palette.info.main,
                           0.12,
                         ),
                         color: it.badge === "local" ? "success.main" : "info.main",
                        lineHeight: 1.2,
                        flexShrink: 0,
                      }}
                    >
                      {it.badge}
                    </Typography>
                  )}

                  {it.active && it.id !== "disable" && (
                    <CheckIcon
                      sx={{
                        fontSize: 13,
                        color: "primary.main",
                        flexShrink: 0,
                        ml: 0.2,
                      }}
                    />
                  )}
                </ListItemButton>
              </React.Fragment>
            );
          })}
          {!loading && filteredModelItems.length === 0 && (
            <Typography
              sx={{ px: 1.25, py: 2, fontSize: "0.74rem", textAlign: "center" }}
              color="text.secondary"
            >
              {search ? "No matching models" : "No models available"}
            </Typography>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};
