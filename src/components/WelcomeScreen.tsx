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
  IconButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { logger } from "../utils/logger";
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

import { AddIcon, FolderOpenIcon, CombineColumnsIcon, HelpOutlinedIcon, DescriptionIcon, DeleteIcon, DiscordIcon, DownloadIcon, CloseIcon } from "./Icons";

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

const ThemeLogo: React.FC<{ sx?: any }> = ({ sx }) => {
  const theme = useTheme();
  return (
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3000 3000"
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: "100%",
        height: "100%",
        ...sx,
      }}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.palette.primary.main} />
          <stop offset="100%" stopColor={theme.palette.primary.light || theme.palette.secondary.main} />
        </linearGradient>
      </defs>
      <g
        transform="translate(0,3000) scale(0.1,-0.1)"
        fill="url(#logo-gradient)"
        stroke="none"
        style={{ transition: "fill 0.3s ease" }}
      >
        <path d="M8674 26030 c-305 -41 -482 -158 -593 -395 -116 -245 -163 -580 -163 -1170 0 -539 39 -861 134 -1110 86 -224 224 -369 408 -426 181 -56 96 -53 1628 -57 1108 -2 1413 -5 1409 -15 -8 -22 -3828 -11638 -3883 -11809 l-54 -167 -748 -4 c-812 -4 -840 -6 -1011 -63 -277 -93 -429 -336 -495 -793 -29 -199 -40 -393 -40 -731 1 -610 52 -952 181 -1205 125 -246 304 -347 667 -375 162 -13 6410 -13 6572 0 363 28 542 129 667 375 129 253 180 595 181 1205 0 338 -11 532 -40 731 -66 457 -218 700 -495 793 -166 56 -209 59 -929 65 l-666 6 333 1060 c183 583 340 1084 348 1113 l16 52 2837 0 2837 0 344 -1103 c190 -606 347 -1108 349 -1114 3 -10 -135 -13 -670 -13 -706 0 -873 -7 -1023 -42 -141 -32 -227 -78 -316 -167 -84 -84 -134 -165 -180 -293 -94 -256 -137 -673 -126 -1213 13 -589 77 -924 221 -1150 106 -165 241 -246 487 -292 88 -16 299 -18 3474 -21 2140 -2 3433 1 3525 7 362 24 537 110 666 327 148 250 206 602 206 1254 1 352 -8 513 -38 725 -63 445 -205 685 -464 788 -172 68 -304 76 -1150 77 l-685 0 -57 178 c-1627 5101 -4494 14064 -4513 14112 -79 194 -172 338 -299 466 -200 201 -444 313 -831 381 -94 16 -329 18 -4030 19 -2161 1 -3957 -2 -3991 -6z m7273 -6450 c513 -1807 933 -3288 933 -3292 0 -5 -871 -8 -1936 -8 -1544 0 -1935 3 -1932 13 2 6 434 1489 959 3295 l954 3283 45 -3 44 -3 933 -3285z" />
        <path d="M5870 6873 c-14 -2 -54 -13 -89 -24 -223 -70 -400 -240 -476 -456 -44 -126 -46 -188 -42 -1028 3 -673 5 -798 19 -845 78 -280 271 -471 545 -540 77 -20 157 -20 9198 -18 l9120 3 77 26 c124 43 204 93 298 188 97 98 154 194 192 327 l23 79 0 830 c0 891 1 866 -52 1005 -62 159 -199 307 -356 383 -50 25 -124 53 -164 61 -65 15 -922 16 -9170 15 -5004 -1 -9109 -4 -9123 -6z" />
      </g>
    </svg>
  );
};

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
      data-tauri-drag-region
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
      {/* Floating Close Button */}
      <IconButton
        size="small"
        onClick={closeWelcome}
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          color: "text.secondary",
          zIndex: 100,
          p: 0.5,
          borderRadius: 0,
          opacity: 0.4,
          transition: "opacity 0.2s ease, color 0.2s ease, background-color 0.2s ease",
          "&:hover": {
            opacity: 1,
            color: "error.main",
            bgcolor: (t) => alpha(t.palette.error.main, 0.1),
          },
        }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>

      <Box
        aria-hidden
        data-tauri-drag-region
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          "@keyframes breathe1": {
            "0%": { transform: "scale(1)", opacity: 0.045 },
            "50%": { transform: "scale(1.15)", opacity: 0.07 },
            "100%": { transform: "scale(1)", opacity: 0.045 },
          },
          "@keyframes breathe2": {
            "0%": { transform: "scale(1.1)", opacity: 0.035 },
            "50%": { transform: "scale(0.95)", opacity: 0.06 },
            "100%": { transform: "scale(1.1)", opacity: 0.035 },
          },
          "@keyframes breathe3": {
            "0%": { transform: "scale(0.95)", opacity: 0.03 },
            "50%": { transform: "scale(1.1)", opacity: 0.055 },
            "100%": { transform: "scale(0.95)", opacity: 0.03 },
          },
          "@keyframes logoBreathe": {
            "0%": { transform: "rotate(-1.5deg)" },
            "50%": { transform: "rotate(1.5deg)" },
            "100%": { transform: "rotate(-1.5deg)" },
          },
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
            animation: "breathe1 10s ease-in-out infinite",
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
            animation: "breathe2 12s ease-in-out infinite",
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
            animation: "breathe3 14s ease-in-out infinite",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 24,
            right: 28,
            width: 80,
            height: 80,
            opacity: 0.07,
            animation: "logoBreathe 8s ease-in-out infinite",
          }}
        >
          <ThemeLogo />
        </Box>
      </Box>
      <Box
        data-tauri-drag-region
        sx={{
          flex: 1,
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
                pr: 1, // Space for scrollbar
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 0,
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
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
