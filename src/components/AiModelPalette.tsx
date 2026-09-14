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
import { useUI, useEditor } from "../context";
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
  const { editorView } = useEditor();
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevOpen = useRef(isOpen);

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

  useEffect(() => {
    if (prevOpen.current && !isOpen) {
      if (editorView) {
        window.setTimeout(() => {
          if (!document.activeElement || document.activeElement === document.body) {
            editorView.contentDOM.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
    prevOpen.current = isOpen;
  }, [isOpen, editorView]);

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
    isAction?: boolean;
    action: () => void;
  }

  const modelItems: Item[] = [
    {
      id: "disable",
      label: "Disable AI",
      icon: <CloseIcon sx={{ fontSize: 13 }} />,
      active: isDisabled,
      isAction: true,
      action: handleDisable,
    },
  ];

  for (const m of ollamaModels) {
    const isActive =
      !isDisabled && config.provider === "ollama" && config.model === m;
    modelItems.push({
      id: `ollama:${m}`,
      label: m,
      badge: "local",
      icon: <MuseIcon sx={{ fontSize: 13 }} />,
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
      icon: <AutoAwesomeIcon sx={{ fontSize: 13 }} />,
      active: isActive,
      action: () => handleSelectApi(e.id),
    });
  }

  modelItems.push({
    id: "configure",
    label: "Configure Models…",
    icon: <SettingsIcon sx={{ fontSize: 13 }} />,
    isAction: true,
    action: handleConfigure,
  });

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
    const container = containerRef.current;
    if (!container) return;
    const selectedElement = container.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (selectedElement) {
      const elemTop = selectedElement.offsetTop;
      const elemBottom = elemTop + selectedElement.offsetHeight;
      if (elemTop < container.scrollTop) {
        container.scrollTop = elemTop;
      } else if (elemBottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = elemBottom - container.clientHeight;
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      if (navigationItems.length) {
        setSelectedIndex((p) => (p + 1) % navigationItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      if (navigationItems.length) {
        setSelectedIndex((p) => (p - 1 + navigationItems.length) % navigationItems.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (navigationItems[selectedIndex]) {
        navigationItems[selectedIndex].action();
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      e.stopPropagation();
      if (navigationItems.length) {
        setSelectedIndex(navigationItems.length - 1);
      }
    } else if (e.key === "PageDown") {
      e.preventDefault();
      e.stopPropagation();
      if (navigationItems.length) {
        setSelectedIndex((p) => Math.min(navigationItems.length - 1, p + 5));
      }
    } else if (e.key === "PageUp") {
      e.preventDefault();
      e.stopPropagation();
      if (navigationItems.length) {
        setSelectedIndex((p) => Math.max(0, p - 5));
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
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
      disableAutoFocus
      disableRestoreFocus
      sx={{ zIndex: 1000001 }}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-label": "Choose AI model",
          sx: {
            width: 320,
            maxWidth: "85vw",
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: theme.palette.background.paper + (isDark ? "e6" : "f2"),
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid",
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)",
            boxShadow: isDark
              ? "0 16px 40px -8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)"
              : "0 16px 40px -8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.04)",
            backgroundImage: "none",
            color: theme.palette.text.primary,
            cursor: "none",
            p: 1,
            pb: 0,
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.6,
          px: 1,
          minHeight: 32,
          border: "none",
          borderRadius: "7px",
          bgcolor: isDark ? `${theme.palette.text.primary}12` : `${theme.palette.text.primary}08`,
          "&:focus-within": {
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
          },
        }}
      >
        <Box sx={{ display: "flex", color: "var(--button-color, primary.main)" }}>
          <SearchIcon sx={{ fontSize: 16 }} />
        </Box>
        <InputBase
          inputRef={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Filter models..."
          inputProps={{
            "aria-label": "Filter AI models",
            "aria-controls": "ai-model-options",
            "aria-activedescendant": navigationItems[selectedIndex]?.id,
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "0.8rem",
            color: "text.primary",
            "& input::placeholder": { color: "text.secondary", opacity: 0.6 },
          }}
        />
        <Typography sx={{ fontSize: "0.65rem", color: "text.disabled", flexShrink: 0, fontFamily: "monospace" }}>
          ↑↓
        </Typography>
      </Box>

      <DialogContent
        ref={containerRef}
        sx={{
          p: 0,
          mt: 0.75,
          maxHeight: 300,
          overflowY: "auto",
        }}
      >
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
          sx={{ py: 0.25 }}
        >
          {filteredModelItems.map((it, modelIndex) => {
            const idx = modelIndex;
            const isSelected = idx === selectedIndex;
            return (
              <ListItemButton
                key={it.id}
                id={it.id}
                data-index={idx}
                role="option"
                aria-selected={isSelected}
                selected={isSelected}
                onClick={it.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                sx={{
                  py: 0.6,
                  px: 1,
                  my: 0.15,
                  borderRadius: "6px",
                  gap: 1,
                  transition: "all var(--duration-fast) ease",
                  bgcolor: isSelected
                    ? `${theme.palette.primary.main}20`
                    : it.active && it.id !== "disable"
                    ? alpha(theme.palette.primary.main, 0.1)
                    : undefined,
                  "&.Mui-selected": {
                    bgcolor: `${theme.palette.primary.main}20`,
                  },
                  "&:hover": {
                    bgcolor: isSelected
                      ? `${theme.palette.primary.main}20`
                      : `${theme.palette.primary.main}12`,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: "auto",
                    color: isSelected
                      ? "var(--button-color, primary.main)"
                      : it.id === "disable" && it.active
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
                        fontSize: "0.8rem",
                        fontWeight: isSelected || (it.active && it.id !== "disable") ? 600 : 400,
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

      <Divider sx={{ mx: -1.25, mt: 0.5 }} />

      <Box
        sx={{
          mx: -1.25,
          px: 1.5,
          py: 0.8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: isDark ? `${theme.palette.background.default}66` : "action.hover",
          color: theme.palette.text.secondary,
        }}
      >
        <Box sx={{ display: "flex", gap: 1.25 }}>
          <Typography variant="caption" color="text.secondary">
            <Typography
              variant="caption"
              component="span"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                bgcolor: isDark ? `${theme.palette.text.primary}1a` : "action.selected",
                color: theme.palette.text.primary,
                px: 0.5,
                py: 0.15,
                borderRadius: "3px",
              }}
            >
              ↑↓
            </Typography>{" "}
            navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Typography
              variant="caption"
              component="span"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                bgcolor: isDark ? `${theme.palette.text.primary}1a` : "action.selected",
                color: theme.palette.text.primary,
                px: 0.5,
                py: 0.15,
                borderRadius: "3px",
              }}
            >
              Enter
            </Typography>{" "}
            select
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Typography
              variant="caption"
              component="span"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                bgcolor: isDark ? `${theme.palette.text.primary}1a` : "action.selected",
                color: theme.palette.text.primary,
                px: 0.5,
                py: 0.15,
                borderRadius: "3px",
              }}
            >
              Esc
            </Typography>{" "}
            close
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.7, fontSize: "0.68rem" }}>
          AI Models
        </Typography>
      </Box>
    </Dialog>
  );
};
