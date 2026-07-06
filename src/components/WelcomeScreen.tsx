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
  Chip,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

import { logger } from "../utils/logger";
import { TutorialSelectionDialog } from "./OnboardingTour";

interface Quote {
  text: string;
  author: string;
}

const QUOTES: Quote[] = [
  { text: "To make a great film, you need three things: the script, the script and the script.", author: "Alfred Hitchcock" },
  { text: "The hardest thing about writing is writing.", author: "Nora Ephron" },
  { text: "If it can be written, or thought, it can be filmed.", author: "Stanley Kubrick" },
  { text: "The screenwriter's job is to make the audience care.", author: "Billy Wilder" },
  { text: "Action is character. If we never show what a person does, we don't know who they are.", author: "Syd Field" },
  { text: "Don't write what you think people want to read. Write what you want to read.", author: "William Goldman" },
  { text: "Give me a good script, and I'll make a good movie.", author: "Akira Kurosawa" },
  { text: "The script is the outline of the dream.", author: "Jean-Luc Godard" },
  { text: "Write what you see, write what you hear. Everything else is decoration.", author: "David Mamet" },
  { text: "Audiences don't know what they want until you give it to them.", author: "Federico Fellini" },
  { text: "A story should have a beginning, a middle, and an end... but not necessarily in that order.", author: "Jean-Luc Godard" },
  { text: "Theme is the glue that holds the story together.", author: "Lajos Egri" },
  { text: "Plot is what happens. Story is who it happens to.", author: "Robert McKee" }
];

function getDynamicQuote(): Quote {
  try {
    const lastIdxStr = localStorage.getItem("last_quote_index");
    const lastIdx = lastIdxStr ? parseInt(lastIdxStr, 10) : -1;
    const available = [];
    for (let i = 0; i < QUOTES.length; i++) {
      if (i !== lastIdx) {
        available.push(i);
      }
    }
    const candidates = available.length > 0 ? available : [0];
    const randomIndex = candidates[Math.floor(Math.random() * candidates.length)];
    localStorage.setItem("last_quote_index", randomIndex.toString());
    return QUOTES[randomIndex];
  } catch {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }
}

import logoImage from "../assets/logo.png";
import { AddIcon, FolderOpenIcon, AutoAwesomeIcon, HelpOutlinedIcon, DescriptionIcon, DeleteIcon, DiscordIcon, DownloadIcon } from "./Icons";

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
      width: 120,
      height: 85,
      p: 1.2,
      borderRadius: 2,
      cursor: "pointer",
      bgcolor: "background.paper",
      color: "text.primary",
      border: 1,
      borderColor: "divider",
      transition: "all 0.12s ease",
      "&:hover": {
        bgcolor: "action.hover",
        transform: "translateY(-1px)",
        boxShadow: (theme: Theme) => `0 2px 8px ${alpha(theme.palette.common.black, 0.08)}`,
      },
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: 1.5,
        bgcolor: "action.selected",
        color: "text.secondary",
        mb: 0.75,
      }}
    >
      {icon}
    </Box>
    <Typography
      variant="subtitle2"
      sx={{ fontWeight: 700, fontSize: 12, lineHeight: 1.2 }}
    >
      {title}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        fontSize: 9,
        lineHeight: 1.1,
        mt: 0.25,
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
  const [quote, setQuote] = useState<Quote>({ text: "", author: "" });
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
    setQuote(getDynamicQuote());

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
          top: 0,
          left: 0,
          right: 0,
          height: "60%",
          pointerEvents: "none",
          filter: "blur(60px)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "0%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "160%",
            height: "200%",
            background: (t) =>
              `radial-gradient(ellipse 60% 60% at 50% 30%, ${alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.22 : 0.38)} 0%, transparent 65%)`,

          }}
        />
      </Box>
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
        {/* Logo with glow */}
        <Box sx={{ position: "relative", width: 180, height: 180, mb: 1.5 }}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 340,
              height: 340,
              borderRadius: "50%",
              background: (theme: Theme) =>
                `radial-gradient(ellipse, ${alpha(theme.palette.primary.main, 0.09)} 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          <Box
            component="img"
            src={logoImage}
            alt="ActOne"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            sx={{ width: "100%", height: "100%", objectFit: "contain", position: "relative", userSelect: "none", WebkitUserDrag: "none" }}
          />
        </Box>

        {/* Quote */}
        {quote.text && (
          <Box sx={{ mb: 1.5, textAlign: "center", maxWidth: 440 }}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 800,
                lineHeight: 1.35,
                fontFamily: '"Courier Prime", monospace',
                textTransform: "uppercase",
                opacity: 0.75,
              }}
            >
              &ldquo;{quote.text}&rdquo;
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "text.secondary",
                mt: 0.5,
                opacity: 0.5,
              }}
            >
              &mdash; {quote.author}
            </Typography>
          </Box>
        )}

        {/* Action Cards */}
        <Box sx={{ display: "flex", flexDirection: "row", gap: 1.5, mb: 2 }}>
          <Box sx={{ position: "relative" }}>
            <Box sx={{
              position: "absolute", inset: -5,
              borderRadius: 2,
              background: (t: Theme) => `radial-gradient(ellipse, ${alpha(t.palette.primary.main, 0.12)} 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />
            <ActionCard
              icon={<AddIcon sx={{ fontSize: 15 }} />}
              title="New Project"
              description="Create screenplay"
              onClick={handleNew}
            />
          </Box>
          <ActionCard
            icon={<FolderOpenIcon sx={{ fontSize: 15 }} />}
            title="Open Project"
            description="Browse and open"
            onClick={handleOpen}
          />
          <ActionCard
            icon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />}
            title="Templates"
            description="Structure template"
            onClick={handleTemplates}
          />
          <ActionCard
            icon={<HelpOutlinedIcon sx={{ fontSize: 15 }} />}
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

        {/* Recent Projects Strip */}
        {recentFiles.length > 0 && (
          <Box sx={{ textAlign: "center", maxWidth: 460 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: 10,
                display: "block",
                mb: 1,
                opacity: 0.55,
              }}
            >
              Recent Projects
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
              {recentFiles.slice(0, 6).map((item: RecentFile) => (
                <Chip
                  key={item.path}
                  icon={<DescriptionIcon sx={{ fontSize: 14, ml: 0.5 }} />}
                  label={item.name}
                  onDelete={() => removeFromRecent(item.path)}
                  deleteIcon={<DeleteIcon sx={{ fontSize: 13, opacity: 0.4, "&:hover": { opacity: 1, color: "error.main" } }} />}
                  onClick={() => handleOpenRecent(item.path)}
                  sx={{
                    maxWidth: 200,
                    fontWeight: 600,
                    fontSize: 11.5,
                    height: 32,
                    bgcolor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "action.hover",
                    },
                    "& .MuiChip-icon": { color: "text.secondary", opacity: 0.5 },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
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
                  borderRadius: '8px',
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
