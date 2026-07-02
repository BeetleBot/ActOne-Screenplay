import React, { useState, useCallback } from "react";
import { Box, Typography, IconButton, Button, TextField, List, ListItemButton, Divider, Menu, MenuItem, Tooltip } from "@mui/material";
import { useSnapshots, type SnapshotInfo } from "../context/SnapshotContext";
import { useFile } from "../context/FileContext";
import { useCustomModal } from "../context/CustomModalContext";
import { AddIcon, SettingsIcon, InfoOutlinedIcon } from "./Icons";
import { useModalWindows } from "../hooks/useModalWindows";

function formatSnapshotDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const dateStr = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${dateStr} • ${timeStr}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const getSnapshotColors = (type: string, theme: any) => {
  let color = theme.palette.text.primary;
  if (type === "manual") {
    color = theme.palette.primary.main;
  } else if (type === "on_save") {
    color = theme.palette.success.main;
  } else {
    color = theme.palette.info.main;
  }
  return {
    tagColor: color,
    bgColor: `color-mix(in srgb, ${color} 8%, transparent)`,
    hoverBgColor: `color-mix(in srgb, ${color} 15%, transparent)`,
    selectedBgColor: `color-mix(in srgb, ${color} 20%, transparent)`,
  };
};

interface SnapshotsPanelProps {
  onClose?: () => void;
}

