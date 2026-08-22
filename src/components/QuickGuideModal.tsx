import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  useTheme as useMuiTheme,
  InputBase,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  SearchIcon,
  MenuBookIcon,
  KeyboardShortcutsIcon,
} from "./Icons";
import { TitleBar } from "./TitleBar";
import { SHORTCUTS_REGISTRY, SYNTAX_REGISTRY, type ShortcutItem } from "../constants/shortcuts";
import { useUI } from "../context";
interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  openHelpWindow?: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({
  isOpen,
  onClose,
  openHelpWindow,
}) => {
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === "dark";
  const { appScale } = useUI();
  const [tab, setTab] = useState<"shortcuts" | "syntax">("shortcuts");
  const [search, setSearch] = useState("");

  const handleOpenHelp = () => {
    onClose();
    if (openHelpWindow) {
      openHelpWindow();
    }
  };

  const categories = useMemo(() => {
    const catNames: ShortcutItem["category"][] = [
      "File & Document",
      "Navigation & View",
      "Editor & Formatting",
      "Zoom & Interface",
    ];

    return catNames
      .map((catTitle) => {
        const items = SHORTCUTS_REGISTRY.filter(
          (item) =>
            item.category === catTitle &&
            (item.label.toLowerCase().includes(search.toLowerCase()) ||
              item.keys.some((k) => k.toLowerCase().includes(search.toLowerCase())))
        );
        return { title: catTitle, items };
      })
      .filter((cat) => cat.items.length > 0);
  }, [search]);

  const filteredSyntax = useMemo(() => {
    const q = search.toLowerCase();
    return SYNTAX_REGISTRY.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.autoSyntax && item.autoSyntax.toLowerCase().includes(q)) ||
        (item.forcedSyntax && item.forcedSyntax.toLowerCase().includes(q)) ||
        (item.autoExample && item.autoExample.toLowerCase().includes(q)) ||
        (item.forcedExample && item.forcedExample.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      disableScrollLock
      transitionDuration={200}
      sx={{
        "& .MuiDialog-paper": {
          zoom: `${appScale}%`,
          borderRadius: 0,
          height: 560,
          maxHeight: "90vh",
          bgcolor: "background.paper",
          backgroundImage: "none",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 0 }}>
        <TitleBar
          title="Quick Guide"
          icon={<KeyboardShortcutsIcon sx={{ fontSize: 16 }} />}
          isModal
          onClose={onClose}
        />
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {/* Sticky Header with Tabs & Search */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            bgcolor: "background.paper",
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <ToggleButtonGroup
            value={tab}
            exclusive
            onChange={(_, val) => val !== null && setTab(val)}
            size="small"
          >
            <ToggleButton value="shortcuts" sx={{ fontSize: 12, py: 0.5, px: 2.5, textTransform: "none", fontWeight: 600 }}>Shortcuts</ToggleButton>
            <ToggleButton value="syntax" sx={{ fontSize: 12, py: 0.5, px: 2.5, textTransform: "none", fontWeight: 600 }}>Syntax Reference</ToggleButton>
          </ToggleButtonGroup>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.6,
              borderRadius: "8px",
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              width: 260,
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <InputBase
              placeholder={tab === "shortcuts" ? "Search shortcuts..." : "Search syntax..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                fontSize: "0.85rem",
                color: "inherit",
                width: "100%",
                "& input": { p: 0 },
              }}
            />
          </Box>
        </Box>

        {/* Scrollable Content */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Tab 1: Shortcuts Grid */}
          {tab === "shortcuts" && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2.5,
              }}
            >
              {categories.map((category) => (
                <Box
                  key={category.title}
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: muiTheme.palette.primary.main,
                      mb: 1.5,
                    }}
                  >
                    {category.title}
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {category.items.map((item) => (
                      <Box
                        key={item.label}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: "0.85rem", color: "text.primary" }}>
                          {item.label}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          {item.keys.map((k, i) => (
                            <Chip
                              key={i}
                              label={k}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                fontFamily: "monospace",
                                borderRadius: "4px",
                                bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                                color: "text.primary",
                                border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Tab 2: Syntax Reference */}
          {tab === "syntax" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {filteredSyntax.map((item) => (
                <Box
                  key={item.name}
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.25,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.95rem", color: muiTheme.palette.primary.main }}>
                    {item.name}
                  </Typography>

                  <Typography variant="body2" sx={{ fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.5 }}>
                    {item.description}
                  </Typography>

                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: item.autoSyntax && item.forcedSyntax ? "1fr 1fr" : "1fr" }, gap: 1.5 }}>
                    {item.autoSyntax && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, p: 1.5, borderRadius: "8px", bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "text.secondary", letterSpacing: 0.5 }}>
                          Auto Finding ({item.autoSyntax})
                        </Typography>
                        {item.autoExample && (
                          <Box sx={{ p: 1, borderRadius: "6px", bgcolor: isDark ? "#0d1117" : "#f6f8fa", fontFamily: "monospace", fontSize: "0.8rem", color: isDark ? "#e6edf3" : "#24292f", whiteSpace: "pre-wrap" }}>
                            {item.autoExample}
                          </Box>
                        )}
                      </Box>
                    )}

                    {item.forcedSyntax && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, p: 1.5, borderRadius: "8px", bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: muiTheme.palette.primary.main, letterSpacing: 0.5 }}>
                          {item.autoSyntax ? "Force Syntax" : "Syntax"} ({item.forcedSyntax})
                        </Typography>
                        {item.forcedExample && (
                          <Box sx={{ p: 1, borderRadius: "6px", bgcolor: isDark ? "#0d1117" : "#f6f8fa", fontFamily: "monospace", fontSize: "0.8rem", color: isDark ? "#e6edf3" : "#24292f", whiteSpace: "pre-wrap" }}>
                            {item.forcedExample}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Footer with Copyright Info & Help Articles Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            py: 1.75,
            bgcolor: "background.paper",
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            © {new Date().getFullYear()} <strong>ActOne Screenplay</strong> · <a href="https://iyal.ink" target="_blank" rel="noopener noreferrer" style={{ color: muiTheme.palette.primary.main, textDecoration: "none", fontWeight: 600 }}>iyal.ink</a>
          </Typography>

          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<MenuBookIcon />}
            onClick={handleOpenHelp}
            sx={{
              borderRadius: "6px",
              textTransform: "none",
              fontWeight: 600,
              px: 2,
              py: 0.6,
            }}
          >
            Help Articles
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
