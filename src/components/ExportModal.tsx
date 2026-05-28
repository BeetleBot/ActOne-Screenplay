import React, { useState } from "react";
import { FileText, X } from "lucide-react";
import { useScreenplay } from "../context/ScreenplayContext";
import { invoke } from "@tauri-apps/api/core";

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const { rawText, fontFamily, paperSize } = useScreenplay();

  const [boldSceneHeadings, setBoldSceneHeadings] = useState(false);
  const [mirrorSceneNumbers, setMirrorSceneNumbers] = useState("off");
  const [exportSections, setExportSections] = useState(false);
  const [exportSynopses, setExportSynopses] = useState(false);
  const [exportTitlePage, setExportTitlePage] = useState(true);

  const handleExport = async () => {
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
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <div className="export-modal-title">
            <FileText size={20} strokeWidth={1.5} />
            <span>Export PDF</span>
          </div>
          <button className="export-modal-close" onClick={onClose}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="export-modal-body">
          <div className="export-modal-preview">
            <div className="export-modal-preview-page">
              <div className="export-modal-preview-line wide" />
              <div className="export-modal-preview-line medium" />
              <div className="export-modal-preview-line wide" />
              <div className="export-modal-preview-line narrow" />
              <div className="export-modal-preview-line medium" />
            </div>
          </div>

          <div className="export-modal-info">
            <div className="export-modal-info-row">
              <span className="export-modal-info-label">Format</span>
              <span className="export-modal-info-value">PDF</span>
            </div>
            <div className="export-modal-info-row">
              <span className="export-modal-info-label">Paper Size</span>
              <span className="export-modal-info-value">{paperSize === "letter" ? "US Letter" : "A4"}</span>
            </div>
            <div className="export-modal-info-row">
              <span className="export-modal-info-label">Font</span>
              <span className="export-modal-info-value">{fontFamily === "courier-prime" ? "Courier Prime" : "Courier Prime Sans"}</span>
            </div>
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

            <div className="export-modal-option-row">
              <div className="export-modal-option-label-wrapper">
                <span className="export-modal-option-label">Include Sections</span>
                <span className="export-modal-option-desc">Render section headings (#) in export</span>
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
                <span className="export-modal-option-desc">Render synopses (=) in export</span>
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
          <button className="export-modal-btn cancel" onClick={onClose}>Cancel</button>
          <button className="export-modal-btn primary" onClick={handleExport}>Export to PDF</button>
        </div>
      </div>
    </div>
  );
};
