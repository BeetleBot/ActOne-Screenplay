import React, { useState } from "react";
import { useFile } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { alpha } from "@mui/material/styles";
import { DownloadIcon, DescriptionIcon } from "./Icons";
import { ExportCompleteDialog } from "./ExportCompleteDialog";
import { WindowResizeHandles } from "./WindowResizeHandles";
import { TitleBar } from "./TitleBar";
import { logger } from "../utils/logger";
import { STORAGE_KEYS } from "../constants";

import {
  Alert,
  Checkbox,
  Dialog,
  DialogTitle,
  Button,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";

import { isProseScript } from "../utils/scriptMode";
import { stripFountainForExport } from "../utils/fountainExport";
import type { ExportWindowData } from "../utils/exportWindow";

type ScriptFormat = "fountain" | "fdx" | "fadein" | "markdown";

export interface ExportScriptWindowProps {
  data?: ExportWindowData;
  onClose: () => void;
}

/* ── Option row with checkbox (Settings Window style) ── */
const OptionRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <Box
    onClick={() => onChange(!checked)}
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      py: 0.6,
      px: 1,
      cursor: "pointer",
      borderRadius: "6px",
      transition: "background-color 0.15s ease",
      '&:hover': { bgcolor: "action.hover" },
      userSelect: "none",
    }}
  >
    <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>{label}</Typography>
    <Checkbox
      size="small"
      checked={checked}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.checked); }}
      sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 18 } }}
    />
  </Box>
);

