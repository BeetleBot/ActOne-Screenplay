import React, { useState } from "react";
import { useFile, useEditor, useParking } from "../context";
import { TodoView } from "./TodoView";
import { OutlineView } from "./OutlineView";
import { SprintView } from "./SprintView";
import { MarkerView } from "./MarkerView";
import { ScriptsView } from "./ScriptsView";
import { SnapshotsPanel } from "./SnapshotsPanel";
import { ActoneBanner } from "./ActoneBanner";
import { AddIcon, CloseIcon, InfoOutlinedIcon } from "./Icons";
import { getPerScriptSettingString, updatePerScriptSetting } from "../utils/perScriptSettings";
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";

interface SidebarViewProps {
  activeTab: string;
}

export const SidebarViews = React.memo<SidebarViewProps>(({ activeTab }) => {
  const { parsedDoc, filePath, saveFileAs, scriptFileName } = useFile();
  const { updateSettings, editorView } = useEditor();
  const parking = useParking();
  const supportsExtended = !filePath || filePath.toLowerCase().endsWith(".actone");
  const [activeItemIdx, setActiveItemIdx] = useState<number>(-1);

  React.useEffect(() => {
    setActiveItemIdx(-1);
  }, [activeTab]);

  if (activeTab === "scripts") {
    return <ScriptsView />;
  }

  if (activeTab === "snapshots") {
    return <SnapshotsPanel onClose={() => {}} />;
  }

  if (activeTab === "outline") {
    return <OutlineView />;
  }

  if (activeTab === "markers") {
    return <MarkerView />;
  }

  if (activeTab === "notepad") {
    const notepadText = getPerScriptSettingString("notepad", parsedDoc.settings, scriptFileName);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      updateSettings((prev) => ({
        ...prev,
        ...updatePerScriptSetting(prev, "notepad", scriptFileName, val),
      }));
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Document Notepad
          </Typography>
          <Tooltip title="Notepad provides a document-wide notepad for jotting down draft goals, beats, outlines, and general notes.">
            <span>
              <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
            </span>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, p: 2 }}>
          {!supportsExtended && (
            <ActoneBanner message="Workspace features require saving the screenplay as an ActOne Bundle (.actone)." saveFileAs={saveFileAs} />
          )}
          <TextField
            value={notepadText}
            onChange={handleChange}
            disabled={!supportsExtended}
            multiline
            placeholder={supportsExtended ? "Type your outline notes, beats, or draft goals here..." : "Save as .actone to use the notepad"}
            variant="outlined"
            fullWidth
            slotProps={{
              input: {
                sx: {
                  fontFamily: "var(--font-ui)",
                  fontSize: "13px",
                  flex: 1,
                  alignItems: "flex-start",
                  minHeight: "300px",
                  bgcolor: "background.paper",
                  "& fieldset": { borderColor: "divider" },
                  "&:hover fieldset": { borderColor: "text.secondary" },
                  "&.Mui-focused fieldset": { borderWidth: "1px", borderColor: "primary.main" },
                }
              }
            }}
            sx={{
              flex: 1,
              display: "flex",
              "& .MuiInputBase-root": {
                height: "100%",
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (activeTab === "todo") {
    return <TodoView disabled={!supportsExtended} saveFileAs={saveFileAs} />;
  }

  if (activeTab === "sprint") {
    return <SprintView />;
  }

  if (activeTab === "parking") {
    const { items, addItem, removeItem } = parking;

    const handleParkSelection = () => {
      const view = editorView;
      if (!view) return;
      const selection = view.state.selection.main;
      if (selection.empty) return;
      const text = view.state.sliceDoc(selection.from, selection.to);
      if (!text.trim()) return;
      addItem(text);
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: "" },
      });
      view.focus();
    };

    const handleCardClick = (item: { id: string; text: string }) => {
      const view = editorView;
      if (!view) return;
      const pos = view.state.selection.main.from;
      view.dispatch({
        changes: { from: pos, insert: item.text + "\n" },
        selection: { anchor: pos + item.text.length + 1 },
      });
      removeItem(item.id);
      view.focus();
    };

    if (!supportsExtended) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Parking
            </Typography>
            <Tooltip title="Parking stores selections of text you've temporarily removed from the script. Drag or click to insert them back.">
              <span>
                <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
              </span>
            </Tooltip>
          </Box>
          <Box sx={{ p: 2 }}>
            <ActoneBanner message="Workspace features require saving the screenplay as an ActOne Bundle (.actone)." saveFileAs={saveFileAs} />
          </Box>
        </Box>
      );
    }

    const handleParkKeyDown = (e: React.KeyboardEvent) => {
      if (items.length === 0) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx = Math.max(0, Math.min(items.length - 1, activeItemIdx + dir));
        setActiveItemIdx(nextIdx);
        const target = items[nextIdx];
        const el = e.currentTarget.querySelector(`[data-card-id="${target.id}"]`) as HTMLElement;
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeItemIdx >= 0 && activeItemIdx < items.length) {
          handleCardClick(items[activeItemIdx]);
        }
      }
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Parking
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Tooltip title="Parking stores selections of text you've temporarily removed from the script. Drag or click to insert them back.">
              <span>
                <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
              </span>
            </Tooltip>
            <Button
              variant="contained"
              size="small"
              onClick={handleParkSelection}
              disabled={editorView?.state.selection.main.empty}
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
              sx={{ textTransform: "none", fontSize: 11, fontWeight: 600 }}
            >
              Park Selection
            </Button>
          </Box>
        </Box>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, p: 2, overflow: "hidden" }}>

        <Box 
          tabIndex={0}
          onKeyDown={handleParkKeyDown}
          sx={{ 
            flex: 1, 
            overflowY: "auto", 
            display: "flex", 
            flexDirection: "column", 
            gap: 1, 
            minHeight: 0,
            outline: "none",
            "&:focus": { outline: "none" }
          }}
        >
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              Select text in the editor and click "Park Selection" to store it here.
            </Typography>
          ) : (
            items.map((item, idx) => {
              const isSelected = activeItemIdx === idx;
              return (
                <Card
                  key={item.id}
                  data-card-id={item.id}
                  onClick={(e) => {
                    setActiveItemIdx(idx);
                    handleCardClick(item);
                    e.currentTarget.parentElement?.focus();
                  }}
                  variant="outlined"
                  sx={{
                    cursor: "pointer",
                    position: "relative",
                    borderRadius: '12px',
                    maxHeight: "140px",
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                    bgcolor: isSelected ? "action.selected" : "transparent",
                    transition: "border-color 0.12s ease, background-color 0.12s ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: isSelected ? "action.selected" : "action.hover",
                    },
                  }}
                >
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, pr: 4, overflowY: "auto", overscrollBehavior: "contain", flex: 1 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        opacity: 0.5,
                        "&:hover": { opacity: 1 },
                        zIndex: 2,
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.4 }}>
                      {item.text}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
    );
  }

  return null;
});

