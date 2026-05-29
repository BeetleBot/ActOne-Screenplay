import React from 'react';
import { ExportModal } from './ExportModal';
import { StructureImportModal } from './StructureImportModal';
import { ThemeSelectorModal } from './ThemeSelectorModal';
import { SettingsModal } from './SettingsModal';
import { CommandPalette } from './CommandPalette';
import { WelcomeModal } from './WelcomeModal';

export interface ModalManagerProps {
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (open: boolean) => void;
  showStructureModal: boolean;
  setShowStructureModal: (open: boolean) => void;
  showThemeModal: boolean;
  setShowThemeModal: (open: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (open: boolean) => void;
  showWelcome: boolean;
  setShowWelcome: (open: boolean) => void;
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
  showThemeModal,
  setShowThemeModal,
  showSettingsModal,
  setShowSettingsModal,
  showWelcome,
  setShowWelcome,
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
        onOpenThemeModal={() => setShowThemeModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        onOpenWelcome={() => setShowWelcome(true)}
      />
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
      {showStructureModal && <StructureImportModal onClose={() => setShowStructureModal(false)} />}
      {showThemeModal && <ThemeSelectorModal onClose={() => setShowThemeModal(false)} />}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />
    </>
  );
};

