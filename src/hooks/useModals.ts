import { useState, useMemo, useCallback } from "react";

export interface ModalState {
  isPaletteOpen: boolean;
  showExportModal: boolean;
  showStructureModal: boolean;
  showSettingsModal: boolean;
  showRevisionModal: boolean;
  showTitlePageModal: boolean;
  showHelpModal: boolean;
  showBreakdownModal: boolean;
  showThemeManagerModal: boolean;
}

export interface ModalActions {
  setIsPaletteOpen: (v: boolean) => void;
  setShowExportModal: (v: boolean) => void;
  setShowStructureModal: (v: boolean) => void;
  setShowSettingsModal: (v: boolean) => void;
  setShowRevisionModal: (v: boolean) => void;
  setShowTitlePageModal: (v: boolean) => void;
  setShowHelpModal: (v: boolean) => void;
  setShowBreakdownModal: (v: boolean) => void;
  setShowThemeManagerModal: (v: boolean) => void;
}

export function useModals() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showTitlePageModal, setShowTitlePageModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showThemeManagerModal, setShowThemeManagerModal] = useState(false);

  const isModalActive = useMemo(
    () => isPaletteOpen || showExportModal || showStructureModal || showSettingsModal ||
         showRevisionModal || showTitlePageModal || showHelpModal || showBreakdownModal ||
         showThemeManagerModal,
    [isPaletteOpen, showExportModal, showStructureModal, showSettingsModal,
     showRevisionModal, showTitlePageModal, showHelpModal, showBreakdownModal,
     showThemeManagerModal]
  );

  const togglePalette = useCallback(() => setIsPaletteOpen(p => !p), []);

  const state: ModalState = useMemo(() => ({
    isPaletteOpen, showExportModal, showStructureModal, showSettingsModal,
    showRevisionModal, showTitlePageModal, showHelpModal, showBreakdownModal,
    showThemeManagerModal
  }), [isPaletteOpen, showExportModal, showStructureModal, showSettingsModal,
      showRevisionModal, showTitlePageModal, showHelpModal, showBreakdownModal,
      showThemeManagerModal]);

  const actions: ModalActions = {
    setIsPaletteOpen, setShowExportModal, setShowStructureModal, setShowSettingsModal,
    setShowRevisionModal, setShowTitlePageModal, setShowHelpModal, setShowBreakdownModal,
    setShowThemeManagerModal
  };

  return { ...state, ...actions, isModalActive, togglePalette };
}
