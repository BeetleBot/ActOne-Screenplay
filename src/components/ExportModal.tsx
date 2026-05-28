import React, { useState, useEffect, useRef } from "react";
import { FileText, X, Download } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { invoke } from "@tauri-apps/api/core";

type ExportFormat = "pdf" | "fountain";

interface ExportModalProps {
  onClose: () => void;
}

function stripFountainForExport(
  rawText: string,
  options: { sections: boolean; synopses: boolean; titlePage: boolean }
): string {
  let text = rawText;

  const drafterStart = text.indexOf("/* If you're seeing this, you can remove the following stuff - DRAFTER:");
  if (drafterStart !== -1) {
    const drafterEnd = text.indexOf("END_DRAFTER*/");
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
  const { rawText, fontFamily, paperSize, editorView } = useAppContext();

  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [boldSceneHeadings, setBoldSceneHeadings] = useState(false);
  const [mirrorSceneNumbers, setMirrorSceneNumbers] = useState("off");
  const [exportSections, setExportSections] = useState(false);
  const [exportSynopses, setExportSynopses] = useState(false);
  const [exportTitlePage, setExportTitlePage] = useState(true);

  const handleClose = () => {
    onClose();
    editorView?.focus();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, editorView]);

  const handleExportPDF = async () => {
    try {
      const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        await invoke("export_pdf", {
          fountainText: rawText,
          paperSize,
          fontFamily,
          boldSceneHeadings,
          mirrorSceneNumbers,
          exportSections,
          exportSynopses,
          exportTitlePage,
        });
      } else {
        alert("PDF export is only supported in the desktop app.");
      }
      handleClose();
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
      handleClose();
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

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div 
      className="export-modal-overlay" 
      onClick={handleClose}
      ref={containerRef}
      tabIndex={-1}
      style={{ outline: "none" }}
    >
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <div className="export-modal-title">
            <Download size={20} strokeWidth={1.5} />
            <span>Export</span>
          </div>
          <button className="export-modal-close" onClick={handleClose}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="export-modal-body">
          <div className="export-modal-format-selector">
            <button
              className={`export-format-btn ${format === "pdf" ? "active" : ""}`}
              onClick={() => setFormat("pdf")}
            >
              <FileText size={16} strokeWidth={1.5} />
              <span>PDF</span>
            </button>
            <button
              className={`export-format-btn ${format === "fountain" ? "active" : ""}`}
              onClick={() => setFormat("fountain")}
            >
              <FileText size={16} strokeWidth={1.5} />
              <span>Fountain</span>
            </button>
          </div>

          {format === "pdf" && (
            <div className="export-modal-preview">
              <div className="export-modal-preview-page">
                <div className="export-modal-preview-line wide" />
                <div className="export-modal-preview-line medium" />
                <div className="export-modal-preview-line wide" />
                <div className="export-modal-preview-line narrow" />
                <div className="export-modal-preview-line medium" />
              </div>
            </div>
          )}

          {format === "fountain" && (
            <div className="export-modal-fountain-info">
              <p>Exports a clean Fountain file without Drafter-specific data.</p>
              <ul>
                <li>Markers and note tags will be removed</li>
                <li>Drafter settings block will be stripped</li>
                <li>Color and storyline tags will be removed</li>
              </ul>
            </div>
          )}

          <div className="export-modal-info">
            <div className="export-modal-info-row">
              <span className="export-modal-info-label">Format</span>
              <span className="export-modal-info-value">{format === "pdf" ? "PDF" : "Fountain (.fountain)"}</span>
            </div>
            {format === "pdf" && (
              <>
                <div className="export-modal-info-row">
                  <span className="export-modal-info-label">Paper Size</span>
                  <span className="export-modal-info-value">{paperSize === "letter" ? "US Letter" : "A4"}</span>
                </div>
                <div className="export-modal-info-row">
                  <span className="export-modal-info-label">Font</span>
                  <span className="export-modal-info-value">{fontFamily === "courier-prime" ? "Courier Prime" : "Courier Prime Sans"}</span>
                </div>
              </>
            )}
          </div>

          <div className="export-modal-option-group">
            <div className="export-modal-option-row">
              <div className="export-modal-option-label-wrapper">
                <span className="export-modal-option-label">Include Title Page</span>
                <span className="export-modal-option-desc">Export the title page if it is defined</span>
              </div>
              <input
                type="checkbox"
                className="export-modal-checkbox"
                checked={exportTitlePage}
                onChange={(e) => setExportTitlePage(e.target.checked)}
              />
            </div>

            {format === "pdf" && (
              <>
                <div className="export-modal-option-row">
                  <div className="export-modal-option-label-wrapper">
                    <span className="export-modal-option-label">Bold Scene Headings</span>
                    <span className="export-modal-option-desc">Make scene headings bold in the PDF</span>
                  </div>
                  <input
                    type="checkbox"
                    className="export-modal-checkbox"
                    checked={boldSceneHeadings}
                    onChange={(e) => setBoldSceneHeadings(e.target.checked)}
                  />
                </div>

                <div className="export-modal-option-row">
                  <div className="export-modal-option-label-wrapper">
                    <span className="export-modal-option-label">Scene Numbers</span>
                    <span className="export-modal-option-desc">Scene numbers positioning option</span>
                  </div>
                  <select
                    className="export-modal-select"
                    value={mirrorSceneNumbers}
                    onChange={(e) => setMirrorSceneNumbers(e.target.value)}
                  >
                    <option value="off">Disabled</option>
                    <option value="export_only">Right Side Only</option>
                    <option value="always">Mirror on Both Sides</option>
                  </select>
                </div>
              </>
            )}

            <div className="export-modal-option-row">
              <div className="export-modal-option-label-wrapper">
                <span className="export-modal-option-label">Include Sections</span>
                <span className="export-modal-option-desc">
                  {format === "pdf" ? "Render section headings (#) in export" : "Keep section lines (#) in the exported file"}
                </span>
              </div>
              <input
                type="checkbox"
                className="export-modal-checkbox"
                checked={exportSections}
                onChange={(e) => setExportSections(e.target.checked)}
              />
            </div>

            <div className="export-modal-option-row">
              <div className="export-modal-option-label-wrapper">
                <span className="export-modal-option-label">Include Synopsis</span>
                <span className="export-modal-option-desc">
                  {format === "pdf" ? "Render synopses (=) in export" : "Keep synopsis lines (=) in the exported file"}
                </span>
              </div>
              <input
                type="checkbox"
                className="export-modal-checkbox"
                checked={exportSynopses}
                onChange={(e) => setExportSynopses(e.target.checked)}
              />
            </div>
          </div>
        </div>

        <div className="export-modal-footer">
          <button className="export-modal-btn cancel" onClick={handleClose}>Cancel</button>
          <button className="export-modal-btn primary" onClick={handleExport}>
            Export to {format === "pdf" ? "PDF" : "Fountain"}
          </button>
        </div>
      </div>
    </div>
  );
};
