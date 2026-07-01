import { useState, useMemo, useCallback } from "react";

export interface ModalState {
  isPaletteOpen: boolean;
  showExportModal: boolean;
  showStructureModal: boolean;
  showTitlePageModal: boolean;
}

export interface ModalActions {
  setIsPaletteOpen: (v: boolean) => void;
  setShowExportModal: (v: boolean) => void;
  setShowStructureModal: (v: boolean) => void;
  setShowTitlePageModal: (v: boolean) => void;
}

export function useModals() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showTitlePageModal, setShowTitlePageModal] = useState(false);

  const isModalActive = useMemo(
    () => isPaletteOpen || showExportModal || showStructureModal || showTitlePageModal,
    [isPaletteOpen, showExportModal, showStructureModal, showTitlePageModal]
  );

  const togglePalette = useCallback(() => setIsPaletteOpen(p => !p), []);

  const state: ModalState = useMemo(() => ({
    isPaletteOpen, showExportModal, showStructureModal, showTitlePageModal
  }), [isPaletteOpen, showExportModal, showStructureModal, showTitlePageModal]);

  const actions: ModalActions = {
    setIsPaletteOpen, setShowExportModal, setShowStructureModal, setShowTitlePageModal
  };

  return { ...state, ...actions, isModalActive, togglePalette };
}
