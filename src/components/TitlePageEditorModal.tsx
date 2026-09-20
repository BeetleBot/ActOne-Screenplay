import React, { useState, useMemo, useCallback } from "react";
import { useFile } from "../context";
import { TitleBar } from "./TitleBar";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";

interface TitlePageEditorModalProps {
  onClose: () => void;
}

const TITLE_PAGE_STANDARD_KEYS = new Set([
  "title", "credit", "credits", "author", "authors", "source", "notes",
  "contact", "draft date", "date", "copyright", "watermark", "revision",
  "format", "episode", "season", "series", "status", "version",
  "writer", "writers", "adaptation", "translator", "translation",
  "based on", "story by", "screenplay by", "rights", "header", "footer",
  "tl", "tr", "bl", "br", "cc"
]);

function isTransitionOrHeading(line: string): boolean {
  const trimmed = line.trim();
  if (/^(?:INT|EXT|INT\/EXT|I\/E|EST)\b/i.test(trimmed) || trimmed.startsWith(".")) {
    return true;
  }
  if (/^(?:[A-Z\s]+ TO:|FADE IN:?|FADE OUT:?)$/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function extractTitlePage(text: string): { header: string; body: string; fields: Record<string, string> } {
  const lines = text.split(/\r?\n/);
  let firstContentIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "") {
      firstContentIdx = i;
      break;
    }
  }

  if (firstContentIdx === -1) {
    return { header: "", body: text, fields: {} };
  }

  let titleBlockEnd = -1;
  let hasRecognizedKey = false;
  let currentKey = "";
  const candidateFields: Record<string, string[]> = {};

  for (let i = firstContentIdx; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === "") {
      titleBlockEnd = i;
      break;
    }

    if (isTransitionOrHeading(raw)) {
      titleBlockEnd = i;
      break;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx !== -1) {
      const keyCandidate = trimmed.substring(0, colonIdx).trim().toLowerCase();
      if (/^[a-z0-9][a-z0-9 _-]*$/.test(keyCandidate)) {
        currentKey = keyCandidate;
        if (TITLE_PAGE_STANDARD_KEYS.has(currentKey)) {
          hasRecognizedKey = true;
        }
        if (!candidateFields[currentKey]) {
          candidateFields[currentKey] = [];
        }
        const val = trimmed.substring(colonIdx + 1).trim();
        if (val) {
          candidateFields[currentKey].push(val);
        }
        continue;
      }
    }

    if (currentKey && (raw.startsWith(" ") || raw.startsWith("\t"))) {
      candidateFields[currentKey].push(trimmed);
      continue;
    }

    titleBlockEnd = i;
    break;
  }

  if (!hasRecognizedKey) {
    return { header: "", body: text, fields: {} };
  }

  const headerEndIdx = titleBlockEnd >= 0 ? titleBlockEnd : lines.length;
  const header = lines.slice(firstContentIdx, headerEndIdx).join("\n");

  let bodyStartIdx = headerEndIdx;
  while (bodyStartIdx < lines.length && lines[bodyStartIdx].trim() === "") {
    bodyStartIdx++;
  }
  const body = lines.slice(bodyStartIdx).join("\n");

  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(candidateFields)) {
    if (v.length > 0) {
      fields[k] = v.join("\n");
    }
  }

  return { header, body, fields };
}

export function buildTitlePage(fields: Record<string, string>): string {
  const lines: string[] = [];
  const order = ["title", "credit", "author", "source", "notes", "contact", "draft date", "date"];

  for (const key of order) {
    const val = fields[key];
    if (val && val.trim()) {
      const label = key === "draft date" ? "Draft date" : key.charAt(0).toUpperCase() + key.slice(1);
      const valLines = val.split(/\r?\n/);
      lines.push(`${label}: ${valLines[0]}`);
      for (let i = 1; i < valLines.length; i++) {
        lines.push("  " + valLines[i]);
      }
    }
  }

  const customKeys = Object.keys(fields).filter(k => !order.includes(k));
  for (const key of customKeys) {
    const val = fields[key];
    if (val && val.trim()) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const valLines = val.split(/\r?\n/);
      lines.push(`${label}: ${valLines[0]}`);
      for (let i = 1; i < valLines.length; i++) {
        lines.push("  " + valLines[i]);
      }
    }
  }

  if (lines.length === 0) return "";
  return lines.join("\n") + "\n\n";
}

const FIELD_DEFS: { key: string; label: string; rows?: number }[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "credit", label: "Credit" },
  { key: "source", label: "Source" },
  { key: "notes", label: "Notes" },
  { key: "contact", label: "Contact" },
  { key: "draft date", label: "Draft Date" },
];

const inputSx = {
  fontSize: 12,
  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
  bgcolor: 'action.hover',
  borderRadius: '6px',
  '&:hover': { bgcolor: 'action.selected' },
  '& .MuiOutlinedInput-input': { py: 0.6, px: 1.25 },
};

