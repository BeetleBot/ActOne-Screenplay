import React, { useEffect, useState } from "react";
import { useFile, useTheme as useAppTheme } from "../context";
import type { RecentFile } from "../context/FileContext";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useModalWindows, useStoreUpdateCheck } from "../hooks";
import { Box, Typography, useTheme, alpha, Menu, MenuItem, IconButton, Tooltip } from "@mui/material";
import { logger } from "../utils/logger";
import { parseScriptFileToFountain } from "../utils/text";
import { ThemeLogo } from "./ThemeLogo";
import { TitleBar } from "./TitleBar";
import {
  HelpOutlinedIcon,
  DeleteIcon,
  DiscordIcon,
  MenuBookIcon,
  DescriptionIcon,
  ColorLensIcon,
} from "./Icons";
import { themes as themeList, ADAPTIVE_THEME_META, THEME_CATEGORIES } from "../theme/muiTheme";

interface WelcomeScreenWindowProps {
  standalone?: boolean;
  onOpenTutorials?: () => void;
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

export const WelcomeScreenWindow: React.FC<WelcomeScreenWindowProps> = ({ standalone = false, onOpenTutorials }) => {
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent, importAsActoneProject } = useFile();
  const { openHelpWindow, openTutorialsWindow } = useModalWindows();
  const appVersion = __APP_VERSION__;
  const appChannel = __APP_CHANNEL__;

