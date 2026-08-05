import { useState, useMemo, useCallback, useEffect, useRef } from "react";

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

  const savedScrollTopRef = useRef<number | null>(null);

  useEffect(() => {
    const el = document.querySelector('.editor-scroll-area') as HTMLElement | null;
    if (!el) return;

    if (isModalActive) {
      if (savedScrollTopRef.current === null) {
        savedScrollTopRef.current = el.scrollTop;
      }
    } else if (savedScrollTopRef.current !== null) {
      const targetScroll = savedScrollTopRef.current;
      savedScrollTopRef.current = null;
      el.scrollTop = targetScroll;
      requestAnimationFrame(() => {
        el.scrollTop = targetScroll;
      });
    }
  }, [isModalActive]);

  const togglePalette = useCallback(() => setIsPaletteOpen(p => !p), []);

  const state: ModalState = useMemo(() => ({
    isPaletteOpen, showExportModal, showStructureModal, showTitlePageModal
  }), [isPaletteOpen, showExportModal, showStructureModal, showTitlePageModal]);

  const actions: ModalActions = {
    setIsPaletteOpen, setShowExportModal, setShowStructureModal, setShowTitlePageModal
  };

  return { ...state, ...actions, isModalActive, togglePalette };
}
