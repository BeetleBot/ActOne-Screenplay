import React, { useMemo } from "react";
import { useFile, useUI } from "../../context";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const StatusBar: React.FC = () => {
  const { rawText, parsedDoc } = useFile();
  const { isZenMode } = useUI();

  const stats = useMemo(() => {
    const text = rawText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const pages = parsedDoc.pageBreaks ? parsedDoc.pageBreaks.length + 1 : 1;
    return { words, chars, pages };
  }, [rawText, parsedDoc]);

  if (isZenMode) return null;

  return (
    <Box
      sx={{
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        px: 2,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        color: "text.secondary",
        fontSize: 11,
        fontFamily: "var(--font-ui)",
        userSelect: "none",
        zIndex: 5,
      }}
    >
      <Box sx={{ display: "flex", gap: 2 }}>
        <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
          Words: <strong style={{ color: "var(--text-main)" }}>{stats.words}</strong>
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
          Characters: <strong style={{ color: "var(--text-main)" }}>{stats.chars}</strong>
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
          Pages: <strong style={{ color: "var(--text-main)" }}>{stats.pages}</strong>
        </Typography>
      </Box>
    </Box>
  );
};
