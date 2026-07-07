import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { CloseIcon } from "./Icons";

interface TitleBarProps {
  title: string;
  onClose: () => void;
  icon?: React.ReactNode;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title, onClose, icon }) => (
  <Box
    data-tauri-drag-region
    sx={{
      height: 40,
      display: "flex",
      alignItems: "center",
      px: 0,
      justifyContent: "space-between",
      userSelect: "none",
      flexShrink: 0,
      borderBottom: "1px solid",
      borderColor: "divider",
      bgcolor: "background.paper",
      borderTopLeftRadius: 'inherit',
      borderTopRightRadius: 'inherit',
    }}
  >
    <Box data-tauri-drag-region sx={{ display: "flex", alignItems: "center", height: "100%", gap: 1.5, borderTopLeftRadius: 'inherit' }}>
      {icon && (
        <Box
          data-tauri-drag-region
          sx={{
            width: 48,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            flexShrink: 0,
            borderRight: "1px solid",
            borderColor: "rgba(0,0,0,0.15)",
            borderTopLeftRadius: 'inherit',
          }}
        >
          {icon}
        </Box>
      )}
      <Typography data-tauri-drag-region variant="caption" sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", pl: icon ? 0 : 1.5 }}>
        {title.toUpperCase()}
      </Typography>
    </Box>
    <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary", mr: 1, p: 0.5, borderRadius: 0 }}>
      <CloseIcon sx={{ fontSize: 16 }} />
    </IconButton>
  </Box>
);
