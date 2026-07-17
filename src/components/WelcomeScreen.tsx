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
import { alpha, useTheme } from "@mui/material/styles";
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

import logoDark from "../assets/logo_dark.png";
import logoLight from "../assets/logo_light.png";
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
      width: 130,
      height: 95,
      p: 1.2,
      borderRadius: 0,
      cursor: "pointer",
      bgcolor: "transparent",
      color: "text.primary",
      border: "none",
      borderRight: "1px solid",
      borderColor: "divider",
      transition: "background-color var(--duration-normal) ease, transform var(--duration-normal) ease",
      "&:last-child": {
        borderRight: "none",
      },
      "&:hover": {
        bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
      },
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 0,
        bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
        color: "primary.main",
        border: "1px solid",
        borderColor: "divider",
        mb: 0.5,
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
  const theme = useTheme();
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
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          "@keyframes lineDrift1": {
            "0%": { transform: "translateX(-15%) rotate(-18deg)" },
            "50%": { transform: "translateX(15%) rotate(-18deg)" },
            "100%": { transform: "translateX(-15%) rotate(-18deg)" },
          },
          "@keyframes lineDrift2": {
            "0%": { transform: "translateX(18%) rotate(12deg)" },
            "50%": { transform: "translateX(-18%) rotate(12deg)" },
            "100%": { transform: "translateX(18%) rotate(12deg)" },
          },
          "@keyframes lineDrift3": {
            "0%": { transform: "translateX(-10%) rotate(-6deg)", opacity: 0.5 },
            "50%": { transform: "translateX(10%) rotate(-6deg)", opacity: 1 },
            "100%": { transform: "translateX(-10%) rotate(-6deg)", opacity: 0.5 },
          },
          "@keyframes lineDrift4": {
            "0%": { transform: "translateX(-20%) rotate(24deg)" },
            "50%": { transform: "translateX(20%) rotate(24deg)" },
            "100%": { transform: "translateX(-20%) rotate(24deg)" },
          },
          "@keyframes lineDrift5": {
            "0%": { transform: "translateX(12%) rotate(-14deg)" },
            "50%": { transform: "translateX(-12%) rotate(-14deg)" },
            "100%": { transform: "translateX(12%) rotate(-14deg)" },
          },
          "@keyframes lineDrift6": {
            "0%": { transform: "translateX(-15%) rotate(8deg)" },
            "50%": { transform: "translateX(15%) rotate(8deg)" },
            "100%": { transform: "translateX(-15%) rotate(8deg)" },
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: "-20%",
            filter: "blur(3px)",
            opacity: 0.9,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: "8%",
              left: "-10%",
              width: "70%",
              height: "1.5px",
              background: (t) =>
                `linear-gradient(90deg, transparent 0%, ${alpha(t.palette.primary.main, 0.9)} 50%, transparent 100%)`,
              animation: "lineDrift1 14s ease-in-out infinite",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "22%",
              right: "-20%",
              width: "80%",
              height: "1.5px",
              background: (t) =>
                `linear-gradient(90deg, transparent 0%, ${alpha(t.palette.primary.main, 0.75)} 50%, transparent 100%)`,
              animation: "lineDrift2 18s ease-in-out infinite",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "40%",
              left: "5%",
              width: "90%",
              height: "1px",
              background: (t) =>
                `linear-gradient(90deg, transparent 0%, ${alpha(t.palette.text.primary, 0.55)} 50%, transparent 100%)`,
              animation: "lineDrift3 22s ease-in-out infinite",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "55%",
              left: "-15%",
              width: "60%",
              height: "1px",
              background: (t) =>
                `linear-gradient(90deg, transparent 0%, ${alpha(t.palette.primary.main, 0.7)} 50%, transparent 100%)`,
              animation: "lineDrift4 16s ease-in-out infinite",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "70%",
              right: "-10%",
              width: "75%",
              height: "1px",
              background: (t) =>
                `linear-gradient(90deg, transparent 0%, ${alpha(t.palette.text.primary, 0.4)} 50%, transparent 100%)`,
              animation: "lineDrift5 20s ease-in-out infinite",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "85%",
              left: "10%",
              width: "50%",
              height: "1px",
              background: (t) =>
                `linear-gradient(90deg, transparent 0%, ${alpha(t.palette.primary.main, 0.6)} 50%, transparent 100%)`,
              animation: "lineDrift6 24s ease-in-out infinite",
            }}
          />
        </Box>
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
            src={theme.palette.mode === "dark" ? logoDark : logoLight}
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
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            mb: 2,
          }}
        >
          <ActionCard
            icon={<AddIcon sx={{ fontSize: 24 }} />}
            title="New Project"
            description="Create screenplay"
            onClick={handleNew}
          />
          <ActionCard
            icon={<FolderOpenIcon sx={{ fontSize: 24 }} />}
            title="Open Project"
            description="Browse and open"
            onClick={handleOpen}
          />
          <ActionCard
            icon={<CombineColumnsIcon sx={{ fontSize: 24 }} />}
            title="Templates"
            description="Structure template"
            onClick={handleTemplates}
          />
          <ActionCard
            icon={<HelpOutlinedIcon sx={{ fontSize: 24 }} />}
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
                    height: 30,
                    bgcolor: "transparent",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 0,
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
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
