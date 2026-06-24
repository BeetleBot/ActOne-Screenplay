import React, { useState, useMemo, useCallback } from "react";
import { useFile, useUI } from "../context";
import { CloseIcon, TextFieldsIcon } from "./Icons";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
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

function extractTitlePage(text: string): { header: string; body: string; fields: Record<string, string> } {
  const lines = text.split(/\r?\n/);
  let titlePageEnd = -1;
  let foundContent = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "") {
      if (foundContent) {
        titlePageEnd = i;
        break;
      }
    } else if (!foundContent) {
      foundContent = true;
    }
  }

  const header = titlePageEnd >= 0 ? lines.slice(0, titlePageEnd + 1).join("\n") : "";
  const body = titlePageEnd >= 0 ? lines.slice(titlePageEnd + 1).join("\n") : text;

  const fields: Record<string, string> = {};
  if (header) {
    const headerLines = header.split(/\r?\n/);
    let currentKey = "";
    let currentValues: string[] = [];

    const flushField = () => {
      if (currentKey && currentValues.length > 0) {
        fields[currentKey] = currentValues.join("\n");
      }
      currentKey = "";
      currentValues = [];
    };

    for (const raw of headerLines) {
      const trimmed = raw.trim();
      if (trimmed === "") {
        flushField();
        continue;
      }
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1) {
        flushField();
        currentKey = trimmed.substring(0, colonIdx).trim().toLowerCase();
        const val = trimmed.substring(colonIdx + 1).trim();
        if (val) currentValues.push(val);
      } else if (currentKey && (raw.startsWith(" ") || raw.startsWith("\t"))) {
        currentValues.push(trimmed);
      } else {
        flushField();
      }
    }
    flushField();
  }

  return { header, body, fields };
}

function buildTitlePage(fields: Record<string, string>): string {
  const lines: string[] = [];
  const order = ["title", "credit", "author", "source", "notes", "contact", "draft date", "date"];

  for (const key of order) {
    const val = fields[key];
    if (val) {
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
    if (val) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const valLines = val.split(/\r?\n/);
      lines.push(`${label}: ${valLines[0]}`);
      for (let i = 1; i < valLines.length; i++) {
        lines.push("  " + valLines[i]);
      }
    }
  }

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
  const { appScale } = useUI();

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
    const allText = newHeader + (newHeader.endsWith("\n") ? "" : "\n") + extracted.body;
    const refields = extractTitlePage(allText).fields;
    setFields(refields);
  }, [rawText]);

  const handleApply = useCallback(() => {
    const extracted = extractTitlePage(rawText);
    const newRaw = fountainText + (fountainText.endsWith("\n") ? "" : "\n") + extracted.body;
    setRawText(newRaw);
    onClose();
  }, [rawText, fountainText, setRawText, onClose]);

  const hasTitlePage = Object.values(fields).some(v => v.trim().length > 0);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" disableScrollLock transitionDuration={200} sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '12px' } }}>
      <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextFieldsIcon sx={{ fontSize: 18 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14 }}>Title Page Editor</Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 2, py: 1 }}>
        <ToggleButtonGroup
          value={activeTab}
          exclusive
          onChange={(_, val) => val !== null && setActiveTab(val as number)}
          fullWidth
          size="small"
        >
          <ToggleButton value={0} sx={{ fontSize: 12, py: 0.3 }}>Form</ToggleButton>
          <ToggleButton value={1} sx={{ fontSize: 12, py: 0.3 }}>Raw</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <DialogContent dividers sx={{ px: 2, py: 1.5, maxHeight: `${(65 * 100) / appScale}vh` }}>
        {activeTab === 0 && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
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
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
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
                      fontFamily: "monospace",
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

      <DialogActions sx={{ px: 2, py: 1, justifyContent: "space-between" }}>
        <Button onClick={onClose} color="inherit" variant="outlined" size="small" sx={{ fontSize: 11 }}>Cancel</Button>
        <Button onClick={handleApply} variant="contained" color="primary" size="small" sx={{ fontSize: 11 }}>
          Apply to Document
        </Button>
      </DialogActions>
    </Dialog>
  );
};
