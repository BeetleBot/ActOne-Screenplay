import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { CloseIcon } from "./Icons";

interface TitleBarProps {
  title: string;
  onClose: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title, onClose }) => (
  <Box
    data-tauri-drag-region
    sx={{
      height: 28,
      display: "flex",
      alignItems: "center",
      px: 1,
      justifyContent: "space-between",
      userSelect: "none",
      flexShrink: 0,
    }}
  >
    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11, color: "text.secondary" }}>
      {title}
    </Typography>
    <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary", p: 0.5 }}>
      <CloseIcon sx={{ fontSize: 14 }} />
    </IconButton>
  </Box>
);
