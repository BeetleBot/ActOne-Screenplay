import React, { useState } from "react";
import { useFile, useEditor, useParking } from "../context";
import { LineType } from "../parser";
import { TodoView } from "./TodoView";
import { OutlineView } from "./OutlineView";
import { SprintView } from "./SprintView";
import { MarkerView } from "./MarkerView";
import { ScriptsView } from "./ScriptsView";
import { ActoneBanner } from "./ActoneBanner";
import { AddIcon, CloseIcon, SearchIcon } from "./Icons";
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Card,
  CardContent,
} from "@mui/material";

const getGenderColor = (gender: string) => {
  switch (gender) {
    case "male":
      return "var(--gender-male)";
    case "female":
      return "var(--gender-female)";
    case "nonbinary":
      return "var(--gender-nonbinary)";
    default:
      return "var(--gender-unknown)";
  }
};

interface SidebarViewProps {
  activeTab: string;
}

export const SidebarViews: React.FC<SidebarViewProps> = ({ activeTab }) => {
  const { parsedDoc, filePath, saveFileAs } = useFile();
  const { updateSettings, editorView } = useEditor();
  const parking = useParking();
  const supportsExtended = !filePath || filePath.toLowerCase().endsWith(".actone");
  const [characterFilter, setCharacterFilter] = useState("");
  const [activeItemIdx, setActiveItemIdx] = useState<number>(-1);
  const GENDER_CYCLE = ["unknown", "male", "female", "nonbinary"] as const;

  React.useEffect(() => {
    setActiveItemIdx(-1);
  }, [activeTab]);

  if (activeTab === "scripts") {
    return <ScriptsView />;
  }

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
      updateSettings((prev) => ({
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
      updateSettings((prev) => ({
        ...prev,
        genders: {
          ...(prev.genders || {}),
          [name]: gender,
        },
      }));
    };

    const cycleGender = (name: string, current: string) => {
      const idx = GENDER_CYCLE.indexOf(current as typeof GENDER_CYCLE[number]);
      const next = GENDER_CYCLE[(idx + 1) % GENDER_CYCLE.length];
      handleGenderChange(name, next);
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
        
        {!supportsExtended && <ActoneBanner message="Workspace features require saving the screenplay as an ActOne Bundle (.actone)." saveFileAs={saveFileAs} />}

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
                    <Box
                      component="button"
                      disabled={!supportsExtended}
                      onClick={() => cycleGender(name, gender)}
                      sx={{
                        width: 22, height: 22,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none',
                        borderRadius: '10px',
                        bgcolor: `${getGenderColor(gender)}18`,
                        cursor: 'pointer',
                        flexShrink: 0,
                        mr: 1.5,
                        '&:hover': { bgcolor: `${getGenderColor(gender)}30` },
                        '&.Mui-disabled': { opacity: 0.35 },
                        transition: 'background-color 0.15s',
                      }}
                      title={gender === 'nonbinary' ? 'Non-Binary' : gender.charAt(0).toUpperCase() + gender.slice(1)}
                    >
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getGenderColor(gender), flexShrink: 0 }} />
                    </Box>
                    <ListItemText
                      primary={name}
                      secondary={`${count} lines`}
                      slotProps={{
                        primary: { sx: { fontWeight: 600, fontSize: "0.85rem" } },
                        secondary: { sx: { fontSize: "0.7rem", color: 'text.primary', opacity: 0.75 } },
                      }}
                      sx={{ mr: 1 }}
                    />
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
    const pages = parsedDoc.pageBreaks ? parsedDoc.pageBreaks.length + 1 : 1;

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
        loc = loc.replace(/^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b[ .]*/i, "").trim();
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

    const statCards = [
      { label: "Estd. Pages", value: pages, color: "primary.main" },
      { label: "Words", value: totalWords.toLocaleString(), color: "text.primary" },
      { label: "Scenes", value: headingCount, color: "text.primary" },
      { label: "Lines", value: totalLines.toLocaleString(), color: "text.primary" },
    ];

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", px: 0.5 }}>
          Statistics
        </Typography>

        <Grid container spacing={1}>
          {statCards.map((stat) => (
            <Grid size={{ xs: 6 }} key={stat.label}>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {stat.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.25, lineHeight: 1.2, color: stat.color }}>
                  {stat.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Dialogue vs Action
          </Typography>
          <Box sx={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", mt: 1, bgcolor: "background.paper" }}>
            <Box sx={{ width: `${dialoguePct}%`, bgcolor: "primary.main", transition: "width 0.3s" }} />
            <Box sx={{ width: `${actionPct}%`, bgcolor: "text.disabled", transition: "width 0.3s" }} />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.75 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main", fontSize: "0.7rem" }}>
              Dialogue {dialoguePct}%
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.7rem" }}>
              Action {actionPct}%
            </Typography>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Dialogue by Gender
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 0.75 }}>
            {["male", "female", "nonbinary", "unknown"].map((g) => {
              const count = genderDialogueLines[g];
              const pct = totalDialogueLines > 0 ? Math.round((count / totalDialogueLines) * 100) : 0;
              const color = getGenderColor(g);
              return (
                <Box key={g} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption" sx={{ textTransform: "capitalize", fontWeight: 500, minWidth: 56, fontSize: "0.7rem" }}>{g}</Typography>
                  <Box sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: "background.paper", overflow: "hidden" }}>
                    <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: color, borderRadius: 2, transition: "width 0.3s" }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28, textAlign: "right", fontSize: "0.7rem" }}>{pct}%</Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Top Locations
          </Typography>
          {locations.length === 0 ? (
            <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", display: "block", mt: 0.5, fontSize: "0.7rem" }}>
              No locations parsed.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, mt: 0.5 }}>
              {locations.map(([loc, count], i) => (
                <Box key={loc} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.3 }}>
                  <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600, minWidth: 14, fontSize: "0.65rem" }}>
                    {i + 1}
                  </Typography>
                  <Typography variant="caption" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.7rem", fontWeight: 500 }}>
                    {loc}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.7rem" }}>
                    {count}
                  </Typography>
                </Box>
              ))}
            </Box>
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
          <ActoneBanner message="Workspace features require saving the screenplay as an ActOne Bundle (.actone)." saveFileAs={saveFileAs} />
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
    );
  }

  return null;
};

