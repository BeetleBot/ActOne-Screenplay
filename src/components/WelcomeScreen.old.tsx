import React, { useEffect, useState } from "react";
import { useFile } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useModalWindows } from "../hooks";
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTheme } from "../context";
import { themes } from "../theme";
import { logger } from "../utils/logger";

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
import { AddIcon, FolderOpenIcon, AutoAwesomeIcon, HelpOutlinedIcon, DescriptionIcon, DeleteIcon, ColorLensIcon, DiscordIcon } from "./Icons";

// PillButton helper component
const PillButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}> = ({ icon, title, onClick }) => (
  <Button
    variant="text"
    onClick={onClick}
    startIcon={icon}
    sx={{
      display: "flex",
      justifyContent: "flex-start",
      width: 260,
      height: 42,
      px: 3,
      borderRadius: "9999px",
      textTransform: "none",
      fontSize: "0.85rem",
      fontWeight: 700,
      color: "text.primary",
      bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      "& .MuiButton-startIcon": {
        color: "primary.main",
        mr: 1.5,
        transition: "transform 0.2s ease",
      },
      "&:hover": {
        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
        color: "primary.main",
        transform: "translateX(4px)",
        "& .MuiButton-startIcon": {
          transform: "scale(1.15)",
        },
      },
    }}
  >
    {title}
  </Button>
);

// RecentFilePill helper component
const RecentFilePill: React.FC<{
  name: string;
  onClick: () => void;
  onDelete: () => void;
}> = ({ name, onClick, onDelete }) => {
  const [hovered, setHovered] = React.useState(false);
  
  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        width: 260,
        height: 42,
        px: 3,
        borderRadius: "9999px",
        bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
        cursor: "pointer",
        boxSizing: "border-box",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
          transform: "translateX(-4px)",
        },
      }}
    >
      <DescriptionIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.5, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0, flex: 1, textAlign: "left" }}>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        sx={{
          color: "text.disabled",
          "&:hover": { color: "error.main" },
          p: 0.2,
          mr: -1.5,
          flexShrink: 0,
          opacity: hovered ? 1 : 0,
          transform: hovered ? "scale(1)" : "scale(0.8)",
          transition: "all 0.15s ease",
        }}
      >
        <DeleteIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Box>
  );
};

interface WelcomeScreenWindowProps {
  standalone?: boolean;
}

export const WelcomeScreenWindow: React.FC<WelcomeScreenWindowProps> = ({ standalone = false }) => {
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();
  const { theme, setTheme, customThemes } = useTheme();
  const [quote, setQuote] = useState<Quote>({ text: "", author: "" });
  const { openHelpWindow } = useModalWindows();
  const appVersion = __APP_VERSION__;
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);


  useEffect(() => {
    setQuote(getDynamicQuote());


    // Check if double-clicked file was passed as CLI argument on startup
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

  // Listen for OS file open events (from Rust backend)
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
        if (created) { closeWelcome(); return; }
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
          if (created) { closeWelcome(); return; }
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
        if (created) { closeWelcome(); return; }
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
    <>
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        color: "text.primary",
        overflow: "hidden",
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "40%",
          background: (theme: any) =>
            `radial-gradient(ellipse 80% 60% at 50% -10%, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 70%)`,
          pointerEvents: "none",
        },
      }}
    >
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
              background: (theme: any) =>
                `radial-gradient(ellipse, ${alpha(theme.palette.primary.main, 0.09)} 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          <img
            src={logoImage}
            alt="ActOne"
            style={{ width: "100%", height: "100%", objectFit: "contain", position: "relative" }}
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

        {/* Split Mirrored Pills Layout */}
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3.5, mt: 1 }}>
          {/* Left Column: 4 Action Pills */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <PillButton
              icon={<AddIcon sx={{ fontSize: 16 }} />}
              title="New Project"
              onClick={handleNew}
            />
            <PillButton
              icon={<FolderOpenIcon sx={{ fontSize: 16 }} />}
              title="Open Project"
              onClick={handleOpen}
            />
            <PillButton
              icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
              title="Templates"
              onClick={handleTemplates}
            />
            <PillButton
              icon={<HelpOutlinedIcon sx={{ fontSize: 16 }} />}
              title="Help Guide"
              onClick={handleHelp}
            />
          </Box>

          {/* Middle Vertical Divider */}
          <Divider orientation="vertical" flexItem sx={{ height: 180, alignSelf: "center", borderColor: "divider", opacity: 0.8 }} />

          {/* Right Column: 4 Recent Pills */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {Array.from({ length: 4 }).map((_, idx) => {
              const item = recentFiles[idx];
              if (item) {
                return (
                  <Tooltip key={item.path} title={item.path}>
                    <Box sx={{ position: "relative" }}>
                      <RecentFilePill
                        name={item.name}
                        onClick={() => handleOpenRecent(item.path)}
                        onDelete={() => removeFromRecent(item.path)}
                      />
                    </Box>
                  </Tooltip>
                );
              } else {
                return (
                  <Box
                    key={`empty-${idx}`}
                    sx={{
                      width: 260,
                      height: 42,
                      borderRadius: "9999px",
                      bgcolor: (t) => alpha(t.palette.text.primary, 0.015),
                      border: (t) => `1px solid ${alpha(t.palette.text.primary, 0.03)}`,
                      boxSizing: "border-box",
                    }}
                  />
                );
              }
            })}
          </Box>
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
        <IconButton
          onClick={(e) => setThemeMenuAnchor(e.currentTarget)}
          size="small"
          sx={{
            color: "text.secondary",
            opacity: 0.4,
            "&:hover": { opacity: 1, color: "text.primary" },
          }}
        >
          <ColorLensIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Menu
          anchorEl={themeMenuAnchor}
          open={Boolean(themeMenuAnchor)}
          onClose={() => setThemeMenuAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 220, maxHeight: 420, py: 0.5 } } }}
        >
          <Typography variant="caption" sx={{ px: 2, pt: 1, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Light
          </Typography>
          {themes.filter(t => !t.isDark).map((t) => (
            <MenuItem
              key={t.id}
              selected={theme === t.id}
              onClick={() => { setTheme(t.id); setThemeMenuAnchor(null); }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flexShrink: 0 }}>
                <Box sx={{ bgcolor: t.colors.editor }} />
                <Box sx={{ bgcolor: t.colors.sidebar }} />
                <Box sx={{ bgcolor: t.colors.accent }} />
                <Box sx={{ bgcolor: t.colors.dropdown }} />
              </Box>
              {t.name}
            </MenuItem>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Typography variant="caption" sx={{ px: 2, pt: 0.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dark
          </Typography>
          {themes.filter(t => t.isDark).map((t) => (
            <MenuItem
              key={t.id}
              selected={theme === t.id}
              onClick={() => { setTheme(t.id); setThemeMenuAnchor(null); }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flexShrink: 0 }}>
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
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" sx={{ px: 2, pt: 0.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Custom
              </Typography>
              {customThemes.map((t) => (
                <MenuItem
                  key={t.id}
                  selected={theme === t.id}
              onClick={() => { setTheme(t.id); setThemeMenuAnchor(null); }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flexShrink: 0 }}>
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
    </Box>
    </>
  );
};
