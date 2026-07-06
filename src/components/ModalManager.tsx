import React from 'react';
import { ExportModal } from './ExportModal';
import { StructureImportModal } from './StructureImportModal';
import { CommandPalette } from './CommandPalette';
import { TitlePageEditorModal } from './TitlePageEditorModal';
import { ErrorBoundary } from './ErrorBoundary';

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
  openSettingsWindow?: () => void;
  openHelpWindow?: () => void;
  openTagManagerWindow?: () => void;
  openThemeManagerWindow?: () => void;
  openXrayWindow?: () => void;
  onOpenTutorialDialog?: () => void;
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
  openTagManagerWindow,
  openThemeManagerWindow,
  openXrayWindow,
  onOpenTutorialDialog,
}) => {
  return (
    <>
      <ErrorBoundary name="command-palette">
        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onExportPDF={() => setShowExportModal(true)}
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          onOpenStructureModal={() => setShowStructureModal(true)}
          onOpenSettingsModal={openSettingsWindow || (() => {})}
          onOpenTitlePageModal={() => setShowTitlePageModal(true)}
          onOpenHelpModal={openHelpWindow || (() => {})}
          onOpenBreakdownModal={openTagManagerWindow || (() => {})}
          onOpenThemeManagerModal={openThemeManagerWindow || (() => {})}
          onOpenXrayModal={openXrayWindow || (() => {})}
          onOpenTutorialDialog={onOpenTutorialDialog}
          onToggleSnapshotsPanel={toggleSnapshotsPanel}
        />
      </ErrorBoundary>
      <ErrorBoundary name="export-modal">{showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="structure-modal">{showStructureModal && <StructureImportModal onClose={() => setShowStructureModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="titlepage-modal">{showTitlePageModal && <TitlePageEditorModal onClose={() => setShowTitlePageModal(false)} />}</ErrorBoundary>
    </>
  );
};
