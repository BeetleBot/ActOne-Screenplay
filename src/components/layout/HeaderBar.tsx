import React, { useState, useEffect, useRef } from "react";
import { useFile } from "../../context";
import { getTauriWindow } from "../../utils";
import { alpha, darken } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
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

  const handleClose = () => { try { getTauriWindow()?.close(); } catch (e) { console.error(e); } };
  const handleMinimize = () => { try { getTauriWindow()?.minimize(); } catch (e) { console.error(e); } };
  const handleMaximize = async () => {
    try {
      const win = getTauriWindow();
      if (win) {
        if (await win.isMaximized()) { await win.unmaximize(); setIsMaximized(false); }
        else { await win.maximize(); setIsMaximized(true); }
      }
    } catch (e) { console.error(e); }
  };

  const lastClickTimeRef = useRef<number>(0);
  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const isTab = target.closest(".header-tab");
      const isIconButton = target.closest("button") || target.tagName === "BUTTON";
      const isInput = target.closest("input") || target.tagName === "INPUT";
      const isMenuItem = target.closest(".MuiMenuItem-root") || target.closest(".MuiMenu-root") || target.tagName === "LI";

      if (!isTab && !isIconButton && !isInput && !isMenuItem) {
        const now = Date.now();
        if (now - lastClickTimeRef.current < 400) { handleMaximize(); lastClickTimeRef.current = 0; return; }
        lastClickTimeRef.current = now;
        try { const win = getTauriWindow(); if (win) await win.startDragging(); } catch (e) { console.error(e); }
      }
    }
  };



  return (
    <AppBar
      position="static"
      elevation={0}
      onMouseDown={handleStartDrag}
      sx={{
        bgcolor: (theme) => theme.palette.mode === 'light' ? darken(theme.palette.background.paper, 0.08) : darken(theme.palette.background.paper, 0.25),
        color: (theme) => theme.palette.text.secondary,
        borderBottom: 1,
        borderColor: (theme) => theme.palette.mode === 'light' ? alpha(theme.palette.text.primary, 0.08) : alpha(theme.palette.text.primary, 0.05),
        height: 30,
        minHeight: 30,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', height: 30, minHeight: 30, px: 0 }}>
        <Box ref={tabsContainerRef} className="header-tabs-container" sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden', px: 0, gap: 0 }}>

          {files.map((file) => {
            const display = file.filePath ? file.filePath.split(/[/\\]/).pop() : "Untitled";
            const isActive = file.id === activeFileId;
            return (
              <Box
                key={file.id}
                className={`header-tab ${isActive ? "active" : ""} ${file.isDirty ? "dirty" : ""}`}
                onClick={() => selectFile(file.id)}
                onContextMenu={(e) => handleContextMenu(e, file.id)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (e.button === 1) { e.preventDefault(); closeFile(file.id); }
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.8,
                  px: 1.5, height: 30, borderTopLeftRadius: '6px', borderTopRightRadius: '6px',
                  cursor: 'pointer', flexShrink: 0, userSelect: 'none',
                  fontSize: 11.5, whiteSpace: 'nowrap',
                  bgcolor: (theme) => isActive ? theme.palette.background.paper : 'transparent',
                  color: (theme) => isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                  borderRight: (theme) => isActive 
                    ? 'none' 
                    : `1px solid ${theme.palette.mode === 'light' ? alpha(theme.palette.text.primary, 0.08) : alpha(theme.palette.text.primary, 0.04)}`,
                  '&:hover': { 
                    bgcolor: (theme) => isActive ? theme.palette.background.paper : alpha(theme.palette.text.primary, 0.04),
                    color: (theme) => isActive ? theme.palette.text.primary : theme.palette.text.primary
                  },
                  transition: 'all 0.12s ease',
                  position: 'relative',
                }}
              >
                <span className="tab-name" style={{ fontWeight: isActive ? 600 : 400 }}>{display}</span>
                {file.isDirty && (
                  <Box 
                    sx={{ 
                      width: 5, height: 5, borderRadius: '50%', 
                      bgcolor: (theme) => isActive ? theme.palette.primary.main : theme.palette.text.secondary, 
                      flexShrink: 0,
                      boxShadow: (theme) => isActive ? `0 0 4px ${alpha(theme.palette.primary.main, 0.4)}` : 'none'
                    }} 
                  />
                )}
                <IconButton
                  size="small"
                  className="tab-close"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    closeFile(file.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  sx={{ 
                    p: '1px', 
                    opacity: 0.6, 
                    color: 'inherit',
                    '&:hover': { 
                      opacity: 1,
                      bgcolor: 'action.hover',
                      color: 'error.main'
                    }, 
                    ml: 0.5 
                  }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            );
          })}
          <Tooltip title="New File">
            <IconButton 
              size="small" 
              onClick={(e) => { e.stopPropagation(); newFile(); }} 
              onMouseDown={(e) => e.stopPropagation()}
              sx={{ 
                p: '4px', 
                ml: 0.5,
                color: 'text.secondary',
                '&:hover': { color: 'text.primary', bgcolor: 'action.hover' }
              }}
            >
              <AddIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} onMouseDown={(e) => e.stopPropagation()}>
          <IconButton
            onClick={handleMinimize}
            title="Minimize"
            sx={{
              width: 46, height: 30, borderRadius: 0,
              color: 'inherit',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
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
              width: 46, height: 30, borderRadius: 0,
              color: 'inherit',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
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
              width: 46, height: 30, borderRadius: 0,
              color: 'inherit',
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
        onMouseDown={(e) => e.stopPropagation()}
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