  const [themeAnchor, setThemeAnchor] = useState<null | HTMLElement>(null);
  const { theme: currentThemeId, setTheme: setAppTheme, customThemes } = useAppTheme();
  const theme = useTheme();
  const { updateAvailable, installUpdate } = useStoreUpdateCheck();

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 1, clientY: 1 }));
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    invoke<string[]>("get_cli_args")
      .then((paths) => {
        if (paths && paths.length > 0) {
          const filePath = paths[0];
          localStorage.setItem("pending-open-path", filePath);
          localStorage.setItem("pending-action", "open");
          createEditorWindow("open").then((created) => {
            if (created) closeWelcome();
          });
        }
      })
      .catch((e) => logger.error("welcome", "get_cli_args failed", e));
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
          createEditorWindow("open").then((created) => {
            if (created) closeWelcome();
          });
        });
      } catch (e) {
        logger.error("welcome", "Failed to listen for file-opened events", e);
      }
    };
    setup();
    return () => {
      if (unlisten) unlisten();
    };
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
          setTimeout(() => {
            unlisten();
          }, 10000);
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
              setTimeout(() => {
                unlisten();
              }, 10000);
            }
          }
        } catch (err) {
          logger.error("welcome", "Ctrl+O failed", err);
        }
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
        visible: false,
      });
      await Promise.race([
        new Promise<void>((resolve) => webview.once("tauri://created", () => resolve())),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
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
          setTimeout(() => {
            unlisten();
          }, 10000);
          return;
        }
      } catch (e) {
        logger.error("welcome", "handleNew failed", e);
      }
      return;
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
            setTimeout(() => {
              unlisten();
            }, 10000);
            return;
          }
        }
      } catch (e) {
        logger.error("welcome", "handleOpen failed", e);
      }
      return;
    }
    await openFile();
  };

  const handleImport = async (format?: string) => {
    if (standalone) {
      try {
        const result = await invoke<{ path: string; name: string; extension: string } | null>("import_script_dialog", {
          format: format || null,
        });
        if (result && result.path) {
          let fountainText = "";
          if (result.path.toLowerCase().endsWith(".fadein")) {
            const bytes = await invoke<number[]>("read_file_binary", { path: result.path });
            fountainText = parseScriptFileToFountain(result.path, new Uint8Array(bytes));
          } else {
            const raw = await invoke<string>("read_file_content", { path: result.path });
            fountainText = parseScriptFileToFountain(result.path, raw);
          }
          const scriptName =
            result.name ||
            result.path
              .split(/[/\\]/)
              .pop()
              ?.replace(/\.(fountain|txt|fdx|fadein|spmd)$/i, "") ||
            "Untitled";

          localStorage.setItem("pending-import-name", scriptName);
          localStorage.setItem("pending-import-content", fountainText);
          localStorage.setItem("pending-action", "import");
          const created = await createEditorWindow("import");
          if (created) {
            const { listen } = await import("@tauri-apps/api/event");
            const unlisten = await listen("editor:ready", () => {
              unlisten();
              closeWelcome();
            });
            setTimeout(() => {
              unlisten();
            }, 10000);
            return;
          }
        }
      } catch (e) {
        logger.error("welcome", "handleImport failed", e);
      }
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".fdx,.fadein,.fountain,.txt,.spmd";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      const name = f.name.replace(/\.(fountain|txt|fdx|fadein|spmd)$/i, "");
      let fountainText: string;
      if (f.name.toLowerCase().endsWith(".fadein")) {
        const buf = await f.arrayBuffer();
        fountainText = parseScriptFileToFountain(f.name, new Uint8Array(buf));
      } else {
        const text = await f.text();
        fountainText = parseScriptFileToFountain(f.name, text);
      }
      await importAsActoneProject(fountainText, name, true);
    };
    input.click();
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
          setTimeout(() => {
            unlisten();
          }, 10000);
          return;
        }
      } catch (e) {
        logger.error("welcome", "handleTemplates failed", e);
      }
      return;
    }
    newFile();
  };

  const handleOpenRecent = async (path: string) => {
    if (standalone) {
      try {
        localStorage.setItem("pending-open-path", path);
        localStorage.setItem("pending-action", "open");
        const created = await createEditorWindow("open");
        if (created) {
          closeWelcome();
          return;
        }
      } catch (e) {
        logger.error("welcome", "handleOpenRecent failed", e);
      }
      return;
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
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        overflow: "hidden",
        boxSizing: "border-box",
        userSelect: "none",
      }}
    >
      <TitleBar
        title="Welcome To ActOne!"
        onClose={closeWelcome}
        updateAvailable={!!updateAvailable}
        installUpdate={installUpdate}
      />

      <Menu
        anchorEl={themeAnchor}
        open={Boolean(themeAnchor)}
        onClose={handleCloseThemeMenu}
        slotProps={{
          paper: {
            sx: {
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
              borderRadius: "8px",
              minWidth: 220,
              maxHeight: 420,
              mt: -0.5,
              bgcolor: theme.palette.background.paper,
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
                <Box sx={{ pt: 0.75, pb: 0.25, px: 2 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: theme.palette.text.disabled, letterSpacing: "0.08em" }}>
                    {cat.label}
                  </Typography>
                </Box>
              )}
              {catIdx > 0 && (
                <Box sx={{ pt: 0.75, pb: 0.25, px: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: theme.palette.text.disabled, letterSpacing: "0.08em" }}>
                    {cat.label}
                  </Typography>
                </Box>
              )}
              {adaptiveMeta && (
                <MenuItem
                  key={cat.adaptiveId}
                  selected={currentThemeId === cat.adaptiveId}
                  onClick={() => handleSelectTheme(cat.adaptiveId!)}
                  sx={{ py: 0.6, px: 1.5, mx: 0.5, borderRadius: "5px" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        flexShrink: 0,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        overflow: "hidden",
                        borderRadius: "3px",
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
                    sx={{ py: 0.6, px: 1.5, mx: 0.5, borderRadius: "5px" }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          flexShrink: 0,
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          overflow: "hidden",
                          borderRadius: "3px",
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
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: theme.palette.text.disabled, letterSpacing: "0.08em" }}>
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
                  sx={{ py: 0.6, px: 1.5, mx: 0.5, borderRadius: "5px" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        flexShrink: 0,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        overflow: "hidden",
                        borderRadius: "3px",
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

      {/* Main Body - Floating Islands Layout */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          overflow: "hidden",
          p: 1,
          gap: 1,
        }}
      >
        {/* Left Sidebar: Recent Screenplays */}
        <Box
          sx={{
            width: "38%",
            minWidth: 240,
            maxWidth: 320,
            borderRadius: "12px",
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: "background.paper",
            boxShadow: (t) => t.palette.mode === "dark" ? "0 8px 24px rgba(0,0,0,0.35)" : "0 2px 12px rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: 2, pb: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: theme.palette.text.disabled, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Recent files
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 1.25,
              pb: 1.5,
            }}
          >
            {recentFiles.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
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
                        gap: 1.2,
                        borderRadius: "8px",
                        px: 1.25,
                        py: 0.8,
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                        border: `1px solid transparent`,
                        "&:hover": {
                          bgcolor: alpha(theme.palette.text.primary, 0.05),
                          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                          "& .delete-btn": { opacity: 0.7 },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "6px",
                          bgcolor: fileType === "actone" ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.text.primary, 0.06),
                          color: fileType === "actone" ? theme.palette.primary.main : theme.palette.text.secondary,
                          flexShrink: 0,
                        }}
                      >
                        {fileType === "actone" ? <MenuBookIcon sx={{ fontSize: 14 }} /> : <DescriptionIcon sx={{ fontSize: 14 }} />}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <Typography
                          sx={{
                            fontSize: 12.5,
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
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, mt: 0.2 }}>
                          <Typography
                            sx={{
                              fontSize: 10.5,
                              color: theme.palette.text.disabled,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              minWidth: 0,
                              lineHeight: 1.1,
                            }}
                          >
                            {directory}
                          </Typography>
                          <Typography sx={{ fontSize: 10.5, color: theme.palette.text.disabled, flexShrink: 0, lineHeight: 1.1 }}>
                            ·
                          </Typography>
                          <Typography sx={{ fontSize: 10.5, color: theme.palette.text.disabled, flexShrink: 0, lineHeight: 1.1 }}>
                            {relTime}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        className="clickable delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromRecent(item.path);
                        }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          p: 0.5,
                          borderRadius: "4px",
                          opacity: 0,
                          transition: "all 0.12s ease",
                          flexShrink: 0,
                          "&:hover": {
                            opacity: "1 !important",
                            bgcolor: alpha(theme.palette.error.main, 0.12),
                            color: theme.palette.error.main,
                          },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 13 }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ display: "flex", height: "100%", minHeight: 140, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.75, p: 2, opacity: 0.7 }}>
                <MenuBookIcon sx={{ fontSize: 28, color: theme.palette.text.disabled, mb: 0.5 }} />
                <Typography sx={{ fontSize: 11.5, color: theme.palette.text.secondary, textAlign: "center" }}>
                  No recent projects
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Main Panel: Centered Hero & Actions */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: 3,
            py: 2,
            overflowY: "auto",
          }}
        >
          {/* Logo & Title Header */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2.5 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                color: theme.palette.primary.main,
                mb: 1.25,
                filter: `drop-shadow(0 6px 16px ${alpha(theme.palette.primary.main, 0.35)})`,
              }}
            >
              <ThemeLogo variant="solid" />
            </Box>
            <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: theme.palette.text.primary }}>
              ActOne Screenplay
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: theme.palette.text.disabled, mt: 0.25 }}>
              {appVersion ? `Version ${appVersion} [${appChannel}]` : "Screenplay Editor"}
            </Typography>
          </Box>

          {/* Action List Container */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 440,
              bgcolor: "background.paper",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: "12px",
              boxShadow: (t) => t.palette.mode === "dark" ? "0 8px 24px rgba(0,0,0,0.35)" : "0 2px 12px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            {/* New Project */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.25,
                py: 1.3,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
              }}
            >
              <Box sx={{ pr: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}>
                  New Project
                </Typography>
                <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary, mt: 0.2 }}>
                  Create a new blank screenplay project (Ctrl+N).
                </Typography>
              </Box>
              <Box
                className="clickable"
                onClick={handleNew}
                sx={{
                  px: 2.25,
                  py: 0.5,
                  borderRadius: "20px",
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.88),
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}`,
                  },
                }}
              >
                Create
              </Box>
            </Box>

            {/* Open Project */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.25,
                py: 1.3,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
              }}
            >
              <Box sx={{ pr: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}>
                  Open Project
                </Typography>
                <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary, mt: 0.2 }}>
                  Open existing .actone screenplay bundle files.
                </Typography>
              </Box>
              <Box
                className="clickable"
                onClick={handleOpen}
                sx={{
                  px: 2.25,
                  py: 0.5,
                  borderRadius: "20px",
                  bgcolor: alpha(theme.palette.text.primary, 0.06),
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.text.primary, 0.12),
                  },
                }}
              >
                Open
              </Box>
            </Box>

            {/* Import Script */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.25,
                py: 1.3,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
              }}
            >
              <Box sx={{ pr: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}>
                  Import Script
                </Typography>
                <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary, mt: 0.2 }}>
                  FDX, FadeIn, Fountain, or plain text files.
                </Typography>
              </Box>
              <Box
                className="clickable"
                onClick={() => handleImport()}
                sx={{
                  px: 2.25,
                  py: 0.5,
                  borderRadius: "20px",
                  bgcolor: alpha(theme.palette.text.primary, 0.06),
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.text.primary, 0.12),
                  },
                }}
              >
                Import
              </Box>
            </Box>

            {/* Templates */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.25,
                py: 1.3,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
              }}
            >
              <Box sx={{ pr: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}>
                  Templates
                </Typography>
                <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary, mt: 0.2 }}>
                  Start with a screenplay 3-Act structure template.
                </Typography>
              </Box>
              <Box
                className="clickable"
                onClick={handleTemplates}
                sx={{
                  px: 2.25,
                  py: 0.5,
                  borderRadius: "20px",
                  bgcolor: alpha(theme.palette.text.primary, 0.06),
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.text.primary, 0.12),
                  },
                }}
              >
                Choose
              </Box>
            </Box>

            {/* Tutorials */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.25,
                py: 1.3,
              }}
            >
              <Box sx={{ pr: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}>
                  Tutorials
                </Typography>
                <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary, mt: 0.2 }}>
                  Learn how ActOne works with interactive tours.
                </Typography>
              </Box>
              <Box
                className="clickable"
                onClick={() => (onOpenTutorials ? onOpenTutorials() : openTutorialsWindow())}
                sx={{
                  px: 2.25,
                  py: 0.5,
                  borderRadius: "20px",
                  bgcolor: alpha(theme.palette.text.primary, 0.06),
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.text.primary, 0.12),
                  },
                }}
              >
                Start
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 36,
          minHeight: 36,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          px: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled, fontWeight: 500, fontFamily: "monospace" }}>
            {appVersion ? `v${appVersion} [${appChannel}]` : "v0.4.3"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 500, color: theme.palette.text.disabled }}>
            © 2026
          </Typography>
          <Typography
            variant="caption"
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              try {
                import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl("https://iyal.ink"));
              } catch {
                window.open("https://iyal.ink", "_blank");
              }
            }}
            sx={{
              fontSize: 11,
              fontWeight: 600,
              color: theme.palette.text.secondary,
              cursor: "pointer",
              "&:hover": {
                color: theme.palette.primary.main,
                textDecoration: "underline",
              },
            }}
          >
            iyal.ink
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 400, color: theme.palette.text.disabled }}>
            — Tools for the story in progress.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            className="clickable"
            onClick={() => {
              import("@tauri-apps/plugin-opener")
                .then(({ openUrl }) => openUrl("https://discord.gg/zpFPpdAxnW"))
                .catch(() => window.open("https://discord.gg/zpFPpdAxnW", "_blank"));
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 0.75,
              py: 0.25,
              borderRadius: "4px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              color: theme.palette.text.secondary,
              "&:hover": {
                color: theme.palette.text.primary,
                bgcolor: alpha(theme.palette.text.primary, 0.05),
              },
            }}
          >
            <DiscordIcon sx={{ fontSize: 13 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 500 }}>Discord</Typography>
          </Box>

          <Box
            className="clickable"
            onClick={handleOpenThemeMenu}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 0.75,
              py: 0.25,
              borderRadius: "4px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              color: theme.palette.text.secondary,
              "&:hover": {
                color: theme.palette.text.primary,
                bgcolor: alpha(theme.palette.text.primary, 0.05),
              },
            }}
          >
            <ColorLensIcon sx={{ fontSize: 13 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 500 }}>Theme</Typography>
          </Box>

          <Tooltip title="Help & Documentation">
            <IconButton
              onClick={handleHelp}
              aria-label="Help"
              size="small"
              sx={{
                p: 0.5,
                color: theme.palette.text.secondary,
                borderRadius: "4px",
                "&:hover": { color: theme.palette.text.primary, bgcolor: alpha(theme.palette.text.primary, 0.05) },
              }}
            >
              <HelpOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};
