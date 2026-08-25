import React, { useState, useCallback } from "react";
import { Box, Typography, IconButton, Button, TextField, List, ListItemButton, Tooltip } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { useSnapshots, type SnapshotInfo } from "../context/SnapshotContext";
import { useCustomModal } from "../context/CustomModalContext";
import { AddIcon, SettingsIcon, InfoOutlinedIcon, MoreVertIcon } from "./Icons";
import { useModalWindows } from "../hooks/useModalWindows";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { OutlineTag } from "./OutlineView";

function formatSnapshotDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const dateStr = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateStr} • ${timeStr}`;
}

interface SnapshotsPanelProps {
  onClose?: () => void;
}

export const SnapshotsPanel: React.FC<SnapshotsPanelProps> = () => {
  const { snapshots, settings, createSnapshot, deleteSnapshot, openSnapshotAsFile, updateSettings } = useSnapshots();
  const { confirm } = useCustomModal();
  const { openSettingsWindow } = useModalWindows();
  const [comment, setComment] = useState("");
  const [tag, setTag] = useState("");

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; info: SnapshotInfo } | null>(null);

  const handleCreate = useCallback(async () => {
    await createSnapshot(comment.trim() || undefined, "manual", tag.trim() || undefined);
    setComment("");
    setTag("");
  }, [createSnapshot, comment, tag]);

  const handleOpenAsFile = useCallback(async (info: SnapshotInfo) => {
    await openSnapshotAsFile(info);
  }, [openSnapshotAsFile]);

  const handleDelete = useCallback(async (info: SnapshotInfo) => {
    const result = await confirm({
      title: "Delete Snapshot",
      message: `Delete snapshot from ${formatSnapshotDateTime(info.created_at)}?\n\nThis action cannot be undone.`,
      buttons: [
        { value: "delete", label: "Delete", variant: "contained", color: "error" },
        { value: "cancel", label: "Cancel", variant: "text" },
      ],
    });
    if (result === "delete") {
      await deleteSnapshot(info);
    }
  }, [deleteSnapshot, confirm]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Snapshots
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Tooltip title="Snapshots captures previous states of your script. Take manual snapshots, or configure automatic interval snapshots.">
            <span>
              <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
            </span>
          </Tooltip>
          <IconButton
            size="small"
            onClick={() => openSettingsWindow("snapshots")}
            sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
          >
            <SettingsIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1.2, overflow: "hidden" }}>
        {/* Create snapshot pane / Enable snapshot button */}
        {settings.enabled ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Comment (optional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              slotProps={{
                input: {
                  sx: {
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    py: 0.3,
                    bgcolor: "background.paper",
                    "& fieldset": { borderColor: "color-mix(in srgb, var(--text-main) 12%, transparent)" },
                  },
                },
              }}
            />
            <TextField
              fullWidth
              size="small"
              placeholder="Tag (optional)..."
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              slotProps={{
                input: {
                  sx: {
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    py: 0.3,
                    bgcolor: "background.paper",
                    "& fieldset": { borderColor: "color-mix(in srgb, var(--text-main) 12%, transparent)" },
                  },
                },
              }}
            />
            <Button
              fullWidth
              size="small"
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={handleCreate}
              sx={{ borderRadius: "20px", py: 0.75, fontSize: "0.75rem", fontWeight: 600, textTransform: "none" }}
            >
              New Snapshot
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, alignItems: "center", justifyContent: "center", py: 2.5, px: 2, bgcolor: "action.hover", borderRadius: "12px", border: "1px dashed", borderColor: "divider" }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", fontSize: "0.75rem" }}>
              Snapshots are currently turned off.
            </Typography>
            <Button
              size="small"
              variant="contained"
              onClick={() => updateSettings({ enabled: true })}
              sx={{ borderRadius: "20px", fontSize: "0.75rem", px: 2.5, py: 0.6, textTransform: "none" }}
            >
              Enable Snapshots
            </Button>
          </Box>
        )}

        {/* Tag Filters */}
        {snapshots.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.2 }}>
            {[
              { key: "manual", label: "MANUAL", isAccent: true },
              { key: "on_save", label: "SAVE", isAccent: true },
              { key: "auto", label: "AUTO", isAccent: false },
              ...Array.from(new Set(snapshots.map((s) => s.custom_tag).filter(Boolean))).map((t) => ({
                key: t as string,
                label: (t as string).toUpperCase(),
                isAccent: false,
              })),
            ].map((opt) => {
              const isSelected = activeFilter === opt.key;
              return (
                <Box
                  key={opt.key}
                  onClick={() => setActiveFilter(activeFilter === opt.key ? null : opt.key)}
                  sx={(theme: Theme) => {
                    const baseColor = opt.isAccent ? "var(--button-color, primary.main)" : theme.palette.text.secondary;
                    return {
                      fontSize: "9px",
                      fontFamily: "var(--font-ui)",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      px: 1.25,
                      py: 0.35,
                      borderRadius: "20px",
                      cursor: "pointer",
                      userSelect: "none",
                      border: "none",
                      color: isSelected ? "primary.contrastText" : baseColor,
                      backgroundColor: isSelected
                        ? "var(--button-color, primary.main)"
                        : "color-mix(in srgb, var(--text-main) 6%, transparent)",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        backgroundColor: isSelected
                          ? "var(--button-color, primary.main)"
                          : "color-mix(in srgb, var(--button-color) 15%, transparent)",
                      },
                    };
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Snapshot list */}
        <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {snapshots.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", py: 2, fontSize: 12, textAlign: "center" }}>
              No snapshots yet{settings.enabled ? "" : " — Snapshots are disabled"}
            </Typography>
          ) : (
            <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.35 }}>
              {snapshots
                .filter((s) => !activeFilter || s.snapshot_type === activeFilter || s.custom_tag === activeFilter)
                .map((info) => {
                  const typeLabel = info.snapshot_type === "manual" ? "MANUAL" : info.snapshot_type === "on_save" ? "SAVE" : "AUTO";
                  const isTypeAccent = info.snapshot_type === "manual" || info.snapshot_type === "on_save";

                  return (
                    <Box key={info.id} sx={{ display: "flex", flexDirection: "column" }}>
                      {/* Top Tier: Header Card with Date & Time */}
                      <ListItemButton
                        dense
                        onClick={() => handleOpenAsFile(info)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, info });
                        }}
                        sx={{
                          borderRadius: "8px 8px 0 0",
                          mb: 0,
                          px: 1,
                          py: 0.45,
                          border: "1px solid",
                          borderColor: "color-mix(in srgb, var(--text-main) 10%, transparent)",
                          bgcolor: "background.paper",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                          transition: "all var(--duration-fast) ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 0.75,
                          "&:hover": {
                            bgcolor: "action.hover",
                            borderColor: "color-mix(in srgb, var(--button-color) 40%, transparent)",
                          },
                        }}
                      >
                        {/* Date & Time Title */}
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            fontFamily: "var(--font-ui)",
                            letterSpacing: "0.01em",
                            color: "text.primary",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatSnapshotDateTime(info.created_at)}
                        </Typography>

                        {/* Context Menu Button */}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, info });
                          }}
                          sx={{
                            p: 0.25,
                            opacity: 0.4,
                            "&:hover": { opacity: 1 },
                            flexShrink: 0,
                          }}
                        >
                          <MoreVertIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </ListItemButton>

                      {/* Second Tier: Attached Sub-Card with Tags & Comment */}
                      <Box
                        sx={{
                          mb: 0.5,
                          p: "5px 8px",
                          borderRadius: "0 0 8px 8px",
                          border: "1px solid",
                          borderColor: "color-mix(in srgb, var(--text-main) 10%, transparent)",
                          borderTop: "none",
                          bgcolor: "color-mix(in srgb, var(--text-main) 3%, transparent)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.35,
                        }}
                      >
                        {/* Tags Row */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                          <OutlineTag
                            label={typeLabel}
                            variant={isTypeAccent ? "accent" : "default"}
                            size="0.65rem"
                          />
                          {info.custom_tag && (
                            <OutlineTag
                              label={info.custom_tag.toUpperCase()}
                              variant="default"
                              size="0.65rem"
                            />
                          )}
                        </Box>

                        {/* Comment / Note */}
                        {info.comment && (
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "0.74rem",
                              color: "text.primary",
                              lineHeight: 1.3,
                              fontStyle: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {info.comment}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
            </List>
          )}
          <ContextMenu
            open={contextMenu !== null}
            x={contextMenu?.x ?? 0}
            y={contextMenu?.y ?? 0}
            items={contextMenu ? [
              { label: "Open as New File", action: () => handleOpenAsFile(contextMenu.info) },
              "separator",
              { label: "Delete", action: () => handleDelete(contextMenu.info) },
            ] satisfies ContextMenuItem[] : []}
            onClose={() => setContextMenu(null)}
          />
        </Box>
      </Box>
    </Box>
  );
};
