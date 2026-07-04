import React, { useEffect, useState } from "react";
import { useFile } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useModalWindows, useStoreUpdateCheck } from "../hooks";
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTheme } from "../context";
import { themes } from "../theme";
import { logger } from "../utils/logger";

import logoImage from "../assets/logo.png";
import { AddIcon, FolderOpenIcon, AutoAwesomeIcon, HelpOutlinedIcon, DescriptionIcon, DiscordIcon, CloseIcon, DownloadIcon } from "./Icons";

interface Quote {
  text: string;
  author: string;
}

const QUOTES: Quote[] = [
  { text: "To make a great film, you need three things: the script, the script and the script.", author: "Alfred Hitchcock" },
  { text: "The hardest thing about writing is writing.", author: "Nora Ephron" },
  { text: "If it can be written, or thought, it can be filmed.", author: "Stanley Kubrick" },
  { text: "The screenwriter's job is to make the audience care.", author: "Billy Wilder" },
  { text: "Action is character. If we never show what a person is, we don't know who they are.", author: "Syd Field" },
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
    const available: number[] = [];
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

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

interface CinematicPalette {
  bg: string;
  bgGradient: (primary: string) => string;
  glow: (primary: string) => string;
  glowStrong: (primary: string) => string;
  glass: string;
  glassHover: string;
  glassBorder: string;
  glassBorderHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  divider: string;
  iconBg: string;
  iconBgHover: string;
  iconColor: string;
  iconColorHover: string;
  accentText: (primary: string) => string;
  shadowSoft: string;
  shadowStrong: (primary: string) => string;
  emptyBg: string;
  emptyBorder: string;
  badgeNeutral: string;
  badgeNeutralText: string;
  badgeActive: (primary: string) => string;
  badgeActiveText: string;
  menuBg: string;
  menuBorder: string;
  menuItemHover: string;
  menuItemSelected: string;
  menuItemText: string;
  menuLabel: string;
  menuShadow: string;
}

const DARK_PALETTE: CinematicPalette = {
  bg: "#0a0a0d",
  bgGradient: (primary) => `
    radial-gradient(ellipse 60% 50% at 25% 20%, ${alpha(primary, 0.22)} 0%, transparent 60%),
    radial-gradient(ellipse 50% 60% at 80% 70%, ${alpha(primary, 0.14)} 0%, transparent 60%),
    linear-gradient(135deg, #0a0a0d 0%, #14141c 50%, #0a0a0d 100%)
  `,
  glow: (primary) => `radial-gradient(ellipse, ${alpha(primary, 0.45)} 0%, transparent 65%)`,
  glowStrong: (primary) => `drop-shadow(0 0 22px ${alpha(primary, 0.60)}) drop-shadow(0 0 44px ${alpha(primary, 0.30)})`,
  glass: "rgba(255, 255, 255, 0.04)",
  glassHover: "rgba(255, 255, 255, 0.08)",
  glassBorder: "rgba(255, 255, 255, 0.10)",
  glassBorderHover: "rgba(255, 255, 255, 0.22)",
  textPrimary: "rgba(255, 255, 255, 0.95)",
  textSecondary: "rgba(255, 255, 255, 0.6)",
  textMuted: "rgba(255, 255, 255, 0.45)",
  textFaint: "rgba(255, 255, 255, 0.35)",
  divider: "rgba(255, 255, 255, 0.08)",
  iconBg: "rgba(255, 255, 255, 0.08)",
  iconBgHover: "rgba(255, 255, 255, 0.95)",
  iconColor: "rgba(255, 255, 255, 0.92)",
  iconColorHover: "#0a0a0d",
  accentText: (primary) => alpha(primary, 0.9),
  shadowSoft: "inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 24px -8px rgba(0,0,0,0.6)",
  shadowStrong: (primary) => `inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 36px -8px ${alpha(primary, 0.45)}`,
  emptyBg: "rgba(255, 255, 255, 0.02)",
  emptyBorder: "rgba(255, 255, 255, 0.10)",
  badgeNeutral: "rgba(255, 255, 255, 0.08)",
  badgeNeutralText: "rgba(255, 255, 255, 0.75)",
  badgeActive: (primary) => alpha(primary, 0.85),
  badgeActiveText: "#0a0a0d",
  menuBg: "rgba(20, 20, 24, 0.92)",
  menuBorder: "rgba(255, 255, 255, 0.10)",
  menuItemHover: "rgba(255, 255, 255, 0.08)",
  menuItemSelected: "rgba(255, 255, 255, 0.12)",
  menuItemText: "rgba(255, 255, 255, 0.9)",
  menuLabel: "rgba(255, 255, 255, 0.6)",
  menuShadow: "0 16px 48px -8px rgba(0,0,0,0.7)",
};

const LIGHT_PALETTE: CinematicPalette = {
  bg: "#fbf7f2",
  bgGradient: (primary) => `
    radial-gradient(ellipse 60% 50% at 25% 20%, ${alpha(primary, 0.22)} 0%, transparent 60%),
    radial-gradient(ellipse 50% 60% at 80% 70%, ${alpha(primary, 0.18)} 0%, transparent 60%),
    linear-gradient(135deg, #fbf7f2 0%, #f3ece2 50%, #f8f2ea 100%)
  `,
  glow: (primary) => `radial-gradient(ellipse, ${alpha(primary, 0.50)} 0%, transparent 65%)`,
  glowStrong: (primary) => `drop-shadow(0 0 22px ${alpha(primary, 0.55)}) drop-shadow(0 0 44px ${alpha(primary, 0.30)})`,
  glass: "rgba(255, 255, 255, 0.55)",
  glassHover: "rgba(255, 255, 255, 0.78)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  glassBorderHover: "rgba(0, 0, 0, 0.20)",
  textPrimary: "rgba(20, 16, 12, 0.95)",
  textSecondary: "rgba(20, 16, 12, 0.65)",
  textMuted: "rgba(20, 16, 12, 0.50)",
  textFaint: "rgba(20, 16, 12, 0.40)",
  divider: "rgba(0, 0, 0, 0.10)",
  iconBg: "rgba(20, 16, 12, 0.06)",
  iconBgHover: "rgba(20, 16, 12, 0.92)",
  iconColor: "rgba(20, 16, 12, 0.85)",
  iconColorHover: "#fbf7f2",
  accentText: (primary) => primary,
  shadowSoft: "inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 20px -6px rgba(0,0,0,0.15)",
  shadowStrong: (primary) => `inset 0 1px 0 rgba(255,255,255,0.8), 0 14px 32px -8px ${alpha(primary, 0.40)}`,
  emptyBg: "rgba(255, 255, 255, 0.35)",
  emptyBorder: "rgba(0, 0, 0, 0.10)",
  badgeNeutral: "rgba(0, 0, 0, 0.06)",
  badgeNeutralText: "rgba(20, 16, 12, 0.7)",
  badgeActive: (primary) => primary,
  badgeActiveText: "#ffffff",
  menuBg: "rgba(255, 253, 248, 0.92)",
  menuBorder: "rgba(0, 0, 0, 0.08)",
  menuItemHover: "rgba(0, 0, 0, 0.05)",
  menuItemSelected: "rgba(0, 0, 0, 0.08)",
  menuItemText: "rgba(20, 16, 12, 0.9)",
  menuLabel: "rgba(20, 16, 12, 0.55)",
  menuShadow: "0 16px 48px -8px rgba(0,0,0,0.18)",
};

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  palette: CinematicPalette;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, description, onClick, palette }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      gap: 0.5,
      width: 130,
      height: 100,
      p: 1.5,
      borderRadius: "14px",
      cursor: "pointer",
      boxSizing: "border-box",
      bgcolor: palette.glass,
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      border: "1px solid",
      borderColor: palette.glassBorder,
      boxShadow: palette.shadowSoft,
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      "& .icon-wrapper": {
        bgcolor: palette.iconBg,
        color: palette.iconColor,
        transition: "all 0.2s ease",
      },
      "&:hover": {
        transform: "translateY(-2px)",
        borderColor: palette.glassBorderHover,
        bgcolor: palette.glassHover,
        boxShadow: (t) => palette.shadowStrong(t.palette.primary.main),
        "& .icon-wrapper": {
          bgcolor: palette.iconBgHover,
          color: palette.iconColorHover,
          transform: "scale(1.05)",
        },
      },
    }}
  >
    <Box
      className="icon-wrapper"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: "8px",
      }}
    >
      {icon}
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: 12, lineHeight: 1.2, color: palette.textPrimary }}>
      {title}
    </Typography>
    <Typography sx={{ color: palette.textSecondary, fontSize: 10, lineHeight: 1.2 }}>
      {description}
    </Typography>
  </Box>
);

