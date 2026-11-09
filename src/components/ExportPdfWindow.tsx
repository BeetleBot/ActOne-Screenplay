import { resolveProseImages } from "../utils/proseAssets";
import React, { useState, useEffect, useMemo } from "react";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";

import { PROSE_EXPORT_STYLES, DEFAULT_PROSE_EXPORT_STYLE } from "../constants/proseExportStyles";
import { isProseScript } from "../utils/scriptMode";
import type { ExportWindowData } from "../utils/exportWindow";

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
      py: 0.6,
      px: 1,
      cursor: "pointer",
      borderRadius: 1,
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

/* ── Section heading ── */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", letterSpacing: 0.6, textTransform: "uppercase", mb: 1 }}>
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
  const [selectedPaperSize, setSelectedPaperSize] = useState<"letter" | "a4">(paperSize as "letter" | "a4");
  const [proseStyle, setProseStyle] = useState(DEFAULT_PROSE_EXPORT_STYLE);
  const activeProseStyle = PROSE_EXPORT_STYLES.find((style) => style.id === proseStyle)!;
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
    paperSize: selectedPaperSize,
    fontFamily: selectedFont,
    ...(isProse ? { proseStyle } : {}),
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
  const resolvedProse = useMemo(() => {
    try { return { text: isProse ? resolveProseImages(rawText, parsedDoc?.settings) : rawText, error: "" }; }
    catch (error) { return { text: "", error: String(error) }; }
  }, [rawText, isProse, parsedDoc?.settings]);
  const previewArguments = JSON.stringify(isProse ? { ...pdfArguments, markdownText: resolvedProse.text } : pdfArguments);

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

        if (resolvedProse.error) throw new Error(resolvedProse.error);
        const result = await invoke<string | null>("export_prose_pdf", {
          ...pdfArguments,
          markdownText: resolvedProse.text,
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
      <DialogTitle sx={{ m: 0, p: 0, flexShrink: 0 }}>
        <TitleBar
          title={isProse ? "Export Prose PDF" : "Export Script PDF"}
          onClose={onClose}
        />
      </DialogTitle>

      {/* Body: Single left settings column + right PDF preview */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>
        {/* ── Left Settings Panel (380px fixed width, elegant card layout) ── */}
        <Box
          sx={{
            width: { xs: 300, md: 340, lg: 360 },
            flexShrink: 0,
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: (t) => t.palette.mode === "dark" ? "background.default" : alpha(t.palette.background.default, 0.6),
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* Document Header Card */}
          <Box
            sx={{
              p: 2,
              flexShrink: 0,
              flexWrap: "wrap",
              gap: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ minWidth: 0, pr: 1.5 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.disabled", letterSpacing: 0.6, textTransform: "uppercase", mb: 0.3 }}>
                Target Document
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <DescriptionIcon sx={{ fontSize: 15, color: "primary.main", flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeScriptName}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`${selectedPaperSize === "letter" ? "Letter" : "A4"} · ${isProse ? activeProseStyle.font : selectedFont === "courier-prime" ? "Courier Prime" : "Prime Sans"}`}
              size="small"
              sx={{
                height: 22,
                fontSize: 10,
                fontWeight: 600,
                borderRadius: "6px",
                bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
                border: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
              }}
            />
          </Box>

          {/* Unified Settings Scroll Area */}
          <Box
            role="region"
            aria-label="PDF export settings"
            tabIndex={0}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              '& > *': { flexShrink: 0 },
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* Page & Layout Options */}
            <Box sx={{ bgcolor: "background.paper", borderRadius: 1.5, p: 1.75, border: "1px solid", borderColor: "divider" }}>
              <SectionTitle>Page & Layout</SectionTitle>
              {!isProse ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, mb: 1.5 }}>
                  <OptionRow label="Include Title Page" checked={exportTitlePage} onChange={setExportTitlePage} />
                  <OptionRow label="Export Scene Colors" checked={exportSceneColors} onChange={handleSceneColorToggle} />
                  <OptionRow label="Section Headings (#)" checked={exportSections} onChange={setExportSections} />
                  <OptionRow label="Include Synopses (=)" checked={exportSynopses} onChange={setExportSynopses} />
                  <OptionRow label="Start Scene on New Page" checked={scenePageBreaks} onChange={setScenePageBreaks} />
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
                  Choose a style to update the font, spacing, headings, and margins. The preview shows your final PDF.
                </Typography>
              )}

              {isProse && (
                <Box sx={{ mb: 2 }}>
                  <Typography id="prose-style-label" sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>Export Style</Typography>
                  <Select fullWidth size="small" value={proseStyle} onChange={(e) => setProseStyle(e.target.value)} labelId="prose-style-label" sx={{ fontSize: 12.5 }}>
                    {PROSE_EXPORT_STYLES.map((style) => <MenuItem key={style.id} value={style.id}>{style.name} - {style.font}</MenuItem>)}
                  </Select>
                  <Typography sx={{ mt: 0.75, fontSize: 12, color: "text.secondary" }}>{activeProseStyle.description}</Typography>
                </Box>
              )}

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 0.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.primary", mb: 0.75 }}>
                    Paper Size
                  </Typography>
                  <Select
                    size="small"
                    fullWidth
                    value={selectedPaperSize}
                    onChange={(e) => setSelectedPaperSize(e.target.value as "letter" | "a4")}
                    sx={{ fontSize: 12.5, borderRadius: 1, bgcolor: "background.default" }}
                  >
                    <MenuItem value="letter" sx={{ fontSize: 12.5 }}>US Letter</MenuItem>
                    <MenuItem value="a4" sx={{ fontSize: 12.5 }}>A4</MenuItem>
                  </Select>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.primary", mb: 0.75 }}>
                    {isProse ? "Document Font" : "Font"}
                  </Typography>
                  {isProse ? <Typography sx={{ fontSize: 12.5, py: 1 }}>{activeProseStyle.font}</Typography> : <Select
                    size="small"
                    fullWidth
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                    sx={{ fontSize: 12.5, borderRadius: 1, bgcolor: "background.default" }}
                  >
                    <MenuItem value="courier-prime" sx={{ fontSize: 12.5 }}>Courier Prime</MenuItem>
                    <MenuItem value="courier-prime-sans" sx={{ fontSize: 12.5 }}>Courier Prime Sans</MenuItem>
                  </Select>}
                </Box>
              </Box>

              {detectedScripts.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", mb: 1 }}>
                    Script Fonts
                  </Typography>
                  {detectedScripts.map((script) => (
                    <Box key={script} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 500, textTransform: "capitalize", minWidth: 70, flexShrink: 0, color: "text.secondary" }}>
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
                          <Typography sx={{ fontSize: 12, fontFamily: `"${value}"` }}>
                            {value || "Select…"}
                          </Typography>
                        )}
                        sx={{ fontSize: 12, borderRadius: 1, bgcolor: "background.default" }}
                      >
                        {(scriptFontOptions[script] || []).map((font) => {
                          if (font === CHOOSE_OTHER) {
                            return [
                              <MenuItem disabled key="sep" sx={{ fontSize: 11, opacity: 0.3, minHeight: 18, '&.Mui-disabled': { opacity: 0.3 } }}>
                                ──────────
                              </MenuItem>,
                              <MenuItem key={CHOOSE_OTHER} value={CHOOSE_OTHER} sx={{ fontSize: 12, color: "primary.main", fontWeight: 600 }}>
                                Choose system font…
                              </MenuItem>,
                            ];
                          }
                          return (
                            <MenuItem key={font} value={font} sx={{ fontFamily: `"${font}"`, fontSize: 12 }}>
                              {font}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* Element Formatting (Collapsible Accordion for screenplay) */}
            {!isProse && (
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "10px !important",
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  sx={{
                    px: 1.75,
                    py: 0.5,
                    minHeight: 44,
                    '& .MuiAccordionSummary-content': { my: 0.5 },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>
                      Element Styles & Scene Numbers
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary", pr: 1 }}>
                      {sceneNumberMode === "off" ? "No numbers" : sceneNumberMode === "mirror" ? "Mirrored" : "Left numbers"}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.75, pt: 0, pb: 2 }}>
                  <Divider sx={{ mb: 1.5 }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", mb: 0.75 }}>
                    Scene Numbering
                  </Typography>
                  <RadioGroup
                    row
                    value={sceneNumberMode}
                    onChange={(e) => handleSceneNumberChange(e.target.value as "off" | "left_side" | "mirror")}
                    sx={{ mb: 2, gap: 1 }}
                  >
                    <FormControlLabel value="off" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Off</Typography>} />
                    <FormControlLabel value="left_side" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Left</Typography>} />
                    <FormControlLabel value="mirror" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Mirrored</Typography>} />
                  </RadioGroup>

                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", mb: 1 }}>
                    Element Typography Styles
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      rowGap: 0.5,
                    }}
                  >
                    <Box />
                    <Box sx={{ display: "flex", gap: 0.75, justifyContent: "center", pb: 0.5 }}>
                      <Typography sx={{ width: 26, textAlign: "center", fontSize: 10, fontWeight: 700, color: "text.disabled" }}>B</Typography>
                      <Typography sx={{ width: 26, textAlign: "center", fontSize: 10, fontWeight: 700, color: "text.disabled", fontStyle: "italic" }}>I</Typography>
                      <Typography sx={{ width: 26, textAlign: "center", fontSize: 10, fontWeight: 700, color: "text.disabled", textDecoration: "underline" }}>U</Typography>
                    </Box>

                    {(Object.keys(FORMAT_LABELS) as (keyof ElementFormats)[]).map((key) => (
                      <React.Fragment key={key}>
                        <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.primary" }}>
                          {FORMAT_LABELS[key]}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.75, justifyContent: "center" }}>
                          {(["bold", "italic", "underline"] as const).map((attr) => {
                            const on = elementFormats[key][attr];
                            return (
                              <Box
                                key={attr}
                                onClick={() => handleFormatToggle(key, attr)}
                                sx={{
                                  width: 26,
                                  height: 22,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  borderRadius: 0.5,
                                  border: "1px solid",
                                  borderColor: on ? "primary.main" : "divider",
                                  bgcolor: on ? "primary.main" : "background.default",
                                  color: on ? "primary.contrastText" : "text.secondary",
                                  fontSize: 11.5,
                                  fontWeight: attr === "bold" ? 800 : 600,
                                  fontStyle: attr === "italic" ? "italic" : "normal",
                                  textDecoration: attr === "underline" ? "underline" : "none",
                                  transition: "all 0.1s ease",
                                  '&:hover': {
                                    borderColor: on ? "primary.dark" : "text.secondary",
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
                </AccordionDetails>
              </Accordion>
            )}

            {/* Watermarks (Collapsible Accordion) */}
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "10px !important",
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary
                sx={{
                  px: 1.75,
                  py: 0.5,
                  minHeight: 44,
                  '& .MuiAccordionSummary-content': { my: 0.5 },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>
                    Watermarks & Security
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "text.secondary", pr: 1 }}>
                    {(watermarkHeaderEnabled || watermarkFooterEnabled || watermarkCenterEnabled) ? "Active" : "None"}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 1.75, pt: 0, pb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                <Divider />
                {/* Header watermark */}
                <Box>
                  <OptionRow label="Header Watermark" checked={watermarkHeaderEnabled} onChange={setWatermarkHeaderEnabled} />
                  {watermarkHeaderEnabled && (
                    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                      <TextField
                        fullWidth size="small" placeholder="e.g. DRAFT — FOR REVIEW ONLY"
                        value={watermarkHeaderText} onChange={(e) => setWatermarkHeaderText(e.target.value)}
                        slotProps={{ input: { style: { fontSize: 12 } } }}
                      />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={{ fontSize: 11, color: "text.secondary", flexShrink: 0 }}>Opacity</Typography>
                        <Slider size="small" value={watermarkHeaderOpacity} min={10} max={100} step={5} onChange={(_, v) => setWatermarkHeaderOpacity(v as number)} sx={{ flex: 1 }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", minWidth: 32, textAlign: "right" }}>{watermarkHeaderOpacity}%</Typography>
                      </Box>
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* Footer watermark */}
                <Box>
                  <OptionRow label="Footer Watermark" checked={watermarkFooterEnabled} onChange={setWatermarkFooterEnabled} />
                  {watermarkFooterEnabled && (
                    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                      <TextField
                        fullWidth size="small" placeholder="e.g. CONFIDENTIAL"
                        value={watermarkFooterText} onChange={(e) => setWatermarkFooterText(e.target.value)}
                        slotProps={{ input: { style: { fontSize: 12 } } }}
                      />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={{ fontSize: 11, color: "text.secondary", flexShrink: 0 }}>Opacity</Typography>
                        <Slider size="small" value={watermarkFooterOpacity} min={10} max={100} step={5} onChange={(_, v) => setWatermarkFooterOpacity(v as number)} sx={{ flex: 1 }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", minWidth: 32, textAlign: "right" }}>{watermarkFooterOpacity}%</Typography>
                      </Box>
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* Center watermark */}
                <Box>
                  <OptionRow label="Center Watermark (Diagonal)" checked={watermarkCenterEnabled} onChange={setWatermarkCenterEnabled} />
                  {watermarkCenterEnabled && (
                    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                      <RadioGroup row value={watermarkCenterType} onChange={(e) => setWatermarkCenterType(e.target.value as "text" | "image")}>
                        <FormControlLabel value="text" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Text</Typography>} sx={{ mr: 2 }} />
                        <FormControlLabel value="image" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Image</Typography>} />
                      </RadioGroup>

                      {watermarkCenterType === "text" ? (
                        <TextField
                          fullWidth size="small" placeholder="e.g. DO NOT COPY"
                          value={watermarkCenterText} onChange={(e) => setWatermarkCenterText(e.target.value)}
                          slotProps={{ input: { style: { fontSize: 12 } } }}
                        />
                      ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <TextField
                              fullWidth size="small" placeholder="Select image…"
                              value={watermarkCenterImagePath}
                              slotProps={{ input: { style: { fontSize: 12 }, readOnly: true } }}
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
                        <Typography sx={{ fontSize: 11, color: "text.secondary", flexShrink: 0 }}>Opacity</Typography>
                        <Slider size="small" value={watermarkCenterOpacity} min={10} max={100} step={5} onChange={(_, v) => setWatermarkCenterOpacity(v as number)} sx={{ flex: 1 }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", minWidth: 32, textAlign: "right" }}>{watermarkCenterOpacity}%</Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>

          {/* Action Bar at Bottom of Left Panel */}
          {(exportError || resolvedProse.error) && <Alert severity="error" sx={{ mx: 2, mb: 1, fontSize: 12 }}>{exportError || resolvedProse.error}</Alert>}
          <Box
            sx={{
              p: 1.75,
              flexShrink: 0,
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
              sx={{ fontSize: 12, fontWeight: 600, textTransform: "none", borderRadius: "6px", px: 2 }}
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
                px: 3,
                py: 0.65,
                borderRadius: "6px",
                boxShadow: "none",
                flex: 1,
              }}
            >
              {isExporting ? "Exporting..." : "Export to PDF"}
            </Button>
          </Box>
        </Box>

        {/* ── Right Live PDF Preview (fills remaining space) ── */}
        <Box sx={{ display: "flex", flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", bgcolor: "background.default" }}>
          <PdfExportPreview argumentsJson={previewArguments} isProse={isProse} />
        </Box>
      </Box>

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