export const SnapshotsPanel: React.FC<SnapshotsPanelProps> = () => {
  const { snapshots, settings, createSnapshot, deleteSnapshot, restoreSnapshot, openSnapshotAsFile, updateSettings } = useSnapshots();
  const { filePath, openFilePath } = useFile();
  const { confirm } = useCustomModal();
  const { openSettingsWindow } = useModalWindows();
  const [comment, setComment] = useState("");
  const [tag, setTag] = useState("");
  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; info: SnapshotInfo } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    await createSnapshot(comment.trim() || undefined, "manual", tag.trim() || undefined);
    setComment("");
    setTag("");
  }, [createSnapshot, comment, tag]);

  const handleRestore = useCallback(async (info: SnapshotInfo) => {
    setMenuState(null);
    const result = await confirm({
      title: "Restore Snapshot",
      message: `Restore snapshot from ${formatSnapshotDateTime(info.created_at)}?\n\nThis will overwrite your current file. A snapshot of the current state will be created first.`,
      buttons: [
        { value: "restore", label: "Restore", variant: "contained", color: "primary" },
        { value: "cancel", label: "Cancel", variant: "text" },
      ],
    });
    if (result === "restore") {
      await createSnapshot();
      await restoreSnapshot(info);
      if (filePath) {
        await openFilePath(filePath);
      }
    }
  }, [createSnapshot, restoreSnapshot, filePath, openFilePath, confirm]);

  const handleOpenAsFile = useCallback(async (info: SnapshotInfo) => {
    setMenuState(null);
    await openSnapshotAsFile(info);
  }, [openSnapshotAsFile]);

  const handleDelete = useCallback(async (info: SnapshotInfo) => {
    setMenuState(null);
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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
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

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2, gap: 1.5, overflow: "hidden" }}>

      {/* Create snapshot pane / Enable snapshot button */}
      {settings.enabled ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Comment (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
            slotProps={{
              input: {
                sx: { borderRadius: '6px', fontSize: '0.8rem', py: 0.3 }
              }
            }}
          />
          <TextField
            fullWidth
            size="small"
            placeholder="Tag (optional)..."
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
            slotProps={{
              input: {
                sx: { borderRadius: '6px', fontSize: '0.8rem', py: 0.3 }
              }
            }}
          />
          <Button
            fullWidth
            size="small"
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={handleCreate}
            sx={{ borderRadius: '6px', py: 0.75, fontSize: '0.75rem' }}
          >
            New Snapshot
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, alignItems: "center", justifyContent: "center", py: 2.5, px: 2, bgcolor: "action.hover", borderRadius: "8px", border: "1px dashed", borderColor: "divider" }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", fontSize: "0.75rem" }}>
            Snapshots are currently turned off.
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={() => updateSettings({ enabled: true })}
            sx={{ borderRadius: '6px', fontSize: '0.75rem', px: 2, py: 0.5 }}
          >
            Enable Snapshots
          </Button>
        </Box>
      )}

      {/* Tag Filters */}
      {snapshots.length > 0 && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
          {[
            { key: "manual", label: "MANUAL", colorKey: "primary" },
            { key: "on_save", label: "SAVE", colorKey: "success" },
            { key: "auto", label: "AUTO", colorKey: "info" },
            ...Array.from(new Set(snapshots.map(s => s.custom_tag).filter(Boolean))).map(t => ({
              key: t,
              label: t.toUpperCase(),
              colorKey: "secondary"
            }))
          ].map((opt) => {
            const isSelected = activeFilter === opt.key;
            return (
              <Box
                key={opt.key}
                onClick={() => setActiveFilter(activeFilter === opt.key ? null : opt.key)}
                sx={(theme: any) => {
                  const baseColor = theme.palette[opt.colorKey]?.main || theme.palette.primary.main;
                  return {
                    fontSize: "8.5px",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    px: 1,
                    py: 0.3,
                    borderRadius: "4px",
                    cursor: "pointer",
                    userSelect: "none",
                    border: "1px solid",
                    borderColor: isSelected ? baseColor : `color-mix(in srgb, ${baseColor} 30%, transparent)`,
                    color: isSelected ? theme.palette.common.white : baseColor,
                    backgroundColor: isSelected ? baseColor : `color-mix(in srgb, ${baseColor} 8%, transparent)`,
                    transition: "all var(--duration-fast) var(--easing-standard)",
                    "&:hover": {
                      backgroundColor: isSelected ? baseColor : `color-mix(in srgb, ${baseColor} 15%, transparent)`,
                      borderColor: baseColor,
                    }
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
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", py: 2, fontSize: 12 }}>
            No snapshots yet{settings.enabled ? "" : " — Snapshots are disabled"}
          </Typography>
        ) : (
          <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            {snapshots
              .filter(s => !activeFilter || s.snapshot_type === activeFilter || s.custom_tag === activeFilter)
              .map((info) => (
                <ListItemButton
                  key={info.id}
                  dense
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuState({ anchorEl: e.currentTarget, info });
                  }}
                  sx={(theme) => {
                    const colors = getSnapshotColors(info.snapshot_type, theme);
                    return {
                      borderRadius: "6px",
                      mb: 0.25,
                      pr: 0.5,
                      py: 0.5,
                      pl: 0.75,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 0.5,
                      bgcolor: colors.bgColor,
                      transition: "background-color 0.12s ease",
                      "&:hover": {
                        bgcolor: colors.hoverBgColor,
                      },
                      "&.Mui-selected": {
                        bgcolor: colors.selectedBgColor,
                        "&:hover": { bgcolor: colors.selectedBgColor },
                      },
                    };
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 0.25 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, width: "100%" }}>
                      <Typography variant="body2" sx={{ fontSize: "0.8rem", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatSnapshotDateTime(info.created_at)}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                        {/* Type Tag */}
                        <Box
                          sx={(theme) => {
                            const colors = getSnapshotColors(info.snapshot_type, theme);
                            return {
                              display: "inline-flex",
                              alignItems: "center",
                              px: 0.8,
                              py: 0.3,
                              borderRadius: "4px",
                              border: "1px solid",
                              borderColor: `color-mix(in srgb, ${colors.tagColor} 30%, transparent)`,
                              bgcolor: `color-mix(in srgb, ${colors.tagColor} 12%, transparent)`,
                              color: colors.tagColor,
                              fontSize: "9.5px",
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              fontFamily: "var(--font-ui)",
                            };
                          }}
                        >
                          {info.snapshot_type === "manual" ? "Manual" : info.snapshot_type === "on_save" ? "Save" : "Auto"}
                        </Box>
                        {/* Custom Tag */}
                        {info.custom_tag && (
                          <Box
                            sx={(theme: any) => {
                              const baseColor = theme.palette.secondary.main;
                              return {
                                display: "inline-flex",
                                alignItems: "center",
                                px: 0.8,
                                py: 0.3,
                                borderRadius: "4px",
                                border: "1px solid",
                                borderColor: `color-mix(in srgb, ${baseColor} 30%, transparent)`,
                                bgcolor: `color-mix(in srgb, ${baseColor} 12%, transparent)`,
                                color: baseColor,
                                fontSize: "9.5px",
                                fontWeight: 700,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                fontFamily: "var(--font-ui)",
                              };
                            }}
                          >
                            {info.custom_tag}
                          </Box>
                        )}
                      </Box>
                    </Box>
                    {info.comment && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem", lineHeight: 1.25, overflowWrap: "anywhere" }}>
                        {info.comment}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
                      {formatSize(info.file_size)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuState({ anchorEl: e.currentTarget, info });
                    }}
                    sx={{ opacity: 0.5, "&:hover": { opacity: 1 }, flexShrink: 0, alignSelf: "center", ml: 0.5 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </IconButton>
                </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuState?.anchorEl}
        open={!!menuState}
        onClose={() => setMenuState(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 130 } } }}
      >
        <MenuItem onClick={() => menuState && handleRestore(menuState.info)} dense sx={{ fontSize: 12 }}>
          Restore
        </MenuItem>
        <MenuItem onClick={() => menuState && handleOpenAsFile(menuState.info)} dense sx={{ fontSize: 12 }}>
          Open as New File
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => menuState && handleDelete(menuState.info)} dense sx={{ fontSize: 12, color: "error.main" }}>
          Delete
        </MenuItem>
      </Menu>
      </Box>
    </Box>
  );
};
