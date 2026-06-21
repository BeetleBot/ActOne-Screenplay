import React from "react";
import Box from "@mui/material/Box";
import { useUI } from "../../context";
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
  const { activeTab, setActiveTab } = useUI();

  return (
    <>
      <HeaderBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <Workspace
            isSidebarOpen={isSidebarOpen}
          />
          <StatusBar />
        </Box>
      </Box>
    </>
  );
};
