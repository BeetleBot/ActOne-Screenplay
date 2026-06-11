import React, { useState } from "react";
import { useFile, useUI } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { DescriptionIcon, CloseIcon, DownloadIcon } from "./Icons";

import {
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
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";

type ExportFormat = "pdf" | "fountain";

interface ExportModalProps {
  onClose: () => void;
}

function stripFountainForExport(
  rawText: string,
  options: { sections: boolean; synopses: boolean; titlePage: boolean }
): string {
  let text = rawText;

  let drafterStart = text.indexOf("/* If you are seeing this and you are not using ActOne, you can delete these. - ACTONE:");
  if (drafterStart === -1) {
    drafterStart = text.indexOf("/* If you're seeing this, you can remove the following stuff - ACTONE:");
  }
  if (drafterStart !== -1) {
    const drafterEnd = text.indexOf("END_ACTONE*/");
    if (drafterEnd !== -1) {
      text = text.substring(0, drafterStart).trimEnd();
    }
  }

  const beatStart = text.indexOf("/* If you're seeing this, you can remove the following stuff - BEAT:");
  if (beatStart !== -1) {
    const beatEnd = text.indexOf("END_BEAT*/");
    if (beatEnd !== -1) {
      text = text.substring(0, beatStart).trimEnd();
    }
  }

  text = text.replace(/\[\[marker[^\]]*\]\]/gi, "");

  text = text.replace(/\[\[(color\s[^\]]*|storyline[^\]]*|red|blue|green|pink|magenta|gray|purple|cyan|teal|yellow|orange|brown)\]\]/gi, "");

  const lines = text.split(/\r?\n/);
  const filtered: string[] = [];
  let inTitlePage = true;

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
  const { rawText } = useFile();
  const { fontFamily, paperSize } = useUI();

  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [boldSceneHeadings, setBoldSceneHeadings] = useState(false);
  const [mirrorSceneNumbers, setMirrorSceneNumbers] = useState("off");
  const [exportSections, setExportSections] = useState(false);
  const [exportSynopses, setExportSynopses] = useState(false);
  const [exportTitlePage, setExportTitlePage] = useState(true);

  const [selectedFont, setSelectedFont] = useState<string>(fontFamily);

  const handleExportPDF = async () => {
    try {
      const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        const revisedLines: boolean[] = [];

        await invoke("export_pdf", {
          fountainText: rawText,
          paperSize,
          fontFamily: selectedFont,
          boldSceneHeadings,
          mirrorSceneNumbers,
          exportSections,
          exportSynopses,
          exportTitlePage,
          revisedLines,
        });
      } else {
        alert("PDF export is only supported in the desktop app.");
      }
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportFountain = async () => {
    try {
      const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;
      const cleaned = stripFountainForExport(rawText, {
        sections: exportSections,
        synopses: exportSynopses,
        titlePage: exportTitlePage,
      });

      if (isTauri) {
        await invoke("export_fountain", { content: cleaned });
      } else {
        const blob = new Blob([cleaned], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "screenplay.fountain";
        a.click();
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    if (format === "pdf") {
      handleExportPDF();
    } else {
      handleExportFountain();
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" disableScrollLock>
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DownloadIcon sx={{ fontSize: 20 }} />
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>Export Screenplay</Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <ToggleButtonGroup
            value={format}
            exclusive
            onChange={(_, val) => val && setFormat(val)}
            aria-label="export format"
            fullWidth
            size="small"
          >
            <ToggleButton value="pdf" aria-label="export as pdf" sx={{ gap: 1 }}>
              <DescriptionIcon sx={{ fontSize: 16 }} />
              PDF
            </ToggleButton>
            <ToggleButton value="fountain" aria-label="export as fountain" sx={{ gap: 1 }}>
              <DescriptionIcon sx={{ fontSize: 16 }} />
              Fountain
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {format === "pdf" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Summary Settings</Typography>
              <Typography variant="caption" color="text.secondary">
                {paperSize === "letter" ? "US Letter" : "A4"} • {selectedFont === "courier-prime" ? "Courier Prime" : "Courier Prime Sans"}
              </Typography>
            </Box>

            <FormControlLabel
              control={<Switch checked={exportTitlePage} onChange={(e) => setExportTitlePage(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Title Page</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Export the title page if it is defined</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={<Switch checked={boldSceneHeadings} onChange={(e) => setBoldSceneHeadings(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Bold Scene Headings</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Make scene headings bold in the PDF</Typography>
                </Box>
              }
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="scene-numbers-label">Scene Numbers</InputLabel>
                <Select
                  labelId="scene-numbers-label"
                  value={mirrorSceneNumbers}
                  label="Scene Numbers"
                  onChange={(e) => setMirrorSceneNumbers(e.target.value)}
                >
                  <MenuItem value="off">Disabled</MenuItem>
                  <MenuItem value="left_side">Left Side Only</MenuItem>
                  <MenuItem value="mirror">Mirror on Both Sides</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel id="export-font-label">Export Font</InputLabel>
                <Select
                  labelId="export-font-label"
                  value={selectedFont}
                  label="Export Font"
                  onChange={(e) => setSelectedFont(e.target.value)}
                >
                  <MenuItem value="courier-prime">Courier Prime</MenuItem>
                  <MenuItem value="courier-prime-sans">Courier Prime Sans</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <FormControlLabel
              control={<Switch checked={exportSections} onChange={(e) => setExportSections(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Sections</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Render section headings (#) in export</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={<Switch checked={exportSynopses} onChange={(e) => setExportSynopses(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Synopsis</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Render synopses (=) in export</Typography>
                </Box>
              }
            />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Clean Fountain File Export</Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                Exports a standard Fountain file without ActOne-specific metadata or draft variables.
                <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0 }}>
                  <li>Markers and note tags will be removed</li>
                  <li>ActOne settings block will be stripped</li>
                  <li>Color and storyline tags will be removed</li>
                </Box>
              </Typography>
            </Box>

            <FormControlLabel
              control={<Switch checked={exportTitlePage} onChange={(e) => setExportTitlePage(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Title Page</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Export the title page if it is defined</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={<Switch checked={exportSections} onChange={(e) => setExportSections(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Sections</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Keep section lines (#) in the exported file</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={<Switch checked={exportSynopses} onChange={(e) => setExportSynopses(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Synopsis</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Keep synopsis lines (=) in the exported file</Typography>
                </Box>
              }
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, justifyContent: "space-between" }}>
        <Button onClick={onClose} color="inherit" variant="outlined">Cancel</Button>
        <Button onClick={handleExport} variant="contained" color="primary">
          Export to {format === "pdf" ? "PDF" : "Fountain"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
