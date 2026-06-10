import React from 'react';
import { ExportModal } from './ExportModal';
import { StructureImportModal } from './StructureImportModal';
import { SettingsModal } from './SettingsModal';
import { CommandPalette } from './CommandPalette';
import { RevisionModal } from './RevisionModal';
import { TitlePageEditorModal } from './TitlePageEditorModal';
import { HelpModal } from './HelpModal';
import { TagManagerView } from './TagManagerView';

export interface ModalManagerProps {
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (open: boolean) => void;
  showStructureModal: boolean;
  setShowStructureModal: (open: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (open: boolean) => void;
  showRevisionModal: boolean;
  setShowRevisionModal: (open: boolean) => void;
  showTitlePageModal: boolean;
  setShowTitlePageModal: (open: boolean) => void;
  showHelpModal: boolean;
  setShowHelpModal: (open: boolean) => void;
  showBreakdownModal: boolean;
  setShowBreakdownModal: (open: boolean) => void;
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
  showRevisionModal,
  setShowRevisionModal,
  showTitlePageModal,
  setShowTitlePageModal,
  showHelpModal,
  setShowHelpModal,
  showBreakdownModal,
  setShowBreakdownModal,
  isSidebarOpen,
  toggleSidebar,
}) => {
  return (
    <>
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onExportPDF={() => setShowExportModal(true)}
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onOpenStructureModal={() => setShowStructureModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        onOpenRevisionModal={() => setShowRevisionModal(true)}
        onOpenTitlePageModal={() => setShowTitlePageModal(true)}
        onOpenHelpModal={() => setShowHelpModal(true)}
        onOpenBreakdownModal={() => setShowBreakdownModal(true)}
      />
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
      {showStructureModal && <StructureImportModal onClose={() => setShowStructureModal(false)} />}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
      {showRevisionModal && <RevisionModal onClose={() => setShowRevisionModal(false)} />}
      {showTitlePageModal && <TitlePageEditorModal onClose={() => setShowTitlePageModal(false)} />}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      {showBreakdownModal && <TagManagerView onClose={() => setShowBreakdownModal(false)} />}
    </>
  );
};

