import React, { useState, useEffect } from "react";
import { useFile, useUI } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { DownloadIcon, DescriptionIcon } from "./Icons";
import { TitleBar } from "./TitleBar";
import { SystemFontPicker } from "./SystemFontPicker";
import { logger } from "../utils/logger";
import { STORAGE_KEYS } from "../constants";

import {
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

type ExportFormat = "pdf" | "fountain" | "fdx" | "fadein";
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

interface ExportModalProps {
  onClose: () => void;
  batchExport?: boolean;
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
      px: indent ? 2.5 : 1.5,
      py: 0.65,
      cursor: "pointer",
      borderRadius: 1,
      fontSize: 12.5,
      fontWeight: active ? 700 : 500,
      color: active ? "primary.main" : "text.secondary",
      bgcolor: active ? "action.selected" : "transparent",
      borderLeft: indent ? "2px solid" : "none",
      borderColor: active ? "primary.main" : "transparent",
      transition: "all 0.12s ease",
      '&:hover': { bgcolor: active ? "action.selected" : "action.hover", color: active ? "primary.main" : "text.primary" },
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

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, batchExport }) => {
  const { rawText, isBundle, activeScriptName, filePath, updateSettings, parsedDoc, scripts } = useFile();
  const { fontFamily, paperSize, appScale } = useUI();

  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [pdfSubTab, setPdfSubTab] = useState<PdfSubTab>("document");

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

  const handleFormatToggle = (element: keyof ElementFormats, attr: "bold" | "italic" | "underline") => {
    const next: ElementFormats = {
      ...elementFormats,
      [element]: { ...elementFormats[element], [attr]: !elementFormats[element][attr] },
    };
    setElementFormats(next);
    updateSettings((prev) => ({ ...prev, elementFormats: next }));
  };

  const handleSceneNumberChange = (mode: "off" | "left_side" | "mirror") => {
    setSceneNumberMode(mode);
    updateSettings((prev) => ({ ...prev, sceneNumberMode: mode }));
  };

  const handleSceneColorToggle = (checked: boolean) => {
    setExportSceneColors(checked);
    updateSettings((prev) => ({ ...prev, exportSceneColors: checked }));
  };

  const getLastExportDir = () => {
    return localStorage.getItem(STORAGE_KEYS.LAST_EXPORT_DIR);
  };

  const saveLastExportDir = (filePath: string) => {
    const sepIdx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    if (sepIdx > 0) {
      localStorage.setItem(STORAGE_KEYS.LAST_EXPORT_DIR, filePath.substring(0, sepIdx));
    }
  };

  const handleExportPDF = async () => {
    try {
      updateWatermarkSettings(currentWatermarkSettings());
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        const revisedLines: boolean[] = [];

        const result = await invoke<string | null>("export_pdf", {
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
          defaultDirectory: getLastExportDir(),
        });
        if (result) saveLastExportDir(result);
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
        const result = await invoke<string | null>("export_fountain", {
          content: cleaned,
          defaultDirectory: getLastExportDir(),
        });
        if (result) saveLastExportDir(result);
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
        if (result) saveLastExportDir(result);
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
      }
      onClose();
    } catch (e) {
      logger.error("export", "handleExportFDX failed", e);
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
        if (result) saveLastExportDir(result);
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
      }
      onClose();
    } catch (e) {
      logger.error("export", "handleExportFadeIn failed", e);
    }
  };

  const handleBatchExport = async () => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) { onClose(); return; }

    try {
      updateWatermarkSettings(currentWatermarkSettings());
      const dir = await invoke<string | null>("pick_directory");
      if (!dir) return;

      for (const script of scripts) {
        // eslint-disable-next-line no-control-regex
        const sanitizedName = script.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "Untitled";

        if (format === "fountain") {
          const cleaned = stripFountainForExport(script.content, { sections: exportSections, synopses: exportSynopses, titlePage: exportTitlePage });
          await invoke("save_file_content", { path: `${dir}/${sanitizedName}.fountain`, content: cleaned })
            .catch(e => logger.error("export", `Batch fountain failed for ${sanitizedName}`, e));
        } else if (format === "fdx") {
          const cleaned = stripFountainForExport(script.content, { sections: false, synopses: false, titlePage: exportTitlePage });
          const fdx = await invoke<string>("generate_fdx_string", { fountainText: cleaned });
          await invoke("save_file_content", { path: `${dir}/${sanitizedName}.fdx`, content: fdx })
            .catch(e => logger.error("export", `Batch FDX failed for ${sanitizedName}`, e));
        } else if (format === "fadein") {
          const cleaned = stripFountainForExport(script.content, { sections: false, synopses: false, titlePage: exportTitlePage });
          const bytes = await invoke<number[]>("generate_fadein_bytes", { fountainText: cleaned });
          await invoke("save_file_binary", { path: `${dir}/${sanitizedName}.fadein`, bytes })
            .catch(e => logger.error("export", `Batch FadeIn failed for ${sanitizedName}`, e));
        } else if (format === "pdf") {
          const revisedLines: boolean[] = [];
          const bytes = await invoke<number[]>("generate_pdf_bytes", {
            fountainText: script.content,
            paperSize,
            fontFamily: selectedFont,
            elementFormats: JSON.stringify(elementFormats),
            mirrorSceneNumbers: sceneNumberMode,
            exportSections,
            exportSynopses,
            exportTitlePage,
            exportSceneColors,
            scenePageBreaks,
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
          await invoke("save_file_binary", { path: `${dir}/${sanitizedName}.pdf`, bytes })
            .catch(e => logger.error("export", `Batch PDF failed for ${sanitizedName}`, e));
        }
      }
    } catch (e) {
      logger.error("export", "handleBatchExport failed", e);
    }
    onClose();
  };

  const handleExport = () => {
    if (batchExport) {
      handleBatchExport();
      return;
    }
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

  const formatLabel = format === "pdf" ? "PDF" : format === "fdx" ? "FDX" : format === "fadein" ? "Fade In" : "Fountain";

  /* ── Render right panel content ── */
  const renderContent = () => {
    // PDF > Document
    if (format === "pdf" && pdfSubTab === "document") {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
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

          <Box>
            <SectionTitle>Screenplay Font</SectionTitle>
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

    // PDF > Formatting
    if (format === "pdf" && pdfSubTab === "formatting") {
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

    // PDF > Watermarks
    if (format === "pdf" && pdfSubTab === "watermarks") {
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

    // Fountain
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

    // FDX
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

    // Fade In
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
          zoom: `${appScale}%`,
          borderRadius: 0,
          height: 520,
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 0 }}>
        <TitleBar
          title="Export Script"
          icon={<DownloadIcon sx={{ fontSize: 16 }} />}
          isModal
          onClose={onClose}
        />
      </DialogTitle>

      {/* 2-Column Body */}
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
              {batchExport ? "Batch Export" : "Exporting"}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <DescriptionIcon sx={{ fontSize: 13, color: "text.secondary" }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {batchExport && isBundle ? `${scripts.length} scripts` : activeScriptName}
              </Typography>
            </Box>
            <Chip
              label={`${paperSize === "letter" ? "US Letter" : "A4"} · ${selectedFont === "courier-prime" ? "Courier Prime" : "Courier Prime Sans"}`}
              size="small"
              sx={{ height: 18, fontSize: 9.5, fontWeight: 600, mt: 0.5, borderRadius: 0.5, bgcolor: "background.paper" }}
            />
          </Box>

          <Divider sx={{ mb: 0.5 }} />

          {/* Format nav */}
          <NavItem label="PDF Document" active={format === "pdf"} onClick={() => setFormat("pdf")} />

          {format === "pdf" && (
            <>
              <NavItem label="Document & Layout" active={pdfSubTab === "document"} onClick={() => setPdfSubTab("document")} indent />
              <NavItem label="Element Formatting" active={pdfSubTab === "formatting"} onClick={() => setPdfSubTab("formatting")} indent />
              <NavItem label="Watermarks" active={pdfSubTab === "watermarks"} onClick={() => setPdfSubTab("watermarks")} indent />
            </>
          )}

          <NavItem label="Fountain" active={format === "fountain"} onClick={() => setFormat("fountain")} />
          <NavItem label="Final Draft (.fdx)" active={format === "fdx"} onClick={() => setFormat("fdx")} />
          <NavItem label="Fade In (.fadein)" active={format === "fadein"} onClick={() => setFormat("fadein")} />
        </Box>

        {/* ── Right Panel ── */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
          {renderContent()}
        </Box>
      </Box>

      {/* ── Footer ── */}
      <DialogActions sx={{ px: 2, py: 1.25, justifyContent: "space-between", borderTop: "1px solid", borderColor: "divider" }}>
        <Button
          onClick={onClose}
          color="inherit"
          size="small"
          sx={{ fontSize: 12, textTransform: "none", borderRadius: 0, px: 2 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          color="primary"
          size="small"
          startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
          sx={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "none",
            px: 2.5,
            borderRadius: 0,
            boxShadow: "none",
          }}
        >
          {batchExport ? `Export All as ${formatLabel}` : `Export to ${formatLabel}`}
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
