import React, { useEffect, useState } from "react";
import { useFile } from "../context";
import type { RecentFile } from "../context/FileContext";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useModalWindows, useStoreUpdateCheck } from "../hooks";
import {
  Box,
  Typography,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { logger } from "../utils/logger";
import { TutorialSelectionDialog } from "./OnboardingTour";

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`;
  return new Date(ts).toLocaleDateString();
}

import logoDark from "../assets/logo_dark.png";
import logoLight from "../assets/logo_light.png";
import { AddIcon, FolderOpenIcon, CombineColumnsIcon, HelpOutlinedIcon, DescriptionIcon, DiscordIcon, DownloadIcon, CloseIcon } from "./Icons";

interface WelcomeScreenWindowProps {
  standalone?: boolean;
}

export const WelcomeScreenWindow: React.FC<WelcomeScreenWindowProps> = ({ standalone = false }) => {
  const theme = useTheme();
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();
  const { openHelpWindow } = useModalWindows();
  const appVersion = __APP_VERSION__;
  const { updateAvailable, installUpdate } = useStoreUpdateCheck();
  const [tutorialDialogOpen, setTutorialDialogOpen] = useState(false);

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

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        color: "text.primary",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: (t) =>
            `radial-gradient(ellipse at center, ${alpha(t.palette.primary.main, 0.06)} 0%, transparent 70%)`,
        }}
      />
      <Box sx={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: 180,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: (t) => alpha(t.palette.text.primary, 0.015),
          }}
        >
          {/* Logo + wordmark */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, px: 2, py: 2.5 }}>
            <Box
              component="img"
              src={theme.palette.mode === "dark" ? logoDark : logoLight}
              alt="ActOne"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              sx={{ width: 40, height: 40, objectFit: "contain", userSelect: "none", WebkitUserDrag: "none", flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, color: "text.primary" }}>
              ActOne
            </Typography>
          </Box>

          <Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />

          {/* Nav items */}
          <Box sx={{ display: "flex", flexDirection: "column", py: 1 }}>
            {[
              { icon: <AddIcon sx={{ fontSize: 16 }} />, label: "New", onClick: handleNew },
              { icon: <FolderOpenIcon sx={{ fontSize: 16 }} />, label: "Open", onClick: handleOpen },
              { icon: <CombineColumnsIcon sx={{ fontSize: 16 }} />, label: "Templates", onClick: handleTemplates },
              { icon: <HelpOutlinedIcon sx={{ fontSize: 16 }} />, label: "Help", onClick: handleHelp },
            ].map((item) => (
              <Box
                key={item.label}
                onClick={item.onClick}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                  px: 2,
                  py: 0.9,
                  cursor: "pointer",
                  position: "relative",
                  color: "text.primary",
                  transition: "background-color var(--duration-fast) ease",
                  "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    bgcolor: "transparent",
                  },
                }}
              >
                <Box sx={{ color: "text.secondary", display: "flex" }}>{item.icon}</Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{item.label}</Typography>
              </Box>
            ))}
            <Box
              onClick={() => setTutorialDialogOpen(true)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                px: 2,
                py: 0.9,
                cursor: "pointer",
                color: "text.primary",
                transition: "background-color var(--duration-fast) ease",
                "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
              }}
            >
              <Box sx={{ color: "text.secondary", display: "flex" }}>
                <HelpOutlinedIcon sx={{ fontSize: 16 }} />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Tutorials</Typography>
            </Box>
          </Box>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Footer of sidebar */}
          <Box sx={{ borderTop: "1px solid", borderColor: "divider", px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 600, color: "text.secondary", opacity: 0.5, letterSpacing: "0.05em" }}>
              {appVersion ? `v${appVersion}` : ""}
            </Typography>
            <Typography sx={{ fontSize: 9, fontWeight: 500, color: "text.secondary", opacity: 0.4, mt: 0.3 }}>
              &copy; 2026 Write Up Film Service Company
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mt: 1 }}>
              <Box
                onClick={() => {
                  import("@tauri-apps/plugin-opener")
                    .then(({ openUrl }) => openUrl("https://discord.gg/RgP4tGHZz"))
                    .catch(() => window.open("https://discord.gg/RgP4tGHZz", "_blank"));
                }}
                sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", color: "text.secondary", opacity: 0.5, "&:hover": { opacity: 1, color: "text.primary" } }}
              >
                <DiscordIcon sx={{ fontSize: 12 }} />
                <Typography sx={{ fontSize: 10, fontWeight: 600 }}>Discord</Typography>
              </Box>
              {updateAvailable && (
                <Tooltip title="Click to install update from Microsoft Store">
                  <Box
                    onClick={(e) => { e.stopPropagation(); installUpdate(); }}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.3,
                      px: 0.6,
                      py: 0.15,
                      borderRadius: 0,
                      cursor: "pointer",
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                      color: "primary.main",
                      fontSize: 9,
                      fontWeight: 700,
                      "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.25) },
                    }}
                  >
                    <DownloadIcon sx={{ fontSize: 10 }} />
                    Update
                  </Box>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>

        {/* Content area */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", p: 3 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: "text.primary", mb: 0.5 }}>
            Welcome to ActOne
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary", opacity: 0.6, mb: 2.5 }}>
            Start a new project, open a recent file, or learn the basics.
          </Typography>

          {/* Recent section */}
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, mb: 1 }}>
            Recent
          </Typography>
          {recentFiles.length > 0 ? (
            <Box sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}>
              {recentFiles.slice(0, 6).map((item: RecentFile) => (
                <Box
                  key={item.path}
                  onClick={() => handleOpenRecent(item.path)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    px: 1.2,
                    py: 0.8,
                    cursor: "pointer",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    transition: "background-color var(--duration-fast) ease",
                    "&:last-of-type": { borderBottom: "none" },
                    "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
                  }}
                >
                  <DescriptionIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.primary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 9.5, color: "text.secondary", flexShrink: 0, opacity: 0.6, fontWeight: 500 }}>
                    {formatRelativeTime(item.lastOpened)}
                  </Typography>
                  <CloseIcon
                    onClick={(e) => { e.stopPropagation(); removeFromRecent(item.path); }}
                    sx={{ fontSize: 11, color: "text.secondary", cursor: "pointer", opacity: 0.4, flexShrink: 0, "&:hover": { opacity: 1, color: "error.main" } }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ mb: 3, p: 2, border: "1px dashed", borderColor: "divider", textAlign: "center" }}>
              <Typography sx={{ fontSize: 11, color: "text.secondary", opacity: 0.5 }}>
                No recent files yet
              </Typography>
            </Box>
          )}

          {/* Walkthroughs section */}
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, mb: 1 }}>
            Walkthroughs
          </Typography>
          <Box sx={{ border: "1px solid", borderColor: "divider" }}>
            <Box
              onClick={() => handleSelectTour("ui")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                px: 1.2,
                py: 0.9,
                cursor: "pointer",
                borderBottom: "1px solid",
                borderColor: "divider",
                transition: "background-color var(--duration-fast) ease",
                "&:last-of-type": { borderBottom: "none" },
                "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
              }}
            >
              <Typography sx={{ fontSize: 13, color: "primary.main", fontWeight: 700, flexShrink: 0 }}>→</Typography>
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.primary" }}>UI Tour</Typography>
                <Typography sx={{ fontSize: 9.5, color: "text.secondary", opacity: 0.6 }}>Learn the editor layout and shortcuts</Typography>
              </Box>
            </Box>
            <Box
              onClick={() => handleSelectTour("fountain")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                px: 1.2,
                py: 0.9,
                cursor: "pointer",
                transition: "background-color var(--duration-fast) ease",
                "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
              }}
            >
              <Typography sx={{ fontSize: 13, color: "primary.main", fontWeight: 700, flexShrink: 0 }}>→</Typography>
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.primary" }}>Fountain Syntax</Typography>
                <Typography sx={{ fontSize: 9.5, color: "text.secondary", opacity: 0.6 }}>Write screenplays in plain text</Typography>
              </Box>
            </Box>
          </Box>
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
