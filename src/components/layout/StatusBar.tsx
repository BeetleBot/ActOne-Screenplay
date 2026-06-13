import React, { useMemo, useState } from "react";
import { useFile, useUI } from "../../context";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";

export const StatusBar: React.FC = () => {
  const { rawText, parsedDoc, isBundle, scripts, activeScriptIndex, filePath, activeScriptName, setActiveScript } = useFile();
  const { isZenMode } = useUI();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const stats = useMemo(() => {
    const text = rawText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const pages = parsedDoc.pageBreaks ? parsedDoc.pageBreaks.length + 1 : 1;
    return { words, chars, pages };
  }, [rawText, parsedDoc]);

  if (isZenMode) return null;

  const fileName = filePath ? filePath.split(/[/\\]/).pop() || "Untitled" : "Untitled";

  return (
    <Box
      sx={{
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
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
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: isBundle ? "pointer" : "default", minWidth: 0 }}
        onClick={(e) => { if (isBundle) setAnchorEl(e.currentTarget); }}
      >
        {isBundle ? (
          <>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary", fontWeight: 500 }}>
              {fileName}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.disabled" }}>&gt;</Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.primary", fontWeight: 600 }}>
              {activeScriptName}.fountain
            </Typography>
            {scripts.length > 1 && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5, marginLeft: 2 }}>
                <path d="M7 10l5 5 5-5z" />
              </svg>
            )}
          </>
        ) : (
          <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary", fontWeight: 500 }}>
            {fileName}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
          Words: <strong style={{ color: "var(--text-main)" }}>{stats.words}</strong>
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
          Pages: <strong style={{ color: "var(--text-main)" }}>{stats.pages}</strong>
        </Typography>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { minWidth: 180, maxHeight: 240 } } }}
      >
        {scripts.map((script, index) => (
          <MenuItem
            key={script.fileName}
            selected={index === activeScriptIndex}
            onClick={() => { setActiveScript(index); setAnchorEl(null); }}
            dense
          >
            <ListItemText
              primary={`${script.name}.fountain`}
              slotProps={{
                primary: { sx: { fontWeight: index === activeScriptIndex ? 700 : 400, fontSize: 13 } },
              }}
            />
            {index === activeScriptIndex && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 8, color: "var(--button-color)" }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
