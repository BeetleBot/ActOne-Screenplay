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
  IconButton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import { logger } from "../utils/logger";
import { ThemeLogo } from "./ThemeLogo";
import { TutorialSelectionDialog } from "./OnboardingTour";

const GREETINGS = [
  "What are you writing today?",
  "Ready to tell a story?",
  "Let's build a world.",
  "Your screenplay awaits.",
  "Time to write something great.",
  "Where does the story begin?",
  "What happens next?",
  "Lights, camera, write.",
  "Every great film starts here.",
  "Who's your protagonist today?",
  "Fresh page, fresh ideas.",
  "The cursor is blinking. Go.",
  "What's the opening scene?",
  "Let's make something worth watching.",
  "A blank page is a beautiful thing.",
  "Start with the character. Always.",
  "Your audience is waiting.",
  "Write the movie you'd want to see.",
];

function getRandomGreeting(): string {
  try {
    const lastIdxStr = localStorage.getItem("last_greeting_index");
    const lastIdx = lastIdxStr ? parseInt(lastIdxStr, 10) : -1;
    const available = [];
    for (let i = 0; i < GREETINGS.length; i++) {
      if (i !== lastIdx) available.push(i);
    }
    const candidates = available.length > 0 ? available : [0];
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    localStorage.setItem("last_greeting_index", idx.toString());
    return GREETINGS[idx];
  } catch {
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }
}

import { AddIcon, FolderOpenIcon, CombineColumnsIcon, HelpOutlinedIcon, DescriptionIcon, DeleteIcon, DiscordIcon, DownloadIcon } from "./Icons";

const ActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon, title, description, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      width: 140,
      height: 100,
      p: 1,
      borderRadius: 0,
      cursor: "pointer",
      bgcolor: "transparent",
      color: "text.primary",
      transition: "all 0.25s ease",
      "&:hover": {
        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
        "& .action-icon": {
          transform: "scale(1.12)",
          bgcolor: (t) => alpha(t.palette.primary.main, 0.18),
        },
      },
    }}
  >
    <Box
      className="action-icon"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        borderRadius: 0,
        bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
        color: "primary.main",
        mb: 0.5,
        transition: "all 0.25s ease",
      }}
    >
      {icon}
    </Box>
    <Typography
      variant="subtitle2"
      sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2, mt: 0.5 }}
    >
      {title}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        fontSize: 10,
        lineHeight: 1.2,
        mt: 0.25,
        opacity: 0.9,
      }}
    >
      {description}
    </Typography>
  </Box>
);

interface WelcomeScreenWindowProps {
  standalone?: boolean;
}

