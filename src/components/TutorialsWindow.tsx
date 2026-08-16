import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Button, Chip, ThemeProvider as MuiThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { AutoAwesomeIcon } from "./Icons";
import { TitleBar } from "./TitleBar";
import { createActOneTheme } from "../theme";
import { resolveThemeConfig, type CustomTheme } from "../theme/themeUtils";
import { initThemeEngine, onThemeChanged, getInitialThemeId, getInitialCustomThemes } from "../theme/ThemeEngine";

interface TutorialItem {
  id: string;
  title: string;
  description: string;
  tourType?: "ui" | "fountain" | "tagging" | "advanced" | "theming";
  comingSoon?: boolean;
}

interface TutorialSection {
  id: string;
  label: string;
  tutorials: TutorialItem[];
}

const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    id: "ui",
    label: "UI",
    tutorials: [
      { id: "basic-ui", title: "Basic UI", description: "Explore every part of the workspace: Activity Bar, Quick Settings, Header tabs, Editor, Status Bar — plus the fastest way to navigate ActOne.", tourType: "ui" },
      { id: "theming", title: "Theming", description: "Customize colors and appearance to match your workflow.", tourType: "theming" },
    ],
  },
  {
    id: "writing",
    label: "WRITING",
    tutorials: [
      { id: "basic-fountain", title: "Basic Fountain Syntax", description: "Hands-on writing sandbox. Practice scene headings, dialogue, parentheticals, transitions, and shots.", tourType: "fountain" },
      { id: "advanced-syntax", title: "Advanced Syntax", description: "Scene colours, storylines, markers — learn production-ready Fountain features.", tourType: "advanced" },
    ],
  },
  {
    id: "tags",
    label: "TAGS",
    tutorials: [
      { id: "tagging-pt1", title: "Tagging Pt.1", description: "Create production tags, discover auto-populated Cast tags, and toggle tag visibility in the editor.", tourType: "tagging" },
    ],
  },
];

interface TutorialsWindowProps {
  isModal?: boolean;
  onClose?: () => void;
}

export const TutorialsWindow: React.FC<TutorialsWindowProps> = ({ isModal = false, onClose }) => {
  const [themeId, setThemeId] = useState(() => getInitialThemeId());
  const [appScale, setAppScale] = useState(100);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => getInitialCustomThemes());
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [activeSection, setActiveSection] = useState(TUTORIAL_SECTIONS[0].id);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    initThemeEngine().then((state) => {
      setThemeId(state.themeId);
      setAppScale(state.appScale);
      try { setCustomThemes(JSON.parse(state.customThemes)); } catch { setCustomThemes([]); }
    });
    return onThemeChanged((state) => {
      setThemeId(state.themeId);
      setAppScale(state.appScale);
      try { setCustomThemes(JSON.parse(state.customThemes)); } catch { setCustomThemes([]); }
    });
  }, []);

  const currentThemeConfig = useMemo(
    () => resolveThemeConfig(themeId, customThemes, systemDark),
    [themeId, customThemes, systemDark],
  );
  const muiTheme = useMemo(
    () => createActOneTheme(currentThemeConfig, appScale),
    [currentThemeConfig, appScale],
  );

  useEffect(() => {
    document.body.classList.toggle("dark-theme", currentThemeConfig.isDark);
  }, [currentThemeConfig.isDark]);

  const handleStartTutorial = async (tourType: "ui" | "fountain" | "tagging" | "advanced" | "theming") => {
    localStorage.setItem("pending-tutorial-type", tourType);
    localStorage.setItem("pending-action", "tutorial");

    let currentLabel = "main";
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      currentLabel = getCurrentWindow().label;
    } catch {}

    if (currentLabel === "welcome") {
      try {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        
        const webview = new WebviewWindow("main", {
          url: `/?action=tutorial&type=${tourType}`,
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

        const { listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen("editor:ready", () => {
          unlisten();
          getCurrentWindow().close().catch(() => {});
        });
        setTimeout(() => { unlisten(); }, 10000);
      } catch (e) {
        console.error("Failed to launch editor window from welcome screen:", e);
      }
    } else {
      if (isModal && onClose) {
        onClose();
      } else {
        const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
        if (isTauri) {
          try {
            const { emit } = await import("@tauri-apps/api/event");
            await emit("tutorial:start", { type: tourType });
          } catch { /* event bus unavailable */ }
          try {
            const { getCurrentWindow } = await import("@tauri-apps/api/window");
            await getCurrentWindow().close();
          } catch { /* window close unavailable */ }
        } else {
          window.location.href = "/?action=tutorial";
        }
      }
    }
  };

  const section = TUTORIAL_SECTIONS.find((s) => s.id === activeSection) || TUTORIAL_SECTIONS[0];

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ height: isModal ? "100%" : "100vh", display: "flex", flexDirection: "column", zoom: `${appScale}%`, overflow: "hidden" }}>
        <TitleBar
          title="Tutorials"
          icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
          isModal={isModal}
          onClose={async () => {
            if (isModal && onClose) {
              onClose();
            } else {
              try {
                const { getCurrentWindow } = await import("@tauri-apps/api/window");
                await getCurrentWindow().close();
              } catch {}
            }
          }}
        />
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left pane — categories */}
          <Box sx={{ width: 130, flexShrink: 0, borderRight: "1px solid", borderColor: "divider", py: 1, display: "flex", flexDirection: "column", gap: 0.5, px: 1 }}>
            {TUTORIAL_SECTIONS.map((sec) => (
              <Button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                disableRipple
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  fontWeight: activeSection === sec.id ? 800 : 600,
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  color: activeSection === sec.id ? "primary.main" : "text.secondary",
                  bgcolor: activeSection === sec.id ? "action.selected" : "transparent",
                  borderRadius: 0,
                  px: 1.5,
                  py: 0.75,
                  minWidth: 0,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                {sec.label}
              </Button>
            ))}
          </Box>

          {/* Right pane — tutorials */}
          <Box sx={{ flex: 1, overflow: "auto", px: 2.5, py: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {section.tutorials.map((tutorial) => (
              <Box
                key={tutorial.id}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 0,
                  bgcolor: "background.paper",
                  opacity: tutorial.comingSoon ? 0.6 : 1,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>
                      {tutorial.title}
                      {tutorial.comingSoon && (
                        <Chip label="Coming soon" size="small" sx={{ ml: 1, height: 18, fontSize: 10, borderRadius: 0, fontWeight: 600 }} />
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                      {tutorial.description}
                    </Typography>
                  </Box>
                  {tutorial.tourType && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleStartTutorial(tutorial.tourType!)}
                      sx={{ borderRadius: 0, fontSize: 11, textTransform: "none", py: 0.4, px: 1.5, minWidth: 72, flexShrink: 0, mt: 0.25 }}
                    >
                      Start
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </MuiThemeProvider>
  );
};
