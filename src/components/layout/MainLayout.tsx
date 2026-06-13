import React, { useEffect } from "react";
import Box from "@mui/material/Box";
import { useUI } from "../../context";
import { getTauriWindow } from "../../utils";
import { HeaderBar } from "./HeaderBar";
import { ActivityBar } from "./ActivityBar";
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
  const { isZenMode, activeTab, setActiveTab } = useUI();

  useEffect(() => {
    const toggleFullscreen = async () => {
      try { const win = getTauriWindow(); if (win) await win.setFullscreen(isZenMode); } catch (e) { console.error(e); }
    };
    toggleFullscreen();
  }, [isZenMode]);

  return (
    <>
      {!isZenMode && <HeaderBar />}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!isZenMode && (
          <ActivityBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            onOpenSettingsModal={onOpenSettingsModal}
            onOpenPalette={onOpenPalette}
            onOpenBreakdownModal={onOpenBreakdownModal}
            onOpenThemeManagerModal={onOpenThemeManagerModal}
          />
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <Workspace
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
          <StatusBar />
        </Box>
      </Box>
    </>
  );
};
