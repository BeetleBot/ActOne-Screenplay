import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useParking } from "../context/ParkingContext";
import { LineType } from "../parser/FountainParser";
import { TodoView } from "./TodoView";
import { OutlineView } from "./OutlineView";
import { SprintView } from "./SprintView";
import { MarkerView } from "./MarkerView";
import { AddIcon, CloseIcon, SearchIcon } from "./Icons";

import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  ListItem,
  Card,
  CardContent,
  Alert,
  AlertTitle,
} from "@mui/material";

const ActoneBanner: React.FC<{ saveFileAs?: () => Promise<string | null> }> = ({ saveFileAs }) => (
  <Alert
    severity="warning"
    sx={{ mb: 2, borderRadius: '12px' }}
    action={
      saveFileAs && (
        <Button
          color="warning"
          size="small"
          variant="contained"
          onClick={() => saveFileAs()}
          sx={{ fontWeight: 600, textTransform: "none", borderRadius: '9999px' }}
        >
          Save as .actone
        </Button>
      )
    }
  >
    <AlertTitle sx={{ fontWeight: 700 }}>Only available on .actone</AlertTitle>
    Workspace features require saving the screenplay as an ActOne Bundle (.actone).
  </Alert>
);

interface SidebarViewProps {
  activeTab: string;
}

