import React, { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useFile } from "../../context/FileContext";
import { useUI } from "../../context/UIContext";
import { useEditor } from "../../context/EditorContext";
import { FountainEditor } from "../FountainEditor";
import { SidebarViews } from "../SidebarViews";
import { SearchPanel } from "../SearchPanel";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import DescriptionIcon from "@mui/icons-material/Description";
import PersonIcon from "@mui/icons-material/Person";
import BarChartIcon from "@mui/icons-material/BarChart";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ArchiveIcon from "@mui/icons-material/Archive";
import TuneIcon from "@mui/icons-material/Tune";
import SearchIcon from "@mui/icons-material/Search";
import RemoveIcon from "@mui/icons-material/Remove";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";

const getTauriWindow = () => {
  try {
    return getCurrentWindow();
  } catch (e) {
    return null;
  }
};

const HeaderBar: React.FC = () => {
  const { files, activeFileId, selectFile, newFile, closeFile, closeOthers, closeAll } = useFile();
  const [isMaximized, setIsMaximized] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; fileId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setMenuAnchor({ el: e.currentTarget as HTMLElement, fileId });
  };

  const handleCloseMenu = () => setMenuAnchor(null);

  useEffect(() => {
    const checkMaximized = async () => {
      const win = getTauriWindow();
      if (win) setIsMaximized(await win.isMaximized());
    };
    checkMaximized();

    let unlisten: any;
    const setupListener = async () => {
      const win = getTauriWindow();
      if (win) unlisten = await win.onResized(() => checkMaximized());
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  useEffect(() => {
    const activeTab = tabsContainerRef.current?.querySelector(".header-tab.active");
    if (activeTab) activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeFileId]);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const handleClose = () => { try { getTauriWindow()?.close(); } catch {} };
  const handleMinimize = () => { try { getTauriWindow()?.minimize(); } catch {} };
  const handleMaximize = async () => {
    try {
      const win = getTauriWindow();
      if (win) {
        if (await win.isMaximized()) { await win.unmaximize(); setIsMaximized(false); }
        else { await win.maximize(); setIsMaximized(true); }
      }
    } catch {}
  };

  const lastClickTimeRef = useRef<number>(0);
  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (target.tagName !== "BUTTON" && !target.closest("button") && target.tagName !== "INPUT" && !target.closest("input")) {
        const now = Date.now();
        if (now - lastClickTimeRef.current < 400) { handleMaximize(); lastClickTimeRef.current = 0; return; }
        lastClickTimeRef.current = now;
        try { const win = getTauriWindow(); if (win) await win.startDragging(); } catch {}
      }
    }
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const isRevisionMode = activeFile?.parsedDoc?.settings?.revisionModeEnabled;

  return (
    <AppBar
      position="static"
      elevation={0}
      onMouseDown={handleStartDrag}
      sx={{
        bgcolor: (theme) => theme.palette.mode === 'light' ? '#2c2c2c' : '#121212',
        color: 'white',
        borderBottom: 1,
        borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)',
        height: 38,
        minHeight: 38,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', height: 38, minHeight: 38, px: 0 }}>
        <Box ref={tabsContainerRef} className="header-tabs-container" sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden', px: 0, gap: 0 }}>
          {isRevisionMode && (
            <Chip
              label="Revision"
              size="small"
              color="error"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                borderRadius: 0,
                flexShrink: 0,
                mx: 1,
                borderColor: 'error.main',
                color: 'error.main'
              }}
            />
          )}
          {files.map((file) => {
            const display = file.filePath ? file.filePath.split(/[/\\]/).pop() : "Untitled";
            const isActive = file.id === activeFileId;
            return (
              <Box
                key={file.id}
                className={`header-tab ${isActive ? "active" : ""} ${file.isDirty ? "dirty" : ""}`}
                onClick={() => selectFile(file.id)}
                onContextMenu={(e) => handleContextMenu(e, file.id)}
                onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeFile(file.id); } }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.8,
                  px: 2, height: 38, borderRadius: 0,
                  cursor: 'pointer', flexShrink: 0, userSelect: 'none',
                  fontSize: 12, whiteSpace: 'nowrap',
                  bgcolor: isActive ? 'background.paper' : 'transparent',
                  color: isActive 
                    ? (theme) => theme.palette.text.primary 
                    : 'rgba(255, 255, 255, 0.6)',
                  borderRight: (theme) => isActive 
                    ? 'none' 
                    : `1px solid ${theme.palette.mode === 'light' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                  '&:hover': { 
                    bgcolor: isActive ? 'background.paper' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? undefined : 'white'
                  },
                  transition: 'all 0.1s ease',
                  position: 'relative',
                }}
              >
                <span className="tab-name" style={{ fontWeight: isActive ? 600 : 400 }}>{display}</span>
                {file.isDirty && (
                  <Box 
                    sx={{ 
                      width: 6, height: 6, borderRadius: '50%', 
                      bgcolor: isActive ? 'primary.main' : 'rgba(255, 255, 255, 0.3)', 
                      flexShrink: 0,
                      boxShadow: isActive ? '0 0 4px rgba(25, 118, 210, 0.4)' : 'none'
                    }} 
                  />
                )}
                <IconButton
                  size="small"
                  className="tab-close"
                  onClick={(e) => { e.stopPropagation(); closeFile(file.id); }}
                  sx={{ 
                    p: '2px', 
                    opacity: isActive ? 0.7 : 0, 
                    color: isActive ? 'inherit' : 'rgba(255,255,255,0.5)',
                    '&:hover': { 
                      opacity: 1,
                      bgcolor: isActive ? 'action.hover' : 'rgba(255,255,255,0.1)',
                      color: 'error.main'
                    }, 
                    ml: 0.5 
                  }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            );
          })}
          <Tooltip title="New File">
            <IconButton 
              size="small" 
              onClick={(e) => { e.stopPropagation(); newFile(); }} 
              sx={{ 
                p: '6px', 
                ml: 0.5,
                color: 'rgba(255, 255, 255, 0.6)',
                '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, px: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={handleMinimize} 
            title="Minimize" 
            sx={{ 
              p: '6px', borderRadius: 0, 
              color: 'rgba(255, 255, 255, 0.6)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' } 
            }}
          >
            <RemoveIcon sx={{ fontSize: 10, fontWeight: 700 }} />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={handleMaximize} 
            title={isMaximized ? "Restore" : "Maximize"} 
            sx={{ 
              p: '6px', borderRadius: 0, 
              color: 'rgba(255, 255, 255, 0.6)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' } 
            }}
          >
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 1H9V7" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1 3H7V9H1V3Z" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            ) : (
              <CropSquareIcon sx={{ fontSize: 8, fontWeight: 700 }} />
            )}
          </IconButton>
          <IconButton 
            size="small" 
            onClick={handleClose} 
            title="Close" 
            sx={{ 
              p: '6px', borderRadius: 0, 
              color: 'rgba(255, 255, 255, 0.6)',
              '&:hover': { bgcolor: '#e81123', color: 'white' } 
            }}
          >
            <CloseIcon sx={{ fontSize: 10, fontWeight: 700 }} />
          </IconButton>
        </Box>
      </Box>

      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 160 } } }}
      >
        <MenuItem onClick={() => { if (menuAnchor) { closeFile(menuAnchor.fileId); handleCloseMenu(); } }}>
          <ListItemText primary="Close" />
        </MenuItem>
        <MenuItem onClick={() => { if (menuAnchor) { closeOthers(menuAnchor.fileId); handleCloseMenu(); } }}>
          <ListItemText primary="Close Others" />
        </MenuItem>
        <MenuItem onClick={() => { closeAll(); handleCloseMenu(); }}>
          <ListItemText primary="Close All" />
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

import TimerIcon from "@mui/icons-material/Timer";

const ActivityBar: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenPalette: () => void;
}> = ({ activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, onOpenThemeModal, onOpenSettingsModal, onOpenPalette }) => {
  const {
    fontFamily, setFontFamily, paperSize, setPaperSize,
    typewriterMode, setTypewriterMode, zoomLevel, setZoomLevel,
    hideFountainMarkupEnabled, setHideFountainMarkupEnabled,
  } = useUI();
  const { filePath } = useFile();
  const supportsExtended = filePath === null || filePath.toLowerCase().endsWith(".actone");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (tab: string) => {
    if (isSidebarOpen && activeTab === tab) setIsSidebarOpen(false);
    else { setActiveTab(tab); setIsSidebarOpen(true); }
  };

  const allTabs = [
    { id: "outline", icon: <FormatListBulletedIcon sx={{ fontSize: 20 }} />, title: "Outline" },
    { id: "notepad", icon: <DescriptionIcon sx={{ fontSize: 20 }} />, title: "Notepad" },
    { id: "characters", icon: <PersonIcon sx={{ fontSize: 20 }} />, title: "Characters" },
    { id: "stats", icon: <BarChartIcon sx={{ fontSize: 20 }} />, title: "Statistics" },
    { id: "todo", icon: <AssignmentIcon sx={{ fontSize: 20 }} />, title: "Tasks" },
    { id: "sprint", icon: <TimerIcon sx={{ fontSize: 20 }} />, title: "Sprint" },
    { id: "parking", icon: <ArchiveIcon sx={{ fontSize: 20 }} />, title: "Parking" },
  ];
  const tabs = supportsExtended ? allTabs : allTabs.filter(t => t.id === "outline" || t.id === "stats");

  return (
    <Box
      sx={{
        width: 48, display: 'flex', flexDirection: 'column',
        alignItems: 'center', py: 0.5, gap: 0.25,
        bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, flex: 1 }}>
        {tabs.map((tab) => {
          const isActive = isSidebarOpen && activeTab === tab.id;
          return (
            <Tooltip key={tab.id} title={tab.title} placement="right">
              <IconButton
                onClick={() => handleClick(tab.id)}
                sx={{
                  p: 1, borderRadius: 0,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                  position: 'relative',
                  '&::before': isActive ? {
                    content: '""', position: 'absolute', left: -4,
                    top: '25%', bottom: '25%', width: 3,
                    borderRadius: 0, bgcolor: 'primary.main',
                  } : {},
                }}
              >
                {tab.icon}
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>

      <Divider sx={{ width: 28, my: 0.5 }} />

      <Tooltip title="Commands (Ctrl+K)" placement="right">
        <IconButton
          onClick={onOpenPalette}
          sx={{
            p: 1, borderRadius: 0,
            color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          }}
        >
          <SearchIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Quickies" placement="right">
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            p: 1, borderRadius: 0,
            color: anchorEl ? 'primary.main' : 'text.secondary',
            bgcolor: anchorEl ? 'action.selected' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <TuneIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 200, ml: 1 } } }}
      >
        <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>Editor Mode</Typography>
        <MenuItem onClick={() => setTypewriterMode(!typewriterMode)} dense>
          <ListItemText>Typewriter Mode</ListItemText>
          {typewriterMode && <ListItemIcon sx={{ minWidth: 'auto' }}><CheckIcon sx={{ fontSize: 14 }} /></ListItemIcon>}
        </MenuItem>
        <MenuItem onClick={() => setHideFountainMarkupEnabled(!hideFountainMarkupEnabled)} dense>
          <ListItemText>Hide Fountain Markup</ListItemText>
          {hideFountainMarkupEnabled && <ListItemIcon sx={{ minWidth: 'auto' }}><CheckIcon sx={{ fontSize: 14 }} /></ListItemIcon>}
        </MenuItem>

        <Divider />
        <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>Font Family</Typography>
        <MenuItem onClick={() => setFontFamily("courier-prime")} selected={fontFamily === "courier-prime"} dense>
          <ListItemText>Courier Prime</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setFontFamily("courier-prime-sans")} selected={fontFamily === "courier-prime-sans"} dense>
          <ListItemText>Courier Prime Sans</ListItemText>
        </MenuItem>

        <Divider />
        <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>Paper Size</Typography>
        <MenuItem onClick={() => setPaperSize("letter")} selected={paperSize === "letter"} dense>
          <ListItemText>US Letter</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setPaperSize("a4")} selected={paperSize === "a4"} dense>
          <ListItemText>A4</ListItemText>
        </MenuItem>

        <Divider />
        <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>Appearance</Typography>
        <MenuItem onClick={() => { setAnchorEl(null); onOpenThemeModal(); }} dense>
          <ListItemText>Theme</ListItemText>
        </MenuItem>

        <Divider />
        <MenuItem onClick={() => setZoomLevel(100)} dense>
          <ListItemText>Reset Zoom ({zoomLevel}%)</ListItemText>
        </MenuItem>

        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); onOpenSettingsModal(); }} dense>
          <ListItemText>Open Settings</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

const Workspace: React.FC<{
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenPalette: () => void;
}> = ({ isSidebarOpen, setIsSidebarOpen, onOpenThemeModal, onOpenSettingsModal, onOpenPalette }) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const { paperSize, activeTab, setActiveTab, zoomLevel, isZenMode } = useUI();
  const { editorView } = useEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const activeEl = document.activeElement;
        const isEditorFocused = activeEl && (activeEl.classList.contains("cm-content") || activeEl.closest(".cm-editor") !== null);
        if (!isEditorFocused) {
          const isModalOpen = document.querySelector(".MuiDialog-root") || document.querySelector(".cp-overlay");
          if (!isModalOpen) {
            e.preventDefault();
            if (activeEl instanceof HTMLElement) activeEl.blur();
            editorView?.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorView]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const activityBarWidth = 48;
      const newWidth = Math.max(200, Math.min(e.clientX - activityBarWidth, 800));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => { setIsDragging(false); document.body.style.cursor = 'default'; };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
  }, [isDragging]);

  return (
    <Box className="app-workspace" sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {!isZenMode && (
        <ActivityBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onOpenThemeModal={onOpenThemeModal}
          onOpenSettingsModal={onOpenSettingsModal}
          onOpenPalette={onOpenPalette}
        />
      )}

      {isSidebarOpen && !isZenMode && (
        <>
          <Paper
            className="sidebar"
            elevation={0}
            tabIndex={-1}
            square
            sx={{
              width: sidebarWidth, flexShrink: 0, outline: 'none',
              borderRight: 1, borderColor: 'divider', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
            onMouseDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "SELECT" &&
                  target.tagName !== "BUTTON" && !target.closest("button") && !target.closest("input") &&
                  !target.closest("textarea") && !target.closest("select") && target.contentEditable !== "true") {
                e.currentTarget.focus();
              }
            }}
          >
            <Box className="sidebar-content" sx={{ flex: 1, overflow: 'auto' }}>
              <SidebarViews activeTab={activeTab} />
            </Box>
          </Paper>
          <Box
            className="sidebar-resizer"
            onMouseDown={() => setIsDragging(true)}
            sx={{
              width: 4, cursor: 'col-resize', flexShrink: 0,
              '&:hover': { bgcolor: 'primary.main', opacity: 0.3 },
              transition: 'background-color 0.2s',
            }}
          />
        </>
      )}

      <Box className="editor-container" sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <SearchPanel />
        <Box className="editor-scroll-area" sx={{ flex: 1, overflow: 'auto' }}>
          <Box className={`editor-paper paper-${paperSize}`} sx={{ zoom: zoomLevel / 100 }}>
            <FountainEditor />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export interface MainLayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenPalette: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  isSidebarOpen, setIsSidebarOpen, onOpenThemeModal, onOpenSettingsModal, onOpenPalette,
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
        onOpenThemeModal={onOpenThemeModal}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenPalette={onOpenPalette}
      />
    </>
  );
};
