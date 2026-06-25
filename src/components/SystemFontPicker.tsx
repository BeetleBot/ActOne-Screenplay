import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "../utils/logger";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  TextField,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { CloseIcon, SearchIcon } from "./Icons";
import { useUI } from "../context";

interface SystemFontPickerProps {
  open: boolean;
  script: string;
  onSelect: (font: string) => void;
  onClose: () => void;
}

export const SystemFontPicker: React.FC<SystemFontPickerProps> = ({
  open,
  script,
  onSelect,
  onClose,
}) => {
  const { appScale } = useUI();
  const [allFonts, setAllFonts] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const fonts = await invoke<string[]>("get_system_fonts");
        setAllFonts(fonts);
      } catch (e) {
        logger.error("SystemFontPicker", "Failed to load system fonts", e);
      }
    };
    load();
  }, [open]);

  const filtered = search
    ? allFonts.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : allFonts;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      disableScrollLock
      transitionDuration={200}
      sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '12px', maxHeight: '85vh' } }}
    >
      <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
          Choose {script} Font
        </Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 1, overflow: "auto" }}>
        <TextField
          size="small"
          placeholder="Search fonts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />,
              style: { fontSize: 12 },
            },
          }}
          sx={{ mb: 0.5 }}
        />

        <List dense sx={{ flex: 1, overflow: "auto", py: 0 }}>
          {filtered.map((font) => (
            <ListItemButton
              key={font}
              onClick={() => {
                onSelect(font);
                onClose();
              }}
              sx={{ borderRadius: 1, py: 0.3, minHeight: 30 }}
            >
              <ListItemText
                primary={font}
                slotProps={{
                  primary: {
                    sx: {
                      fontFamily: `"${font}"`,
                      fontSize: 13,
                    },
                  },
                }}
              />
            </ListItemButton>
          ))}
          {filtered.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", py: 2, fontSize: 12 }}>
              No fonts match your search.
            </Typography>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};
