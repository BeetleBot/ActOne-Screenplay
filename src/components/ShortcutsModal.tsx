import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  useTheme as useMuiTheme,
  InputBase,
  Chip,
} from "@mui/material";
import {
  CloseIcon,
  SearchIcon,
  MenuBookIcon,
  ActionKeyIcon,
} from "./Icons";
import { TitleBar } from "./TitleBar";
import { SHORTCUTS_REGISTRY, type ShortcutItem } from "../constants/shortcuts";

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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          bgcolor: isDark ? "#161b22" : "#ffffff",
          color: isDark ? "#f0f6fc" : "#1c2128",
          boxShadow: isDark
            ? "0 24px 48px rgba(0,0,0,0.6)"
            : "0 24px 48px rgba(0,0,0,0.15)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          overflow: "hidden",
        },
      }}
    >
      <TitleBar
        title="Keyboard Shortcuts"
        onClose={onClose}
        action={
          <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      <DialogContent sx={{ p: 3, pt: 2, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Header & Search Bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            pb: 1,
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <ActionKeyIcon sx={{ fontSize: 24, color: muiTheme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
              Keyboard Shortcuts
            </Typography>
          </Box>

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
              width: 240,
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <InputBase
              placeholder="Search shortcuts..."
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

        {/* Categories Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2.5,
            maxHeight: "55vh",
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
