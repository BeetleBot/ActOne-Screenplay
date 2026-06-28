import React, { useState, useEffect } from "react";
import { useFile, useUI } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { CloseIcon, DownloadIcon } from "./Icons";
import { SystemFontPicker } from "./SystemFontPicker";
import { logger } from "../utils/logger";

import {
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Slider,
} from "@mui/material";

type ExportFormat = "pdf" | "fountain" | "fdx" | "fadein";

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

interface ExportModalProps {
  onClose: () => void;
}

function stripFountainForExport(
  rawText: string,
  options: { sections: boolean; synopses: boolean; titlePage: boolean }
): string {
  let text = rawText;

  text = text.replace(/\[\[marker[^\]]*\]\]/gi, "");

  text = text.replace(/\[\[(color\s[^\]]*|storyline[^\]]*|red|blue|green|pink|magenta|gray|purple|cyan|teal|yellow|orange|brown)\]\]/gi, "");

  const lines = text.split(/\r?\n/);
  const filtered: string[] = [];
  
  let hasTitlePage = false;
  const firstNonEmptyLine = lines.find(l => l.trim() !== "");
  if (firstNonEmptyLine) {
    const colonIdx = firstNonEmptyLine.indexOf(":");
    if (colonIdx !== -1) {
      const key = firstNonEmptyLine.substring(0, colonIdx).trim().toLowerCase();
      const validKeys = ["title", "credit", "author", "authors", "source", "notes", "draft date", "date", "contact", "copyright"];
      if (validKeys.includes(key)) {
        hasTitlePage = true;
      }
    }
  }

  let inTitlePage = hasTitlePage;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (inTitlePage) {
      if (trimmed === "" && i > 0) {
        inTitlePage = false;
        if (!options.titlePage) {
          continue;
        }
      } else if (trimmed !== "") {
        if (!options.titlePage) {
          continue;
        }
      }
      filtered.push(lines[i]);
      continue;
    }

    if (!options.sections && trimmed.startsWith("#") && !trimmed.startsWith("#!")) {
      continue;
    }

    if (!options.synopses && trimmed.startsWith("=") && !(trimmed.startsWith("===") && trimmed.replace(/=/g, "").trim() === "")) {
      continue;
    }

    filtered.push(lines[i]);
  }

  let result = filtered.join("\n");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.trimEnd() + "\n";

  return result;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const { rawText, isBundle, activeScriptName, filePath, updateSettings, parsedDoc } = useFile();
  const { fontFamily, paperSize, appScale } = useUI();

  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [showFormatPanel, setShowFormatPanel] = useState(false);

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
  const [selectedFont, setSelectedFont] = useState<string>(fontFamily);
  
  const savedWatermarks = parsedDoc?.settings?.watermarkSettings;
  const [showWatermarkPanel, setShowWatermarkPanel] = useState(false);
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

  const updateWatermarkSettings = (updates: Partial<any>) => {
    updateSettings((prev: Record<string, any>) => ({
      ...prev,
      watermarkSettings: {
        ...(prev.watermarkSettings || {}),
        ...updates,
      }
    }));
  };

  const handleFormatChange = (_: React.MouseEvent<HTMLElement>, newFormat: ExportFormat | null) => {
    if (newFormat !== null) {
      setFormat(newFormat);
      setShowFormatPanel(false);
    }
  };

  const handleFormatToggle = (element: keyof ElementFormats, attr: "bold" | "italic" | "underline") => {
    const next: ElementFormats = {
      ...elementFormats,
      [element]: { ...elementFormats[element], [attr]: !elementFormats[element][attr] },
    };
    setElementFormats(next);
    updateSettings((prev: Record<string, any>) => ({ ...prev, elementFormats: next }));
  };

  const handleSceneNumberChange = (mode: "off" | "left_side" | "mirror") => {
    setSceneNumberMode(mode);
    updateSettings((prev: Record<string, any>) => ({ ...prev, sceneNumberMode: mode }));
  };

  const handleSceneColorToggle = (checked: boolean) => {
    setExportSceneColors(checked);
    updateSettings((prev: Record<string, any>) => ({ ...prev, exportSceneColors: checked }));
  };

  const handleExportPDF = async () => {
    try {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        const revisedLines: boolean[] = [];

        await invoke("export_pdf", {
          fountainText: rawText,
          paperSize,
          fontFamily: selectedFont,
          elementFormats: JSON.stringify(elementFormats),
          mirrorSceneNumbers: sceneNumberMode,
          exportSections,
          exportSynopses,
          exportTitlePage,
          exportSceneColors,
          revisedLines,
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
        });
      } else {
        alert("PDF export is only supported in the desktop app.");
      }
      onClose();
    } catch (e) {
      logger.error("export", "handleExportPDF failed", e);
    }
  };

  const handleExportFountain = async () => {
    try {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      const cleaned = stripFountainForExport(rawText, {
        sections: exportSections,
        synopses: exportSynopses,
        titlePage: exportTitlePage,
      });

      if (isTauri) {
        await invoke("export_fountain", { content: cleaned });
      } else {
        const bundleName = filePath
          ? filePath.split(/[/\\]/).pop()?.replace(/\.(actone|fountain|txt)$/i, "") || "Untitled"
          : "Untitled";
        const scriptSuffix = isBundle ? `_${activeScriptName}` : "";
        const downloadName = `${bundleName}${scriptSuffix}.fountain`;
        const blob = new Blob([cleaned], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        a.click();
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch (e) {
      logger.error("export", "handleExportFountain failed", e);
    }
  };

  const handleExportFDX = async () => {
    try {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        await invoke("export_fdx", { fountainText: rawText });
      } else {
        const cleaned = stripFountainForExport(rawText, {
          sections: false,
          synopses: false,
          titlePage: true,
        });
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
      }
      onClose();
    } catch (e) {
      logger.error("export", "handleExportFDX failed", e);
    }
  };

  const handleExportFadeIn = async () => {
    try {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        await invoke("export_fadein", { fountainText: rawText });
      } else {
        const bundleName = filePath
          ? filePath.split(/[/\\]/).pop()?.replace(/\.(actone|fountain|txt)$/i, "") || "Untitled"
          : "Untitled";
        const scriptSuffix = isBundle ? `_${activeScriptName}` : "";
        const blob = new Blob([rawText], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bundleName}${scriptSuffix}.fadein`;
        a.click();
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch (e) {
      logger.error("export", "handleExportFadeIn failed", e);
    }
  };

  const handleExport = () => {
    if (format === "pdf") {
      handleExportPDF();
    } else if (format === "fdx") {
      handleExportFDX();
    } else if (format === "fadein") {
      handleExportFadeIn();
    } else {
      handleExportFountain();
    }
  };

  return (
    <Dialog
      open onClose={onClose} fullWidth
      maxWidth="xs"
      disableScrollLock
      transitionDuration={200}
      sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '12px', maxHeight: '85vh' } }}
    >
      <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DownloadIcon sx={{ fontSize: 18 }} />
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: 14 }}>Export Screenplay</Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 2, py: 1.5, overflow: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* Exporting Indicator */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.6, bgcolor: "action.hover", borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11, color: "text.secondary" }}>
            Exporting
          </Typography>
          {isBundle && (
            <>
              <Typography variant="caption" sx={{ fontSize: 11, color: "text.disabled" }}>&gt;</Typography>
              <Typography variant="caption" sx={{ fontWeight: 500, fontSize: 11, color: "text.secondary" }}>
                {filePath?.split(/[/\\]/).pop()?.replace(/\.actone$/i, "") || "Untitled"}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, color: "text.disabled" }}>&gt;</Typography>
            </>
          )}
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, color: "text.primary" }}>
            {activeScriptName}
          </Typography>
        </Box>

        {/* Toggle Button for Formats */}
        <ToggleButtonGroup
          value={format}
          exclusive
          onChange={handleFormatChange}
          fullWidth
          size="small"
          sx={{ mb: 0.5 }}
        >
          <ToggleButton value="pdf" sx={{ fontSize: 12, py: 0.3 }}>PDF</ToggleButton>
          <ToggleButton value="fountain" sx={{ fontSize: 12, py: 0.3 }}>Fountain</ToggleButton>
          <ToggleButton value="fdx" sx={{ fontSize: 12, py: 0.3 }}>FDX</ToggleButton>
          <ToggleButton value="fadein" sx={{ fontSize: 12, py: 0.3 }}>Fade In</ToggleButton>
        </ToggleButtonGroup>

        {/* Conditional Panes based on Format */}
        {format === "pdf" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                SUMMARY SETTINGS
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Dimensions & Style</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {paperSize === "letter" ? "US Letter" : "A4"} • {selectedFont === "courier-prime" ? "Courier Prime" : "Courier Prime Sans"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1.25, display: 'block' }}>
                FORMATTING OPTIONS
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, mb: 1 }}>
                <FormControlLabel
                  control={<Switch size="small" checked={exportTitlePage} onChange={(e) => setExportTitlePage(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Title Page</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
                <FormControlLabel
                  control={<Switch size="small" checked={exportSceneColors} onChange={(e) => handleSceneColorToggle(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Scene Colors</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <FormControlLabel
                  control={<Switch size="small" checked={exportSections} onChange={(e) => setExportSections(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Sections (#)</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
                <FormControlLabel
                  control={<Switch size="small" checked={exportSynopses} onChange={(e) => setExportSynopses(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Synopsis (=)</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
              </Box>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, display: 'block' }}>
                EXPORT FONT
              </Typography>
              <Select
                size="small"
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
              >
                <MenuItem value="courier-prime">Courier Prime</MenuItem>
                <MenuItem value="courier-prime-sans">Courier Prime Sans</MenuItem>
              </Select>
            </Box>

            {detectedScripts.length > 0 && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, display: 'block' }}>
                  SCRIPT FONTS
                </Typography>
                {detectedScripts.map((script) => (
                  <Box key={script}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block', mb: 0.25, textTransform: 'capitalize' }}>
                      {script}
                    </Typography>
                    <Select
                      size="small"
                      value={scriptFonts[script] || ""}
                      onChange={(e) => {
                        if (e.target.value === CHOOSE_OTHER) {
                          setSystemFontPickerScript(script);
                        } else {
                          setScriptFonts(prev => ({ ...prev, [script]: e.target.value }));
                        }
                      }}
                      renderValue={(value) => {
                        if (!value) return <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>Select</Typography>;
                        return <Typography variant="body2" sx={{ fontSize: 12, fontFamily: `"${value}"` }}>{value}</Typography>;
                      }}
                    >
                      {(scriptFontOptions[script] || []).map((font) => {
                        if (font === CHOOSE_OTHER) {
                          return [
                            <MenuItem disabled key="sep" sx={{ fontSize: 12, opacity: 0.3, minHeight: 20, '&.Mui-disabled': { opacity: 0.3 } }}>
                              ──────────
                            </MenuItem>,
                            <MenuItem key={CHOOSE_OTHER} value={CHOOSE_OTHER} sx={{ fontSize: 12, color: 'primary.main', fontWeight: 500 }}>
                              ☰ Choose other fonts…
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

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => setShowFormatPanel(true)}
                  sx={{ fontSize: 11, py: 0.5, borderRadius: '6px' }}
                >
                  Format Elements
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => setShowWatermarkPanel(true)}
                  sx={{ fontSize: 11, py: 0.5, borderRadius: '6px' }}
                >
                  Watermark Options
                </Button>
              </Box>
            </Box>
        )}

        {format === "fdx" && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
              FINAL DRAFT XML
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ fontSize: 11, lineHeight: 1.4 }}>
              Exports the screenplay as a Final Draft XML (.fdx) file, compatible with Final Draft, Fade In, and other professional screenwriting apps.
            </Typography>
          </Box>
        )}

        {format === "fadein" && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
              FADE IN PROFESSIONAL
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ fontSize: 11, lineHeight: 1.4 }}>
              Exports the screenplay as a native Fade In (.fadein) file, compatible with Fade In Professional Screenwriting Software on Windows, macOS, and Linux.
            </Typography>
          </Box>
        )}

        {format === "fountain" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                CLEAN FOUNTAIN EXPORT
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ fontSize: 11, lineHeight: 1.4 }}>
                Exports a standard Fountain file without ActOne-specific metadata or draft variables. Markers, note tags, and storyline metadata will be stripped.
              </Typography>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1.25, display: 'block' }}>
                EXPORT SECTIONS
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, mb: 1 }}>
                <FormControlLabel
                  control={<Switch size="small" checked={exportTitlePage} onChange={(e) => setExportTitlePage(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Title Page</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
                <FormControlLabel
                  control={<Switch size="small" checked={exportSections} onChange={(e) => setExportSections(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Sections (#)</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
              </Box>
              <FormControlLabel
                control={<Switch size="small" checked={exportSynopses} onChange={(e) => setExportSynopses(e.target.checked)} />}
                label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Synopsis (=)</Typography>}
                sx={{ mx: 0 }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1, justifyContent: "space-between" }}>
        <Button onClick={onClose} color="inherit" variant="outlined" size="small" sx={{ fontSize: 11 }}>Cancel</Button>
        <Button onClick={handleExport} variant="contained" color="primary" size="small" sx={{ fontSize: 11 }}>
          Export to {format === "pdf" ? "PDF" : format === "fdx" ? "FDX" : format === "fadein" ? "Fade In" : "Fountain"}
        </Button>
      </DialogActions>

      {/* Nested Dialog for Format Elements */}
      <Dialog
        open={showFormatPanel}
        onClose={() => setShowFormatPanel(false)}
        fullWidth
        maxWidth="xs"
        disableScrollLock
        sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14 }}>Format Elements</Typography>
          <IconButton aria-label="close" onClick={() => setShowFormatPanel(false)} sx={{ color: "text.secondary" }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 2, py: 1.5, overflow: "auto" }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, mb: 0.5, display: "block" }}>
              SCENE NUMBERS
            </Typography>
            <RadioGroup
              value={sceneNumberMode}
              onChange={(e) => handleSceneNumberChange(e.target.value as "off" | "left_side" | "mirror")}
            >
              <FormControlLabel value="off" control={<Radio size="small" />} label={<Typography variant="caption" sx={{ fontSize: 11 }}>No scene numbers</Typography>} />
              <FormControlLabel value="left_side" control={<Radio size="small" />} label={<Typography variant="caption" sx={{ fontSize: 11 }}>Left side</Typography>} />
              <FormControlLabel value="mirror" control={<Radio size="small" />} label={<Typography variant="caption" sx={{ fontSize: 11 }}>Mirror on both sides</Typography>} />
            </RadioGroup>
          </Box>

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: 0.5, mb: 0.75, display: "block" }}>
              ELEMENT FORMATTING
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 0.25, alignItems: "center" }}>
              {(Object.keys(FORMAT_LABELS) as (keyof ElementFormats)[]).map((key) => (
                <React.Fragment key={key}>
                  <Typography variant="caption" sx={{ fontSize: 11, py: 0.3 }}>{FORMAT_LABELS[key]}</Typography>
                  <Box sx={{ display: "flex", gap: 0.25 }}>
                    {(["bold", "italic", "underline"] as const).map((attr) => (
                      <ToggleButton
                        key={attr}
                        value={attr}
                        size="small"
                        selected={elementFormats[key][attr]}
                        onChange={() => handleFormatToggle(key, attr)}
                        sx={{
                          width: 28, height: 24, p: 0,
                          border: "1px solid",
                          borderColor: elementFormats[key][attr] ? "primary.main" : "divider",
                          borderRadius: "4px",
                          bgcolor: elementFormats[key][attr] ? "primary.main" : "transparent",
                          color: elementFormats[key][attr] ? "primary.contrastText" : "text.secondary",
                          fontSize: 10,
                          fontWeight: 700,
                          lineHeight: 1,
                          '&:hover': {
                            bgcolor: elementFormats[key][attr] ? "primary.dark" : "action.hover",
                          },
                          transition: "all 0.1s ease",
                        }}
                      >
                        {attr === "bold" ? "B" : attr === "italic" ? "I" : "U"}
                      </ToggleButton>
                    ))}
                  </Box>
                </React.Fragment>
              ))}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1, justifyContent: "flex-end" }}>
          <Button onClick={() => setShowFormatPanel(false)} variant="contained" size="small" sx={{ fontSize: 11 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Nested Dialog for Watermark Options */}
      <Dialog
        open={showWatermarkPanel}
        onClose={() => {
          setShowWatermarkPanel(false);
          updateWatermarkSettings({
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
        }}
        fullWidth
        maxWidth="xs"
        disableScrollLock
        sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14 }}>Watermark Options</Typography>
          <IconButton
            aria-label="close"
            onClick={() => {
              setShowWatermarkPanel(false);
              updateWatermarkSettings({
                headerEnabled: watermarkHeaderEnabled,
                headerText: watermarkHeaderText,
                footerEnabled: watermarkFooterEnabled,
                footerText: watermarkFooterText,
                centerEnabled: watermarkCenterEnabled,
                centerType: watermarkCenterType,
                centerText: watermarkCenterText,
                centerImagePath: watermarkCenterImagePath,
                centerOpacity: watermarkCenterOpacity,
              });
            }}
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 2, py: 1.5, overflow: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Header Watermark */}
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={watermarkHeaderEnabled}
                  onChange={(e) => setWatermarkHeaderEnabled(e.target.checked)}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>Header Watermark (Above Page)</Typography>}
              sx={{ m: 0, mb: watermarkHeaderEnabled ? 1 : 0 }}
            />
            {watermarkHeaderEnabled && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Watermark Text"
                  variant="outlined"
                  value={watermarkHeaderText}
                  onChange={(e) => setWatermarkHeaderText(e.target.value)}
                  slotProps={{ input: { style: { fontSize: 12 } }, inputLabel: { style: { fontSize: 12 } } }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    Opacity: {watermarkHeaderOpacity}%
                  </Typography>
                  <Slider
                    size="small"
                    value={watermarkHeaderOpacity}
                    min={10}
                    max={100}
                    step={5}
                    onChange={(_, val) => setWatermarkHeaderOpacity(val as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Box>
            )}
          </Box>

          {/* Footer Watermark */}
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={watermarkFooterEnabled}
                  onChange={(e) => setWatermarkFooterEnabled(e.target.checked)}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>Footer Watermark (Below Page)</Typography>}
              sx={{ m: 0, mb: watermarkFooterEnabled ? 1 : 0 }}
            />
            {watermarkFooterEnabled && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Watermark Text"
                  variant="outlined"
                  value={watermarkFooterText}
                  onChange={(e) => setWatermarkFooterText(e.target.value)}
                  slotProps={{ input: { style: { fontSize: 12 } }, inputLabel: { style: { fontSize: 12 } } }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    Opacity: {watermarkFooterOpacity}%
                  </Typography>
                  <Slider
                    size="small"
                    value={watermarkFooterOpacity}
                    min={10}
                    max={100}
                    step={5}
                    onChange={(_, val) => setWatermarkFooterOpacity(val as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Box>
            )}
          </Box>

          {/* Center Watermark */}
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={watermarkCenterEnabled}
                  onChange={(e) => setWatermarkCenterEnabled(e.target.checked)}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>Center Watermark (Diagonal/Large)</Typography>}
              sx={{ m: 0, mb: watermarkCenterEnabled ? 1.5 : 0 }}
            />
            {watermarkCenterEnabled && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <RadioGroup
                  row
                  value={watermarkCenterType}
                  onChange={(e) => setWatermarkCenterType(e.target.value as "text" | "image")}
                >
                  <FormControlLabel value="text" control={<Radio size="small" />} label={<Typography variant="caption" sx={{ fontSize: 11 }}>Text</Typography>} />
                  <FormControlLabel value="image" control={<Radio size="small" />} label={<Typography variant="caption" sx={{ fontSize: 11 }}>Image</Typography>} />
                </RadioGroup>

                {watermarkCenterType === "text" ? (
                  <TextField
                    fullWidth
                    size="small"
                    label="Center Text"
                    variant="outlined"
                    value={watermarkCenterText}
                    onChange={(e) => setWatermarkCenterText(e.target.value)}
                    slotProps={{ input: { style: { fontSize: 12 } }, inputLabel: { style: { fontSize: 12 } } }}
                  />
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Image Path"
                        variant="outlined"
                        value={watermarkCenterImagePath}
                        slotProps={{ input: { style: { fontSize: 12 } }, inputLabel: { style: { fontSize: 12 } }, htmlInput: { readOnly: true } }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={async () => {
                          try {
                            const selected = await invoke<string | null>("select_watermark_image");
                            if (selected) {
                              setWatermarkCenterImagePath(selected);
                            }
                          } catch (e) {
                            logger.error("export", "select_watermark_image failed", e);
                          }
                        }}
                        sx={{ fontSize: 11, py: 1 }}
                      >
                        Browse
                      </Button>
                    </Box>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={watermarkCenterGrayscale} onChange={(e) => setWatermarkCenterGrayscale(e.target.checked)} />}
                      label={<Typography variant="caption" sx={{ fontSize: 11 }}>Grayscale (Black & White)</Typography>}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      Accepted: PNG, JPG, BMP, GIF, WebP
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    Opacity: {watermarkCenterOpacity}%
                  </Typography>
                  <Slider
                    size="small"
                    value={watermarkCenterOpacity}
                    min={10}
                    max={100}
                    step={5}
                    onChange={(_, val) => setWatermarkCenterOpacity(val as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1, justifyContent: "flex-end" }}>
          <Button
            onClick={() => {
              setShowWatermarkPanel(false);
              updateWatermarkSettings({
                headerEnabled: watermarkHeaderEnabled,
                headerText: watermarkHeaderText,
                footerEnabled: watermarkFooterEnabled,
                footerText: watermarkFooterText,
                centerEnabled: watermarkCenterEnabled,
                centerType: watermarkCenterType,
                centerText: watermarkCenterText,
                centerImagePath: watermarkCenterImagePath,
                centerOpacity: watermarkCenterOpacity,
              });
            }}
            variant="contained"
            size="small"
            sx={{ fontSize: 11 }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

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
