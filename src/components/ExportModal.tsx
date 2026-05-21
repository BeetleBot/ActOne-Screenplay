import React from "react";
import { FileText, X } from "lucide-react";
import { useScreenplay } from "../context/ScreenplayContext";
import { exportToPDF } from "../utils/PDFExporter";

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const { parsedDoc, fontFamily, paperSize } = useScreenplay();

  const handleExport = async () => {
    try {
      await exportToPDF(parsedDoc, fontFamily, paperSize);
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
        </div>

        <div className="export-modal-footer">
          <button className="export-modal-btn cancel" onClick={onClose}>Cancel</button>
          <button className="export-modal-btn primary" onClick={handleExport}>Export to PDF</button>
        </div>
      </div>
    </div>
  );
};
