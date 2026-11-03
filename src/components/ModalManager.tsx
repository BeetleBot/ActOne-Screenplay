import React, { lazy, Suspense, useState, useEffect } from 'react';
const ExportPdfWindow = lazy(() => import('./ExportPdfWindow').then(module => ({ default: module.ExportPdfWindow })));
const ExportScriptWindow = lazy(() => import('./ExportScriptWindow').then(module => ({ default: module.ExportScriptWindow })));
const StructureImportModal = lazy(() => import('./StructureImportModal').then(module => ({ default: module.StructureImportModal })));
import { CommandPalette } from './CommandPalette';
const TitlePageEditorModal = lazy(() => import('./TitlePageEditorModal').then(module => ({ default: module.TitlePageEditorModal })));
const AboutModal = lazy(() => import('./AboutModal').then(module => ({ default: module.AboutModal })));
const BugReportModal = lazy(() => import('./BugReportModal').then(module => ({ default: module.BugReportModal })));
const QuickGuideModal = lazy(() => import('./QuickGuideModal').then(module => ({ default: module.QuickGuideModal })));
const FixFormattingModal = lazy(() => import('./FixFormattingModal').then(module => ({ default: module.FixFormattingModal })));
import { ErrorBoundary } from './ErrorBoundary';
import { TranslateDocumentModal } from './TranslateDocumentModal';
import { flushPendingEditorEdits } from '../editor/pendingEdits';
import { Alert } from '@mui/material';
import { useFile, useUI } from '../context';
import { openExportPdfWindow, openExportScriptWindow } from '../utils/exportWindow';
import type { FixFormattingReport } from '../utils/fixFormatting';

