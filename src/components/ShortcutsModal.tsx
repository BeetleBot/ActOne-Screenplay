import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  useTheme as useMuiTheme,
  InputBase,
  Chip,
  Tabs,
  Tab,
} from "@mui/material";
import {
  CloseIcon,
  SearchIcon,
  MenuBookIcon,
  KeyboardArrowDownIcon,
} from "./Icons";
import { TitleBar } from "./TitleBar";
import { SHORTCUTS_REGISTRY, SYNTAX_REGISTRY, type ShortcutItem } from "../constants/shortcuts";
import { useUI } from "../context";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  openHelpWindow?: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
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
    return SYNTAX_REGISTRY.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.syntax.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.example.toLowerCase().includes(search.toLowerCase())
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
          title="Keyboard Shortcuts & Syntax Reference"
          icon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
          isModal
          onClose={onClose}
        />
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 2, display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 2 }}>
        {/* Header with Tabs and Search */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            pb: 1,
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, val) => setTab(val)}
            sx={{
              minHeight: 36,
              "& .MuiTab-root": {
                minHeight: 36,
                py: 0,
                px: 2,
                fontSize: "0.85rem",
                fontWeight: 600,
                textTransform: "none",
              },
            }}
          >
            <Tab value="shortcuts" label="Shortcuts" />
            <Tab value="syntax" label="Syntax Reference" />
          </Tabs>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.5,
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

        {/* Tab 1: Shortcuts Grid */}
        {tab === "shortcuts" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
              flex: 1,
              overflowY: "auto",
              pr: 0.5,
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
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              flex: 1,
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {filteredSyntax.map((item) => (
              <Box
                key={item.name}
                sx={{
                  p: 1.75,
                  borderRadius: "10px",
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.75,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.9rem", color: muiTheme.palette.primary.main }}>
                    {item.name}
                  </Typography>
                  <Chip
                    label={item.syntax}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      borderRadius: "4px",
                      bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                      color: "text.primary",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                  {item.description}
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "6px",
                    bgcolor: isDark ? "#0d1117" : "#f6f8fa",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    color: isDark ? "#e6edf3" : "#24292f",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.example}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Footer with Help Articles Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            pt: 1.5,
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<MenuBookIcon />}
            onClick={handleOpenHelp}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              px: 2,
              py: 0.8,
            }}
          >
            Help Articles
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