export const TitlePageEditorModal: React.FC<TitlePageEditorModalProps> = ({ onClose }) => {
  const { rawText, setRawText } = useFile();

  const initial = useMemo(() => extractTitlePage(rawText), [rawText]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [fields, setFields] = useState<Record<string, string>>(initial.fields);
  const [fountainText, setFountainText] = useState(initial.header);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFields(prev => {
      const next = { ...prev, [key]: value };
      setFountainText(buildTitlePage(next));
      return next;
    });
  }, []);

  const handleFountainChange = useCallback((text: string) => {
    setFountainText(text);
    const extracted = extractTitlePage(rawText);
    const newHeader = text;
    const allText = newHeader + (newHeader.endsWith("\n") ? "" : "\n") + (extracted.body ? "\n" + extracted.body : "");
    const refields = extractTitlePage(allText).fields;
    setFields(refields);
  }, [rawText]);

  const handleApply = useCallback(() => {
    const extracted = extractTitlePage(rawText);
    const trimmedHeader = fountainText.trim();
    let newRaw: string;
    if (!trimmedHeader) {
      newRaw = extracted.body;
    } else {
      newRaw = fountainText.trimEnd() + (extracted.body ? "\n\n" + extracted.body : "\n");
    }
    setRawText(newRaw);
    onClose();
  }, [rawText, fountainText, setRawText, onClose]);

  const hasTitlePage = Object.values(fields).some(v => v.trim().length > 0);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" disableScrollLock transitionDuration={200} sx={{ '& .MuiDialog-paper': { borderRadius: '12px', overflow: 'hidden' } }}>
      <DialogTitle sx={{ m: 0, p: 0 }}>
        <TitleBar
          title="Title Page Editor"
          isModal
          onClose={onClose}
        />
      </DialogTitle>

      <Box sx={{ px: 2, py: 1 }}>
        <ToggleButtonGroup
          value={activeTab}
          exclusive
          onChange={(_, val) => val !== null && setActiveTab(val as number)}
          fullWidth
          size="small"
          sx={{
            p: '3px',
            gap: '4px',
            borderRadius: '8px',
            bgcolor: 'action.hover',
            '& .MuiToggleButtonGroup-grouped': {
              border: 'none !important',
              borderRadius: '6px !important',
            },
          }}
        >
          <ToggleButton value={0} sx={{ fontSize: 12, py: 0.3 }}>Form</ToggleButton>
          <ToggleButton value={1} sx={{ fontSize: 12, py: 0.3 }}>Raw</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <DialogContent dividers sx={{ px: 2, py: 1.5, maxHeight: "65vh" }}>
        {activeTab === 0 && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1.25, display: 'block' }}>
              METADATA FIELDS
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              {!hasTitlePage && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, fontStyle: "italic", px: 0.5 }}>
                  No title page found. Fill in the fields below to create one.
                </Typography>
              )}
              {FIELD_DEFS.map(({ key, label, rows }) => (
                <Box key={key} sx={{ display: "flex", alignItems: rows && rows > 1 ? "flex-start" : "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 11, minWidth: 80, flexShrink: 0, color: "text.secondary", pt: rows && rows > 1 ? 0.5 : 0 }}>
                    {label.toUpperCase()}
                  </Typography>
                  <TextField
                    size="small"
                    value={fields[key] || ""}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    multiline={!!rows}
                    rows={rows}
                    fullWidth
                    sx={rows ? { ...inputSx, '& .MuiOutlinedInput-input': { ...inputSx['& .MuiOutlinedInput-input'], py: rows ? 0.5 : 0.6 } } : inputSx}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1.25, display: 'block' }}>
              RAW FOUNTAIN SYNTAX
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
                Edit the raw Fountain title page syntax. Changes sync with the Form view.
              </Typography>
              <TextField
                value={fountainText}
                onChange={(e) => handleFountainChange(e.target.value)}
                multiline
                rows={12}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  bgcolor: 'action.hover',
                  borderRadius: '6px',
                }}
                slotProps={{
                  input: {
                    sx: {
                      fontFamily: '"Courier Prime", Courier, monospace',
                      fontSize: 12,
                      lineHeight: 1.5,
                      py: 0.5, px: 1.25,
                    }
                  }
                }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.25, justifyContent: "space-between" }}>
        <Button
          size="small"
          onClick={() => {
            setFields({});
            setFountainText("");
          }}
          color="error"
          sx={{ fontSize: 11, fontWeight: 600, textTransform: "none", borderRadius: '20px', px: 1.75 }}
        >
          Clear Title Page
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" onClick={onClose} sx={{ fontSize: 11, fontWeight: 600, textTransform: "none", borderRadius: '20px', px: 1.75 }}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleApply} sx={{ fontSize: 11, fontWeight: 600, textTransform: "none", borderRadius: '20px', px: 2 }}>
            Apply Changes
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