export interface ModalManagerProps {
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  showExportWindow: boolean;
  setShowExportWindow: (open: boolean) => void;
  showExportScriptWindow?: boolean;
  setShowExportScriptWindow?: (open: boolean) => void;
  showStructureModal: boolean;
  setShowStructureModal: (open: boolean) => void;
  showTitlePageModal: boolean;
  setShowTitlePageModal: (open: boolean) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  toggleSnapshotsPanel?: () => void;
  openSettingsWindow?: (tab?: string) => void;
  openHelpWindow?: () => void;
  openThemeManagerWindow?: () => void;
  openXrayWindow?: () => void;
  openTutorialsWindow?: () => void;
  showAboutModal?: boolean;
  setShowAboutModal?: (open: boolean) => void;
  showBugReportModal?: boolean;
  setShowBugReportModal?: (open: boolean) => void;
  showShortcutsModal?: boolean;
  setShowShortcutsModal?: (open: boolean) => void;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  isPaletteOpen,
  setIsPaletteOpen,
  showExportWindow,
  setShowExportWindow,
  showExportScriptWindow = false,
  setShowExportScriptWindow,
  showStructureModal,
  setShowStructureModal,
  showTitlePageModal,
  setShowTitlePageModal,
  isSidebarOpen,
  toggleSidebar,
  toggleSnapshotsPanel,
  openSettingsWindow,
  openHelpWindow,
  openThemeManagerWindow,
  openXrayWindow,
  openTutorialsWindow,
  showAboutModal: externalShowAbout,
  setShowAboutModal: externalSetShowAbout,
  showBugReportModal: externalShowBugReport,
  setShowBugReportModal: externalSetShowBugReport,
  showShortcutsModal = false,
  setShowShortcutsModal,
}) => {
  const exportFile = useFile();
  const exportUI = useUI();
  const [exportWindowError, setExportWindowError] = useState("");
  const [exportScriptWindowError, setExportScriptWindowError] = useState("");

  useEffect(() => {
    if (!showExportWindow || !(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) return;
    setExportWindowError("");
    void openExportPdfWindow({
      file: { rawText: exportFile.rawText, isBundle: exportFile.isBundle, activeScriptName: exportFile.activeScriptName, filePath: exportFile.filePath, parsedDoc: exportFile.parsedDoc, scripts: exportFile.scripts, activeScriptIndex: exportFile.activeScriptIndex },
      ui: { fontFamily: exportUI.fontFamily, paperSize: exportUI.paperSize },
    }).then(() => setShowExportWindow(false)).catch(error => setExportWindowError(String(error)));
  }, [showExportWindow]);

  useEffect(() => {
    if (!showExportScriptWindow || !(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) return;
    setExportScriptWindowError("");
    void openExportScriptWindow({
      file: { rawText: exportFile.rawText, isBundle: exportFile.isBundle, activeScriptName: exportFile.activeScriptName, filePath: exportFile.filePath, parsedDoc: exportFile.parsedDoc, scripts: exportFile.scripts, activeScriptIndex: exportFile.activeScriptIndex },
      ui: { fontFamily: exportUI.fontFamily, paperSize: exportUI.paperSize },
    }).then(() => setShowExportScriptWindow?.(false)).catch(error => setExportScriptWindowError(String(error)));
  }, [showExportScriptWindow]);

  const [localShowAbout, setLocalShowAbout] = useState(false);
  const showAbout = externalShowAbout !== undefined ? externalShowAbout : localShowAbout;
  const setShowAbout = externalSetShowAbout || setLocalShowAbout;

  const [localShowBugReport, setLocalShowBugReport] = useState(false);
  const showBugReport = externalShowBugReport !== undefined ? externalShowBugReport : localShowBugReport;
  const setShowBugReport = externalSetShowBugReport || setLocalShowBugReport;

  const [fixFormattingReport, setFixFormattingReport] = useState<FixFormattingReport | null>(null);

  return (
    <>
      <ErrorBoundary name="command-palette">
        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onExportPDF={() => {
            flushPendingEditorEdits();
            setShowExportWindow(true);
          }}
          onExportScript={() => {
            flushPendingEditorEdits();
            setShowExportScriptWindow?.(true);
          }}
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          onOpenStructureModal={() => setShowStructureModal(true)}
          onOpenSettingsModal={openSettingsWindow || (() => {})}
          onOpenTitlePageModal={() => setShowTitlePageModal(true)}
          onOpenHelpModal={openHelpWindow || (() => {})}
          onOpenThemeManagerModal={openThemeManagerWindow || (() => {})}
          onOpenXrayModal={openXrayWindow || (() => {})}
          openTutorialsWindow={openTutorialsWindow}
          onToggleSnapshotsPanel={toggleSnapshotsPanel}
          onOpenUrAISettings={() => openSettingsWindow?.("urai")}
          onOpenAboutModal={() => setShowAbout(true)}
          onOpenBugReportModal={() => setShowBugReport(true)}
          onFixFormattingResult={(report) => setFixFormattingReport(report)}
        />
      </ErrorBoundary>
      {exportWindowError && <Alert severity="error" onClose={() => { setExportWindowError(""); setShowExportWindow(false); }}>Could not open the PDF export window: {exportWindowError}</Alert>}
      {exportScriptWindowError && <Alert severity="error" onClose={() => { setExportScriptWindowError(""); setShowExportScriptWindow?.(false); }}>Could not open the script export window: {exportScriptWindowError}</Alert>}
      <ErrorBoundary name="export-pdf-window">{showExportWindow && (!(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) && <Suspense fallback={null}><ExportPdfWindow onClose={() => setShowExportWindow(false)} /></Suspense>}</ErrorBoundary>
      <ErrorBoundary name="export-script-window">{showExportScriptWindow && (!(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) && <Suspense fallback={null}><ExportScriptWindow onClose={() => setShowExportScriptWindow?.(false)} /></Suspense>}</ErrorBoundary>
      <ErrorBoundary name="structure-modal">{showStructureModal && <Suspense fallback={null}><StructureImportModal onClose={() => setShowStructureModal(false)} /></Suspense>}</ErrorBoundary>
      <ErrorBoundary name="titlepage-modal">{showTitlePageModal && <Suspense fallback={null}><TitlePageEditorModal onClose={() => setShowTitlePageModal(false)} /></Suspense>}</ErrorBoundary>
      <ErrorBoundary name="about-modal">{showAbout && <Suspense fallback={null}><AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} /></Suspense>}</ErrorBoundary>
      <ErrorBoundary name="bug-report-modal">{showBugReport && <Suspense fallback={null}><BugReportModal isOpen={showBugReport} onClose={() => setShowBugReport(false)} /></Suspense>}</ErrorBoundary>
      <ErrorBoundary name="quickguide-modal">
        {showShortcutsModal && setShowShortcutsModal && (
          <Suspense fallback={null}><QuickGuideModal
            isOpen={showShortcutsModal}
            onClose={() => setShowShortcutsModal(false)}
            openHelpWindow={openHelpWindow}
          /></Suspense>
        )}
      </ErrorBoundary>
      <ErrorBoundary name="fix-formatting-modal">
        {fixFormattingReport && (
          <Suspense fallback={null}><FixFormattingModal
            isOpen={Boolean(fixFormattingReport)}
            onClose={() => setFixFormattingReport(null)}
            report={fixFormattingReport}
          /></Suspense>
        )}
      </ErrorBoundary>
      <ErrorBoundary name="translation-progress-modal">
        <TranslateDocumentModal />
      </ErrorBoundary>
    </>
  );
};
