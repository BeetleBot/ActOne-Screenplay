import React, { useEffect, useState } from "react";
import { useFile } from "../context/FileContext";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { HelpModal } from "./HelpModal";
import {
  Box,
  Typography,
  Button,
  Chip,
} from "@mui/material";

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
import { AddIcon, FolderOpenIcon, AutoAwesomeIcon, HelpOutlinedIcon, DescriptionIcon, DeleteIcon } from "./Icons";

const ActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  highlighted?: boolean;
  onClick: () => void;
}> = ({ icon, title, description, highlighted, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      width: 340,
      p: 1.25,
      borderRadius: 2.5,
      cursor: "pointer",
      bgcolor: highlighted ? "primary.main" : "background.paper",
      color: highlighted ? "primary.contrastText" : "text.primary",
      border: highlighted ? "none" : 1,
      borderColor: "divider",
      transition: "all 0.15s ease",
      "&:hover": {
        bgcolor: highlighted ? "primary.dark" : "action.hover",
        transform: "translateY(-1px)",
        boxShadow: (theme: any) =>
          highlighted
            ? `0 4px 16px ${theme.palette.primary.main}50`
            : `0 2px 8px rgba(0,0,0,0.06)`,
      },
    }}
  >
    <Box
      sx={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 2,
        bgcolor: highlighted ? "rgba(255,255,255,0.15)" : "action.selected",
        color: highlighted ? "inherit" : "text.secondary",
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.3 }}
      >
        {title}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: highlighted ? "rgba(255,255,255,0.65)" : "text.secondary",
          fontSize: 10.5,
          lineHeight: 1.2,
          display: "block",
          mt: 0.15,
        }}
      >
        {description}
      </Typography>
    </Box>
  </Box>
);

interface WelcomeScreenWindowProps {
  standalone?: boolean;
}

export const WelcomeScreenWindow: React.FC<WelcomeScreenWindowProps> = ({ standalone = false }) => {
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();
  const [quote, setQuote] = useState<Quote>({ text: "", author: "" });
  const [showHelp, setShowHelp] = useState(false);
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    setQuote(getDynamicQuote());
    getVersion().then(setAppVersion).catch(() => setAppVersion("0.1.0"));
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
      console.error("Failed to create editor window:", e);
      return false;
    }
  };

  const closeWelcome = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNew = async () => {
    if (standalone) {
      try {
        localStorage.setItem("pending-action", "new");
        const created = await createEditorWindow("new");
        if (created) { closeWelcome(); return; }
      } catch (e) { console.error(e); }
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
      } catch (e) { console.error(e); }
    }
    await openFile();
  };

  const handleTemplates = async () => {
    if (standalone) {
      try {
        localStorage.setItem("pending-action", "template");
        const created = await createEditorWindow("template");
        if (created) { closeWelcome(); return; }
      } catch (e) { console.error(e); }
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
      } catch (e) { console.error(e); }
    }
    openFilePath(path);
  };

  const handleHelp = () => {
    setShowHelp(true);
  };

  return (
    <>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
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
            `radial-gradient(ellipse 80% 60% at 50% -10%, ${theme.palette.primary.main}10 0%, transparent 70%)`,
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
                `radial-gradient(ellipse, ${theme.palette.primary.main}18 0%, transparent 70%)`,
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
          <Box sx={{ mb: 2.5, textAlign: "center", maxWidth: 440 }}>
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2.5 }}>
          <ActionCard
            icon={<AddIcon sx={{ fontSize: 16 }} />}
            title="New Project"
            description="Create a new screenplay"
            highlighted
            onClick={handleNew}
          />
          <ActionCard
            icon={<FolderOpenIcon sx={{ fontSize: 16 }} />}
            title="Open Project"
            description="Browse and open an existing file"
            onClick={handleOpen}
          />
          <ActionCard
            icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
            title="Templates"
            description="Start from a pre-built structure"
            onClick={handleTemplates}
          />
        </Box>

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
              {recentFiles.slice(0, 6).map((item: any) => (
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
          justifyContent: "center",
          gap: 2,
          py: 1.5,
          px: 3,
          position: "relative",
        }}
      >
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
      </Box>
    </Box>
    </>
  );
};
