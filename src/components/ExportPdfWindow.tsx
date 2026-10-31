import React, { useState, useEffect } from "react";
import { useFile, useUI } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { alpha } from "@mui/material/styles";
import { DownloadIcon, DescriptionIcon } from "./Icons";
import { ExportCompleteDialog } from "./ExportCompleteDialog";
import { WindowResizeHandles } from "./WindowResizeHandles";
import { TitleBar } from "./TitleBar";
import { PdfExportPreview } from "./PdfExportPreview";
import { SystemFontPicker } from "./SystemFontPicker";
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
  FormControlLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Slider,
  Chip,
  Divider,
} from "@mui/material";

import { isProseScript } from "../utils/scriptMode";
import type { ExportWindowData } from "../utils/exportWindow";

type PdfSubTab = "document" | "formatting" | "watermarks";

interface ElementFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface ElementFormats {
  scene_heading: ElementFormat;
  action: ElementFormat;
  character: ElementFormat;
  parenthetical: ElementFormat;
  dialogue: ElementFormat;
  lyrics: ElementFormat;
  transition: ElementFormat;
  shot: ElementFormat;
  centered_text: ElementFormat;
}

const FORMAT_LABELS: Record<keyof ElementFormats, string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  lyrics: "Lyrics",
  transition: "Transition",
  shot: "Shot",
  centered_text: "Centered Text",
};

const DEFAULT_ELEMENT_FORMATS: ElementFormats = {
  scene_heading: { bold: true, italic: false, underline: false },
  action:          { bold: false, italic: false, underline: false },
  character:      { bold: false, italic: false, underline: false },
  parenthetical:  { bold: false, italic: false, underline: false },
  dialogue:       { bold: false, italic: false, underline: false },
  lyrics:         { bold: false, italic: false, underline: false },
  transition:     { bold: false, italic: false, underline: false },
  shot:           { bold: true, italic: false, underline: false },
  centered_text:   { bold: false, italic: false, underline: false },
};

export interface ExportPdfWindowProps {
  data?: ExportWindowData;
  onClose: () => void;
}

