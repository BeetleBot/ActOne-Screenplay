import React from "react";
import Box from "@mui/material/Box";
import { useUI } from "../../context";
import { HeaderBar } from "./HeaderBar";
import { ActivityBar } from "./ActivityBar";
import { Workspace } from "./Workspace";
import { StatusBar } from "./StatusBar";
import { ErrorBoundary } from "../ErrorBoundary";

export interface MainLayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenSettingsModal: () => void;
  onOpenPalette: () => void;
  onOpenThemeManagerModal?: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  isSidebarOpen, setIsSidebarOpen, onOpenSettingsModal, onOpenPalette,
  onOpenThemeManagerModal,
}) => {
  const { activeTab, setActiveTab } = useUI();

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%', flex: 1, overflow: 'hidden' }}>
      <ErrorBoundary name="activity">
        <ActivityBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onOpenSettingsModal={onOpenSettingsModal}
          onOpenThemeManagerModal={onOpenThemeManagerModal}
          onOpenPalette={onOpenPalette}
        />
      </ErrorBoundary>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <ErrorBoundary name="header"><HeaderBar /></ErrorBoundary>
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Workspace
            isSidebarOpen={isSidebarOpen}
          />
        </Box>
        <ErrorBoundary name="status"><StatusBar /></ErrorBoundary>
      </Box>
    </Box>
  );
};
