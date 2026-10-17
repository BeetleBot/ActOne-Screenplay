import React from "react";
import { Box, Typography, ListItemButton, IconButton, Tooltip } from "@mui/material";
import { LineType } from "../parser";
import { KeyboardArrowDownIcon, DragHandleIcon } from "./Icons";
import { getSceneColor, getSceneTitle, type TreeNode, type OutlineItem } from "./OutlineView";
import type { OutlineDropTarget } from "../editor/moveOutlineBlock";

export interface OutlineRowProps {
  node: TreeNode;
  isActive: boolean;
  isCollapsed: boolean;
  isDragging: boolean;
  dropPlacement?: OutlineDropTarget["placement"];
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
  dropPlacement,
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
  const { item, synopses } = node;
  const { line } = item;
  const isSection = line.type === LineType.section;
  const isSynopsis = line.type === LineType.synopse;
  const sceneColor = getSceneColor(line);
  return (
    <Box
      data-outline-index={sceneIndex >= 0 ? sceneIndex : undefined}
      data-outline-line={item.index}
      data-outline-section={isSection ? "true" : undefined}
      sx={{
        ml: `${Math.min(node.depth * 12, 60)}px`,
        my: 0.25,
        position: "relative",
        opacity: isDragging ? 0.4 : 1,
        ...(dropPlacement === "before" || dropPlacement === "after"
          ? {
              "&::after": {
                content: '""',
                position: "absolute",
                left: 0,
                right: 0,
                [dropPlacement === "before" ? "top" : "bottom"]: -2,
                height: 2,
                bgcolor: "var(--button-color)",
                zIndex: 1,
              },
            }
          : {}),
      }}
    >
      <ListItemButton
        data-scene-id={line.id}
        data-scene-index={!isSection && !isSynopsis ? sceneIndex : undefined}
        selected={isActive}
        aria-expanded={isSection ? !isCollapsed : undefined}
        onClick={(event) => handleItemClick(item, true, event)}
        onDoubleClick={isSection ? (event) => toggleSection(item.key ?? line.id, event) : undefined}
        onContextMenu={
          !isSection && !isSynopsis
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                onContextMenu(event, item);
              }
            : undefined
        }
        sx={{
          alignItems: "flex-start",
          borderRadius: "6px",
          px: 0.8,
          py: isSection ? 0.8 : 1,
          mt: isSection && node.depth === 0 ? 1 : 0,
          borderTop: "none",
          bgcolor: dropPlacement === "inside" ? "action.selected" : "transparent",
          outline: dropPlacement === "inside" ? "1px solid var(--button-color)" : undefined,
          transition: "background-color var(--duration-fast) ease",
          "&:hover .outline-drag, &:focus-within .outline-drag": { opacity: 1 },
        }}
      >
        {isSection ? (
          <IconButton
            size="small"
            aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${getSceneTitle(line)}`}
            onClick={(event) => toggleSection(item.key ?? line.id, event)}
            sx={{ p: 0.2, mr: 0.5, transform: isCollapsed ? "rotate(-90deg)" : undefined }}
          >
            <KeyboardArrowDownIcon sx={{ fontSize: 15 }} />
          </IconButton>
        ) : (
          <Box
            component="span"
            sx={{
              minWidth: 24,
              mr: 1,
              mt: 0.1,
              textAlign: "center",
              borderRadius: "4px",
              px: 0.5,
              py: 0.1,
              fontSize: fontSizes.number,
              fontVariantNumeric: "tabular-nums",
              bgcolor: sceneColor ? `color-mix(in srgb, ${sceneColor} 35%, transparent)` : "action.hover",
            }}
          >
            {line.sceneNumber ?? (isSynopsis ? "·" : "—")}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: "var(--font-ui)",
              fontSize: isSection ? fontSizes.section : fontSizes.scene,
              fontWeight: isSection || !isSynopsis ? 600 : 400,
              lineHeight: 1.45,
              overflowWrap: "anywhere",
              color: isSynopsis ? "text.secondary" : "text.primary",
              letterSpacing: isSection && node.depth === 0 ? "0.035em" : undefined,
              textTransform: isSection && node.depth === 0 ? "uppercase" : undefined,
            }}
          >
            {isSynopsis ? line.text.replace(/^=\s*/, "") : getSceneTitle(line)}
          </Typography>
          {showSynopses &&
            synopses.map((synopsis) => (
              <Typography
                key={synopsis.key ?? synopsis.line.id}
                component="span"
                role="button"
                onClick={(event) => {
                  event.stopPropagation();
                  scrollToLine(synopsis.index, true);
                }}
                sx={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  mt: 0.5,
                  color: "text.secondary",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: fontSizes.synopsis,
                  fontWeight: 400,
                  fontStyle: "normal",
                  lineHeight: 1.5,
                }}
              >
                {synopsis.line.text.replace(/^=\s*/, "")}
              </Typography>
            ))}
          {showStorylines && !!line.storylines?.length && (
            <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 1, rowGap: 0.25, mt: 0.6 }}>
              {line.storylines.map((tag) => (
                <Typography
                  key={tag}
                  component="span"
                  sx={{
                    color: "text.secondary",
                    fontSize: fontSizes.chip,
                    lineHeight: 1.4,
                    display: "inline-flex",
                    minWidth: 0,
                    maxWidth: "100%",
                    overflowWrap: "anywhere",
                    alignItems: "center",
                    px: 0.6,
                    py: 0.15,
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    bgcolor: "action.hover",
                  }}
                >
                  {tag}
                </Typography>
              ))}
            </Box>
          )}
          {dropPlacement === "inside" && (
            <Typography
              sx={{
                position: "absolute",
                top: 0,
                right: 0,
                px: 0.5,
                borderRadius: "4px",
                bgcolor: "background.paper",
                fontSize: "0.7rem",
                color: "text.secondary",
                pointerEvents: "none",
              }}
            >
              Move inside
            </Typography>
          )}
        </Box>
        {!isSynopsis && (
          <Tooltip title={`Drag ${isSection ? "section and its contents" : "scene"}`}>
            <Box
              component="span"
              className="outline-drag"
              role="button"
              aria-label={`Drag ${getSceneTitle(line)}`}
              onMouseDown={(event) => {
                event.stopPropagation();
                handleHandleMouseDown(event, sceneIndex);
              }}
              sx={{ display: "flex", ml: 0.5, pt: 0.2, cursor: "grab", color: "text.secondary", opacity: 0.45 }}
            >
              <DragHandleIcon sx={{ fontSize: 15 }} />
            </Box>
          </Tooltip>
        )}
      </ListItemButton>
    </Box>
  );
});
