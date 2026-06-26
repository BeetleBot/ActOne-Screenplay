import React from 'react';
import { ExportModal } from './ExportModal';
import { StructureImportModal } from './StructureImportModal';
import { SettingsModal } from './SettingsModal';
import { CommandPalette } from './CommandPalette';
import { TitlePageEditorModal } from './TitlePageEditorModal';
import { HelpModal } from './HelpModal';
import { TagManager } from './TagManager';
import { ThemeManagerModal } from './ThemeManagerModal';
import { ErrorBoundary } from './ErrorBoundary';

export interface ModalManagerProps {
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (open: boolean) => void;
  showStructureModal: boolean;
  setShowStructureModal: (open: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (open: boolean) => void;
  showTitlePageModal: boolean;
  setShowTitlePageModal: (open: boolean) => void;
  showHelpModal: boolean;
  setShowHelpModal: (open: boolean) => void;
  showBreakdownModal: boolean;
  setShowBreakdownModal: (open: boolean) => void;
  showThemeManagerModal: boolean;
  setShowThemeManagerModal: (open: boolean) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  isPaletteOpen,
  setIsPaletteOpen,
  showExportModal,
  setShowExportModal,
  showStructureModal,
  setShowStructureModal,
  showSettingsModal,
  setShowSettingsModal,
  showTitlePageModal,
  setShowTitlePageModal,
  showHelpModal,
  setShowHelpModal,
  showBreakdownModal,
  setShowBreakdownModal,
  showThemeManagerModal,
  setShowThemeManagerModal,
  isSidebarOpen,
  toggleSidebar,
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
          onOpenSettingsModal={() => setShowSettingsModal(true)}
          onOpenTitlePageModal={() => setShowTitlePageModal(true)}
          onOpenHelpModal={() => setShowHelpModal(true)}
          onOpenBreakdownModal={() => setShowBreakdownModal(true)}
          onOpenThemeManagerModal={() => setShowThemeManagerModal(true)}
        />
      </ErrorBoundary>
      <ErrorBoundary name="export-modal">{showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="structure-modal">{showStructureModal && <StructureImportModal onClose={() => setShowStructureModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="settings-modal">{showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="titlepage-modal">{showTitlePageModal && <TitlePageEditorModal onClose={() => setShowTitlePageModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="help-modal">{showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="tag-manager">{showBreakdownModal && <TagManager onClose={() => setShowBreakdownModal(false)} />}</ErrorBoundary>
      <ErrorBoundary name="theme-modal">{showThemeManagerModal && <ThemeManagerModal onClose={() => setShowThemeManagerModal(false)} />}</ErrorBoundary>
    </>
  );
};