interface RecentRowProps {
  file: { path: string; name: string; lastOpened: number };
  onClick: () => void;
  onDelete: () => void;
  palette: CinematicPalette;
}

const RecentRow: React.FC<RecentRowProps> = ({ file, onClick, onDelete, palette }) => {
  const isActOne = file.path.endsWith(".actone");
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        height: 38,
        borderRadius: "10px",
        cursor: "pointer",
        boxSizing: "border-box",
        bgcolor: palette.glass,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid",
        borderColor: palette.glassBorder,
        boxShadow: palette.shadowSoft,
        transition: "all 0.15s ease",
        flexShrink: 0,
        "& .recent-delete": {
          opacity: 0,
          transform: "scale(0.8)",
          transition: "all 0.15s ease",
        },
        "&:hover": {
          borderColor: (t) => alpha(t.palette.primary.main, 0.5),
          bgcolor: palette.glassHover,
          "& .recent-delete": {
            opacity: 1,
            transform: "scale(1)",
          },
        },
      }}
    >
      <DescriptionIcon sx={{ fontSize: 14, color: palette.textMuted, flexShrink: 0 }} />
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          color: palette.textPrimary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          minWidth: 0,
        }}
      >
        {file.name}
      </Typography>
      <Box
        sx={{
          fontSize: 8,
          fontWeight: 800,
          px: 0.5,
          py: 0.1,
          borderRadius: "3px",
          bgcolor: isActOne ? (t) => alpha(t.palette.primary.main, 0.85) : palette.badgeNeutral,
          color: isActOne ? palette.badgeActiveText : palette.badgeNeutralText,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          flexShrink: 0,
        }}
      >
        {isActOne ? "bundle" : "fountain"}
      </Box>
      <Typography
        sx={{
          fontSize: 9,
          color: palette.textFaint,
          whiteSpace: "nowrap",
          flexShrink: 0,
          minWidth: 48,
          textAlign: "right",
        }}
      >
        {getRelativeTime(file.lastOpened)}
      </Typography>
      <Box
        className="recent-delete"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: "5px",
          cursor: "pointer",
          color: palette.textMuted,
          flexShrink: 0,
          "&:hover": {
            color: "#f44336",
            bgcolor: "rgba(244,67,54,0.10)",
          },
        }}
      >
        <CloseIcon sx={{ fontSize: 12 }} />
      </Box>
    </Box>
  );
};

