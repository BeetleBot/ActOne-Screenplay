import React, { useEffect, useState } from "react";
import { useFile, useTheme as useAppTheme } from "../context";
import type { RecentFile } from "../context/FileContext";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useModalWindows, useStoreUpdateCheck } from "../hooks";
import { Box, Typography, useTheme, alpha, Menu, MenuItem } from "@mui/material";
import { logger } from "../utils/logger";
import { ThemeLogo } from "./ThemeLogo";
import { TutorialSelectionDialog } from "./OnboardingTour";
import { AddIcon, FolderOpenIcon, CombineColumnsIcon, HelpOutlinedIcon, DeleteIcon, DiscordIcon, PlayArrowIcon, MenuBookIcon, DescriptionIcon, ColorLensIcon, CloseIcon, MinimizeIcon } from "./Icons";
import { getRandomQuote, type Quote } from "../data/quotes";
import { themes as themeList, ADAPTIVE_THEME_META, THEME_CATEGORIES } from "../theme/muiTheme";

interface WelcomeScreenWindowProps {
  standalone?: boolean;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function getFileTypeIcon(name: string): "actone" | "fountain" | "file" {
  const lower = name.toLowerCase();
  if (lower.endsWith(".actone")) return "actone";
  if (lower.endsWith(".fountain") || lower.endsWith(".txt")) return "fountain";
  return "file";
}

function getDirectory(path: string): string {
  const parts = path.split(/[/\\]/);
  if (parts.length <= 1) return path;
  parts.pop();
  return parts.join("/");
}

export const WelcomeScreenWindow: React.FC<WelcomeScreenWindowProps> = ({ standalone = false }) => {
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();
  const { openHelpWindow } = useModalWindows();
  const appVersion = __APP_VERSION__;
  const appChannel = __APP_CHANNEL__;
  const { updateAvailable, installUpdate } = useStoreUpdateCheck();
  const [tutorialDialogOpen, setTutorialDialogOpen] = useState(false);
  const [quote, setQuote] = useState<Quote>(getRandomQuote());
  const handleQuoteClick = () => setQuote(getRandomQuote());
  const emptyMessages = [
    "What are you doing? This is empty. Start writing!",
    "No recent projects yet. What are you waiting for?",
    "This space is screaming for a screenplay.",
    "Blank pages don't write themselves!",
    "Your next masterpiece is just a click away.",
    "Don't leave me hanging. Create something!",
  ];
  const [emptyMessage] = useState(() => emptyMessages[Math.floor(Math.random() * emptyMessages.length)]);
  const [themeAnchor, setThemeAnchor] = useState<null | HTMLElement>(null);
  const { theme: currentThemeId, setTheme: setAppTheme, customThemes } = useAppTheme();
  const theme = useTheme();

  const handleSelectTour = async (type: "ui" | "fountain") => {
    try {
      localStorage.setItem("pending-action", "tutorial");
      localStorage.setItem("pending-tutorial-type", type);
      const created = await createEditorWindow("tutorial");
      if (created) {
        closeWelcome();
      }
    } catch (e) {
      logger.error("welcome", "Failed to start tutorial:", e);
    }
  };

  useEffect(() => {
    invoke<string[]>("get_cli_args").then((paths) => {
      if (paths && paths.length > 0) {
        const filePath = paths[0];
        localStorage.setItem("pending-open-path", filePath);
        localStorage.setItem("pending-action", "open");
        createEditorWindow("open").then(created => {
          if (created) closeWelcome();
        });
      }
    }).catch(e => logger.error("welcome", "get_cli_args failed", e));
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string[]>("file-opened", (event) => {
          const paths = event.payload;
          if (!paths || paths.length === 0) return;
          const filePath = paths[0];
          localStorage.setItem("pending-open-path", filePath);
          localStorage.setItem("pending-action", "open");
          createEditorWindow("open").then(created => {
            if (created) closeWelcome();
          });
        });
      } catch (e) { logger.error("welcome", "Failed to listen for file-opened events", e); }
    };
    setup();
    return () => { if (unlisten) unlisten(); };
  }, []);

  useEffect(() => {
    if (!standalone) return;
    const handleKeyDown = async (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "n") {
        e.stopPropagation();
        e.preventDefault();
        localStorage.setItem("pending-action", "new");
        const created = await createEditorWindow("new");
        if (created) {
          const { listen } = await import("@tauri-apps/api/event");
          const unlisten = await listen("editor:ready", () => {
            unlisten();
            closeWelcome();
          });
          setTimeout(() => { unlisten(); }, 10000);
        }
      } else if (ctrl && e.key === "o") {
        e.stopPropagation();
        e.preventDefault();
        try {
          const result = await invoke<{ path: string; content: string } | null>("open_file_dialog");
          if (result && result.path) {
            localStorage.setItem("pending-open-path", result.path);
            localStorage.setItem("pending-action", "open");
            const created = await createEditorWindow("open");
            if (created) {
              const { listen } = await import("@tauri-apps/api/event");
              const unlisten = await listen("editor:ready", () => {
                unlisten();
                closeWelcome();
              });
              setTimeout(() => { unlisten(); }, 10000);
            }
          }
        } catch (err) { logger.error("welcome", "Ctrl+O failed", err); }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [standalone]);

  const createEditorWindow = async (action: string): Promise<boolean> => {
    try {
      const webview = new WebviewWindow("main", {
        url: `/?action=${action}`,
        title: "ActOne",
        width: 1000,
        height: 700,
        decorations: false,
      });
      await Promise.race([
        new Promise<void>((resolve) => webview.once("tauri://created", () => resolve())),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 5000)
        ),
      ]);
      return true;
    } catch (e) {
      logger.error("welcome", "Failed to create editor window", e);
      return false;
    }
  };

  const closeWelcome = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      logger.error("welcome", "closeWelcome failed", e);
    }
  };

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      logger.error("welcome", "minimize failed", e);
    }
  };

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-drag]") || target.closest("button, [role='button'], a, .clickable")) return;
    try {
      await getCurrentWindow().startDragging();
    } catch (e) {
      logger.error("welcome", "startDrag failed", e);
    }
  };

  const handleNew = async () => {
    if (standalone) {
      try {
        localStorage.setItem("pending-action", "new");
        const created = await createEditorWindow("new");
        if (created) {
          const { listen } = await import("@tauri-apps/api/event");
          const unlisten = await listen("editor:ready", () => {
            unlisten();
            closeWelcome();
          });
          setTimeout(() => { unlisten(); }, 10000);
          return;
        }
      } catch (e) { logger.error("welcome", "handleNew failed", e); }
    }
    newFile();
  };

  const handleOpen = async () => {
    if (standalone) {
      try {
        const result = await invoke<{ path: string; content: string } | null>("open_file_dialog");
        if (result && result.path) {
          localStorage.setItem("pending-open-path", result.path);
          localStorage.setItem("pending-action", "open");
          const created = await createEditorWindow("open");
          if (created) {
            const { listen } = await import("@tauri-apps/api/event");
            const unlisten = await listen("editor:ready", () => {
              unlisten();
              closeWelcome();
            });
            setTimeout(() => { unlisten(); }, 10000);
            return;
          }
        }
      } catch (e) { logger.error("welcome", "handleOpen failed", e); }
    }
    await openFile();
  };

  const handleTemplates = async () => {
    if (standalone) {
      try {
        localStorage.setItem("pending-action", "template");
        const created = await createEditorWindow("template");
        if (created) {
          const { listen } = await import("@tauri-apps/api/event");
          const unlisten = await listen("editor:ready", () => {
            unlisten();
            closeWelcome();
          });
          setTimeout(() => { unlisten(); }, 10000);
          return;
        }
      } catch (e) { logger.error("welcome", "handleTemplates failed", e); }
    }
    newFile();
  };

  const handleOpenRecent = async (path: string) => {
    if (standalone) {
      try {
        localStorage.setItem("pending-open-path", path);
        localStorage.setItem("pending-action", "open");
        const created = await createEditorWindow("open");
        if (created) { closeWelcome(); return; }
      } catch (e) { logger.error("welcome", "handleOpenRecent failed", e); }
    }
    openFilePath(path);
  };

  const handleHelp = () => {
    openHelpWindow();
  };

  const handleOpenThemeMenu = (e: React.MouseEvent<HTMLElement>) => {
    setThemeAnchor(e.currentTarget);
  };

  const handleCloseThemeMenu = () => {
    setThemeAnchor(null);
  };

  const handleSelectTheme = (themeId: string) => {
    setAppTheme(themeId);
    handleCloseThemeMenu();
  };

  return (
    <Box
      onMouseDown={handleStartDrag}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        overflow: "hidden",
        boxSizing: "border-box",
        cursor: "grab",
        fontFamily: '"Noto Sans", sans-serif',
        "& .MuiTypography-root": { fontFamily: '"Noto Sans", sans-serif' },
      }}
    >
      <Box sx={{ display: "flex", height: 120, minHeight: 120, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box
            sx={{
              width: "20%",
              borderRight: `1px solid rgba(0,0,0,0.2)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: theme.palette.primary.main,
              p: 1,
              boxSizing: "border-box",
            }}
          >
            <Box sx={{ width: 100, height: 100, color: theme.palette.primary.contrastText, lineHeight: 0, filter: `drop-shadow(0 0 12px ${alpha(theme.palette.primary.contrastText, 0.3)})` }}>
            <ThemeLogo variant="solid" />
          </Box>
        </Box>

        <Box sx={{ width: "60%", display: "flex", flexDirection: "column", borderRight: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
          <Box
            sx={{
              height: 60,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.01em", color: theme.palette.text.primary }}>
              Welcome To ActOne!
            </Typography>
          </Box>
          <Box
            className="clickable"
            onClick={handleQuoteClick}
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 2,
              textAlign: "center",
              cursor: "pointer",
              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
            }}
          >
            <Box key={quote.text} sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              <Typography
                sx={{
                  fontStyle: "italic",
                  fontSize: 15,
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                  lineHeight: 1.3,
                }}
              >
                &ldquo;{quote.text}&rdquo;
              </Typography>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: theme.palette.text.disabled,
                  lineHeight: 1.2,
                }}
              >
                &mdash; {quote.author}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            width: "20%",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            bgcolor: theme.palette.background.paper,
          }}
        >
          <Box
            sx={{
              height: 40,
              display: "flex",
              borderBottom: `1px solid rgba(0,0,0,0.2)`,
            }}
          >
            <Box
              className="clickable"
              onClick={handleMinimize}
              aria-label="Minimize"
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRight: `1px solid ${theme.palette.divider}`,
                "&:hover": { bgcolor: theme.palette.action.hover },
              }}
            >
              <MinimizeIcon sx={{ fontSize: 14, color: theme.palette.text.primary }} />
            </Box>
            {updateAvailable && (
              <Box
                className="clickable"
                onClick={installUpdate}
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  borderRight: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.primary.main,
                  "&:hover": { bgcolor: theme.palette.action.hover },
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: "bold" }}>↓</Typography>
              </Box>
            )}
            <Box
              className="clickable"
              onClick={closeWelcome}
              aria-label="Close"
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                "&:hover": { bgcolor: theme.palette.error.main, color: "#FFFFFF" },
              }}
            >
              <CloseIcon sx={{ fontSize: 14, color: "inherit" }} />
            </Box>
          </Box>

          <Box
            className="clickable"
            onClick={() => {
              import("@tauri-apps/plugin-opener")
                .then(({ openUrl }) => openUrl("https://discord.gg/RgP4tGHZz"))
                .catch(() => window.open("https://discord.gg/RgP4tGHZz", "_blank"));
            }}
            sx={{
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              cursor: "pointer",
              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08), textDecoration: "underline" },
            }}
          >
            <DiscordIcon sx={{ fontSize: 18, color: theme.palette.text.primary }} />
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: theme.palette.text.primary }}>
              Discord
            </Typography>
          </Box>

          <Box
            className="clickable"
            onClick={handleOpenThemeMenu}
            sx={{
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              cursor: "pointer",
              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08), textDecoration: "underline" },
            }}
          >
            <ColorLensIcon sx={{ fontSize: 18, color: theme.palette.text.primary }} />
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: theme.palette.text.primary }}>
              Theme
            </Typography>
          </Box>
        </Box>
      </Box>
      <Menu
        anchorEl={themeAnchor}
        open={Boolean(themeAnchor)}
        onClose={handleCloseThemeMenu}
        slotProps={{
          paper: {
            sx: {
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: "none",
              minWidth: 220,
              maxHeight: 420,
            },
          },
        }}
      >
        {THEME_CATEGORIES.map((cat, catIdx) => {
          const catThemes = themeList.filter((t) => t.category === cat.category);
          const adaptiveMeta = cat.adaptiveId ? ADAPTIVE_THEME_META[cat.adaptiveId] : null;
          return (
            <Box key={cat.category}>
              {catIdx === 0 && (
                <Box sx={{ pt: 0.5, pb: 0.25, px: 2 }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: theme.palette.text.disabled, letterSpacing: "0.08em" }}>
                    {cat.label}
                  </Typography>
                </Box>
              )}
              {catIdx > 0 && (
                <Box sx={{ pt: 0.75, pb: 0.25, px: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: theme.palette.text.disabled, letterSpacing: "0.08em" }}>
                    {cat.label}
                  </Typography>
                </Box>
              )}
              {adaptiveMeta && (
                <MenuItem
                  key={cat.adaptiveId}
                  selected={currentThemeId === cat.adaptiveId}
                  onClick={() => handleSelectTheme(cat.adaptiveId!)}
                  sx={{ py: 0.5 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                    <Box
                      sx={{
                        width: 22, height: 22, flexShrink: 0,
                        display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden",
                        border: `1.5px solid ${currentThemeId === cat.adaptiveId ? theme.palette.primary.main : theme.palette.divider}`,
                      }}
                    >
                      <Box sx={{ bgcolor: adaptiveMeta.swatchColors[0] }} />
                      <Box sx={{ bgcolor: adaptiveMeta.swatchColors[1] }} />
                      <Box sx={{ bgcolor: adaptiveMeta.swatchColors[2] }} />
                      <Box sx={{ bgcolor: adaptiveMeta.swatchColors[3] }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: currentThemeId === cat.adaptiveId ? 600 : 500 }}>
                        {adaptiveMeta.label}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              )}
              {catThemes.map((t) => {
                const isActive = currentThemeId === t.id;
                return (
                  <MenuItem
                    key={t.id}
                    selected={isActive}
                    onClick={() => handleSelectTheme(t.id)}
                    sx={{ py: 0.5 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                      <Box
                        sx={{
                          width: 22, height: 22, flexShrink: 0,
                          display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden",
                          border: `1.5px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
                        }}
                      >
                        <Box sx={{ bgcolor: t.colors.editor }} />
                        <Box sx={{ bgcolor: t.colors.sidebar }} />
                        <Box sx={{ bgcolor: t.colors.accent }} />
                        <Box sx={{ bgcolor: t.colors.dropdown }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: isActive ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.name}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                );
              })}
            </Box>
          );
        })}

        {customThemes.length > 0 && (
          <Box>
            <Box sx={{ pt: 0.75, pb: 0.25, px: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: theme.palette.text.disabled, letterSpacing: "0.08em" }}>
                CUSTOM
              </Typography>
            </Box>
            {customThemes.map((t) => {
              const isActive = currentThemeId === t.id;
              return (
                <MenuItem
                  key={t.id}
                  selected={isActive}
                  onClick={() => handleSelectTheme(t.id)}
                  sx={{ py: 0.5 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                    <Box
                      sx={{
                        width: 22, height: 22, flexShrink: 0,
                        display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden",
                        border: `1.5px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
                      }}
                    >
                      <Box sx={{ bgcolor: t.colors.editor }} />
                      <Box sx={{ bgcolor: t.colors.sidebar }} />
                      <Box sx={{ bgcolor: t.colors.accent }} />
                      <Box sx={{ bgcolor: t.colors.dropdown }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: isActive ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.name}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              );
            })}
          </Box>
        )}
      </Menu>

      <Box sx={{ display: "flex", height: 120, minHeight: 120, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
        <Box sx={{ width: "20%", borderRight: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box
            className="clickable"
            onClick={handleNew}
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              cursor: "pointer",
              p: 1,
              boxSizing: "border-box",
              transition: "all 0.15s ease",
              border: `2px solid transparent`,
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                borderColor: alpha(theme.palette.primary.main, 0.4),
              },
            }}
          >
            <AddIcon sx={{ fontSize: 32, color: theme.palette.primary.main, mb: 0.75 }} />
            <Typography sx={{ fontWeight: "bold", fontSize: 13, color: theme.palette.text.primary }}>New Project</Typography>
            <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>Ctrl+N</Typography>
          </Box>
        </Box>

        <Box sx={{ width: "20%", borderRight: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box
            className="clickable"
            onClick={handleOpen}
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              cursor: "pointer",
              p: 1,
              boxSizing: "border-box",
              transition: "all 0.15s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <FolderOpenIcon sx={{ fontSize: 32, color: theme.palette.primary.main, mb: 0.75 }} />
            <Typography sx={{ fontWeight: "bold", fontSize: 13, color: theme.palette.text.primary }}>Open Project</Typography>
            <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>Ctrl+O</Typography>
          </Box>
        </Box>

        <Box sx={{ width: "20%", borderRight: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box
            className="clickable"
            onClick={handleTemplates}
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              cursor: "pointer",
              p: 1,
              boxSizing: "border-box",
              transition: "all 0.15s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <CombineColumnsIcon sx={{ fontSize: 32, color: theme.palette.primary.main, mb: 0.75 }} />
            <Typography sx={{ fontWeight: "bold", fontSize: 13, color: theme.palette.text.primary }}>Templates</Typography>
            <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>Structure template</Typography>
          </Box>
        </Box>

        <Box sx={{ width: "20%", borderRight: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              p: 1,
              boxSizing: "border-box",
              opacity: 0.55,
            }}
          >
            <MenuBookIcon sx={{ fontSize: 32, color: theme.palette.text.secondary, mb: 0.75 }} />
            <Typography sx={{ fontWeight: "bold", fontSize: 13, color: theme.palette.text.primary }}>Sample Screenplays</Typography>
            <Typography sx={{ fontSize: 10, fontStyle: "italic", color: theme.palette.text.disabled }}>Coming soon</Typography>
          </Box>
        </Box>

        <Box sx={{ width: "20%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box
            className="clickable"
            onClick={() => setTutorialDialogOpen(true)}
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              cursor: "pointer",
              p: 1,
              boxSizing: "border-box",
              transition: "all 0.15s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 32, color: theme.palette.primary.main, mb: 0.75 }} />
            <Typography sx={{ fontWeight: "bold", fontSize: 13, color: theme.palette.text.primary }}>Tutorials</Typography>
            <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>Interactive tours</Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          bgcolor: theme.palette.background.paper,
          p: 2,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: "bold", mb: 1, color: theme.palette.text.primary }}>
          Recent files
        </Typography>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            pr: 1,
            "&::-webkit-scrollbar": {
              width: "16px",
            },
            "&::-webkit-scrollbar-track": {
              background: theme.palette.background.paper,
              borderLeft: `1px solid ${theme.palette.divider}`,
            },
            "&::-webkit-scrollbar-thumb": {
              background: theme.palette.text.secondary,
              border: `3px solid ${theme.palette.background.paper}`,
            },
          }}
        >
          {recentFiles.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {recentFiles.slice(0, 10).map((item: RecentFile) => {
                const fileType = getFileTypeIcon(item.name);
                const directory = getDirectory(item.path);
                const relTime = getRelativeTime(item.lastOpened);
                return (
                  <Box
                    key={item.path}
                    className="clickable"
                    onClick={() => handleOpenRecent(item.path)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.25,
                      bgcolor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      px: 1.25,
                      py: 0.9,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative",
                      overflow: "hidden",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                        borderColor: alpha(theme.palette.primary.main, 0.4),
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        minWidth: 30,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        flexShrink: 0,
                      }}
                    >
                      {fileType === "actone" ? (
                        <MenuBookIcon sx={{ fontSize: 18 }} />
                      ) : (
                        <DescriptionIcon sx={{ fontSize: 18 }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.15 }}>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          lineHeight: 1.25,
                        }}
                      >
                        {item.name}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: theme.palette.text.secondary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            minWidth: 0,
                            lineHeight: 1.2,
                          }}
                        >
                          {directory}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: theme.palette.text.disabled,
                            flexShrink: 0,
                            lineHeight: 1.2,
                          }}
                        >
                          ·
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: theme.palette.text.disabled,
                            flexShrink: 0,
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {relTime}
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      className="clickable"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromRecent(item.path);
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 0.5,
                        opacity: 0.4,
                        transition: "opacity 0.15s ease",
                        flexShrink: 0,
                        "&:hover": { opacity: 1 },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box sx={{ display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
              <MenuBookIcon sx={{ fontSize: 40, color: alpha(theme.palette.text.disabled, 0.3), mb: 0.5 }} />
              <Typography sx={{ fontStyle: "italic", color: theme.palette.text.secondary, textAlign: "center", px: 2 }}>
                {emptyMessage}
              </Typography>
              <Typography sx={{ fontSize: 10, color: theme.palette.text.disabled }}>
                Press Ctrl+N to get started
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          bgcolor: alpha(theme.palette.common.black, 0.03),
          px: 1.5,
          py: 0.5,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary, fontWeight: 500 }}>
          {appVersion ? `v${appVersion} [${appChannel}]` : "version"}
        </Typography>
        <Typography sx={{ fontSize: 10, color: theme.palette.text.disabled, fontStyle: "italic" }}>
          &copy; 2026 Write Up Film Service Company
        </Typography>
        <Box
          className="clickable"
          onClick={handleHelp}
          aria-label="Help"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            width: 24,
            height: 24,
            borderRadius: 0,
            "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
          }}
        >
          <HelpOutlinedIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
        </Box>
      </Box>

      <TutorialSelectionDialog
        open={tutorialDialogOpen}
        onClose={() => setTutorialDialogOpen(false)}
        onSelectTour={handleSelectTour}
      />
    </Box>
  );
};