export const WelcomeScreenWindow: React.FC<WelcomeScreenWindowProps> = ({ standalone = false }) => {
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();
  const [greeting, setGreeting] = useState("");
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
    setGreeting(getRandomGreeting());

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
    if (target.closest("[data-no-drag]") || target.closest("button, [role='button'], .MuiButtonBase-root")) return;
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
      {/* Header */}
      <Box
        onMouseDown={handleStartDrag}
        sx={{
          height: 40,
          minHeight: 40,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "relative",
          zIndex: 10,
          pr: "94px",
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            flexShrink: 0,
            borderRight: "1px solid",
            borderColor: "rgba(0,0,0,0.15)",
          }}
        >
          <Box sx={{ width: 19, height: 19, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ThemeLogo variant="solid" />
          </Box>
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", pl: 1.5, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Welcome to ActOne
        </Typography>
        <Box sx={{ flex: 1 }} />
        {updateAvailable && (
          <Box
            onClick={(e) => { e.stopPropagation(); installUpdate(); }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Click to install update from Microsoft Store"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              height: 40,
              px: 1.25,
              cursor: "pointer",
              bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
              color: "primary.main",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              borderLeft: 1,
              borderColor: "divider",
              flexShrink: 0,
              "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.25) },
            }}
          >
            <DownloadIcon sx={{ fontSize: 12 }} />
            Update
          </Box>
        )}
        <Box
          data-no-drag="true"
          sx={{
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            position: "absolute",
            right: 0,
            top: 0,
            height: "100%",
            bgcolor: "inherit",
            zIndex: 11,
            borderLeft: 1,
            borderColor: "divider",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <IconButton
            onClick={handleMinimize}
            title="Minimize"
            sx={{ width: 48, height: 40, borderRadius: 0, color: "inherit", "&:hover": { bgcolor: "action.hover", color: "text.primary" } }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
              <path d="M2 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </IconButton>
          <IconButton
            onClick={closeWelcome}
            title="Close"
            sx={{ width: 46, height: 40, borderRadius: 0, color: "inherit", borderLeft: 1, borderColor: "divider", "&:hover": { bgcolor: (t) => t.palette.error.main, color: (t) => t.palette.common.white } }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ pointerEvents: "none" }} />
            </svg>
          </IconButton>
        </Box>
      </Box>

      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "-15%",
            right: "-10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: (t) =>
              `radial-gradient(circle, ${alpha(t.palette.primary.main, 0.35)} 0%, transparent 70%)`,
            filter: "blur(80px)",
            opacity: 0.045,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "-10%",
            left: "-15%",
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: (t) =>
              `radial-gradient(circle, ${alpha(t.palette.primary.main, 0.3)} 0%, transparent 70%)`,
            filter: "blur(90px)",
            opacity: 0.035,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "40%",
            left: "30%",
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: (t) =>
              `radial-gradient(circle, ${alpha(t.palette.text.primary, 0.15)} 0%, transparent 70%)`,
            filter: "blur(100px)",
            opacity: 0.03,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 180,
            height: 180,
            opacity: 0.07,
            pointerEvents: "none",
          }}
        >
          <ThemeLogo />
        </Box>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          px: 4,
          pt: 4,
          pb: 1.5,
          gap: 1.5,
          "@keyframes fadeInUp": {
            "0%": { opacity: 0, transform: "translateY(8px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 600,
            fontFamily: '"Inter", sans-serif',
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: "primary.main",
            opacity: 0,
            animation: "fadeInUp 0.5s ease forwards 0.15s",
            maxWidth: 340,
          }}
        >
          {greeting}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 0.5,
            opacity: 0,
            animation: "fadeInUp 0.5s ease forwards 0.25s",
          }}
        >
          <ActionCard
            icon={<AddIcon sx={{ fontSize: 22 }} />}
            title="New Project"
            description="Create screenplay"
            onClick={handleNew}
          />
          <ActionCard
            icon={<FolderOpenIcon sx={{ fontSize: 22 }} />}
            title="Open Project"
            description="Browse and open"
            onClick={handleOpen}
          />
          <ActionCard
            icon={<CombineColumnsIcon sx={{ fontSize: 22 }} />}
            title="Templates"
            description="Structure template"
            onClick={handleTemplates}
          />
          <ActionCard
            icon={<HelpOutlinedIcon sx={{ fontSize: 22 }} />}
            title="Tutorials"
            description="Interactive tours"
            onClick={() => setTutorialDialogOpen(true)}
          />
        </Box>

        <TutorialSelectionDialog
          open={tutorialDialogOpen}
          onClose={() => setTutorialDialogOpen(false)}
          onSelectTour={handleSelectTour}
        />

        <Box
          sx={{
            flex: 1,
            opacity: 0,
            animation: "fadeInUp 0.5s ease forwards 0.35s",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: 10,
              display: "block",
              mb: 0.8,
              opacity: 0.8,
            }}
          >
            Recent
          </Typography>
          {recentFiles.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                overflowY: "auto",
                flex: 1,
                minHeight: 0,
                pr: 1, // Space for scrollbar
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.15),
                  borderRadius: "3px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.3),
                },
              }}
            >
              {recentFiles.slice(0, 10).map((item: RecentFile) => {
                const parts = item.path.replace(/\\/g, "/").split("/");
                const folder = parts.slice(0, -1).slice(-2).join("/");
                const ext = item.name.split(".").pop()?.toLowerCase() || "";
                const typeLabel = ext === "actone" ? "Bundle" : ext === "fountain" ? "Fountain" : ext.toUpperCase();
                const elapsed = Date.now() - item.lastOpened;
                const mins = Math.floor(elapsed / 60000);
                const hrs = Math.floor(mins / 60);
                const days = Math.floor(hrs / 24);
                const timeAgo = days > 0 ? `${days}d ago` : hrs > 0 ? `${hrs}h ago` : mins > 1 ? `${mins}m ago` : "Just now";

                return (
                  <Box
                    key={item.path}
                    onClick={() => handleOpenRecent(item.path)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.2,
                      px: 1.5,
                      py: 1,
                      borderRadius: 0,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                        "& .recent-delete": { opacity: 0.5 },
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 0,
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <DescriptionIcon sx={{ fontSize: 16, color: "primary.main", opacity: 0.7 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 600,
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 10,
                          color: "text.secondary",
                          opacity: 0.85,
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {folder}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexShrink: 0 }}>
                      <Box
                        sx={{
                          px: 0.8,
                          py: 0.3,
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                          color: "primary.main",
                          borderRadius: 0,
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {typeLabel}
                      </Box>
                      <Typography
                        sx={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: "text.secondary",
                          opacity: 0.75,
                          whiteSpace: "nowrap",
                          width: 55,
                          textAlign: "right",
                        }}
                      >
                        {timeAgo}
                      </Typography>
                      <IconButton
                        className="recent-delete"
                        size="medium"
                        onClick={(e) => { e.stopPropagation(); removeFromRecent(item.path); }}
                        sx={{
                          p: 0.8,
                          opacity: 0.4,
                          borderRadius: 0,
                          transition: "all 0.15s ease",
                          "&:hover": { opacity: 1, color: "error.main", bgcolor: (t) => alpha(t.palette.error.main, 0.1) },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  color: "text.secondary",
                  opacity: 0.35,
                  fontStyle: "italic",
                }}
              >
                No recent projects yet
              </Typography>
            </Box>
          )}
        </Box>

      </Box>

      {/* Footer */}
      <Box
        sx={{
          height: 28,
          minHeight: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          position: "relative",
          flexShrink: 0,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            sx={{
              fontSize: 9.5,
              fontWeight: 600,
              color: "text.secondary",
              opacity: 0.5,
            }}
          >
            {appVersion ? `v${appVersion}` : ""}
          </Typography>
          <Typography
            sx={{
              fontSize: 9,
              fontWeight: 500,
              color: "text.secondary",
              opacity: 0.5,
              userSelect: "none",
            }}
          >
            &copy; 2026 Write Up Film Service Company
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            onClick={handleHelp}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              cursor: "pointer",
              color: "text.secondary",
              opacity: 0.4,
              transition: "opacity 0.2s ease, color 0.2s ease",
              "&:hover": { opacity: 1, color: "text.primary" },
            }}
          >
            <HelpOutlinedIcon sx={{ fontSize: 12 }} />
            <Typography sx={{ fontSize: 10, fontWeight: 600 }}>Help</Typography>
          </Box>
          <Box
            onClick={() => {
              import("@tauri-apps/plugin-opener")
                .then(({ openUrl }) => openUrl("https://discord.gg/RgP4tGHZz"))
                .catch(() => window.open("https://discord.gg/RgP4tGHZz", "_blank"));
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              cursor: "pointer",
              color: "text.secondary",
              opacity: 0.4,
              transition: "opacity 0.2s ease, color 0.2s ease",
              "&:hover": { opacity: 1, color: "text.primary" },
            }}
          >
            <DiscordIcon sx={{ fontSize: 12 }} />
            <Typography sx={{ fontSize: 10, fontWeight: 600 }}>Discord</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
