import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { getTauriWindow } from "../utils";
import { DownloadIcon } from "./Icons";

interface TitleBarProps {
  title: string;
  onClose: () => void;
  updateAvailable?: boolean;
  installUpdate?: () => void;
  isModal?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({ 
  title, 
  onClose, 
  updateAvailable = false,
  installUpdate,
  isModal = false
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizable, setIsResizable] = useState(true);
  const lastClickTimeRef = useRef<number>(0);

  useEffect(() => {
    const win = getTauriWindow();
    if (!win) return;

    const checkWindow = async () => {
      try {
        setIsMaximized(await win.isMaximized());
        setIsResizable(await win.isResizable());
      } catch (e) {
        console.error("TitleBar window check failed", e);
      }
    };
    checkWindow();

    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      try {
        unlisten = await win.onResized(() => checkWindow());
      } catch (e) {
        console.error("TitleBar resize listener setup failed", e);
      }
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  const handleMinimize = () => {
    try {
      getTauriWindow()?.minimize();
    } catch (e) {
      console.error("TitleBar minimize failed", e);
    }
  };

  const handleMaximize = async () => {
    try {
      const win = getTauriWindow();
      if (win && isResizable) {
        if (await win.isMaximized()) {
          await win.unmaximize();
          setIsMaximized(false);
        } else {
          await win.maximize();
          setIsMaximized(true);
        }
      }
    } catch (e) {
      console.error("TitleBar maximize failed", e);
    }
  };

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      // Do not drag if clicking any button or child of a button
      const isIconButton = target.closest("button") || target.tagName === "BUTTON" || target.closest("[role='button']");
      if (!isIconButton) {
        const now = Date.now();
        if (now - lastClickTimeRef.current < 400 && isResizable) {
          handleMaximize();
          lastClickTimeRef.current = 0;
          return;
        }
        lastClickTimeRef.current = now;
        try {
          const win = getTauriWindow();
          if (win) await win.startDragging();
        } catch (e) {
          console.error("TitleBar startDragging failed", e);
        }
      }
    }
  };

  // Calculate right padding based on controls layout
  const controlsWidth = (isResizable && !isModal ? 140 : (isModal ? 46 : 94)) + (updateAvailable && installUpdate ? 80 : 0);

  return (
    <Box
      onMouseDown={handleStartDrag}
      sx={{
        height: 40,
        display: "flex",
        alignItems: "center",
        px: 0,
        justifyContent: "space-between",
        userSelect: "none",
        flexShrink: 0,
        borderBottom: "none",
        bgcolor: "transparent",
        borderTopLeftRadius: isModal ? 'inherit' : 0,
        borderTopRightRadius: isModal ? 'inherit' : 0,
        position: 'relative',
        pr: `${controlsWidth}px`,
        cursor: "default",
      }}
    >
      <Box 
        sx={{ 
          display: "flex", 
          alignItems: "center", 
          height: "100%", 
          gap: 1.25, 
          pl: 2,
        }}
      >
        <Typography 
          variant="caption" 
          sx={{ 
            fontWeight: 700, 
            fontSize: 11, 
            color: "text.primary", 
            letterSpacing: "0.04em",
          }}
        >
          {title.toUpperCase()}
        </Typography>
      </Box>

      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          flexShrink: 0,
          position: 'absolute',
          right: 8,
          top: 0,
          height: '100%',
          bgcolor: 'inherit',
          zIndex: 11,
        }} 
        onMouseDown={(e) => e.stopPropagation()}
      >
        {updateAvailable && installUpdate && (
          <Box
            onClick={(e) => { e.stopPropagation(); installUpdate(); }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Click to install update from Microsoft Store"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              height: 26,
              px: 1.25,
              borderRadius: '6px',
              cursor: 'pointer',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
              color: 'primary.main',
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: (t) => alpha(t.palette.primary.main, 0.25),
              },
            }}
          >
            <DownloadIcon sx={{ fontSize: 12 }} />
            Update
          </Box>
        )}

        {!isModal && (
          <IconButton
            onClick={handleMinimize}
            title="Minimize"
            size="small"
            sx={{
              width: 28, 
              height: 28, 
              borderRadius: '6px',
              color: 'text.secondary',
              '&:hover': { bgcolor: (t) => alpha(t.palette.text.primary, 0.08), color: 'text.primary' },
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
              <path d="M2 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </IconButton>
        )}
        
        {!isModal && isResizable && (
          <IconButton
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
            size="small"
            sx={{
              width: 28, 
              height: 28, 
              borderRadius: '6px',
              color: 'text.secondary',
              '&:hover': { bgcolor: (t) => alpha(t.palette.text.primary, 0.08), color: 'text.primary' },
              transition: 'all 0.15s ease',
            }}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
                <path d="M4 2H10V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 4H8V10H2V4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
                <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            )}
          </IconButton>
        )}

        <IconButton
          onClick={onClose}
          title="Close"
          size="small"
          sx={{
            width: 28, 
            height: 28, 
            borderRadius: '6px',
            color: 'text.secondary',
            '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.15), color: (theme) => theme.palette.error.main },
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconButton>
      </Box>
    </Box>
  );
};
