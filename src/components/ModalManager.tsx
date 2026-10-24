import React, { lazy, Suspense, useState } from 'react';
const ExportModal = lazy(() => import('./ExportModal').then(module => ({ default: module.ExportModal })));
const StructureImportModal = lazy(() => import('./StructureImportModal').then(module => ({ default: module.StructureImportModal })));
import { CommandPalette } from './CommandPalette';
const TitlePageEditorModal = lazy(() => import('./TitlePageEditorModal').then(module => ({ default: module.TitlePageEditorModal })));
const AboutModal = lazy(() => import('./AboutModal').then(module => ({ default: module.AboutModal })));
const BugReportModal = lazy(() => import('./BugReportModal').then(module => ({ default: module.BugReportModal })));
const QuickGuideModal = lazy(() => import('./QuickGuideModal').then(module => ({ default: module.QuickGuideModal })));
const FixFormattingModal = lazy(() => import('./FixFormattingModal').then(module => ({ default: module.FixFormattingModal })));
import { ErrorBoundary } from './ErrorBoundary';
import { TranslateDocumentModal } from './TranslateDocumentModal';
import { SceneJumpPalette } from './SceneJumpPalette';
import { flushPendingEditorEdits } from '../editor/pendingEdits';
import type { FixFormattingReport } from '../utils/fixFormatting';

export interface ModalManagerProps {
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  isSceneJumpOpen?: boolean;
  setIsSceneJumpOpen?: (open: boolean) => void;
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
  isSceneJumpOpen = false,
  setIsSceneJumpOpen,
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
    <Suspense fallback={null}>
      <ErrorBoundary name="command-palette">
        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onExportPDF={() => {
            flushPendingEditorEdits();
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
          onOpenSceneJump={setIsSceneJumpOpen ? () => setIsSceneJumpOpen(true) : undefined}
          onFixFormattingResult={(report) => setFixFormattingReport(report)}
        />
      </ErrorBoundary>
      <ErrorBoundary name="scene-jump-palette">
        {isSceneJumpOpen && setIsSceneJumpOpen && (
          <SceneJumpPalette
            isOpen={isSceneJumpOpen}
            onClose={() => setIsSceneJumpOpen(false)}
          />
        )}
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
    </Suspense>
  );
};