export const ExportScriptWindow: React.FC<ExportScriptWindowProps> = ({ onClose, data }) => {
  const fileContext = useFile();
  const { rawText, isBundle, activeScriptName, filePath, scripts, activeScriptIndex } = data?.file ?? fileContext;

  const activeScript = scripts?.[activeScriptIndex ?? 0];
  const isProse = isProseScript(activeScript, filePath);

  const [format, setFormat] = useState<ScriptFormat>(isProse ? "markdown" : "fountain");
  const [exportedPath, setExportedPath] = useState<string | null>(null);
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [exportSections, setExportSections] = useState(false);
  const [exportSynopses, setExportSynopses] = useState(false);
  const [exportTitlePage, setExportTitlePage] = useState(true);

  const getLastExportDir = (): string | undefined => {
    return localStorage.getItem(STORAGE_KEYS.LAST_EXPORT_DIR) || undefined;
  };

  const saveLastExportDir = (savedPath: string) => {
    try {
      const dir = savedPath.replace(/[/\\][^/\\]+$/, "");
      if (dir && dir !== savedPath) {
        localStorage.setItem(STORAGE_KEYS.LAST_EXPORT_DIR, dir);
      }
    } catch (e) {
      logger.error("export", "saveLastExportDir failed", e);
    }
  };

  const handleExportMarkdown = async () => {
    try {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        const documentDir = filePath ? filePath.replace(/[/\\][^/\\]+$/, "") : undefined;
        const defaultDir = documentDir || getLastExportDir();
        const defaultName = activeScriptName.endsWith(".md") ? activeScriptName : `${activeScriptName}.md`;

        const result = await invoke<string | null>("export_markdown", {
          markdownText: rawText,
          defaultDirectory: defaultDir,
          defaultName,
        });
        if (result) {
          saveLastExportDir(result);
          setExportedPath(result);
        }
      } else {
        const bundleName = filePath
          ? filePath.split(/[/\\]/).pop()?.replace(/\.(actone|fountain|txt|md|markdown)$/i, "") || "Untitled"
          : "Untitled";
        const scriptSuffix = isBundle ? `_${activeScriptName}` : "";
        const blob = new Blob([rawText], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bundleName}${scriptSuffix}.md`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
      }
    } catch (e) {
      logger.error("export", "handleExportMarkdown failed", e);
      setExportError("Markdown export failed. Please try again or choose another location.");
    }
  };

  const handleExportFountain = async () => {
    try {
      const cleaned = stripFountainForExport(rawText, {
        sections: exportSections,
        synopses: exportSynopses,
        titlePage: exportTitlePage,
      });
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        const result = await invoke<string | null>("export_fountain", {
          fountainText: cleaned,
          defaultDirectory: getLastExportDir(),
        });
        if (result) {
          saveLastExportDir(result);
          setExportedPath(result);
        }
      } else {
        const bundleName = filePath
          ? filePath.split(/[/\\]/).pop()?.replace(/\.(actone|fountain|txt)$/i, "") || "Untitled"
          : "Untitled";
        const scriptSuffix = isBundle ? `_${activeScriptName}` : "";
        const blob = new Blob([cleaned], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bundleName}${scriptSuffix}.fountain`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
      }
    } catch (e) {
      logger.error("export", "handleExportFountain failed", e);
      setExportError("Fountain export failed. Please try again or choose another location.");
    }
  };

  const handleExportFDX = async () => {
    try {
      const cleaned = stripFountainForExport(rawText, {
        sections: false,
        synopses: false,
        titlePage: exportTitlePage,
      });
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        const result = await invoke<string | null>("export_fdx", {
          fountainText: cleaned,
          defaultDirectory: getLastExportDir(),
        });
        if (result) {
          saveLastExportDir(result);
          setExportedPath(result);
        }
      } else {
        const bundleName = filePath
          ? filePath.split(/[/\\]/).pop()?.replace(/\.(actone|fountain|txt)$/i, "") || "Untitled"
          : "Untitled";
        const scriptSuffix = isBundle ? `_${activeScriptName}` : "";
        const blob = new Blob([cleaned], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bundleName}${scriptSuffix}.fdx`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
      }
    } catch (e) {
      logger.error("export", "handleExportFDX failed", e);
      setExportError("Final Draft export failed. Please try again or choose another location.");
    }
  };

  const handleExportFadeIn = async () => {
    try {
      const cleaned = stripFountainForExport(rawText, {
        sections: false,
        synopses: false,
        titlePage: exportTitlePage,
      });
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        const result = await invoke<string | null>("export_fadein", {
          fountainText: cleaned,
          defaultDirectory: getLastExportDir(),
        });
        if (result) {
          saveLastExportDir(result);
          setExportedPath(result);
        }
      } else {
        const bundleName = filePath
          ? filePath.split(/[/\\]/).pop()?.replace(/\.(actone|fountain|txt)$/i, "") || "Untitled"
          : "Untitled";
        const scriptSuffix = isBundle ? `_${activeScriptName}` : "";
        const blob = new Blob([cleaned], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bundleName}${scriptSuffix}.fadein`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
      }
    } catch (e) {
      logger.error("export", "handleExportFadeIn failed", e);
      setExportError("Fade In export failed. Please try again or choose another location.");
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError("");
    try {
      if (isProse) {
        await handleExportMarkdown();
        return;
      }
      if (format === "fdx") {
        await handleExportFDX();
      } else if (format === "fadein") {
        await handleExportFadeIn();
      } else {
        await handleExportFountain();
      }
    } finally {
      setIsExporting(false);
    }
  };

  const formatButtonLabel = isProse
    ? "Export to Markdown (.md)"
    : (format === "fdx" ? "Export to Final Draft (.fdx)" : format === "fadein" ? "Export to Fade In (.fadein)" : "Export to Fountain (.fountain)");

  if (exportedPath) return <ExportCompleteDialog path={exportedPath} onClose={onClose} />;

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen
      maxWidth={false}
      disableScrollLock
      transitionDuration={150}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 0,
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          m: 0,
        }
      }}
    >
      {typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && <WindowResizeHandles />}
      <DialogTitle sx={{ m: 0, p: 0 }}>
        <TitleBar
          title={isProse ? "Export Prose" : "Export Script"}
          onClose={onClose}
          isModal={true}
        />
      </DialogTitle>

      {/* Format Selector Pill Header (Identical to SettingsWindow top tab bar) */}
      {!isProse && (
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <ToggleButtonGroup
            value={format}
            exclusive
            onChange={(_, val) => val !== null && setFormat(val as ScriptFormat)}
            fullWidth
            size="small"
            sx={{
              p: "3px",
              gap: "4px",
              borderRadius: "8px",
              bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
              border: "1px solid",
              borderColor: "divider",
              "& .MuiToggleButtonGroup-grouped": {
                border: "none !important",
                borderRadius: "6px !important",
                mx: 0,
              },
            }}
          >
            {[
              { id: "fountain", label: "Fountain" },
              { id: "fdx", label: "Final Draft (.fdx)" },
              { id: "fadein", label: "Fade In (.fadein)" },
            ].map(({ id, label }) => {
              const isSelected = format === id;
              return (
                <ToggleButton
                  key={id}
                  value={id}
                  sx={{
                    fontSize: 12,
                    py: 0.5,
                    textTransform: "none",
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? "text.primary" : "text.secondary",
                    bgcolor: isSelected ? "background.paper !important" : "transparent",
                    boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: isSelected ? "background.paper !important" : (t) => alpha(t.palette.text.primary, 0.05),
                    },
                  }}
                >
                  {label}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Settings Card Content Area */}
      <Box sx={{ flex: 1, overflow: "auto", px: 2, py: isProse ? 1.5 : 0.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* Document Header Card */}
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "8px",
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
          }}
        >
          <DescriptionIcon sx={{ fontSize: 18, color: "primary.main", flexShrink: 0 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: 10,
                color: "text.secondary",
                letterSpacing: 0.5,
                display: "block",
                textTransform: "uppercase",
              }}
            >
              ACTIVE DOCUMENT
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeScriptName}
            </Typography>
          </Box>
        </Box>

        {/* Options Card */}
        {!isProse ? (
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px", p: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: 10,
                color: "text.secondary",
                letterSpacing: 0.5,
                mb: 1,
                display: "block",
                textTransform: "uppercase",
              }}
            >
              OPTIONS
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              <OptionRow label="Include Title Page" checked={exportTitlePage} onChange={setExportTitlePage} />
              {format === "fountain" && (
                <>
                  <OptionRow label="Section Headings (#)" checked={exportSections} onChange={setExportSections} />
                  <OptionRow label="Include Synopses (=)" checked={exportSynopses} onChange={setExportSynopses} />
                </>
              )}
            </Box>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 1.25, lineHeight: 1.45 }}>
              {format === "fountain" && "Strips app-specific markers and colors, outputting standardized Fountain plain text."}
              {format === "fdx" && "Converts screenplay elements into Final Draft XML compatible with Final Draft & Highland."}
              {format === "fadein" && "Generates native Fade In package bundle with character, scene, and dialogue layout."}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px", p: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: 10,
                color: "text.secondary",
                letterSpacing: 0.5,
                mb: 0.75,
                display: "block",
                textTransform: "uppercase",
              }}
            >
              MARKDOWN EXPORT
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.5 }}>
              Exports your active document as standard Markdown (.md) with all headings, emphasis, blockquotes, and prose structure preserved.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer Action Bar */}
      {exportError && <Alert severity="error" sx={{ mx: 2, mb: 1, fontSize: 12 }}>{exportError}</Alert>}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          disabled={isExporting}
          color="inherit"
          size="small"
          sx={{ fontSize: 12, fontWeight: 600, textTransform: "none", borderRadius: "8px", px: 2 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          variant="contained"
          color="primary"
          size="small"
          startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
          sx={{
            fontSize: 12.5,
            fontWeight: 700,
            textTransform: "none",
            px: 2.5,
            py: 0.65,
            borderRadius: "8px",
            boxShadow: "none",
            flex: 1,
          }}
        >
          {isExporting ? "Exporting..." : formatButtonLabel}
        </Button>
      </Box>
    </Dialog>
  );
};