interface WelcomeScreenWindowProps {
  standalone?: boolean;
}

export const WelcomeScreenWindow: React.FC<WelcomeScreenWindowProps> = ({ standalone = false }) => {
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();
  const { theme, setTheme, customThemes, mode } = useTheme();
  const [quote, setQuote] = useState<Quote>({ text: "", author: "" });
  const { openHelpWindow } = useModalWindows();
  const appVersion = __APP_VERSION__;
  const { updateAvailable, installUpdate } = useStoreUpdateCheck();
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);

  const isDark = mode === "dark";
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

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
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        bgcolor: palette.bg,
        color: palette.textPrimary,
        fontFamily: "var(--font-ui)",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: (t) => palette.bgGradient(t.palette.primary.main),
          backgroundSize: "200% 200%",
          animation: "cinematic-drift 18s ease-in-out infinite",
          pointerEvents: "none",
          transition: "background 0.3s ease",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "60%",
          height: "60%",
          zIndex: 0,
          borderRadius: "50%",
          background: (t) => `radial-gradient(circle, ${alpha(t.palette.primary.main, isDark ? 0.30 : 0.35)} 0%, transparent 70%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
          animation: "orb-drift-1 22s ease-in-out infinite",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: "-15%",
          right: "-10%",
          width: "55%",
          height: "55%",
          zIndex: 0,
          borderRadius: "50%",
          background: (t) => `radial-gradient(circle, ${alpha(t.palette.primary.main, isDark ? 0.22 : 0.28)} 0%, transparent 70%)`,
          filter: "blur(70px)",
          pointerEvents: "none",
          animation: "orb-drift-2 26s ease-in-out infinite",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: "40%",
          height: "40%",
          zIndex: 0,
          borderRadius: "50%",
          background: (t) => `radial-gradient(circle, ${alpha(t.palette.primary.main, isDark ? 0.18 : 0.22)} 0%, transparent 70%)`,
          filter: "blur(50px)",
          pointerEvents: "none",
          transform: "translate(-50%, -50%)",
          animation: "orb-drift-3 30s ease-in-out infinite",
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center", pt: 2.5, minHeight: 0, border: "none" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pb: 0,
              animation: "quote-fade-in 0.6s ease-out both",
            }}
        >
          <Box sx={{ position: "relative", width: 250, height: 250 }}>
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 560,
                height: 560,
                borderRadius: "50%",
                background: (t) => palette.glow(t.palette.primary.main),
                filter: "blur(32px)",
                pointerEvents: "none",
                animation: "logo-glow-pulse 4.5s ease-in-out infinite",
              }}
            />
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                filter: (t) => palette.glowStrong(t.palette.primary.main),
              }}
            >
              <img src={logoImage} alt="ActOne Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            px: 4,
            py: 0,
            mt: -0.5,
            animation: "quote-fade-in 0.6s ease-out 0.15s both",
            minHeight: 0,
          }}
        >
          {quote.text && (
            <>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  fontFamily: '"Courier Prime Sans", sans-serif',
                  fontStyle: "italic",
                  color: palette.textPrimary,
                  maxWidth: 480,
                  textShadow: isDark ? "0 2px 24px rgba(0,0,0,0.6)" : "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                &ldquo;{quote.text}&rdquo;
              </Typography>
              <Typography
                sx={{
                  mt: 1,
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: (t) => palette.accentText(t.palette.primary.main),
                }}
              >
                &mdash; {quote.author}
              </Typography>
            </>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: 1.25,
            px: 4,
            pt: 1,
            pb: 1,
            animation: "quote-fade-in 0.6s ease-out 0.3s both",
          }}
        >
          <ActionCard
            icon={<AddIcon sx={{ fontSize: 18 }} />}
            title="New Project"
            description="Start fresh script"
            onClick={handleNew}
            palette={palette}
          />
          <ActionCard
            icon={<FolderOpenIcon sx={{ fontSize: 18 }} />}
            title="Open File"
            description="Browse local files"
            onClick={handleOpen}
            palette={palette}
          />
          <ActionCard
            icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
            title="Templates"
            description="Use structural form"
            onClick={handleTemplates}
            palette={palette}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            px: 4,
            pb: 1,
            animation: "quote-fade-in 0.6s ease-out 0.45s both",
            width: "100%",
            maxWidth: 460,
            mx: "auto",
            alignSelf: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography
              sx={{
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: "0.18em",
                fontSize: 9,
                color: palette.textMuted,
                flexShrink: 0,
              }}
            >
              Recent
            </Typography>
            {recentFiles.length > 0 && (
              <Typography sx={{ color: palette.textFaint, fontSize: 9.5, flexShrink: 0 }}>
                {recentFiles.length}
              </Typography>
            )}
          </Box>

          {recentFiles.length === 0 ? (
            <Typography sx={{ color: palette.textFaint, fontSize: 10, fontStyle: "italic" }}>
              No recent screenplays — start your first script
            </Typography>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                overflowY: "auto",
                flex: 1,
                minHeight: 0,
                pb: 1,
                pr: 0.5,
                mr: -0.5,
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": { bgcolor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)", borderRadius: 2 },
                "&::-webkit-scrollbar-thumb:hover": { bgcolor: isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.22)" },
              }}
            >
              {recentFiles.slice(0, 10).map((file) => (
                <RecentRow
                  key={file.path}
                  file={file}
                  onClick={() => handleOpenRecent(file.path)}
                  onDelete={() => removeFromRecent(file.path)}
                  palette={palette}
                />
              ))}
            </Box>
          )}
        </Box>

        </Box>

        <Box
          sx={{
            height: 36,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            position: "relative",
            zIndex: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontSize: 10, color: palette.textFaint, fontWeight: 600 }}>
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
                  Update
                </Box>
              </Tooltip>
            )}
            <Button
              size="small"
              startIcon={<DiscordIcon sx={{ fontSize: 11 }} />}
              onClick={() => {
                import("@tauri-apps/plugin-opener")
                  .then(({ openUrl }) => openUrl("https://discord.gg/RgP4tGHZz"))
                  .catch(() => window.open("https://discord.gg/RgP4tGHZz", "_blank"));
              }}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: 10,
                color: palette.textMuted,
                p: 0,
                minWidth: 0,
                "&:hover": { color: palette.textPrimary, bgcolor: "transparent" },
              }}
            >
              Discord
            </Button>
            <Button
              size="small"
              startIcon={<HelpOutlinedIcon sx={{ fontSize: 11 }} />}
              onClick={handleHelp}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: 10,
                color: palette.textMuted,
                p: 0,
                minWidth: 0,
                "&:hover": { color: palette.textPrimary, bgcolor: "transparent" },
              }}
            >
              Help
            </Button>
          </Box>

          <Button
            onClick={(e) => setThemeMenuAnchor(e.currentTarget)}
            size="small"
            startIcon={
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "3px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {(() => {
                  const t = [...themes, ...customThemes].find(th => th.id === theme);
                  if (!t) return <><Box sx={{ bgcolor: palette.iconBg }} /><Box sx={{ bgcolor: palette.iconBg }} /></>;
                  return (
                    <>
                      <Box sx={{ bgcolor: t.colors.editor }} />
                      <Box sx={{ bgcolor: t.colors.sidebar }} />
                      <Box sx={{ bgcolor: t.colors.accent }} />
                      <Box sx={{ bgcolor: t.colors.dropdown }} />
                    </>
                  );
                })()}
              </Box>
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 10,
              color: palette.textPrimary,
              border: "1px solid",
              borderColor: palette.glassBorder,
              borderRadius: "8px",
              px: 1.25,
              py: 0.25,
              minWidth: 0,
              bgcolor: palette.glass,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              "&:hover": {
                color: palette.textPrimary,
                borderColor: palette.glassBorderHover,
                bgcolor: palette.glassHover,
              },
            }}
          >
            {(() => {
              const t = [...themes, ...customThemes].find(th => th.id === theme);
              return t?.name ?? "Theme";
            })()}
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={themeMenuAnchor}
        open={Boolean(themeMenuAnchor)}
        onClose={() => setThemeMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 220,
              maxHeight: 400,
              borderRadius: "12px",
              bgcolor: palette.menuBg,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid",
              borderColor: palette.menuBorder,
              boxShadow: palette.menuShadow,
            },
          },
        }}
      >
        <Typography sx={{ px: 2, pt: 1, pb: 0.5, display: 'block', color: palette.menuLabel, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Light
        </Typography>
        {themes.filter(t => !t.isDark).map((t) => (
          <MenuItem
            key={t.id}
            selected={theme === t.id}
            onClick={() => { setTheme(t.id); setThemeMenuAnchor(null); }}
            sx={{ color: palette.menuItemText, "&:hover": { bgcolor: palette.menuItemHover }, "&.Mui-selected": { bgcolor: palette.menuItemSelected } }}
          >
            <Box sx={{ width: 22, height: 22, borderRadius: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flexShrink: 0, mr: 1.5 }}>
              <Box sx={{ bgcolor: t.colors.editor }} />
              <Box sx={{ bgcolor: t.colors.sidebar }} />
              <Box sx={{ bgcolor: t.colors.accent }} />
              <Box sx={{ bgcolor: t.colors.dropdown }} />
            </Box>
            {t.name}
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5, borderColor: palette.divider }} />
        <Typography sx={{ px: 2, pt: 0.5, pb: 0.5, display: 'block', color: palette.menuLabel, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Dark
        </Typography>
        {themes.filter(t => t.isDark).map((t) => (
          <MenuItem
            key={t.id}
            selected={theme === t.id}
            onClick={() => { setTheme(t.id); setThemeMenuAnchor(null); }}
            sx={{ color: palette.menuItemText, "&:hover": { bgcolor: palette.menuItemHover }, "&.Mui-selected": { bgcolor: palette.menuItemSelected } }}
          >
            <Box sx={{ width: 22, height: 22, borderRadius: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flexShrink: 0, mr: 1.5 }}>
              <Box sx={{ bgcolor: t.colors.editor }} />
              <Box sx={{ bgcolor: t.colors.sidebar }} />
              <Box sx={{ bgcolor: t.colors.accent }} />
              <Box sx={{ bgcolor: t.colors.dropdown }} />
            </Box>
            {t.name}
          </MenuItem>
        ))}
        {customThemes.length > 0 && (
          <>
            <Divider sx={{ my: 0.5, borderColor: palette.divider }} />
            <Typography sx={{ px: 2, pt: 0.5, pb: 0.5, display: 'block', color: palette.menuLabel, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Custom
            </Typography>
            {customThemes.map((t) => (
              <MenuItem
                key={t.id}
                selected={theme === t.id}
                onClick={() => { setTheme(t.id); setThemeMenuAnchor(null); }}
                sx={{ color: palette.menuItemText, "&:hover": { bgcolor: palette.menuItemHover }, "&.Mui-selected": { bgcolor: palette.menuItemSelected } }}
              >
                <Box sx={{ width: 22, height: 22, borderRadius: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flexShrink: 0, mr: 1.5 }}>
                  <Box sx={{ bgcolor: t.colors.editor }} />
                  <Box sx={{ bgcolor: t.colors.sidebar }} />
                  <Box sx={{ bgcolor: t.colors.accent }} />
                  <Box sx={{ bgcolor: t.colors.dropdown }} />
                </Box>
                {t.name}
              </MenuItem>
            ))}
          </>
        )}
      </Menu>
    </Box>
  );
};
