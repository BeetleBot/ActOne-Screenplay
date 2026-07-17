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
  Button,
  Tooltip,
  TextField,
  InputAdornment,
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
import { AddIcon, FolderOpenIcon, CombineColumnsIcon, HelpOutlinedIcon, DescriptionIcon, DiscordIcon, DownloadIcon, SearchIcon, CloseIcon } from "./Icons";

interface WelcomeScreenWindowProps {
  standalone?: boolean;
}

export const WelcomeScreenWindow: React.FC<WelcomeScreenWindowProps> = ({ standalone = false }) => {
  const theme = useTheme();
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();
  const [search, setSearch] = useState("");
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
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          px: 4,
        }}
      >
        {/* Hero: logo + wordmark side-by-side */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Box
            component="img"
            src={theme.palette.mode === "dark" ? logoDark : logoLight}
            alt="ActOne"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            sx={{ width: 72, height: 72, objectFit: "contain", userSelect: "none", WebkitUserDrag: "none", flexShrink: 0 }}
          />
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, color: "text.primary" }}>
              ActOne
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "text.secondary", opacity: 0.55, mt: 0.4 }}>
              {appVersion ? `v${appVersion}` : ""} • Screenplay editor
            </Typography>
          </Box>
        </Box>

        {/* Search + Recent Files */}
        <Box sx={{ width: "100%", maxWidth: 480, mb: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recent files"
            fullWidth
            size="small"
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <CloseIcon
                      sx={{ fontSize: 14, color: "text.secondary", cursor: "pointer", "&:hover": { color: "text.primary" } }}
                      onClick={() => setSearch("")}
                    />
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 0,
                fontSize: 12,
                bgcolor: (t) => alpha(t.palette.text.primary, 0.03),
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "primary.main" },
              },
              "& input": { padding: "8px 0", color: "text.primary" },
              "& input::placeholder": { color: "text.secondary", opacity: 0.6 },
            }}
          />
        </Box>

        {/* Recent Files List */}
        {recentFiles.length > 0 && (() => {
          const filtered = recentFiles.filter(
            (f) => !search || f.name.toLowerCase().includes(search.toLowerCase())
          );
          if (filtered.length === 0) return null;
          return (
            <Box sx={{ width: "100%", maxWidth: 480, mb: 2 }}>
              {filtered.slice(0, 8).map((item: RecentFile) => (
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
                    borderRadius: 0,
                    border: "1px solid transparent",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    transition: "background-color var(--duration-fast) ease",
                    "&:hover": {
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                      borderColor: "primary.main",
                    },
                    "&:last-of-type": { borderBottom: "1px solid transparent" },
                  }}
                >
                  <DescriptionIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.primary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: "text.secondary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: 0.6 }}>
                      {item.path}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 10, color: "text.secondary", flexShrink: 0, opacity: 0.6, fontWeight: 500 }}>
                    {formatRelativeTime(item.lastOpened)}
                  </Typography>
                  <CloseIcon
                    onClick={(e) => { e.stopPropagation(); removeFromRecent(item.path); }}
                    sx={{ fontSize: 12, color: "text.secondary", cursor: "pointer", opacity: 0.4, flexShrink: 0, "&:hover": { opacity: 1, color: "error.main" } }}
                  />
                </Box>
              ))}
            </Box>
          );
        })()}

        <TutorialSelectionDialog
          open={tutorialDialogOpen}
          onClose={() => setTutorialDialogOpen(false)}
          onSelectTour={handleSelectTour}
        />

        {/* Action Buttons (small) */}
        <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            onClick={handleNew}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 11,
              borderRadius: 0,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": { borderColor: "primary.main", bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
            }}
          >
            New
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FolderOpenIcon sx={{ fontSize: 14 }} />}
            onClick={handleOpen}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 11,
              borderRadius: 0,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": { borderColor: "primary.main", bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
            }}
          >
            Open
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CombineColumnsIcon sx={{ fontSize: 14 }} />}
            onClick={handleTemplates}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 11,
              borderRadius: 0,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": { borderColor: "primary.main", bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
            }}
          >
            Templates
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<HelpOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => setTutorialDialogOpen(true)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 11,
              borderRadius: 0,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": { borderColor: "primary.main", bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
            }}
          >
            Tutorials
          </Button>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
          px: 3,
          position: "relative",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            size="small"
            startIcon={<HelpOutlinedIcon sx={{ fontSize: 13 }} />}
            onClick={handleHelp}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 11,
              color: "text.secondary",
              opacity: 0.4,
              "&:hover": { opacity: 1, color: "text.primary" },
            }}
          >
            Help
          </Button>
          <Button
            size="small"
            startIcon={<DiscordIcon sx={{ fontSize: 13 }} />}
            onClick={() => {
              import("@tauri-apps/plugin-opener")
                .then(({ openUrl }) => openUrl("https://discord.gg/RgP4tGHZz"))
                .catch(() => window.open("https://discord.gg/RgP4tGHZz", "_blank"));
            }}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 11,
              color: "text.secondary",
              opacity: 0.4,
              "&:hover": { opacity: 1, color: "text.primary" },
            }}
          >
            Discord
          </Button>
          <Typography
            sx={{
              fontSize: 9.5,
              fontWeight: 600,
              color: "text.secondary",
              opacity: 0.25,
            }}
          >
            {appVersion ? `v${appVersion}` : ""}
          </Typography>
          {updateAvailable && (
            <Tooltip title="Click to install update from Microsoft Store">
              <Box
                onClick={(e) => { e.stopPropagation(); installUpdate(); }}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.3,
                  px: 0.75,
                  py: 0.15,
                  borderRadius: 0,
                  cursor: 'pointer',
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                  color: 'primary.main',
                  fontSize: 9,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.25),
                  },
                }}
              >
                <DownloadIcon sx={{ fontSize: 10 }} />
                Update available
              </Box>
            </Tooltip>
          )}
          <Typography
            sx={{
              fontSize: 9,
              fontWeight: 500,
              color: "text.secondary",
              opacity: 0.35,
              userSelect: "none",
            }}
          >
            &copy; 2026 Write Up Film Service Company
          </Typography>
        </Box>

      </Box>
    </Box>
  );
};
