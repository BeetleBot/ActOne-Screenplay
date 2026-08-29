import React, { useState } from 'react';
import { ExportModal } from './ExportModal';
import { StructureImportModal } from './StructureImportModal';
import { CommandPalette } from './CommandPalette';
import { TitlePageEditorModal } from './TitlePageEditorModal';
import { AboutModal } from './AboutModal';
import { BugReportModal } from './BugReportModal';
import { QuickGuideModal } from './QuickGuideModal';
import { FixFormattingModal } from './FixFormattingModal';
import { ErrorBoundary } from './ErrorBoundary';
import { TranslateDocumentModal } from './TranslateDocumentModal';
import type { FixFormattingReport } from '../utils/fixFormatting';

export interface ModalManagerProps {
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (open: boolean) => void;
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
  showExportModal,
  setShowExportModal,
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
            setShowExportModal(true);
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
          onOpenMuseSettings={() => openSettingsWindow?.("muse")}
          onOpenAboutModal={() => setShowAbout(true)}
          onOpenBugReportModal={() => setShowBugReport(true)}
          onFixFormattingResult={(report) => setFixFormattingReport(report)}
        />
      </ErrorBoundary>
      <ErrorBoundary name="export-modal">{showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="structure-modal">{showStructureModal && <StructureImportModal onClose={() => setShowStructureModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="titlepage-modal">{showTitlePageModal && <TitlePageEditorModal onClose={() => setShowTitlePageModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="about-modal">{showAbout && <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />}</ErrorBoundary>
      <ErrorBoundary name="bug-report-modal">{showBugReport && <BugReportModal isOpen={showBugReport} onClose={() => setShowBugReport(false)} />}</ErrorBoundary>
      <ErrorBoundary name="quickguide-modal">
        {showShortcutsModal && setShowShortcutsModal && (
          <QuickGuideModal
            isOpen={showShortcutsModal}
            onClose={() => setShowShortcutsModal(false)}
            openHelpWindow={openHelpWindow}
          />
        )}
      </ErrorBoundary>
      <ErrorBoundary name="fix-formatting-modal">
        {fixFormattingReport && (
          <FixFormattingModal
            isOpen={Boolean(fixFormattingReport)}
            onClose={() => setFixFormattingReport(null)}
            report={fixFormattingReport}
          />
        )}
      </ErrorBoundary>
      <ErrorBoundary name="translation-progress-modal">
        <TranslateDocumentModal />
      </ErrorBoundary>
    </>
  );
};