export const SidebarViews: React.FC<SidebarViewProps> = ({ activeTab }) => {
  const app = useAppContext();
  const { parsedDoc, updateSettings, filePath, saveFileAs } = app;
  const parking = useParking();
  const supportsExtended = !filePath || filePath.toLowerCase().endsWith(".actone");
  const [characterFilter, setCharacterFilter] = useState("");
  const [activeItemIdx, setActiveItemIdx] = useState<number>(-1);

  React.useEffect(() => {
    setActiveItemIdx(-1);
  }, [activeTab]);

  if (activeTab === "outline") {
    return <OutlineView />;
  }

  if (activeTab === "markers") {
    return <MarkerView />;
  }

  if (activeTab === "notepad") {
    const notepadText = parsedDoc.settings.notepad || "";

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      updateSettings((prev: any) => ({
        ...prev,
        notepad: val,
      }));
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 1.5, p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8 }}>
          Document Notepad
        </Typography>
        {!supportsExtended && (
          <ActoneBanner saveFileAs={saveFileAs} />
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
    );
  }

  if (activeTab === "characters") {
    const characterMap: { [name: string]: number } = {};
    parsedDoc.lines.forEach((line) => {
      if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
        const name = line.text
          .replace(/^@[ ]*/, "")
          .replace(/[ ]*\^[ ]*$/, "")
          .replace(/\s*\([^)]*\)/g, "")
          .trim()
          .toUpperCase();
        if (name) {
          characterMap[name] = (characterMap[name] || 0) + 1;
        }
      }
    });

    const rawCharacters = Object.entries(characterMap).sort((a, b) => b[1] - a[1]);
    const filteredCharacters = rawCharacters.filter(([name]) =>
      name.toLowerCase().includes(characterFilter.toLowerCase())
    );

    const genders = parsedDoc.settings.genders || {};

    const handleGenderChange = (name: string, gender: string) => {
      updateSettings((prev: any) => ({
        ...prev,
        genders: {
          ...(prev.genders || {}),
          [name]: gender,
        },
      }));
    };

    const getGenderColor = (gender: string) => {
      switch (gender) {
        case "male":
          return "#0081ef";
        case "female":
          return "#fa6fc1";
        case "nonbinary":
          return "#b520da";
        default:
          return "#969696";
      }
    };

    const handleCharKeyDown = (e: React.KeyboardEvent) => {
      if (filteredCharacters.length === 0) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx = Math.max(0, Math.min(filteredCharacters.length - 1, activeItemIdx + dir));
        setActiveItemIdx(nextIdx);
        const target = filteredCharacters[nextIdx];
        const el = e.currentTarget.querySelector(`[data-char-id="${target[0]}"]`) as HTMLElement;
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2, height: "100%" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8 }}>
          Character Tracking
        </Typography>
        
        {!supportsExtended && <ActoneBanner saveFileAs={saveFileAs} />}

        <TextField
          value={characterFilter}
          disabled={!supportsExtended}
          onChange={(e) => setCharacterFilter(e.target.value)}
          placeholder={!supportsExtended ? "Tracking disabled..." : "Filter characters..."}
          size="small"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <Box sx={{ display: "flex", color: "text.secondary", mr: 1 }}>
                  <SearchIcon sx={{ fontSize: 16 }} />
                </Box>
              ),
            }
          }}
        />
        {filteredCharacters.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
            No characters found matching search.
          </Typography>
        ) : (
          <Box 
            tabIndex={0}
            onKeyDown={handleCharKeyDown}
            sx={{ 
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
              opacity: !supportsExtended ? 0.6 : 1,
              outline: "none",
              "&:focus": { outline: "none" }
            }}
          >
            <List disablePadding>
              {filteredCharacters.map(([name, count], idx) => {
                const gender = genders[name] || "unknown";
                const isSelected = activeItemIdx === idx;
                return (
                  <ListItemButton
                    key={name}
                    data-char-id={name}
                    dense
                    selected={isSelected}
                    onClick={() => setActiveItemIdx(idx)}
                    sx={{ borderRadius: "6px", mb: 0.25 }}
                  >
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: getGenderColor(gender), mr: 1.5, flexShrink: 0 }} />
                    <ListItemText
                      primary={name}
                      secondary={`${count} lines`}
                      slotProps={{
                        primary: { sx: { fontWeight: 600, fontSize: "0.85rem" } },
                        secondary: { sx: { fontSize: "0.7rem" } },
                      }}
                      sx={{ mr: 1 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={gender}
                        disabled={!supportsExtended}
                        onChange={(e) => handleGenderChange(name, e.target.value)}
                        sx={{ fontSize: "0.75rem", height: 26, borderRadius: "6px" }}
                      >
                        <MenuItem value="unknown">Unknown</MenuItem>
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="nonbinary">Non-Binary</MenuItem>
                      </Select>
                    </FormControl>
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        )}
      </Box>
    );
  }

  if (activeTab === "stats") {
    const totalLines = parsedDoc.lines.length;
    const pageEstimate = Math.max(1, Math.round(totalLines / 54));

    let totalWords = 0;
    let dialogueWords = 0;
    let actionWords = 0;
    let headingCount = 0;

    const locationCounts: { [loc: string]: number } = {};
    const genderDialogueLines: { [gender: string]: number } = { male: 0, female: 0, nonbinary: 0, unknown: 0 };
    const genders = parsedDoc.settings.genders || {};

    let currentSpeaker = "";

    parsedDoc.lines.forEach((line) => {
      const words = line.text.trim().split(/\s+/).filter((w) => w !== "").length;
      totalWords += words;

      if (line.type === LineType.heading) {
        headingCount++;
        const text = line.text.replace(/^[. ]+/, "").toUpperCase();
        let loc = text;
        const dashIdx = text.indexOf(" -");
        if (dashIdx !== -1) {
          loc = text.substring(0, dashIdx).trim();
        }
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      } else if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
        currentSpeaker = line.text
          .replace(/^@[ ]*/, "")
          .replace(/[ ]*\^[ ]*$/, "")
          .replace(/\s*\([^)]*\)/g, "")
          .trim()
          .toUpperCase();
      } else if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
        dialogueWords += words;
        const gender = genders[currentSpeaker] || "unknown";
        genderDialogueLines[gender] = (genderDialogueLines[gender] || 0) + 1;
      } else if (line.type === LineType.action) {
        actionWords += words;
      }
    });

    const dialoguePct = totalWords > 0 ? Math.round((dialogueWords / totalWords) * 100) : 0;
    const actionPct = totalWords > 0 ? Math.round((actionWords / totalWords) * 100) : 0;

    const locations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const totalDialogueLines = Object.values(genderDialogueLines).reduce((a, b) => a + b, 0);

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8 }}>
          Screenplay Stats
        </Typography>

        <Grid container spacing={1}>
          {[
            { label: "Est. Pages", value: pageEstimate },
            { label: "Total Words", value: totalWords },
            { label: "Total Scenes", value: headingCount },
            { label: "Total Lines", value: totalLines },
          ].map((stat) => (
            <Grid size={{ xs: 6 }} key={stat.label}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: "left", borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                  {stat.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {stat.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
            Dialogue vs Action Balance
          </Typography>

          <Box sx={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", mt: 1, bgcolor: "action.disabledBackground" }}>
            <Box sx={{ width: `${dialoguePct}%`, bgcolor: "primary.main" }} />
            <Box sx={{ width: `${actionPct}%`, bgcolor: "text.disabled" }} />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>Dialogue: {dialoguePct}%</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Action: {actionPct}%</Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
            Dialogue Gender Split
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {["male", "female", "nonbinary", "unknown"].map((g) => {
              const count = genderDialogueLines[g];
              const pct = totalDialogueLines > 0 ? Math.round((count / totalDialogueLines) * 100) : 0;
              const color = g === "male" ? "#0081ef" : g === "female" ? "#fa6fc1" : g === "nonbinary" ? "#b520da" : "#969696";
              return (
                <Box key={g} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ textTransform: "capitalize", fontWeight: 500 }}>{g}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{pct}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, "& .MuiLinearProgress-bar": { bgcolor: color }, bgcolor: "action.disabledBackground" }} />
                </Box>
              );
            })}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
            Top Locations
          </Typography>
          {locations.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              No locations parsed.
            </Typography>
          ) : (
            <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {locations.map(([loc, count]) => (
                <ListItem key={loc} disableGutters sx={{ py: 0.2, display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {loc}
                  </Typography>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                    {count}
                  </Typography>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
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
    const { editorView } = app;

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
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 1.5, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8 }}>
            Parking
          </Typography>
          <ActoneBanner saveFileAs={saveFileAs} />
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
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 2, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8 }}>
            Parking
          </Typography>
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
                    transition: "border-color 0.15s ease, background-color 0.15s ease",
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
    );
  }

  return null;
};

