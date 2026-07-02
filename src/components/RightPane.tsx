import React, { useState, useEffect } from "react";
import { Box, Paper, IconButton } from "@mui/material";
import { useUI } from "../context";
import { CloseIcon } from "./Icons";
import { ErrorBoundary } from "./ErrorBoundary";

interface RightPaneProps {
  type: string;
  onClose: () => void;
  children: React.ReactNode;
  errorBoundaryName?: string;
  ariaLabel?: string;
}

export const RightPane: React.FC<RightPaneProps> = ({
  type,
  onClose,
  children,
  errorBoundaryName = "right-pane",
  ariaLabel = "Find and Replace",
}) => {
  const { rightPaneWidth, setRightPaneWidth } = useUI();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(700, window.innerWidth - e.clientX));
      setRightPaneWidth(newWidth);
    };
    const handleUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "default";
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, setRightPaneWidth]);

  return (
    <>
      <Box
        className="right-pane-resizer"
        onMouseDown={() => setIsDragging(true)}
        sx={{
          width: 4,
          cursor: "col-resize",
          flexShrink: 0,
          "&:hover": { bgcolor: "var(--button-color)", opacity: 0.3 },
        }}
      />
      <Paper
        className="right-pane"
        elevation={0}
        square
        data-pane-type={type}
        aria-label={ariaLabel}
        sx={{
          width: rightPaneWidth,
          flexShrink: 0,
          borderLeft: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <IconButton
          size="small"
          aria-label="Close pane"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
            zIndex: 2,
            opacity: 0.6,
            "&:hover": { opacity: 1 },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <ErrorBoundary name={errorBoundaryName}>
          <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {children}
          </Box>
        </ErrorBoundary>
      </Paper>
    </>
  );
};
