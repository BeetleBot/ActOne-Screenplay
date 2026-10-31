import React, { useState } from "react";
import { useFile, useUI } from "../context";
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
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
} from "@mui/material";

import { isProseScript } from "../utils/scriptMode";
import { stripFountainForExport } from "../utils/fountainExport";
import type { ExportWindowData } from "../utils/exportWindow";

type ScriptFormat = "fountain" | "fdx" | "fadein" | "markdown";

export interface ExportScriptWindowProps {
  data?: ExportWindowData;
  onClose: () => void;
}

/* ── Sidebar nav item ── */
const NavItem: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      px: 1.5,
      py: 0.75,
      cursor: "pointer",
      borderRadius: "6px",
      fontSize: 12.5,
      fontWeight: active ? 700 : 500,
      color: (t) => active ? t.palette.primary.main : "text.secondary",
      bgcolor: (t) => active ? alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.25 : 0.12) : "transparent",
      transition: "all 0.12s ease",
      "&:hover": {
        bgcolor: (t) => active ? alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.32 : 0.18) : alpha(t.palette.text.primary, 0.06),
        color: (t) => active ? t.palette.primary.main : "text.primary",
      },
      userSelect: "none",
    }}
  >
    {label}
  </Box>
);

/* ── Option row with checkbox ── */
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
      py: 0.5,
      px: 0.5,
      cursor: "pointer",
      borderRadius: 0.5,
      '&:hover': { bgcolor: "action.hover" },
      userSelect: "none",
    }}
  >
    <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: "text.primary" }}>{label}</Typography>
    <Checkbox
      size="small"
      checked={checked}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.checked); }}
      sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 18 } }}
    />
  </Box>
);

/* ── Section heading ── */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", letterSpacing: 0.6, textTransform: "uppercase", mb: 0.75 }}>
    {children}
  </Typography>
);

export const ExportScriptWindow: React.FC<ExportScriptWindowProps> = ({ onClose, data }) => {
  const fileContext = useFile();
  const { rawText, isBundle, activeScriptName, filePath, scripts, activeScriptIndex } = data?.file ?? fileContext;
  const ui = useUI();
  const { fontFamily, paperSize } = data?.ui ?? ui;

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

  const formatLabel = isProse
    ? "Markdown (.md)"
    : (format === "fdx" ? "Final Draft (.fdx)" : format === "fadein" ? "Fade In (.fadein)" : "Fountain (.fountain)");

  /* ── Render right panel content ── */
  const renderContent = () => {
    if (format === "markdown") {
      return (
        <Box>
          <SectionTitle>Markdown Export</SectionTitle>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.6, mb: 2 }}>
            Exports your document as a standard Markdown (.md) file.
          </Typography>
        </Box>
      );
    }

    if (format === "fountain") {
      return (
        <Box>
          <SectionTitle>Export Options</SectionTitle>
          <OptionRow label="Include Title Page" checked={exportTitlePage} onChange={setExportTitlePage} />
          <OptionRow label="Section Headings (#)" checked={exportSections} onChange={setExportSections} />
          <OptionRow label="Synopses (=)" checked={exportSynopses} onChange={setExportSynopses} />
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.5 }}>
            Exports clean Fountain markup without ActOne-specific metadata, markers, or storyline tags.
          </Typography>
        </Box>
      );
    }

    if (format === "fdx") {
      return (
        <Box>
          <SectionTitle>Final Draft XML</SectionTitle>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.6, mb: 2 }}>
            Exports the screenplay as a Final Draft XML (.fdx) file compatible with Final Draft, Highland, and Movie Magic Screenwriter.
          </Typography>
          <OptionRow label="Include Title Page" checked={exportTitlePage} onChange={setExportTitlePage} />
        </Box>
      );
    }

    if (format === "fadein") {
      return (
        <Box>
          <SectionTitle>Fade In Professional</SectionTitle>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.6, mb: 2 }}>
            Exports the screenplay as a native Fade In (.fadein) file for Fade In Professional on Windows, macOS, and Linux.
          </Typography>
          <OptionRow label="Include Title Page" checked={exportTitlePage} onChange={setExportTitlePage} />
        </Box>
      );
    }

    return null;
  };

  if (exportedPath) return <ExportCompleteDialog path={exportedPath} onClose={onClose} />;

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      disableScrollLock
      transitionDuration={200}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: "12px",
          height: 520,
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          m: 0,
          width: "100%",
          maxWidth: "100%",
        }
      }}
    >
      {typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && <WindowResizeHandles />}
      <DialogTitle sx={{ m: 0, p: 0 }}>
        <TitleBar
          title={isProse ? "Export Prose" : "Export Script"}
          onClose={onClose}
        />
      </DialogTitle>

      {/* Body */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* ── Left Sidebar ── */}
        <Box
          sx={{
            width: 190,
            flexShrink: 0,
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
            display: "flex",
            flexDirection: "column",
            py: 1.5,
            px: 1,
            gap: 0.25,
            overflowY: "auto",
          }}
        >
          {/* Script target */}
          <Box sx={{ px: 1, mb: 1 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.disabled", letterSpacing: 0.6, textTransform: "uppercase", mb: 0.25 }}>
              Exporting Script
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <DescriptionIcon sx={{ fontSize: 13, color: "text.secondary" }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeScriptName}
              </Typography>
            </Box>
            <Chip
              label={`${paperSize === "letter" ? "US Letter" : "A4"} · ${fontFamily === "courier-prime" ? "Courier Prime" : "Courier Prime Sans"}`}
              size="small"
              sx={{ height: 18, fontSize: 9.5, fontWeight: 600, mt: 0.5, borderRadius: "4px", bgcolor: "background.paper" }}
            />
          </Box>

          <Divider sx={{ mb: 0.5 }} />

          {/* Format nav */}
          {isProse ? (
            <NavItem label="Markdown (.md)" active={format === "markdown"} onClick={() => setFormat("markdown")} />
          ) : (
            <>
              <NavItem label="Fountain (.fountain)" active={format === "fountain"} onClick={() => setFormat("fountain")} />
              <NavItem label="Final Draft (.fdx)" active={format === "fdx"} onClick={() => setFormat("fdx")} />
              <NavItem label="Fade In (.fadein)" active={format === "fadein"} onClick={() => setFormat("fadein")} />
            </>
          )}
        </Box>

        {/* ── Right Panel ── */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
          {renderContent()}
        </Box>
      </Box>

      {/* ── Footer ── */}
      {exportError && <Alert severity="error" sx={{ mx: 2, my: 1 }}>{exportError}</Alert>}
      <DialogActions sx={{ px: 2, py: 1.25, justifyContent: "space-between", borderTop: "1px solid", borderColor: "divider" }}>
        <Button
          onClick={onClose}
          disabled={isExporting}
          color="inherit"
          size="small"
          sx={{ fontSize: 12, fontWeight: 600, textTransform: "none", borderRadius: "20px", px: 2.25, py: 0.6 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          variant="contained"
          color="primary"
          size="small"
          startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
          sx={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "none",
            px: 2.75,
            py: 0.6,
            borderRadius: "20px",
            boxShadow: "none",
          }}
        >
          {isExporting ? "Exporting..." : `Export to ${formatLabel}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
