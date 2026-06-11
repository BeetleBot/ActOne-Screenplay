import React, { useState, useEffect, useRef } from "react";
import { useFile } from "../../context";
import { getTauriWindow } from "../../utils";
import { alpha } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import { CloseIcon, AddIcon } from "../Icons";

export const HeaderBar: React.FC = () => {
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
        bgcolor: (theme) => theme.palette.mode === 'light' ? theme.palette.grey[900] : theme.palette.common.black,
        color: (theme) => theme.palette.common.white,
        borderBottom: 1,
        borderColor: (theme) => theme.palette.mode === 'light' ? alpha(theme.palette.common.black, 0.1) : alpha(theme.palette.common.white, 0.05),
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
                borderRadius: '9999px',
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
                  px: 2, height: 38, borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
                  cursor: 'pointer', flexShrink: 0, userSelect: 'none',
                  fontSize: 12, whiteSpace: 'nowrap',
                  bgcolor: (theme) => isActive ? theme.palette.background.paper : 'transparent',
                  color: (theme) => isActive ? theme.palette.text.primary : alpha(theme.palette.common.white, 0.6),
                  borderRight: (theme) => isActive 
                    ? 'none' 
                    : `1px solid ${theme.palette.mode === 'light' ? alpha(theme.palette.common.white, 0.1) : alpha(theme.palette.common.white, 0.05)}`,
                  '&:hover': { 
                    bgcolor: (theme) => isActive ? theme.palette.background.paper : alpha(theme.palette.common.white, 0.05),
                    color: (theme) => isActive ? theme.palette.text.primary : theme.palette.common.white
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
                      bgcolor: (theme) => isActive ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.3), 
                      flexShrink: 0,
                      boxShadow: (theme) => isActive ? `0 0 4px ${alpha(theme.palette.primary.main, 0.4)}` : 'none'
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
                    color: (theme) => isActive ? 'inherit' : alpha(theme.palette.common.white, 0.5),
                    '&:hover': { 
                      opacity: 1,
                      bgcolor: (theme) => isActive ? theme.palette.action.hover : alpha(theme.palette.common.white, 0.1),
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
                color: (theme) => alpha(theme.palette.common.white, 0.6),
                '&:hover': { color: (theme) => theme.palette.common.white, bgcolor: (theme) => alpha(theme.palette.common.white, 0.1) }
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <IconButton
            onClick={handleMinimize}
            title="Minimize"
            sx={{
              width: 46, height: 38, borderRadius: 0,
              color: (theme) => alpha(theme.palette.common.white, 0.6),
              '&:hover': { bgcolor: (theme) => alpha(theme.palette.common.white, 0.1), color: (theme) => theme.palette.common.white },
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </IconButton>
          <IconButton
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
            sx={{
              width: 46, height: 38, borderRadius: 0,
              color: (theme) => alpha(theme.palette.common.white, 0.6),
              '&:hover': { bgcolor: (theme) => alpha(theme.palette.common.white, 0.1), color: (theme) => theme.palette.common.white },
            }}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2H10V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 4H8V10H2V4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            )}
          </IconButton>
          <IconButton
            onClick={handleClose}
            title="Close"
            sx={{
              width: 46, height: 38, borderRadius: 0,
              color: (theme) => alpha(theme.palette.common.white, 0.6),
              '&:hover': { bgcolor: (theme) => theme.palette.error.main, color: (theme) => theme.palette.common.white },
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
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
