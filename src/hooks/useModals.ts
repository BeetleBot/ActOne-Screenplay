import { useState, useMemo, useCallback } from "react";

export interface ModalState {
  isPaletteOpen: boolean;
  showExportModal: boolean;
  showStructureModal: boolean;
  showSettingsModal: boolean;
  showTitlePageModal: boolean;
  showHelpModal: boolean;
  showBreakdownModal: boolean;
  showThemeManagerModal: boolean;
  showXrayModal: boolean;
}

export interface ModalActions {
  setIsPaletteOpen: (v: boolean) => void;
  setShowExportModal: (v: boolean) => void;
  setShowStructureModal: (v: boolean) => void;
  setShowSettingsModal: (v: boolean) => void;
  setShowTitlePageModal: (v: boolean) => void;
  setShowHelpModal: (v: boolean) => void;
  setShowBreakdownModal: (v: boolean) => void;
  setShowThemeManagerModal: (v: boolean) => void;
  setShowXrayModal: (v: boolean) => void;
}

export function useModals() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTitlePageModal, setShowTitlePageModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showThemeManagerModal, setShowThemeManagerModal] = useState(false);
  const [showXrayModal, setShowXrayModal] = useState(false);

  const isModalActive = useMemo(
    () => isPaletteOpen || showExportModal || showStructureModal || showSettingsModal ||
         showTitlePageModal || showHelpModal || showBreakdownModal ||
         showThemeManagerModal || showXrayModal,
    [isPaletteOpen, showExportModal, showStructureModal, showSettingsModal,
     showTitlePageModal, showHelpModal, showBreakdownModal,
     showThemeManagerModal, showXrayModal]
  );

  const togglePalette = useCallback(() => setIsPaletteOpen(p => !p), []);

  const state: ModalState = useMemo(() => ({
    isPaletteOpen, showExportModal, showStructureModal, showSettingsModal,
    showTitlePageModal, showHelpModal, showBreakdownModal,
    showThemeManagerModal, showXrayModal
  }), [isPaletteOpen, showExportModal, showStructureModal, showSettingsModal,
      showTitlePageModal, showHelpModal, showBreakdownModal,
      showThemeManagerModal, showXrayModal]);

  const actions: ModalActions = {
    setIsPaletteOpen, setShowExportModal, setShowStructureModal, setShowSettingsModal,
    setShowTitlePageModal, setShowHelpModal, setShowBreakdownModal,
    setShowThemeManagerModal, setShowXrayModal
  };

  return { ...state, ...actions, isModalActive, togglePalette };
}
