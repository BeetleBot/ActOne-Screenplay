import React, { useEffect } from "react";
import { useUI } from "../../context";
import { getTauriWindow } from "../../utils";
import { HeaderBar } from "./HeaderBar";
import { Workspace } from "./Workspace";
import { StatusBar } from "./StatusBar";

export interface MainLayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenSettingsModal: () => void;
  onOpenPalette: () => void;
  onOpenBreakdownModal: () => void;
  onOpenThemeManagerModal: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  isSidebarOpen, setIsSidebarOpen, onOpenSettingsModal, onOpenPalette,
  onOpenBreakdownModal, onOpenThemeManagerModal,
}) => {
  const { isZenMode } = useUI();

  useEffect(() => {
    const toggleFullscreen = async () => {
      try { const win = getTauriWindow(); if (win) await win.setFullscreen(isZenMode); } catch {}
    };
    toggleFullscreen();
  }, [isZenMode]);

  return (
    <>
      {!isZenMode && <HeaderBar />}
      <Workspace
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenPalette={onOpenPalette}
        onOpenBreakdownModal={onOpenBreakdownModal}
        onOpenThemeManagerModal={onOpenThemeManagerModal}
      />
      <StatusBar />
    </>
  );
};
