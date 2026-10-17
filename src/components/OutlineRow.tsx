import React from "react";
import { Box, Typography, ListItemButton, ListItemText, IconButton } from "@mui/material";
import { LineType } from "../parser";
import { KeyboardArrowDownIcon, DragHandleIcon } from "./Icons";
import { OutlineTag, getSceneColor, getSceneTitle, type TreeNode, type OutlineItem } from "./OutlineView";

export interface OutlineRowProps {
  node: TreeNode;
  isActive: boolean;
  isCollapsed: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  showStorylines: boolean;
  showSynopses: boolean;
  sceneIndex: number;
  fontSizes: { section: string; scene: string; synopsis: string; number: string; chip: string };
  scrollToLine: (index: number, noFocus?: boolean) => void;
  handleItemClick: (item: OutlineItem, selectable: boolean, event: React.MouseEvent) => void;
  toggleSection: (id: string, event: React.MouseEvent) => void;
  handleHandleMouseDown: (event: React.MouseEvent, index: number) => void;
  onContextMenu: (event: React.MouseEvent, item: OutlineItem) => void;
}

export const OutlineRow = React.memo(function OutlineRow({
  node,
  isActive,
  isCollapsed,
  isDragging,
  isDragOver,
  showStorylines,
  showSynopses,
  sceneIndex,
  fontSizes,
  scrollToLine,
  handleItemClick,
  toggleSection,
  handleHandleMouseDown,
  onContextMenu,
}: OutlineRowProps) {
  const renderOutlineSynopses = (synopses: OutlineItem[]) => {
    if (synopses.length === 0) return null;

    if (synopses.length === 1) {
      const syn = synopses[0];
      return (
        <Box
          sx={{
            mt: 0.5,
            mb: 0.3,
            px: 1,
            py: 0.4,
            borderRadius: "2px",
            bgcolor: "transparent",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            onClick={(e) => {
              e.stopPropagation();
              scrollToLine(syn.index, true);
              const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
              if (container) container.focus();
            }}
            sx={{
              display: "block",
              cursor: "pointer",
              fontStyle: "italic",
              fontSize: fontSizes.synopsis,
              fontFamily: "var(--font-ui)",
              lineHeight: 1.4,
              letterSpacing: "0.01em",
              "&:hover": { color: "text.primary" },
            }}
          >
            {syn.line.text.replace(/^=[ ]*/, "").trim()}
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          mt: 0.5,
          mb: 0.3,
          px: 1,
          py: 0.4,
          borderRadius: "2px",
          bgcolor: "transparent",
          display: "flex",
          flexDirection: "column",
          gap: 0.3,
        }}
      >
        {synopses.map((syn) => (
          <Typography
            key={syn.line.id}
            variant="body2"
            color="text.secondary"
            onClick={(e) => {
              e.stopPropagation();
              scrollToLine(syn.index, true);
              const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
              if (container) container.focus();
            }}
            sx={{
              cursor: "pointer",
              fontStyle: "italic",
              fontSize: fontSizes.synopsis,
              fontFamily: "var(--font-ui)",
              lineHeight: 1.4,
              letterSpacing: "0.01em",
              "&:hover": { color: "text.primary" },
              display: "flex",
              alignItems: "flex-start",
              gap: 0.5,
            }}
          >
            • {syn.line.text.replace(/^=[ ]*/, "").trim()}
          </Typography>
        ))}
      </Box>
    );
  };

  const { item, synopses } = node;
  const { line } = item;
  const isSection = line.type === LineType.section;
  const isSynopsis = line.type === LineType.synopse;
  const isScene = line.type === LineType.heading;
  const sceneColor = getSceneColor(line);
  const depth = node.depth || 0;

  if (isSection) {
    const sDepth = line.sectionDepth || 1;
    const isLevel1 = sDepth === 1;

    return (
      <Box key={line.id} sx={{ display: "flex", flexDirection: "column" }}>
        <ListItemButton
          data-scene-id={line.id}
          onClick={(e) => handleItemClick(item, true, e)}
          onDoubleClick={(e) => toggleSection(item.key ?? line.id, e)}
          aria-expanded={!isCollapsed}
          selected={isActive}
          sx={{
            pl: `${Math.min(depth * 8, 16)}px`,
            py: isLevel1 ? 0.4 : 0.25,
            mt: isLevel1 ? 1.2 : 0.4,
            mb: 0.2,
            borderRadius: "6px",
            borderTop: isLevel1 ? "1px solid" : "none",
            borderColor: "color-mix(in srgb, var(--button-color) 25%, transparent)",
            bgcolor: "transparent",
            transition: "background-color var(--duration-fast) ease",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => toggleSection(item.key ?? line.id, e)}
            sx={{
              p: 0.1,
              mr: 0.3,
              transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform var(--duration-normal) ease",
            }}
          >
            <KeyboardArrowDownIcon sx={{ fontSize: 13 }} />
          </IconButton>
          <ListItemText
            slotProps={{ secondary: { component: "span" as const } }}
            primary={
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isLevel1 ? 700 : 600,
                  color: isLevel1 ? "var(--button-color)" : "text.primary",
                  fontSize: fontSizes.section,
                  fontFamily: "var(--font-ui)",
                  letterSpacing: isLevel1 ? "0.04em" : "0.01em",
                  textTransform: isLevel1 ? "uppercase" : "none",
                }}
              >
                {line.text.replace(/^[.#= ]+/, "").trim()}
              </Typography>
            }
            secondary={showSynopses && renderOutlineSynopses(synopses)}
          />
        </ListItemButton>
      </Box>
    );
  }

  if (isSynopsis) {
    return (
      <ListItemButton
        key={line.id}
        data-scene-id={line.id}
        selected={isActive}
        onClick={(e) => {
          handleItemClick(item, true, e);
        }}
        sx={{ pl: `${12 + Math.min(depth * 8, 16)}px`, py: 0.15, borderRadius: "4px", mb: 0.1 }}
      >
        <Box component="span" sx={{ mr: 0.8, fontSize: 10, color: "text.secondary" }}>
          •
        </Box>
        <ListItemText
          primary={
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontStyle: "italic",
                fontSize: fontSizes.synopsis,
                fontFamily: "var(--font-ui)",
                letterSpacing: "0.01em",
              }}
            >
              {line.text.replace(/^=[ ]*/, "").trim()}
            </Typography>
          }
        />
      </ListItemButton>
    );
  }

  const showDragOver = isDragOver && !isDragging;
  const sceneIndent = Math.min(depth * 8, 16);
  const hasSubCardContent =
    (showStorylines && line.storylines && line.storylines.length > 0) || (showSynopses && synopses.length > 0);

  return (
    <Box key={line.id} sx={{ display: "flex", flexDirection: "column" }}>
      <ListItemButton
        data-scene-id={line.id}
        data-scene-index={isScene ? sceneIndex : undefined}
        selected={isActive}
        onClick={(e) => handleItemClick(item, true, e)}
        onContextMenu={
          isScene
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(e, item);
              }
            : undefined
        }
        sx={{
          ml: `${sceneIndent}px`,
          py: 0.4,
          px: 0.8,
          borderRadius: hasSubCardContent ? "6px 6px 0 0" : "6px",
          mb: hasSubCardContent ? 0 : 0.4,
          opacity: isDragging ? 0.4 : 1,
          border: "1px solid",
          borderColor: isActive
            ? "var(--button-color, primary.main)"
            : "color-mix(in srgb, var(--text-main) 10%, transparent)",
          boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.02)",
          transition: "all var(--duration-fast) ease",
          bgcolor: showDragOver
            ? "action.hover"
            : isActive
              ? sceneColor
                ? sceneColor.startsWith("var")
                  ? `color-mix(in srgb, ${sceneColor} 22%, transparent)`
                  : `${sceneColor}30`
                : "action.selected"
              : sceneColor
                ? sceneColor.startsWith("var")
                  ? `color-mix(in srgb, ${sceneColor} 12%, transparent)`
                  : `${sceneColor}1A`
                : "background.paper",
          position: "relative",
          "&:hover": {
            borderColor: "color-mix(in srgb, var(--button-color) 40%, transparent)",
            bgcolor: sceneColor
              ? sceneColor.startsWith("var")
                ? `color-mix(in srgb, ${sceneColor} 20%, transparent)`
                : `${sceneColor}28`
              : "action.hover",
          },
          "&.Mui-selected": {
            bgcolor: sceneColor
              ? sceneColor.startsWith("var")
                ? `color-mix(in srgb, ${sceneColor} 24%, transparent)`
                : `${sceneColor}35`
              : "action.selected",
            "&:hover": {
              bgcolor: sceneColor
                ? sceneColor.startsWith("var")
                  ? `color-mix(in srgb, ${sceneColor} 28%, transparent)`
                  : `${sceneColor}40`
                : "action.selected",
            },
          },
          "&::after": showDragOver
            ? {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "2px",
                bgcolor: "primary.main",
              }
            : undefined,
        }}
      >
        {isScene && (
          <Box
            onMouseDown={(e) => handleHandleMouseDown(e, sceneIndex)}
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "grab",
              color: "text.disabled",
              mr: 0.4,
              flexShrink: 0,
              "&:hover": { color: "text.secondary" },
              "&:active": { cursor: "grabbing" },
            }}
          >
            <DragHandleIcon sx={{ fontSize: 13 }} />
          </Box>
        )}
        {!isScene && <Box sx={{ width: 18, flexShrink: 0 }} />}
        <ListItemText
          primary={
            <Box sx={{ display: "flex", gap: 0.6, alignItems: "center", width: "100%" }}>
              {line.sceneNumber && <OutlineTag label={line.sceneNumber} size={fontSizes.number} />}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  fontSize: fontSizes.scene,
                  fontFamily: "var(--font-ui)",
                  letterSpacing: "0.01em",
                  textTransform: "uppercase",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {getSceneTitle(line)}
              </Typography>
            </Box>
          }
        />
      </ListItemButton>

      {/* Separate Attached Sub-Card for Storylines & Synopsis */}
      {hasSubCardContent && (
        <Box
          sx={{
            ml: `${sceneIndent}px`,
            mb: 0.4,
            p: "6px 8px",
            borderRadius: "0 0 6px 6px",
            border: "1px solid",
            borderColor: "color-mix(in srgb, var(--text-main) 10%, transparent)",
            borderTop: "none",
            bgcolor: "color-mix(in srgb, var(--text-main) 3%, transparent)",
            display: "flex",
            flexDirection: "column",
            gap: 0.4,
          }}
        >
          {showStorylines && line.storylines && line.storylines.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
              {line.storylines.map((sl) => (
                <Box
                  key={sl}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    px: 0.8,
                    py: 0.25,
                    borderRadius: "4px",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    color: "text.secondary",
                    fontSize: "9.5px",
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-ui)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  }}
                >
                  {sl}
                </Box>
              ))}
            </Box>
          )}
          {showSynopses && renderOutlineSynopses(synopses)}
        </Box>
      )}
    </Box>
  );
});