/* ── Sidebar nav item ── */
const NavItem: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  indent?: boolean;
}> = ({ label, active, onClick, indent }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      pl: indent ? 3 : 1.5,
      pr: 1.5,
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

export const ExportPdfWindow: React.FC<ExportPdfWindowProps> = ({ onClose, data }) => {
  const fileContext = useFile();
  const { rawText, activeScriptName, filePath, parsedDoc, scripts, activeScriptIndex } = data?.file ?? fileContext;
  const updateSettings = fileContext.updateSettings;
  const ui = useUI();
  const { fontFamily, paperSize } = data?.ui ?? ui;

  const activeScript = scripts?.[activeScriptIndex ?? 0];
  const isProse = isProseScript(activeScript, filePath);

  const [pdfSubTab, setPdfSubTab] = useState<PdfSubTab>("document");
  const [exportedPath, setExportedPath] = useState<string | null>(null);
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const savedFormats = parsedDoc?.settings?.elementFormats as ElementFormats | undefined;
  const [elementFormats, setElementFormats] = useState<ElementFormats>(
    savedFormats ?? DEFAULT_ELEMENT_FORMATS
  );

  const savedSceneNumberMode = parsedDoc?.settings?.sceneNumberMode as string | undefined;
  const [sceneNumberMode, setSceneNumberMode] = useState<"off" | "left_side" | "mirror">(
    (savedSceneNumberMode as "off" | "left_side" | "mirror") ?? "left_side"
  );

  const [exportSections, setExportSections] = useState(false);
  const [exportSynopses, setExportSynopses] = useState(false);
  const [exportTitlePage, setExportTitlePage] = useState(true);
  const [exportSceneColors, setExportSceneColors] = useState(false);
  const [scenePageBreaks, setScenePageBreaks] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>(fontFamily);
  
  const savedWatermarks = parsedDoc?.settings?.watermarkSettings;
  const [watermarkHeaderEnabled, setWatermarkHeaderEnabled] = useState(!!savedWatermarks?.headerEnabled);
  const [watermarkHeaderText, setWatermarkHeaderText] = useState(savedWatermarks?.headerText || "");
  const [watermarkHeaderOpacity, setWatermarkHeaderOpacity] = useState<number>(savedWatermarks?.headerOpacity ?? 100);
  const [watermarkFooterEnabled, setWatermarkFooterEnabled] = useState(!!savedWatermarks?.footerEnabled);
  const [watermarkFooterText, setWatermarkFooterText] = useState(savedWatermarks?.footerText || "");
  const [watermarkFooterOpacity, setWatermarkFooterOpacity] = useState<number>(savedWatermarks?.footerOpacity ?? 100);
  const [watermarkCenterEnabled, setWatermarkCenterEnabled] = useState(!!savedWatermarks?.centerEnabled);
  const [watermarkCenterType, setWatermarkCenterType] = useState<"text" | "image">(savedWatermarks?.centerType || "text");
  const [watermarkCenterText, setWatermarkCenterText] = useState(savedWatermarks?.centerText || "");
  const [watermarkCenterImagePath, setWatermarkCenterImagePath] = useState(savedWatermarks?.centerImagePath || "");
  const [watermarkCenterOpacity, setWatermarkCenterOpacity] = useState<number>(savedWatermarks?.centerOpacity ?? 40);
  const [watermarkCenterGrayscale, setWatermarkCenterGrayscale] = useState(!!savedWatermarks?.centerGrayscale);

  const [detectedScripts, setDetectedScripts] = useState<string[]>([]);
  const [scriptFontOptions, setScriptFontOptions] = useState<Record<string, string[]>>({});
  const [scriptFonts, setScriptFonts] = useState<Record<string, string>>({});
  const [systemFontPickerScript, setSystemFontPickerScript] = useState<string | null>(null);

  const CHOOSE_OTHER = "___choose_other___";

  useEffect(() => {
    const initScriptFonts = async () => {
      try {
        const scripts = await invoke<string[]>("get_detected_scripts", { text: rawText });
        setDetectedScripts(scripts);
        const options: Record<string, string[]> = {};
        const selected: Record<string, string> = {};
        for (const s of scripts) {
          const fonts = await invoke<string[]>("get_fonts_for_script", { script: s });
          options[s] = fonts;
          selected[s] = fonts[0] || "";
        }
        setScriptFontOptions(options);
        setScriptFonts(selected);
      } catch (e) {
        logger.error("export", "Failed to load script fonts", e);
      }
    };
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (isTauri) initScriptFonts();
  }, [rawText]);

  const updateWatermarkSettings = (updates: Partial<Record<string, unknown>>) => {
    updateSettings((prev) => ({
      ...prev,
      watermarkSettings: {
        ...(prev.watermarkSettings || {}),
        ...updates,
      }
    }));
  };

  const currentWatermarkSettings = () => ({
    headerEnabled: watermarkHeaderEnabled,
    headerText: watermarkHeaderText,
    headerOpacity: watermarkHeaderOpacity,
    footerEnabled: watermarkFooterEnabled,
    footerText: watermarkFooterText,
    footerOpacity: watermarkFooterOpacity,
    centerEnabled: watermarkCenterEnabled,
    centerType: watermarkCenterType,
    centerText: watermarkCenterText,
    centerImagePath: watermarkCenterImagePath,
    centerOpacity: watermarkCenterOpacity,
    centerGrayscale: watermarkCenterGrayscale,
  });

  const handleSceneNumberChange = (mode: "off" | "left_side" | "mirror") => {
    setSceneNumberMode(mode);
    updateSettings((prev) => ({ ...prev, sceneNumberMode: mode }));
  };

  const handleFormatToggle = (element: keyof ElementFormats, attr: "bold" | "italic" | "underline") => {
    const updated = {
      ...elementFormats,
      [element]: {
        ...elementFormats[element],
        [attr]: !elementFormats[element][attr],
      },
    };
    setElementFormats(updated);
    updateSettings((prev) => ({ ...prev, elementFormats: updated }));
  };

  const handleSceneColorToggle = (val: boolean) => {
    setExportSceneColors(val);
    updateSettings((prev) => ({ ...prev, exportSceneColors: val }));
  };

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

  const pdfArguments = {
    fountainText: rawText,
    paperSize,
    fontFamily: selectedFont,
    elementFormats: JSON.stringify(elementFormats),
    mirrorSceneNumbers: sceneNumberMode,
    exportSections,
    exportSynopses,
    exportTitlePage,
    exportSceneColors,
    scenePageBreaks,
    autoContd: localStorage.getItem(STORAGE_KEYS.AUTO_CONTD_ENABLED) !== "false",
    revisedLines: [] as boolean[],
    watermarkHeaderEnabled,
    watermarkHeaderText,
    watermarkHeaderOpacity: watermarkHeaderOpacity / 100.0,
    watermarkFooterEnabled,
    watermarkFooterText,
    watermarkFooterOpacity: watermarkFooterOpacity / 100.0,
    watermarkCenterEnabled,
    watermarkCenterType,
    watermarkCenterText,
    watermarkCenterImagePath,
    watermarkCenterOpacity: watermarkCenterOpacity / 100.0,
    watermarkCenterGrayscale,
    scriptFonts: JSON.stringify(scriptFonts),
  };
  const previewArguments = JSON.stringify(isProse ? { ...pdfArguments, markdownText: rawText } : pdfArguments);

  const handleExportPDF = async () => {
    try {
      updateWatermarkSettings(currentWatermarkSettings());
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        const result = await invoke<string | null>("export_pdf", {
          ...pdfArguments,
          defaultDirectory: getLastExportDir(),
        });
        if (result) {
          saveLastExportDir(result);
          setExportedPath(result);
        }
      } else {
        setExportError("PDF export requires the desktop app.");
      }
    } catch (e) {
      logger.error("export", "handleExportPDF failed", e);
      setExportError(String(e));
    }
  };

  const handleExportProsePDF = async () => {
    try {
      updateWatermarkSettings(currentWatermarkSettings());
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        const documentDir = filePath
          ? filePath.replace(/[/\\][^/\\]+$/, "")
          : undefined;
        const defaultDir = documentDir || getLastExportDir();

        const result = await invoke<string | null>("export_prose_pdf", {
          ...pdfArguments,
          markdownText: rawText,
          defaultDirectory: defaultDir,
        });
        if (result) {
          saveLastExportDir(result);
          setExportedPath(result);
        }
      } else {
        setExportError("Prose PDF export requires the desktop app.");
      }
    } catch (e) {
      logger.error("export", "handleExportProsePDF failed", e);
      setExportError(String(e));
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError("");
    try {
      if (isProse) {
        await handleExportProsePDF();
      } else {
        await handleExportPDF();
      }
    } finally {
      setIsExporting(false);
    }
  };

  /* ── Render right panel content ── */
  const renderContent = () => {
    // Document tab
    if (pdfSubTab === "document") {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {!isProse && (
            <>
              <Box>
                <SectionTitle>Page Options</SectionTitle>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <OptionRow label="Include Title Page" checked={exportTitlePage} onChange={setExportTitlePage} />
                  <OptionRow label="Export Scene Colors" checked={exportSceneColors} onChange={handleSceneColorToggle} />
                  <OptionRow label="Section Headings (#)" checked={exportSections} onChange={setExportSections} />
                  <OptionRow label="Include Synopses (=)" checked={exportSynopses} onChange={setExportSynopses} />
                  <OptionRow label="Start Each Scene on New Page" checked={scenePageBreaks} onChange={setScenePageBreaks} />
                </Box>
              </Box>

              <Divider />
            </>
          )}

          <Box>
            <SectionTitle>{isProse ? "Document Font" : "Screenplay Font"}</SectionTitle>
            <Select
              size="small"
              fullWidth
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              sx={{ fontSize: 12.5, borderRadius: 1 }}
            >
              <MenuItem value="courier-prime" sx={{ fontSize: 12.5 }}>Courier Prime</MenuItem>
              <MenuItem value="courier-prime-sans" sx={{ fontSize: 12.5 }}>Courier Prime Sans</MenuItem>
            </Select>
          </Box>

          {detectedScripts.length > 0 && (
            <>
              <Divider />
              <Box>
                <SectionTitle>Script Fonts</SectionTitle>
                {detectedScripts.map((script) => (
                  <Box key={script} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 500, textTransform: "capitalize", minWidth: 80, flexShrink: 0, color: "text.secondary" }}>
                      {script}
                    </Typography>
                    <Select
                      size="small"
                      fullWidth
                      value={scriptFonts[script] || ""}
                      onChange={(e) => {
                        if (e.target.value === CHOOSE_OTHER) {
                          setSystemFontPickerScript(script);
                        } else {
                          setScriptFonts(prev => ({ ...prev, [script]: e.target.value }));
                        }
                      }}
                      renderValue={(value) => (
                        <Typography sx={{ fontSize: 12.5, fontFamily: `"${value}"` }}>
                          {value || "Select…"}
                        </Typography>
                      )}
                      sx={{ fontSize: 12.5, borderRadius: 1 }}
                    >
                      {(scriptFontOptions[script] || []).map((font) => {
                        if (font === CHOOSE_OTHER) {
                          return [
                            <MenuItem disabled key="sep" sx={{ fontSize: 12, opacity: 0.3, minHeight: 20, '&.Mui-disabled': { opacity: 0.3 } }}>
                              ──────────
                            </MenuItem>,
                            <MenuItem key={CHOOSE_OTHER} value={CHOOSE_OTHER} sx={{ fontSize: 12.5, color: "primary.main", fontWeight: 600 }}>
                              Choose system font…
                            </MenuItem>,
                          ];
                        }
                        return (
                          <MenuItem key={font} value={font} sx={{ fontFamily: `"${font}"`, fontSize: 12.5 }}>
                            {font}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      );
    }

    // Formatting tab
    if (pdfSubTab === "formatting") {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box>
            <SectionTitle>Scene Numbers</SectionTitle>
            <RadioGroup
              value={sceneNumberMode}
              onChange={(e) => handleSceneNumberChange(e.target.value as "off" | "left_side" | "mirror")}
              sx={{ gap: 0 }}
            >
              <FormControlLabel value="off" control={<Radio size="small" sx={{ p: 0.5 }} />} label={<Typography sx={{ fontSize: 12.5 }}>No scene numbers</Typography>} sx={{ m: 0, mb: 0.25 }} />
              <FormControlLabel value="left_side" control={<Radio size="small" sx={{ p: 0.5 }} />} label={<Typography sx={{ fontSize: 12.5 }}>Left side only</Typography>} sx={{ m: 0, mb: 0.25 }} />
              <FormControlLabel value="mirror" control={<Radio size="small" sx={{ p: 0.5 }} />} label={<Typography sx={{ fontSize: 12.5 }}>Both sides (mirrored)</Typography>} sx={{ m: 0 }} />
            </RadioGroup>
          </Box>

          <Divider />

          <Box>
            <SectionTitle>Element Styles</SectionTitle>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                rowGap: 0.25,
              }}
            >
              {/* Header row */}
              <Box />
              <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", pb: 0.5 }}>
                <Typography sx={{ width: 28, textAlign: "center", fontSize: 10, fontWeight: 700, color: "text.disabled" }}>B</Typography>
                <Typography sx={{ width: 28, textAlign: "center", fontSize: 10, fontWeight: 700, color: "text.disabled", fontStyle: "italic" }}>I</Typography>
                <Typography sx={{ width: 28, textAlign: "center", fontSize: 10, fontWeight: 700, color: "text.disabled", textDecoration: "underline" }}>U</Typography>
              </Box>

              {(Object.keys(FORMAT_LABELS) as (keyof ElementFormats)[]).map((key) => (
                <React.Fragment key={key}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 500, py: 0.4 }}>
                    {FORMAT_LABELS[key]}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                    {(["bold", "italic", "underline"] as const).map((attr) => {
                      const on = elementFormats[key][attr];
                      return (
                        <Box
                          key={attr}
                          onClick={() => handleFormatToggle(key, attr)}
                          sx={{
                            width: 28,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            borderRadius: 0.5,
                            border: "1px solid",
                            borderColor: on ? "primary.main" : "divider",
                            bgcolor: on ? "primary.main" : "transparent",
                            color: on ? "primary.contrastText" : "text.secondary",
                            fontSize: 12,
                            fontWeight: attr === "bold" ? 800 : 600,
                            fontStyle: attr === "italic" ? "italic" : "normal",
                            textDecoration: attr === "underline" ? "underline" : "none",
                            transition: "all 0.1s ease",
                            '&:hover': {
                              borderColor: on ? "primary.dark" : "text.secondary",
                              bgcolor: on ? "primary.dark" : "action.hover",
                            },
                            userSelect: "none",
                          }}
                        >
                          {attr === "bold" ? "B" : attr === "italic" ? "I" : "U"}
                        </Box>
                      );
                    })}
                  </Box>
                </React.Fragment>
              ))}
            </Box>
          </Box>
        </Box>
      );
    }

    // Watermarks tab
    if (pdfSubTab === "watermarks") {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* Header watermark */}
          <Box>
            <OptionRow label="Header Watermark" checked={watermarkHeaderEnabled} onChange={setWatermarkHeaderEnabled} />
            {watermarkHeaderEnabled && (
              <Box sx={{ pl: 0.5, mt: 1, display: "flex", flexDirection: "column", gap: 1.25 }}>
                <TextField
                  fullWidth size="small" placeholder="e.g. DRAFT — FOR REVIEW ONLY"
                  value={watermarkHeaderText} onChange={(e) => setWatermarkHeaderText(e.target.value)}
                  slotProps={{ input: { style: { fontSize: 12.5 } } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ fontSize: 11.5, color: "text.secondary", flexShrink: 0 }}>Opacity</Typography>
                  <Slider size="small" value={watermarkHeaderOpacity} min={10} max={100} step={5} onChange={(_, v) => setWatermarkHeaderOpacity(v as number)} sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "text.secondary", minWidth: 32, textAlign: "right" }}>{watermarkHeaderOpacity}%</Typography>
                </Box>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Footer watermark */}
          <Box>
            <OptionRow label="Footer Watermark" checked={watermarkFooterEnabled} onChange={setWatermarkFooterEnabled} />
            {watermarkFooterEnabled && (
              <Box sx={{ pl: 0.5, mt: 1, display: "flex", flexDirection: "column", gap: 1.25 }}>
                <TextField
                  fullWidth size="small" placeholder="e.g. CONFIDENTIAL"
                  value={watermarkFooterText} onChange={(e) => setWatermarkFooterText(e.target.value)}
                  slotProps={{ input: { style: { fontSize: 12.5 } } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ fontSize: 11.5, color: "text.secondary", flexShrink: 0 }}>Opacity</Typography>
                  <Slider size="small" value={watermarkFooterOpacity} min={10} max={100} step={5} onChange={(_, v) => setWatermarkFooterOpacity(v as number)} sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "text.secondary", minWidth: 32, textAlign: "right" }}>{watermarkFooterOpacity}%</Typography>
                </Box>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Center watermark */}
          <Box>
            <OptionRow label="Center Watermark (Diagonal)" checked={watermarkCenterEnabled} onChange={setWatermarkCenterEnabled} />
            {watermarkCenterEnabled && (
              <Box sx={{ pl: 0.5, mt: 1, display: "flex", flexDirection: "column", gap: 1.25 }}>
                <RadioGroup row value={watermarkCenterType} onChange={(e) => setWatermarkCenterType(e.target.value as "text" | "image")}>
                  <FormControlLabel value="text" control={<Radio size="small" sx={{ p: 0.5 }} />} label={<Typography sx={{ fontSize: 12.5 }}>Text</Typography>} sx={{ m: 0, mr: 2 }} />
                  <FormControlLabel value="image" control={<Radio size="small" sx={{ p: 0.5 }} />} label={<Typography sx={{ fontSize: 12.5 }}>Image</Typography>} sx={{ m: 0 }} />
                </RadioGroup>

                {watermarkCenterType === "text" ? (
                  <TextField
                    fullWidth size="small" placeholder="e.g. DO NOT COPY"
                    value={watermarkCenterText} onChange={(e) => setWatermarkCenterText(e.target.value)}
                    slotProps={{ input: { style: { fontSize: 12.5 } } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                  />
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        fullWidth size="small" placeholder="Select image…"
                        value={watermarkCenterImagePath}
                        slotProps={{ input: { style: { fontSize: 12.5 }, readOnly: true } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                      />
                      <Button
                        variant="outlined" size="small"
                        onClick={async () => {
                          try {
                            const selected = await invoke<string | null>("select_watermark_image");
                            if (selected) setWatermarkCenterImagePath(selected);
                          } catch (e) {
                            logger.error("export", "select_watermark_image failed", e);
                          }
                        }}
                        sx={{ fontSize: 12, borderRadius: 1, textTransform: "none", flexShrink: 0 }}
                      >
                        Browse
                      </Button>
                    </Box>
                    <OptionRow label="Convert to grayscale" checked={watermarkCenterGrayscale} onChange={setWatermarkCenterGrayscale} />
                  </Box>
                )}

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ fontSize: 11.5, color: "text.secondary", flexShrink: 0 }}>Opacity</Typography>
                  <Slider size="small" value={watermarkCenterOpacity} min={10} max={100} step={5} onChange={(_, v) => setWatermarkCenterOpacity(v as number)} sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "text.secondary", minWidth: 32, textAlign: "right" }}>{watermarkCenterOpacity}%</Typography>
                </Box>
              </Box>
            )}
          </Box>
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
      fullScreen
      maxWidth={false}
      disableScrollLock
      transitionDuration={200}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 0,
          height: "100%",
          maxHeight: "100%",
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }
      }}
    >
      {typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && <WindowResizeHandles />}
      <DialogTitle sx={{ m: 0, p: 0 }}>
        <TitleBar
          title={isProse ? "Export Prose PDF" : "Export Script PDF"}
          onClose={onClose}
        />
      </DialogTitle>

      {/* Body */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0 }}>
        <Box sx={{ display: "flex", width: "40%", minWidth: 0 }}>
          {/* ── Left Sidebar ── */}
          <Box
            sx={{
              width: "35%",
              maxWidth: 190,
              minWidth: 120,
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
                Exporting PDF
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <DescriptionIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeScriptName}
                </Typography>
              </Box>
              <Chip
                label={`${paperSize === "letter" ? "US Letter" : "A4"} · ${selectedFont === "courier-prime" ? "Courier Prime" : "Courier Prime Sans"}`}
                size="small"
                sx={{ height: 18, fontSize: 9.5, fontWeight: 600, mt: 0.5, borderRadius: "4px", bgcolor: "background.paper" }}
              />
            </Box>

            <Divider sx={{ mb: 0.5 }} />

            {/* Format nav */}
            <NavItem label="Document & Layout" active={pdfSubTab === "document"} onClick={() => setPdfSubTab("document")} />
            {!isProse && (
              <NavItem label="Element Formatting" active={pdfSubTab === "formatting"} onClick={() => setPdfSubTab("formatting")} />
            )}
            <NavItem label="Watermarks" active={pdfSubTab === "watermarks"} onClick={() => setPdfSubTab("watermarks")} />
          </Box>

          {/* ── Right Panel ── */}
          <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto", p: 2.5 }}>
            {renderContent()}
          </Box>
        </Box>
        <PdfExportPreview argumentsJson={previewArguments} isProse={isProse} />
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
          {isExporting ? "Exporting..." : "Export to PDF"}
        </Button>
      </DialogActions>

      {/* System Font Picker Dialog */}
      {systemFontPickerScript && (
        <SystemFontPicker
          open={!!systemFontPickerScript}
          script={systemFontPickerScript}
          onSelect={(font) => {
            setScriptFonts(prev => ({ ...prev, [systemFontPickerScript]: font }));
          }}
          onClose={() => setSystemFontPickerScript(null)}
        />
      )}
    </Dialog>
  );
};
