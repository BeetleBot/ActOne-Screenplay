import React, { useState, useMemo, useCallback } from "react";
import { useFile, useUI } from "../context";
import { CloseIcon } from "./Icons";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Box,
  Typography,
  Button,
  TextField,
  Alert,
} from "@mui/material";

interface TitlePageEditorModalProps {
  onClose: () => void;
}

function extractTitlePage(text: string): { header: string; body: string; fields: Record<string, string> } {
  const lines = text.split("\n");
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
    const headerLines = header.split("\n");
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
  const order = ["title", "credit", "author", "source", "contact", "draft date", "date"];

  for (const key of order) {
    const val = fields[key];
    if (val) {
      const label = key === "draft date" ? "Draft date" : key.charAt(0).toUpperCase() + key.slice(1);
      const valLines = val.split("\n");
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
      const valLines = val.split("\n");
      lines.push(`${label}: ${valLines[0]}`);
      for (let i = 1; i < valLines.length; i++) {
        lines.push("  " + valLines[i]);
      }
    }
  }

  return lines.join("\n") + "\n\n";
}

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
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" disableScrollLock>
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Title Page Editor</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} variant="fullWidth">
          <Tab label="Form View" />
          <Tab label="Fountain View" />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 3, maxHeight: `${(65 * 100) / appScale}vh`, overflowY: "auto" }}>
        {activeTab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {!hasTitlePage && (
              <Alert severity="warning">
                No title page found. Fill in the fields below to create one.
              </Alert>
            )}
            <TextField label="Title" value={fields["title"] || ""} onChange={(e) => handleFieldChange("title", e.target.value)} size="small" fullWidth />
            <TextField label="Author" value={fields["author"] || ""} onChange={(e) => handleFieldChange("author", e.target.value)} size="small" fullWidth />
            <TextField label="Credit" value={fields["credit"] || ""} onChange={(e) => handleFieldChange("credit", e.target.value)} size="small" fullWidth />
            <TextField label="Source" value={fields["source"] || ""} onChange={(e) => handleFieldChange("source", e.target.value)} size="small" fullWidth />
            <TextField label="Contact" value={fields["contact"] || ""} onChange={(e) => handleFieldChange("contact", e.target.value)} size="small" multiline rows={3} fullWidth />
            <TextField label="Draft Date" value={fields["draft date"] || ""} onChange={(e) => handleFieldChange("draft date", e.target.value)} size="small" fullWidth />
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Edit the raw Fountain title page syntax below. Changes sync with the Form view.
            </Typography>
            <TextField
              value={fountainText}
              onChange={(e) => handleFountainChange(e.target.value)}
              multiline
              rows={12}
              fullWidth
              slotProps={{
                input: {
                  sx: {
                    fontFamily: "monospace",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }
                }
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, justifyContent: "space-between" }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
        <Button onClick={handleApply} variant="contained" color="primary">
          Apply to Document
        </Button>
      </DialogActions>
    </Dialog>
  );
};
