import React, { useState, useMemo, useCallback } from "react";
import { X } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useFocusTrap } from "../hooks/useFocusTrap";

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
  const { rawText, setRawText } = useAppContext();
  const { containerRef, handleKeyDown: trapKeyDown } = useFocusTrap(true, onClose);

  const initial = useMemo(() => extractTitlePage(rawText), [rawText]);
  const [activeTab, setActiveTab] = useState<"form" | "fountain">("form");
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
    <div
      className="theme-modal-overlay"
      onClick={onClose}
      ref={containerRef}
      onKeyDown={trapKeyDown}
      tabIndex={-1}
      style={{ outline: "none" }}
    >
      <div
        className="theme-modal"
        style={{ maxWidth: "600px", width: "90%" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Title Page Editor"
      >
        <div className="theme-modal-header">
          <h2 className="theme-modal-title">Title Page Editor</h2>
          <button className="theme-modal-close" onClick={onClose} tabIndex={0}>
            <X size={18} />
          </button>
        </div>

        <div className="theme-tabs" role="tablist">
          <button
            className={`theme-tab-btn ${activeTab === "form" ? "active" : ""}`}
            onClick={() => setActiveTab("form")}
            role="tab"
            aria-selected={activeTab === "form"}
            tabIndex={0}
          >
            Form View
          </button>
          <button
            className={`theme-tab-btn ${activeTab === "fountain" ? "active" : ""}`}
            onClick={() => setActiveTab("fountain")}
            role="tab"
            aria-selected={activeTab === "fountain"}
            tabIndex={0}
          >
            Fountain View
          </button>
        </div>

        <div className="theme-modal-body" style={{ maxHeight: "420px", overflowY: "auto" }} role="tabpanel">
          {activeTab === "form" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px" }}>
              {!hasTitlePage && (
                <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(255, 193, 7, 0.1)", border: "1px solid rgba(255, 193, 7, 0.3)", fontSize: "12px", color: "var(--text-main)" }}>
                  No title page found. Fill in the fields below to create one.
                </div>
              )}
              <FormField label="Title" value={fields["title"] || ""} onChange={(v) => handleFieldChange("title", v)} />
              <FormField label="Author" value={fields["author"] || ""} onChange={(v) => handleFieldChange("author", v)} />
              <FormField label="Credit" value={fields["credit"] || ""} onChange={(v) => handleFieldChange("credit", v)} />
              <FormField label="Source" value={fields["source"] || ""} onChange={(v) => handleFieldChange("source", v)} />
              <FormField label="Contact" value={fields["contact"] || ""} onChange={(v) => handleFieldChange("contact", v)} multiline />
              <FormField label="Draft Date" value={fields["draft date"] || ""} onChange={(v) => handleFieldChange("draft date", v)} />
            </div>
          )}

          {activeTab === "fountain" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, opacity: 0.8, color: "var(--text-muted)" }}>
                Edit the raw Fountain title page syntax below. Changes sync with the Form view.
              </label>
              <textarea
                value={fountainText}
                onChange={(e) => handleFountainChange(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "280px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-editor-wrapper)",
                  color: "var(--text-main)",
                  fontFamily: '"Courier Prime", Courier, monospace',
                  fontSize: "13px",
                  lineHeight: "1.5",
                  resize: "vertical",
                  outline: "none",
                  tabSize: 2,
                }}
                spellCheck={false}
              />
            </div>
          )}
        </div>

        <div className="export-modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "8px", padding: "16px 20px", borderTop: "1px solid var(--border-color)" }}>
          <button className="export-modal-btn cancel" onClick={onClose}>Cancel</button>
          <button className="export-modal-btn primary" onClick={handleApply}>
            Apply to Document
          </button>
        </div>
      </div>
    </div>
  );
};

const FormField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
}> = ({ label, value, onChange, multiline }) => {
  const id = `title-field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label htmlFor={id} style={{ fontSize: "12px", fontWeight: 600, opacity: 0.85 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-sidebar)",
            color: "var(--text-main)",
            fontSize: "13px",
            fontFamily: "var(--font-ui)",
            resize: "vertical",
            outline: "none",
          }}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-sidebar)",
            color: "var(--text-main)",
            fontSize: "13px",
            fontFamily: "var(--font-ui)",
            outline: "none",
          }}
        />
      )}
    </div>
  );
};
